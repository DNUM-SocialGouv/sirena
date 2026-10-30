import type { BreadcrumbProps } from '@codegouvfr/react-dsfr/Breadcrumb';
import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GlobalLayout } from './globalLayout';

const mockUseAppBreadCrumb = vi.fn();
let mockPathname = '/request/create/declarant';
const { breadcrumbProps } = vi.hoisted(() => ({ breadcrumbProps: vi.fn() }));

vi.mock('@codegouvfr/react-dsfr/Breadcrumb', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@codegouvfr/react-dsfr/Breadcrumb')>();
  return {
    ...actual,
    Breadcrumb: (props: BreadcrumbProps) => {
      breadcrumbProps(props);
      return <actual.Breadcrumb {...props} />;
    },
  };
});

vi.mock('@tanstack/react-router', () => ({
  useLocation: () => ({ pathname: mockPathname }),
  Link: ({ to, children, search: _search, ...props }: { to: string; search?: unknown; children: ReactNode }) => (
    <a href={to} {...props}>
      {children}
    </a>
  ),
}));

vi.mock('./breadcrumb/useAppBreadCrumb', () => ({
  useAppBreadCrumb: () => mockUseAppBreadCrumb(),
}));

vi.mock('./header', () => ({ HeaderMenu: () => <header>Header</header> }));
vi.mock('./footer', () => ({ AppFooter: () => <footer>Footer</footer> }));
vi.mock('./EnvironmentBanner', () => ({ EnvironmentBanner: () => null }));
vi.mock('./UpdateBanner', () => ({ UpdateBanner: () => null }));
vi.mock('./WarningBanner', () => ({ WarningBanner: () => null }));

describe('GlobalLayout breadcrumb', () => {
  beforeEach(() => {
    mockPathname = '/request/create/declarant';
    mockUseAppBreadCrumb.mockReset();
    breadcrumbProps.mockReset();
  });

  it('renders the breadcrumb between the header and the main content', () => {
    mockUseAppBreadCrumb.mockReturnValue([
      { text: 'Liste des requêtes', to: '/home', current: false },
      { text: 'Déclarant', to: '/request/create/declarant', current: true },
    ]);

    render(<GlobalLayout>Contenu</GlobalLayout>);

    const breadcrumb = screen.getByRole('navigation', { name: 'vous êtes ici :' });
    const main = screen.getByRole('main');
    expect(main).not.toContainElement(breadcrumb);
    expect(breadcrumb.compareDocumentPosition(main) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('never flags an ancestor as the current page', () => {
    // /request/RA-1 is a prefix of the current URL: a default router link would be active, hence not clickable
    mockUseAppBreadCrumb.mockReturnValue([
      { text: 'Liste des requêtes', to: '/home', search: { offset: 10 }, current: false },
      { text: 'Requête RA-1', to: '/request/RA-1', current: false },
      { text: 'Déclarant', to: '/request/RA-1/declarant', current: true },
    ]);

    render(<GlobalLayout>Contenu</GlobalLayout>);

    const { segments, currentPageLabel } = breadcrumbProps.mock.calls[0][0] as BreadcrumbProps;
    expect(currentPageLabel).toBe('Déclarant');
    expect(segments.map((segment) => segment.linkProps)).toEqual([
      { to: '/home', search: { offset: 10 }, activeOptions: { exact: true } },
      { to: '/request/RA-1', search: {}, activeOptions: { exact: true } },
    ]);
  });

  it('renders no breadcrumb when the page has none', () => {
    mockUseAppBreadCrumb.mockReturnValue(null);

    render(<GlobalLayout>Contenu</GlobalLayout>);

    expect(screen.queryByRole('navigation', { name: 'vous êtes ici :' })).not.toBeInTheDocument();
  });

  it('does not clip the focus ring of the request banner breadcrumb', () => {
    mockPathname = '/request/RA-1';
    mockUseAppBreadCrumb.mockReturnValue([
      { text: 'Liste des requêtes', to: '/home', current: false },
      { text: 'Requête RA-1', to: '/request/RA-1', current: true },
    ]);

    render(<GlobalLayout>Contenu</GlobalLayout>);

    // fr-container--fluid sets overflow: hidden, which crops the focus ring of the first link
    const clipping = ['fr-container--fluid'];
    for (
      let node: HTMLElement | null = screen.getByRole('navigation', { name: 'vous êtes ici :' });
      node;
      node = node.parentElement
    ) {
      expect(clipping.filter((className) => node?.classList.contains(className))).toEqual([]);
    }
  });

  it('lines up the request sub pages with the full width header', () => {
    mockPathname = '/request/RA-1/declarant';
    mockUseAppBreadCrumb.mockReturnValue([
      { text: 'Liste des requêtes', to: '/home', current: false },
      { text: 'Requête RA-1', to: '/request/RA-1', current: false },
      { text: 'Déclarant', to: '/request/RA-1/declarant', current: true },
    ]);

    render(<GlobalLayout>Contenu</GlobalLayout>);

    expect(screen.getByRole('navigation', { name: 'vous êtes ici :' })).toHaveClass('app-container--wide');
    expect(screen.getByText('Contenu')).toHaveClass('app-container--wide');
  });
});
