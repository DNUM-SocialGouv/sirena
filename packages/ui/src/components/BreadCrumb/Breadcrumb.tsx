import { Link } from '@tanstack/react-router';

export type BreadCrumbItem = { text: string; to: string; current?: boolean };

export function BreadCrumb({ items }: { items: BreadCrumbItem[] }) {
  return (
    // biome-ignore lint/a11y/useSemanticElements: exigé par RGAA
    <nav role="navigation" className="fr-container fr-breadcrumb" aria-label="Vous êtes ici :">
      <ol className="fr-breadcrumb__list">
        {items.map((item) => (
          <li key={item.to} className="fr-breadcrumb__item">
            <Link to={item.to} className="fr-breadcrumb__link" aria-current={item.current ? 'page' : undefined}>
              {item.text}
            </Link>
          </li>
        ))}
      </ol>
    </nav>
  );
}
