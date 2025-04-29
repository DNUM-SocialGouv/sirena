import type { FC } from 'react';

type ButtonProps = {
  label: string;
  onClick?: () => void;
};

export const Button: FC<ButtonProps> = ({ label, onClick }) => {
  return (
    <button type="button" onClick={onClick} className="fr-btn" style={{ padding: '0.5rem 1rem', fontSize: '16px' }}>
      {label}
    </button>
  );
};
