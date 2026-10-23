import { ROLES } from '@sirena/common/constants';
import { describe, expect, it } from 'vitest';
import { type BreadCrumbContext, getBreadCrumbItems, ROUTES_WITHOUT_BREADCRUMB } from './breadcrumbConfig';

const writer: BreadCrumbContext = { params: {}, role: ROLES.WRITER, listStates: {} };
const superAdmin: BreadCrumbContext = { params: {}, role: ROLES.SUPER_ADMIN, listStates: {} };
const entityAdmin: BreadCrumbContext = { params: {}, role: ROLES.ENTITY_ADMIN, listStates: {} };

const texts = (routeId: string, ctx: BreadCrumbContext) => getBreadCrumbItems(routeId, ctx)?.map((item) => item.text);

describe('getBreadCrumbItems', () => {
  it('has no breadcrumb on the routes left out of the site hierarchy', () => {
    for (const routeId of ROUTES_WITHOUT_BREADCRUMB) {
      expect(getBreadCrumbItems(routeId, writer)).toBeNull();
      expect(getBreadCrumbItems(routeId, superAdmin)).toBeNull();
    }
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
    expect(items?.[2]).toMatchObject({ text: 'Description de la situation', current: true });
  });

  it('roots the statistics page on the home page of the role', () => {
    expect(texts('/_auth/statistiques', writer)).toEqual(['Liste des requêtes', 'Indicateurs']);
    expect(texts('/_auth/statistiques', superAdmin)).toEqual(['Espace administrateur', 'Indicateurs']);
  });

  it('shows each admin tab as the current page of the admin section, for every role', () => {
    for (const ctx of [entityAdmin, superAdmin]) {
      expect(getBreadCrumbItems('/_auth/admin/users/', ctx)).toEqual([
        { text: 'Espace administrateur', to: '/admin', current: false },
        { text: "Demandes d'habilitation", to: '/admin/users', current: true },
      ]);
      expect(texts('/_auth/admin/users/all', ctx)).toEqual(['Espace administrateur', 'Utilisateurs']);
      expect(texts('/_auth/admin/entites/', ctx)).toEqual(['Espace administrateur', 'Entités']);
      expect(texts('/_auth/admin/entite/', ctx)).toEqual(['Espace administrateur', 'Entité']);
      expect(texts('/_auth/admin/directions-services/', ctx)).toEqual([
        'Espace administrateur',
        'Directions et services',
      ]);
      expect(texts('/_auth/admin/sirec-migration', ctx)).toEqual(['Espace administrateur', 'Migration SIREC']);
    }
  });

  it('roots the admin sub pages on the admin section for every role', () => {
    const expected = ['Espace administrateur', 'Directions et services', 'Ajouter un service'];

    expect(texts('/_auth/admin/directions-services/services/create', entityAdmin)).toEqual(expected);
    expect(texts('/_auth/admin/directions-services/services/create', superAdmin)).toEqual(expected);
  });

  it('names the entity tab in the singular for a root-level entity admin', () => {
    expect(texts('/_auth/admin/entite/edit', entityAdmin)).toEqual([
      'Espace administrateur',
      'Entité',
      'Modifier l’entité',
    ]);
  });

  it('nests entity creation under the edited entity', () => {
    const items = getBreadCrumbItems('/_auth/admin/entites/$entiteId/create', {
      ...superAdmin,
      params: { entiteId: 'e1' },
      listStates: { entites: { to: '/admin/entites', search: { offset: 30 } } },
    });

    expect(items).toEqual([
      { text: 'Espace administrateur', to: '/admin', current: false },
      { text: 'Entités', to: '/admin/entites', search: { offset: 30 }, current: false },
      { text: 'Modifier l’entité', to: '/admin/entites/e1', current: false },
      { text: 'Créer une entité', to: '/admin/entites/e1/create', current: true },
    ]);
  });

  it('leads a user page back to the users tab it was opened from, with its filters', () => {
    const ctx = { ...superAdmin, params: { userId: 'u1' } };
    const fromPending = getBreadCrumbItems('/_auth/admin/user/$userId', {
      ...ctx,
      listStates: { users: { to: '/admin/users', search: { offset: 20, search: 'Dupont' } } },
    });
    const fromAll = getBreadCrumbItems('/_auth/admin/user/$userId', {
      ...ctx,
      listStates: { users: { to: '/admin/users/all', search: { offset: 20 } } },
    });

    expect(fromPending?.[1]).toEqual({
      text: "Demandes d'habilitation",
      to: '/admin/users',
      search: { offset: 20, search: 'Dupont' },
      current: false,
    });
    expect(fromAll?.[1]).toEqual({
      text: 'Utilisateurs',
      to: '/admin/users/all',
      search: { offset: 20 },
      current: false,
    });
  });

  it('when no list is remembered, leads a user page back to the users tab inferred from its role', () => {
    const ctx = { ...superAdmin, params: { userId: 'u1' } };
    const pending = getBreadCrumbItems('/_auth/admin/user/$userId', { ...ctx, editedUserRoleId: ROLES.PENDING });
    const writerUser = getBreadCrumbItems('/_auth/admin/user/$userId', { ...ctx, editedUserRoleId: ROLES.WRITER });

    expect(pending?.[1]).toMatchObject({ text: "Demandes d'habilitation", to: '/admin/users', search: {} });
    expect(writerUser?.[1]).toMatchObject({ text: 'Utilisateurs', to: '/admin/users/all', search: {} });
  });

  it('keeps the terms of use page under the site home and marks it as current', () => {
    expect(getBreadCrumbItems('/_public/conditions-generales-utilisation', writer)).toEqual([
      { text: 'Accueil', to: '/', current: false },
      {
        text: 'Conditions générales d’utilisation',
        to: '/conditions-generales-utilisation',
        current: true,
      },
    ]);
  });

  it('keeps the public pages under the site home', () => {
    expect(texts('/_public/accessibilite', writer)).toEqual(['Accueil', 'Accessibilité']);
  });
});
