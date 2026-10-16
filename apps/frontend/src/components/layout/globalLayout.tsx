import { Breadcrumb } from '@codegouvfr/react-dsfr/Breadcrumb';
import { type LinkProps, useLocation } from '@tanstack/react-router';
import { type ReactNode, useEffect, useRef } from 'react';
import type { BreadCrumbItem } from './breadcrumb/breadcrumbConfig';
import { useAppBreadCrumb } from './breadcrumb/useAppBreadCrumb';
import { EnvironmentBanner } from './EnvironmentBanner';
import { AppFooter } from './footer';
import { HeaderMenu } from './header';
import { UpdateBanner } from './UpdateBanner';

type GlobalLayoutProps = {
  children: ReactNode;
};

const WIDE_LAYOUT_PREFIXES = ['/home', '/statistiques', '/admin'];

const isRequestOverview = (pathname: string): boolean => {
  const segments = pathname.split('/').filter(Boolean);
  if (segments[0] !== 'request') return false;
  if (segments.length === 2) return true; // /request/create or /request/<id>
  return segments.length === 3 && segments[2] === 'processing'; // /request/<id>/processing
};

const getContainerClassName = (pathname: string): string => {
  if (WIDE_LAYOUT_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))) {
    return 'fr-container app-container--wide';
  }
  if (isRequestOverview(pathname)) {
    return 'app-container--flush';
  }
  return 'fr-container';
};

const AppBreadcrumb = ({ items, className }: { items: BreadCrumbItem[]; className: string }) => {
  const current = items.at(-1);
  if (!current) return null;
  return (
    <Breadcrumb
      className={className}
      currentPageLabel={current.text}
      segments={items.slice(0, -1).map((item) => ({
        label: item.text,
        // Trails hold resolved paths, not route templates. Exact matching keeps ancestors from being flagged
        // active (aria-current="page"), which DSFR renders as the non clickable current page.
        linkProps: { to: item.to, search: item.search ?? {}, activeOptions: { exact: true } } as LinkProps,
      }))}
    />
  );
};

const BreadCrumbBar = ({ pathname, items }: { pathname: string; items: BreadCrumbItem[] }) => {
  // On request pages the breadcrumb opens the colored request banner rendered at the top of <main>
  if (isRequestOverview(pathname)) {
    return (
      <div className="bg-cumulus fr-pt-3w">
        <AppBreadcrumb items={items} className="fr-container--fluid fr-pl-7w fr-pr-3w fr-mt-0 app-breadcrumb--banner" />
      </div>
    );
  }
  const className =
    getContainerClassName(pathname) === 'fr-container' ? 'fr-container' : 'fr-container app-container--wide';
  return <AppBreadcrumb items={items} className={`${className} app-breadcrumb`} />;
};

export const GlobalLayout = ({ children }: GlobalLayoutProps) => {
  const skipLinkRef = useRef<HTMLAnchorElement>(null);
  const mainId = 'main';
  const { pathname } = useLocation();

  const containerClassName = getContainerClassName(pathname);
  const breadCrumbItems = useAppBreadCrumb();

  useEffect(() => {
    if (!pathname) return;

    const handleFirstTab = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;
      e.preventDefault();
      skipLinkRef.current?.focus();
      document.removeEventListener('keydown', handleFirstTab);
    };

    document.addEventListener('keydown', handleFirstTab);

    return () => {
      document.removeEventListener('keydown', handleFirstTab);
    };
  }, [pathname]);

  return (
    <div className="layout">
      <div className="fr-skiplinks">
        <nav role="navigation" aria-label="Accès rapide" className="fr-container" lang="fr">
          <ul className="fr-skiplinks__list">
            <li>
              <a className="fr-link" href="#main" ref={skipLinkRef}>
                Contenu principal
              </a>
            </li>
            <li>
              <a className="fr-link" href="#footer">
                Pied de page
              </a>
            </li>
          </ul>
        </nav>
      </div>
      <HeaderMenu homeTo="/" />
      <EnvironmentBanner />
      <UpdateBanner />
      {breadCrumbItems ? <BreadCrumbBar pathname={pathname} items={breadCrumbItems} /> : null}
      <main id={mainId} role="main" className="main-content">
        <div className={containerClassName}>{children}</div>
      </main>
      <AppFooter />
    </div>
  );
};
