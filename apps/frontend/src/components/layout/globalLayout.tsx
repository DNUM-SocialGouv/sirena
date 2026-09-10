import { useLocation } from '@tanstack/react-router';
import { type ReactNode, useEffect, useRef } from 'react';
import { EnvironmentBanner } from './EnvironmentBanner';
import { AppFooter } from './footer';
import { HeaderMenu } from './header';
import { UpdateBanner } from './UpdateBanner';

type GlobalLayoutProps = {
  children: ReactNode;
};

// Pages that use the full-width container (cf. ticket sirena-634).
const WIDE_LAYOUT_PREFIXES = ['/home', '/statistiques', '/admin'];

const isRequestOverview = (pathname: string): boolean => {
  const segments = pathname.split('/').filter(Boolean);
  if (segments[0] !== 'request') return false;
  if (segments.length === 2) return true; // /request/create or /request/<id>
  return segments.length === 3 && segments[2] === 'processing'; // /request/<id>/processing
};

export const GlobalLayout = ({ children }: GlobalLayoutProps) => {
  const skipLinkRef = useRef<HTMLAnchorElement>(null);
  const mainId = 'main';
  const { pathname } = useLocation();

  const isWideLayout =
    WIDE_LAYOUT_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)) ||
    isRequestOverview(pathname);

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
      <main id={mainId} role="main" className="main-content">
        <EnvironmentBanner />
        <UpdateBanner />
        <div className={isWideLayout ? 'fr-container app-container--wide' : 'fr-container'}>{children}</div>
      </main>
      <AppFooter />
    </div>
  );
};
