import { ROLES } from '@sirena/common/constants';
import { describe, expect, it } from 'vitest';
import { type BreadCrumbContext, getBreadCrumbItems } from './breadcrumbConfig';

const writer: BreadCrumbContext = { params: {}, role: ROLES.WRITER, listStates: {} };
const superAdmin: BreadCrumbContext = { params: {}, role: ROLES.SUPER_ADMIN, listStates: {} };
const entityAdmin: BreadCrumbContext = { params: {}, role: ROLES.ENTITY_ADMIN, listStates: {} };

const texts = (routeId: string, ctx: BreadCrumbContext) => getBreadCrumbItems(routeId, ctx)?.map((item) => item.text);

describe('getBreadCrumbItems', () => {
  it('has no breadcrumb on the home pages', () => {
    expect(getBreadCrumbItems('/', writer)).toBeNull();
    expect(getBreadCrumbItems('/_auth/_user/home', writer)).toBeNull();
    expect(getBreadCrumbItems('/_auth/inactive', writer)).toBeNull();
    expect(getBreadCrumbItems('/_auth/admin/users/', superAdmin)).toBeNull();
  });

  it('follows the request creation hierarchy', () => {
    const items = getBreadCrumbItems('/_auth/_user/request/create/declarant', writer);

    expect(items).toEqual([
      { text: 'Liste des requêtes', to: '/home', search: undefined, current: false },
      { text: 'Nouvelle requête', to: '/request/create', current: false },
      { text: 'Déclarant', to: '/request/create/declarant', current: true },
    ]);
  });

  it('restores the remembered request list search on the root crumb', () => {
    const search = { offset: 20 };
    const items = getBreadCrumbItems('/_auth/_user/request/create/', {
      ...writer,
      listStates: { requetes: { to: '/home', search } },
    });

    expect(items?.[0]).toMatchObject({ to: '/home', search });
  });

  it('shows the same trail on both tabs of a request', () => {
    const ctx = { ...writer, params: { requestId: 'RA-42' } };

    expect(texts('/_auth/_user/request/$requestId/', ctx)).toEqual(['Liste des requêtes', 'Requête RA-42']);
    expect(texts('/_auth/_user/request/$requestId/processing', ctx)).toEqual(['Liste des requêtes', 'Requête RA-42']);
  });

  it('links the edited request as parent of its sub pages', () => {
    const items = getBreadCrumbItems('/_auth/_user/request/$requestId/situation/$situationId', {
      ...writer,
      params: { requestId: 'RA-42', situationId: 's1' },
    });

    expect(items?.[1]).toEqual({ text: 'Requête RA-42', to: '/request/RA-42', current: false });
    expect(items?.[2]).toMatchObject({ text: 'Situation', current: true });
  });

  it('roots the statistics page on the home page of the role', () => {
    expect(texts('/_auth/statistiques', writer)).toEqual(['Liste des requêtes', 'Indicateurs']);
    expect(texts('/_auth/statistiques', superAdmin)).toEqual(['Espace administrateur', 'Indicateurs']);
  });

  it('treats the admin tabs as the home of a standalone admin section', () => {
    for (const routeId of [
      '/_auth/admin/users/',
      '/_auth/admin/users/all',
      '/_auth/admin/entites/',
      '/_auth/admin/entite/',
      '/_auth/admin/directions-services/',
      '/_auth/admin/sirec-migration',
    ]) {
      expect(getBreadCrumbItems(routeId, entityAdmin)).toBeNull();
      expect(getBreadCrumbItems(routeId, superAdmin)).toBeNull();
    }
  });

  it('roots the admin sub pages on the admin section for every role', () => {
    const expected = ['Espace administrateur', 'Directions et services', 'Ajouter un service'];

    expect(texts('/_auth/admin/directions-services/services/create', entityAdmin)).toEqual(expected);
    expect(texts('/_auth/admin/directions-services/services/create', superAdmin)).toEqual(expected);
  });

  it('nests entity creation under the edited entity', () => {
    const items = getBreadCrumbItems('/_auth/admin/entites/$entiteId/create', {
      ...superAdmin,
      params: { entiteId: 'e1' },
      listStates: { entites: { to: '/admin/entites', search: { offset: 30 } } },
    });

    expect(items).toEqual([
      { text: 'Espace administrateur', to: '/admin/users', current: false },
      { text: 'Entités', to: '/admin/entites', search: { offset: 30 }, current: false },
      { text: 'Modifier l’entité', to: '/admin/entites/e1', current: false },
      { text: 'Créer une entité', to: '/admin/entites/e1/create', current: true },
    ]);
  });

  it('only restores the users list search when it comes from the users tab', () => {
    const ctx = { ...superAdmin, params: { userId: 'u1' } };
    const fromPending = getBreadCrumbItems('/_auth/admin/user/$userId', {
      ...ctx,
      listStates: { users: { to: '/admin/users', search: { offset: 20 } } },
    });
    const fromAll = getBreadCrumbItems('/_auth/admin/user/$userId', {
      ...ctx,
      listStates: { users: { to: '/admin/users/all', search: { offset: 20 } } },
    });

    expect(fromPending?.[1]).toMatchObject({ text: 'Utilisateurs', to: '/admin/users/all', search: undefined });
    expect(fromAll?.[1]).toMatchObject({ search: { offset: 20 } });
  });

  it('keeps the public pages under the site home', () => {
    expect(texts('/_public/accessibilite', writer)).toEqual(['Accueil', 'Accessibilité']);
  });
});
