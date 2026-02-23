// biome-ignore-all lint: lint/a11y/noNoninteractiveTabindex + lint/a11y/useSemanticElements exigé par RGAA
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
    const handleFirstTab = (e: KeyboardEvent) => {
      if (e.key === 'Tab') {
        e.preventDefault();
        skipLinkRef.current?.focus();
        document.removeEventListener('keydown', handleFirstTab);
      }
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
      <HeaderMenu homeHref="/" />
      <main id={mainId} role="main" className="fr-container main-content">
        {children}
      </main>
      <AppFooter />
    </div>
  );
};
