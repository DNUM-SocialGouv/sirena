import { useLocation } from '@tanstack/react-router';
import { type ReactNode, useEffect, useRef } from 'react';
import { AppFooter } from './footer';
import { HeaderMenu } from './header';

type GlobalLayoutProps = {
  children: ReactNode;
};

export const GlobalLayout = ({ children }: GlobalLayoutProps) => {
  const skipLinkRef = useRef<HTMLAnchorElement>(null);
  const mainId = 'main';
  const { pathname } = useLocation();

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
        {/** biome-ignore lint/a11y/useSemanticElements: keep explicit landmark role for alignment with DSFR audit rules */}
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
      <HeaderMenu homeHref="/" />
      {/** biome-ignore lint/a11y/useSemanticElements: keep explicit landmark role for alignment with DSFR audit rules */}
      <main id={mainId} role="main" className="fr-container main-content">
        {children}
      </main>
      <AppFooter />
    </div>
  );
};
