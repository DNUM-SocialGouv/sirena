import './loader.css';
export const Loader = () => {
  return (
    // biome-ignore lint/a11y/useFocusableInteractive: false positive (progress + progressbar are not focusable interactives)
    <div className="loader" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={50}>
      <div className="fr-sr-only" role="alert">
        chargement en cours
      </div>
    </div>
  );
};
