import './loader.css';
export const Loader = () => {
  return (
    <div className="loader" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={50}>
      <div className="fr-sr-only" role="alert">
        chargement en cours
      </div>
    </div>
  );
};
