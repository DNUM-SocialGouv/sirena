import { ROLES, type Role } from '@sirena/common/constants';
import { ADMIN_TAB_LABELS } from '@/routes/_auth/admin/-tabs';
import type { FileRoutesById } from '@/routeTree.gen';
import type { ListKey, ListState } from '@/stores/listStateStore';
import { resolveUsersList } from '@/utils/usersList';

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
  // Role of the user shown on the user page, once loaded
  editedUserRoleId?: string;
};

type Crumb = Omit<BreadCrumbItem, 'current'>;
type Trail = (ctx: BreadCrumbContext) => Crumb[];

const requetesRoot = (ctx: BreadCrumbContext): Crumb => ({
  text: 'Liste des requêtes',
  to: '/home',
  search: ctx.listStates.requetes?.search,
});

// Points to the admin index rather than the first tab, so that this crumb never targets the current page
const adminRoot: Crumb = { text: 'Espace administrateur', to: '/admin' };

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

// A user is opened from either admin users tab: lead back to that tab, with its filters
const usersTrail: Trail = (ctx) => {
  const usersList = resolveUsersList(ctx.listStates.users, ctx.editedUserRoleId);
  return [
    ...adminTrail(ctx),
    {
      text: usersList.to === '/admin/users' ? ADMIN_TAB_LABELS.pending : ADMIN_TAB_LABELS.users,
      to: usersList.to,
      search: usersList.search,
    },
  ];
};

const entitesTrail: Trail = (ctx) => [
  ...adminTrail(ctx),
  { text: ADMIN_TAB_LABELS.entites, to: '/admin/entites', search: ctx.listStates.entites?.search },
];

const editEntiteTrail: Trail = (ctx) => [
  ...entitesTrail(ctx),
  { text: 'Modifier l’entité', to: `/admin/entites/${ctx.params.entiteId}` },
];

const localEntiteTrail: Trail = (ctx) => [
  ...adminTrail(ctx),
  { text: ADMIN_TAB_LABELS.localEntite, to: '/admin/entite' },
];

const directionsServicesTrail: Trail = (ctx) => [
  ...adminTrail(ctx),
  { text: ADMIN_TAB_LABELS.directionsServices, to: '/admin/directions-services' },
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

// Every route is arbitrated: either it has a trail below, or it is listed here.
// A new route breaks the build until it is added to one or the other.
export const ROUTES_WITHOUT_BREADCRUMB = [
  // Layouts never render as the leaf route
  '__root__',
  '/_auth',
  '/_auth/_user',
  '/_auth/_user/request/create',
  '/_auth/_user/request/$requestId',
  '/_auth/_user/request/$requestId/situation',
  '/_auth/admin',
  '/_auth/admin/users',
  '/_auth/admin/entite',
  '/_auth/admin/entites/$entiteId',
  '/_public',
  // Home pages and pages outside the site hierarchy
  '/',
  '/login',
  '/_auth/inactive',
  '/_auth/_user/home',
  '/_auth/admin/', // redirects to the users tab
] as const satisfies readonly (keyof FileRoutesById)[];

type RouteWithBreadcrumb = Exclude<keyof FileRoutesById, (typeof ROUTES_WITHOUT_BREADCRUMB)[number]>;

// Trails follow the site hierarchy, never the navigation history
const trails: Record<RouteWithBreadcrumb, Trail> = {
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

  // Each admin tab has its own URL: the tab is the current page of the admin section
  '/_auth/admin/users/': page(adminTrail, ADMIN_TAB_LABELS.pending, '/admin/users'),
  '/_auth/admin/users/all': page(adminTrail, ADMIN_TAB_LABELS.users, '/admin/users/all'),
  '/_auth/admin/entites/': page(adminTrail, ADMIN_TAB_LABELS.entites, '/admin/entites'),
  '/_auth/admin/entite/': page(adminTrail, ADMIN_TAB_LABELS.localEntite, '/admin/entite'),
  '/_auth/admin/directions-services/': page(
    adminTrail,
    ADMIN_TAB_LABELS.directionsServices,
    '/admin/directions-services',
  ),
  '/_auth/admin/sirec-migration': page(adminTrail, ADMIN_TAB_LABELS.sirecMigration, '/admin/sirec-migration'),
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
  const trail: Trail | undefined = trails[routeId as RouteWithBreadcrumb];
  if (!trail) return null;

  const crumbs = trail(ctx);
  return crumbs.map((crumb, index) => ({ ...crumb, current: index === crumbs.length - 1 }));
}
