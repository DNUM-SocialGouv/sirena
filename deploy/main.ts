import { App as CdkApp, YamlOutputType } from "cdk8s"
import * as k8s from "./imports/k8s"
import { App } from "./charts/app"
import { SharedResources } from "./charts/shared-resources"



if (!process.env.IMAGE_TAG) {
  console.error("IMAGE_TAG non défini")
  process.exit(1)
}
if (!process.env.ENVIRONNEMENT) {
  console.error("ENVIRONNEMENT non défini")
  process.exit(1)
}
const imageTag: string = process.env.IMAGE_TAG
const environnement: string = process.env.ENVIRONNEMENT

// Common configuration values
const COMMON_CONFIG = {
  port: 80,
  imageRegistry: "ghcr.io/dnum-socialgouv/sirena",
  resources: {
    dev: { replicas: 1 },
    prod: { replicas: 2 },
  },
  targetPorts: {
    backend: k8s.IntOrString.fromNumber(4000),
    frontend: k8s.IntOrString.fromNumber(80),
  },
} as const

// Environment-specific configuration
interface EnvironmentConfig {
  subdomain: string
  domain: string
  replicas: number
}

const ENV_CONFIGS: Record<string, EnvironmentConfig> = {
  integration: {
    subdomain: "sirena.integration",
    domain: "dev.atlas.fabrique.social.gouv.fr",
    replicas: COMMON_CONFIG.resources.dev.replicas,
  },
  test: {
    subdomain: "sirena.test",
    domain: "dev.atlas.fabrique.social.gouv.fr",
    replicas: COMMON_CONFIG.resources.dev.replicas,
  },
  // validation: {
  //   subdomain: "sirena.validation",
  //   domain: "dev.atlas.fabrique.social.gouv.fr",
  //   replicas: COMMON_CONFIG.resources.dev.replicas,
  // },
  // production: {
  //   subdomain: "sirena",
  //   domain: "prod.atlas.fabrique.social.gouv.fr",
  //   replicas: COMMON_CONFIG.resources.prod.replicas,
  // },
}

// Helper functions
function getHostUrl(envConfig: EnvironmentConfig): string {
  return `https://${envConfig.subdomain}.${envConfig.domain}`
}

function createApps(
  app: CdkApp,
  envConfig: EnvironmentConfig,
  imageTag: string,
  namespace: string
): void {
  const hostUrl = getHostUrl(envConfig)

  // Shared resources (database and external secrets)
  new SharedResources(app, "shared-resources")

  // Backend
  new App(app, "backend", {
    name: "backend",
    host: hostUrl,
    replicas: envConfig.replicas,
    port: COMMON_CONFIG.port,
    targetPort: COMMON_CONFIG.targetPorts.backend,
    image: `${COMMON_CONFIG.imageRegistry}:${imageTag}-backend`,
    namespace,
  })

  // Frontend
  new App(app, "frontend", {
    name: "frontend",
    host: hostUrl,
    replicas: envConfig.replicas,
    port: COMMON_CONFIG.port,
    targetPort: COMMON_CONFIG.targetPorts.frontend,
    image: `${COMMON_CONFIG.imageRegistry}:${imageTag}-frontend`,
    namespace,
  })
}

const app = new CdkApp({
  yamlOutputType: YamlOutputType.FOLDER_PER_CHART_FILE_PER_RESOURCE,
})


// Deploy applications based on environment
const envConfig = ENV_CONFIGS[environnement]
if (!envConfig) {
  console.error(`Environnement non supporté: ${environnement}`)
  console.error(`Environnements supportés: ${Object.keys(ENV_CONFIGS).join(", ")}`)
  process.exit(1)
}

const namespace = `org-sdpsn-ws-sirena-${environnement}`
createApps(app, envConfig, imageTag, namespace)

app.synth()

