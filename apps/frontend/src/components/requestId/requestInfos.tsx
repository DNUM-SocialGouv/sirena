import { Checkbox } from '@codegouvfr/react-dsfr/Checkbox';
import type { RequetePrioriteType } from '@sirena/common/constants';
import { REQUETE_STATUT_TYPES } from '@sirena/common/constants';
import { useUpdatePriorite } from '@/hooks/mutations/updatePriorite.hook';
import { useUpdateStatut } from '@/hooks/mutations/updateStatut.hook';
import { useProfile } from '@/hooks/queries/profile.hook';
import { useCanEdit } from '@/hooks/useCanEdit';
import { PrioriteMenu } from '../common/PrioriteMenu';
import { RequeteStatutTag } from '../common/RequeteStatutTag';
import style from './requestInfos.module.css';
import { ContactInfo } from './sections/helpers';

interface RequestInfosProps {
  requestId?: string;
  fullName: string | null;
  motifs: string[];
  statutId: string;
  prioriteId?: string | null;
}

export const RequestInfos = ({ requestId, fullName, motifs, statutId, prioriteId }: RequestInfosProps) => {
  const updatePrioriteMutation = useUpdatePriorite(requestId || '');
  const updateStatutMutation = useUpdateStatut(requestId || '');
  const { canEdit } = useCanEdit({ requeteId: requestId });
  const { data: profile } = useProfile();

  const topEntiteIsActive = profile?.topEntiteIsActive ?? false;
  const showPriseEnCompteToggle = Boolean(requestId) && !canEdit && topEntiteIsActive === false;

  const handlePrioriteChange = async (value: string | null) => {
    if (requestId) {
      await updatePrioriteMutation.mutateAsync({
        prioriteId: value as RequetePrioriteType | null,
      });
    }
  };

  const handlePriseEnCompteChange = async (checked: boolean) => {
    if (!requestId) return;
    await updateStatutMutation.mutateAsync({
      statutId: checked ? REQUETE_STATUT_TYPES.TRAITEE : REQUETE_STATUT_TYPES.NOUVEAU,
    });
  };

  return (
    <div className="fr-grid-row fr-grid-row--gutters">
      <div className="fr-col">
        <div className="fr-grid-row fr-grid-row--gutters fr-grid-row--middle">
          <div className="fr-col">
            <h1 className="fr-mb-2w">
              {requestId ? (
                <>
                  <div className={style['request-title']}>
                    <span>Requête {requestId}</span>
                    <RequeteStatutTag className={style['requete-statut-tag']} statut={statutId} noIcon />
                  </div>
                  {showPriseEnCompteToggle && (
                    <div className={`${style['toggle-line']} fr-text--md`}>
                      <Checkbox
                        options={[
                          {
                            label: 'Cette requête a été prise en compte',
                            nativeInputProps: {
                              checked: statutId === REQUETE_STATUT_TYPES.TRAITEE,
                              onChange: (e) => handlePriseEnCompteChange(e.target.checked),
                              disabled: updateStatutMutation.isPending,
                            },
                          },
                        ]}
                      />
                    </div>
                  )}
                </>
              ) : (
                'Nouvelle requête'
              )}
            </h1>
          </div>
          {requestId && (
            <div className={`fr-col-auto ${style['priorite-menu-wrapper']}`}>
              <PrioriteMenu
                value={prioriteId || null}
                onPrioriteClick={handlePrioriteChange}
                isLoading={updatePrioriteMutation.isPending}
                disabled={!requestId || updatePrioriteMutation.isPending}
              />
            </div>
          )}
        </div>
        {fullName && (
          <div className={style['legend-display']}>
            <ContactInfo icon="fr-icon-user-line" ariaLabel="Identité - personne concernée">
              {fullName}
            </ContactInfo>
          </div>
        )}
        {motifs.length > 0 && (
          <div className={style['legend-display']}>
            {motifs.map((motif) => (
              <ContactInfo key={motif} icon="fr-icon-todo-line" ariaLabel="Motif de la requête">
                {motif}
              </ContactInfo>
            ))}
          </div>
        )}
        {!requestId && (
          <p className="fr-text--sm fr-mb-0">La requête sera créée lorsqu'au moins une donnée sera renseignée</p>
        )}
      </div>
    </div>
  );
};
