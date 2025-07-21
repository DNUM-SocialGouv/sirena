import clsx from 'clsx';
import './Loader.css';

type LoaderSize = 'sm' | 'md' | 'lg';

interface LoaderProps {
  size?: LoaderSize;
  className?: string;
}

export const Loader = ({ size = 'md', className }: LoaderProps) => {
  const sizeClass = typeof size === 'string' ? `loader--${size}` : undefined;

  return (
    <div className={clsx('loader', sizeClass, className)} role="progressbar" aria-live="polite">
      <span className="fr-sr-only">Chargement en cours...</span>
    </div>
  );
};
