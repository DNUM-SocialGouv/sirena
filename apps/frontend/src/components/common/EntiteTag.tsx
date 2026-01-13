import { fr } from '@codegouvfr/react-dsfr';
import { Tag } from '@codegouvfr/react-dsfr/Tag';
import type { EntiteType, RequeteStatutType } from '@sirena/common/constants';
import type { ReactNode } from 'react';
import style from './EntiteTag.module.css';
import { RequeteStatutTag } from './RequeteStatutTag';

type EntiteTagProps = {
  label: string;
  entiteTypeId: EntiteType;
  statut?: RequeteStatutType;
  children?: ReactNode;
};

export const EntiteTag = ({ entiteTypeId, label, statut, children }: EntiteTagProps) => {
  return (
    <div className={style['entiteTag-container']}>
      <div>
        <Tag className={style[`entiteTag-${entiteTypeId.toLowerCase()}`]}>{entiteTypeId}</Tag>
      </div>
      <div className={fr.cx('fr-ml-2w')}>
        <div className={style['entiteTag-text']}>{label}</div>
        {children}
        {statut && (
          <div>
            Statut de la requête:
            <div className={fr.cx('fr-mt-1w')}>
              <RequeteStatutTag statut={statut} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
