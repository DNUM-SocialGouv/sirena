import { memo, useEffect } from 'react';
import { useEntiteChain } from '@/hooks/queries/entites.hook';
import { useEntityLevels } from '@/hooks/useEntitiesLevel';
import { EntityLevelSelect } from './entityLevelSelect';

type EntityHierarchySelectorProps = {
  id: string | null;
  setLevel: (level: string) => void;
};

export function EntityHierarchySelectorComponent({ id, setLevel }: EntityHierarchySelectorProps) {
  const { data: chain } = useEntiteChain(id === null ? '' : id);

  const { level1, level2, level3, setLevel1, setLevel2, setLevel3, setLevels } = useEntityLevels(setLevel);

  useEffect(() => {
    if (chain) {
      setLevels(chain[0]?.id || '', chain[1]?.id || '', chain[2]?.id || '');
    }
  }, [chain, setLevels]);

  return (
    <>
      <fieldset className="fr-fieldset">
        <legend className="fr-fieldset__legend">Paramètres de profil de l'utilisateur</legend>
        <EntityLevelSelect
          level={level1}
          parentLevel={undefined}
          setLevel={setLevel1}
          disabled={chain?.[0]?.disabled}
          name="entite-administrative"
          label="Entité administrative"
          nullPlaceholder="Pas d'entité administrative sélectionnée"
        />
      </fieldset>
      {level1 && (
        <fieldset className="fr-fieldset">
          <EntityLevelSelect
            level={level2}
            parentLevel={level1}
            setLevel={setLevel2}
            disabled={chain?.[1]?.disabled}
            name="direction"
            label="Direction"
            nullPlaceholder="Pas de service direction sélectionnée"
          />
        </fieldset>
      )}
      {level2 && (
        <fieldset className="fr-fieldset">
          <EntityLevelSelect
            level={level3}
            parentLevel={level2}
            setLevel={setLevel3}
            disabled={chain?.[2]?.disabled}
            name="service"
            label="Service"
            nullPlaceholder="Pas de service sélectionnée"
          />
        </fieldset>
      )}
    </>
  );
}

export const EntityHierarchySelector = memo(EntityHierarchySelectorComponent);
