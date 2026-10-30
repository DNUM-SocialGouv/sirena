import { fr } from '@codegouvfr/react-dsfr';
import { type ReactNode, useEffect, useRef } from 'react';

type DocumentExportMessageProps = {
  title: string;
  lead: ReactNode;
  children?: ReactNode;
  picto: ReactNode;
  actions: ReactNode;
};

/**
 * Layout of the pages a download link leads to, on the model of the 404 page. The title takes the
 * focus when it appears, so a screen reader announces the outcome of the link it was opened from.
 */
export const DocumentExportMessage = ({ title, lead, children, picto, actions }: DocumentExportMessageProps) => {
  const titleRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    titleRef.current?.focus();
  }, []);

  return (
    <div
      className={fr.cx(
        'fr-my-7w',
        'fr-mt-md-12w',
        'fr-mb-md-10w',
        'fr-grid-row',
        'fr-grid-row--gutters',
        'fr-grid-row--middle',
        'fr-grid-row--center',
      )}
    >
      <div className={fr.cx('fr-py-0', 'fr-col-12', 'fr-col-md-6')}>
        <h1 ref={titleRef} tabIndex={-1}>
          {title}
        </h1>
        <p className={fr.cx('fr-text--lead', 'fr-mb-3w')}>{lead}</p>
        {children}
        {/* --icon-left lets a button keep its label next to its icon inside the group. */}
        <ul className={fr.cx('fr-btns-group', 'fr-btns-group--inline-md', 'fr-btns-group--icon-left', 'fr-mt-5w')}>
          {actions}
        </ul>
      </div>
      <div className={fr.cx('fr-col-12', 'fr-col-md-3', 'fr-col-offset-md-1', 'fr-px-6w', 'fr-px-md-0', 'fr-py-0')}>
        {picto}
      </div>
    </div>
  );
};
