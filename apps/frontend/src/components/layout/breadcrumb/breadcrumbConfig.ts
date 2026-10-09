import { ROLES, type Role } from '@sirena/common/constants';
import type { FileRoutesById } from '@/routeTree.gen';
import type { ListKey, ListState } from '@/stores/listStateStore';

export type BreadCrumbItem = {
  text: string;
  to: string;
  search?: Record<string, unknown>;
  current: boolean;
};

export type BreadCrumbContext = {
  params: Record<string, string>;
  role: Role | null;
  listStates: Partial<Record<ListKey, ListState>>;
};

type Crumb = Omit<BreadCrumbItem, 'current'>;
type Trail = (ctx: BreadCrumbContext) => Crumb[];

const requetesRoot = (ctx: BreadCrumbContext): Crumb => ({
  text: 'Liste des requêtes',
  to: '/home',
  search: ctx.listStates.requetes?.search,
});

const adminRoot: Crumb = { text: 'Espace administrateur', to: '/admin/users' };

// The super admin has no request list: the admin area is their home
const rootTrail: Trail = (ctx) => (ctx.role === ROLES.SUPER_ADMIN ? [adminRoot] : [requetesRoot(ctx)]);

// The admin area is a standalone section, whatever the role
const adminTrail: Trail = () => [adminRoot];

const SITUATION_LABEL = 'Description de la situation';

const createRequestTrail: Trail = (ctx) => [...rootTrail(ctx), { text: 'Nouvelle requête', to: '/request/create' }];

const requestTrail: Trail = (ctx) => [
  ...rootTrail(ctx),
  { text: `Requête ${ctx.params.requestId}`, to: `/request/${ctx.params.requestId}` },
];

const usersTrail: Trail = (ctx) => [
  ...adminTrail(ctx),
  {
    text: 'Utilisateurs',
    to: '/admin/users/all',
    search: ctx.listStates.users?.to === '/admin/users/all' ? ctx.listStates.users.search : undefined,
  },
];

const entitesTrail: Trail = (ctx) => [
  ...adminTrail(ctx),
  { text: 'Entités', to: '/admin/entites', search: ctx.listStates.entites?.search },
];

const editEntiteTrail: Trail = (ctx) => [
  ...entitesTrail(ctx),
  { text: 'Modifier l’entité', to: `/admin/entites/${ctx.params.entiteId}` },
];

const localEntiteTrail: Trail = (ctx) => [...adminTrail(ctx), { text: 'Entités', to: '/admin/entite' }];

const directionsServicesTrail: Trail = (ctx) => [
  ...adminTrail(ctx),
  { text: 'Directions et services', to: '/admin/directions-services' },
];

const publicTrail =
  (text: string, to: string): Trail =>
  () => [
    { text: 'Accueil', to: '/' },
    { text, to },
  ];

const page =
  (parent: Trail, text: string, to: string | ((ctx: BreadCrumbContext) => string)): Trail =>
  (ctx) => [...parent(ctx), { text, to: typeof to === 'function' ? to(ctx) : to }];

// Trails follow the site hierarchy, never the navigation history. Routes absent from
// this map (login, home, inactive account) have no breadcrumb.
const trails: Partial<Record<keyof FileRoutesById, Trail>> = {
  '/_auth/_user/request/create/': createRequestTrail,
  '/_auth/_user/request/create/declarant': page(createRequestTrail, 'Déclarant', '/request/create/declarant'),
  '/_auth/_user/request/create/personne-concernee': page(
    createRequestTrail,
    'Personne concernée',
    '/request/create/personne-concernee',
  ),
  '/_auth/_user/request/create/situation': page(createRequestTrail, SITUATION_LABEL, '/request/create/situation'),

  // Details and processing are tabs of the same page
  '/_auth/_user/request/$requestId/': requestTrail,
  '/_auth/_user/request/$requestId/processing': requestTrail,
  '/_auth/_user/request/$requestId/declarant': page(
    requestTrail,
    'Déclarant',
    (ctx) => `/request/${ctx.params.requestId}/declarant`,
  ),
  '/_auth/_user/request/$requestId/personne-concernee': page(
    requestTrail,
    'Personne concernée',
    (ctx) => `/request/${ctx.params.requestId}/personne-concernee`,
  ),
  '/_auth/_user/request/$requestId/situation/': page(
    requestTrail,
    SITUATION_LABEL,
    (ctx) => `/request/${ctx.params.requestId}/situation`,
  ),
  '/_auth/_user/request/$requestId/situation/$situationId': page(
    requestTrail,
    SITUATION_LABEL,
    (ctx) => `/request/${ctx.params.requestId}/situation/${ctx.params.situationId}`,
  ),

  '/_auth/statistiques': page(rootTrail, 'Indicateurs', '/statistiques'),

  // Admin tabs are the home of the admin section: only their sub pages have a breadcrumb
  '/_auth/admin/feature-flags': page(adminTrail, 'Gestion des fonctionnalités', '/admin/feature-flags'),
  '/_auth/admin/user/$userId': page(usersTrail, 'Modifier l’utilisateur', (ctx) => `/admin/user/${ctx.params.userId}`),
  '/_auth/admin/entites/$entiteId/': editEntiteTrail,
  '/_auth/admin/entites/$entiteId/create': page(
    editEntiteTrail,
    'Créer une entité',
    (ctx) => `/admin/entites/${ctx.params.entiteId}/create`,
  ),
  '/_auth/admin/entite/edit': page(localEntiteTrail, 'Modifier l’entité', '/admin/entite/edit'),
  '/_auth/admin/directions-services/directions/create': page(
    directionsServicesTrail,
    'Ajouter une direction',
    '/admin/directions-services/directions/create',
  ),
  '/_auth/admin/directions-services/services/create': page(
    directionsServicesTrail,
    'Ajouter un service',
    '/admin/directions-services/services/create',
  ),
  '/_auth/admin/directions-services/$entiteId/edit': page(
    directionsServicesTrail,
    'Modifier',
    (ctx) => `/admin/directions-services/${ctx.params.entiteId}/edit`,
  ),

  '/_public/accessibilite': publicTrail('Accessibilité', '/accessibilite'),
  '/_public/mentions-legales': publicTrail('Mentions légales', '/mentions-legales'),
  '/_public/donnees-personnelles': publicTrail('Données personnelles', '/donnees-personnelles'),
  '/_public/gestion-cookies': publicTrail('Gestion des cookies', '/gestion-cookies'),
};

export function getBreadCrumbItems(routeId: string, ctx: BreadCrumbContext): BreadCrumbItem[] | null {
  const trail = trails[routeId as keyof FileRoutesById];
  if (!trail) return null;

  const crumbs = trail(ctx);
  return crumbs.map((crumb, index) => ({ ...crumb, current: index === crumbs.length - 1 }));
}
