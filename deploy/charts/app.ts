import { Chart } from "cdk8s"
import type { Construct } from "constructs"
import * as k8s from "../imports/k8s"

interface AppProps {
  name: string
  host: string
  image: string
  replicas: number
  port: number
  targetPort: k8s.IntOrString
  namespace: string
}

function createBackendEnvVars(host: string): k8s.EnvVar[] {
  return [
    {
      name: "HOST",
      value: host,
    },
    {
      name: "LOG_FORMAT",
      value: "json",
    },
    {
      name: "PC_DOMAIN",
      value: "https://fca.integ01.dev-agentconnect.fr/api/v2",
    },
    {
      name: "PC_REDIRECT_URI",
      value: `${host}/api/auth/callback`,
    },
    {
      name: "PC_ID_TOKEN_SIGNED_RESPONSE_ALG",
      value: "RS256",
    },
    {
      name: "PC_USERINFO_SIGNED_RESPONSE_ALG",
      value: "RS256",
    },
    {
      name: "AUTH_TOKEN_NAME",
      value: "auth_token",
    },
    {
      name: "REFRESH_TOKEN_NAME",
      value: "refresh_token",
    },
    {
      name: "IS_LOGGED_TOKEN_NAME",
      value: "is_logged_token",
    },
    {
      name: "AUTH_TOKEN_EXPIRATION",
      value: "600",
    },
    {
      name: "REFRESH_TOKEN_EXPIRATION",
      value: "86400",
    },
    {
      name: "FRONTEND_REDIRECT_URI",
      value: `${host}/home`,
    },
    {
      name: "FRONTEND_REDIRECT_LOGIN_URI",
      value: `${host}/login`,
    },
    {
      name: "FRONTEND_URI",
      value: host,
    },
  ]
}

function createDatabaseEnvVars(): k8s.EnvVar[] {
  const dbSecretName = "db-app"
  const dbEnvMappings = [
    { envName: "PG_SIRENA_DB", secretKey: "dbname" },
    { envName: "PG_SIRENA_USER", secretKey: "username" },
    { envName: "PG_SIRENA_PASSWORD", secretKey: "password" },
    { envName: "PG_PORT", secretKey: "port" },
    { envName: "PG_HOST", secretKey: "host" },
    { envName: "PG_URL", secretKey: "uri" },
  ]

  return dbEnvMappings.map(({ envName, secretKey }) => ({
    name: envName,
    valueFrom: {
      secretKeyRef: {
        name: dbSecretName,
        key: secretKey,
      },
    },
  }))
}

function createContainer(props: AppProps): k8s.Container {
  const isBackend = props.name === "backend"
  
  return {
    name: props.name,
    resources: {
      limits: {
        cpu: k8s.Quantity.fromString("250m"),
        memory: k8s.Quantity.fromString("500Mi"),
      },
      requests: {
        cpu: k8s.Quantity.fromString("250m"),
        memory: k8s.Quantity.fromString("500Mi"),
      },
    },
    image: props.image,
    ports: [{ containerPort: Number(props.targetPort.value) }],
    env: isBackend ? [...createBackendEnvVars(props.host), ...createDatabaseEnvVars()] : [],
    envFrom: isBackend ? [{ secretRef: { name: "backend" } }] : undefined,
  }
}

function createIngressAnnotations(isBackend: boolean, namespace: string): Record<string, string> {
  const baseAnnotations = {
    "cert-manager.io/cluster-issuer": "letsencrypt",
    "nginx.ingress.kubernetes.io/proxy-body-size": "60m",
  }

  if (isBackend) {
    return {
      ...baseAnnotations,
      "nginx.ingress.kubernetes.io/use-regex": "true",
      "nginx.ingress.kubernetes.io/rewrite-target": "/$1",
    }
  }

  console.log(`namespace: ${namespace}`)

  return {
    ...baseAnnotations,
    // "nginx.ingress.kubernetes.io/custom-headers": `${namespace}/security-headers`,
  }
}

function createConfigMap(scope: Construct, isBackend: boolean) {
  if (!isBackend) {
    return new k8s.KubeConfigMap(scope, "security-headers", {
      metadata: {
        name: "security-headers",
      },
      data: {
        "X-Frame-Options": "DENY",
        "X-Content-Type-Options": "nosniff",
        "X-XSS-Protection": "1; mode=block",
        "Referrer-Policy": "strict-origin-when-cross-origin",
        "X-Robots-Tag": "noindex, nofollow, nosnippet, noarchive",
        "Content-Security-Policy": "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self'; frame-ancestors 'none'",
        "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
      },
    })
  }
  return undefined
}

function createDeployment(scope: Construct, props: AppProps, labels: Record<string, string>) {
  return new k8s.KubeDeployment(scope, "deployment", {
    metadata: {
      name: props.name,
      labels: labels,
    },
    spec: {
      replicas: props.replicas,
      selector: {
        matchLabels: labels,
      },
      template: {
        metadata: {
          labels: labels,
        },
        spec: {
          containers: [createContainer(props)],
          imagePullSecrets: [
            {
              name: "ghcr-registry",
            },
          ],
        },
      },
    },
  })
}

function createService(scope: Construct, props: AppProps, labels: Record<string, string>) {
  return new k8s.KubeService(scope, "service", {
    metadata: {
      name: props.name,
    },
    spec: {
      type: "ClusterIP",
      selector: labels,
      ports: [{ port: props.port, targetPort: props.targetPort }],
    },
  })
}

function createIngress(scope: Construct, props: AppProps, isBackend: boolean, namespace: string, service: k8s.KubeService) {
  return new k8s.KubeIngress(scope, "ingress", {
    metadata: {
      name: props.name,
      annotations: createIngressAnnotations(isBackend, namespace),
    },
    spec: {
      ingressClassName: "public",
      rules: [
        {
          host: props.host.replace("https://", ""),
          http: {
            paths: [
              {
                pathType: isBackend ? "ImplementationSpecific" : "Prefix",
                path: isBackend ? "/api/(.*)" : "/",
                backend: {
                  service: {
                    name: service.name,
                    port: {
                      number: props.port,
                    },
                  },
                },
              },
            ],
          },
        },
      ],
      tls: [
        {
          hosts: [props.host.replace("https://", "")],
          secretName: "frontend-tls",
        },
      ],
    },
  })
}

export class App extends Chart {
  constructor(scope: Construct, id: string, props: AppProps) {
    super(scope, id, {
      disableResourceNameHashes: true,
    })

    const labels = {
      app: props.name,
    }

    const isBackend = props.name === "backend"
    const namespace = props.namespace

    createConfigMap(this, isBackend)
    createDeployment(this, props, labels)
    const service = createService(this, props, labels)
    createIngress(this, props, isBackend, namespace, service)
  }
} 