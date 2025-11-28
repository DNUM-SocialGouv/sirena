import { fr } from '@codegouvfr/react-dsfr';
import { Tag } from '@codegouvfr/react-dsfr/Tag';
import type { EntiteType, RequeteEtapeStatutType } from '@sirena/common/constants';
import style from './EntiteTag.module.css';
import { RequeteEtapeStatutTag } from './RequeteStatutTag';

type EntiteTagProps = {
  label: string;
  entiteTypeId: EntiteType;
  statut?: RequeteEtapeStatutType;
};

export const EntiteTag = ({ entiteTypeId, label, statut }: EntiteTagProps) => {
  return (
    <div className={style['entiteTag-container']}>
      <div>
        <Tag className={style[`entiteTag-${entiteTypeId.toLowerCase()}`]}>{entiteTypeId}</Tag>
      </div>
      <div className={fr.cx('fr-ml-2w')}>
        <div className={style['entiteTag-text']}>{label}</div>
        {statut && (
          <div>
            Statut de la requête:
            <div className={fr.cx('fr-mt-1w')}>
              <RequeteEtapeStatutTag statut={statut} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
