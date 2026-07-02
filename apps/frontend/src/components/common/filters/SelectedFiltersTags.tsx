import { Button } from '@codegouvfr/react-dsfr/Button';
import { Tag } from '@codegouvfr/react-dsfr/Tag';
import { domainesFonctionnelsLabels, requetePrioriteType, requeteStatutType } from '@sirena/common/constants';
import { useNavigate, useSearch } from '@tanstack/react-router';
import { type RefObject, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useProfile } from '@/hooks/queries/profile.hook';
import type { QueryParams } from '@/types/pagination.type';
import { splitCsv } from '@/utils/filters';
import { getAffectationQuickFilterConfig } from '../tables/requetesEntites.filters.model';
import styles from './SelectedFiltersTags.module.css';

const statutLabels = requeteStatutType as Record<string, string | undefined>;
const domaineLabels = domainesFonctionnelsLabels as Record<string, string | undefined>;
const prioriteLabels = requetePrioriteType as Record<string, string | undefined>;

/** URL params of type `string | undefined` — the only ones this component removes. */
type StringFilterCategory = {
  [K in keyof QueryParams]-?: NonNullable<QueryParams[K]> extends string ? K : never;
}[keyof QueryParams];

type FilterCategory = Extract<
  'search' | 'entiteId' | 'prioriteId' | 'statutIds' | 'departementCodes' | 'domaineIds',
  StringFilterCategory
>;

export type FilterTag = {
  key: string;
  label: string;
  /** The URL param this tag belongs to; removing the tag clears it entirely. */
  category: FilterCategory;
};

type ActiveFilterTagsContext = {
  departementLabels: Record<string, string>;
  affectation: { isChecked: boolean; label: string };
};

/** A comma-separated (OR) filter collapses into a single tag listing every selected value. */
const collapsedLabel = (values: string[], labels: Record<string, string | undefined>): string =>
  values.map((value) => labels[value] ?? value).join(', ');

export function getActiveFilterTags(queries: QueryParams, context: ActiveFilterTagsContext): FilterTag[] {
  const { departementLabels, affectation } = context;
  const tags: FilterTag[] = [];

  if (queries.search) {
    tags.push({ key: 'search', label: `Recherche : « ${queries.search} »`, category: 'search' });
  }

  if (affectation.isChecked) {
    tags.push({ key: 'entiteId', label: affectation.label, category: 'entiteId' });
  }

  if (queries.prioriteId) {
    tags.push({
      key: 'prioriteId',
      label: `Priorité : ${prioriteLabels[queries.prioriteId] ?? queries.prioriteId}`,
      category: 'prioriteId',
    });
  }

  const statutIds = splitCsv(queries.statutIds);
  if (statutIds.length > 0) {
    tags.push({
      key: 'statutIds',
      label: `Statut : ${collapsedLabel(statutIds, statutLabels)}`,
      category: 'statutIds',
    });
  }

  const departementCodes = splitCsv(queries.departementCodes);
  if (departementCodes.length > 0) {
    tags.push({
      key: 'departementCodes',
      label: `Département : ${collapsedLabel(departementCodes, departementLabels)}`,
      category: 'departementCodes',
    });
  }

  const domaineIds = splitCsv(queries.domaineIds);
  if (domaineIds.length > 0) {
    tags.push({
      key: 'domaineIds',
      label: `Domaine : ${collapsedLabel(domaineIds, domaineLabels)}`,
      category: 'domaineIds',
    });
  }

  return tags;
}

type Props = {
  /** Focused when the tags row unmounts (last tag removed / clear-all), to avoid losing focus. */
  fallbackFocusRef?: RefObject<HTMLElement | null>;
};

export function SelectedFiltersTags({ fallbackFocusRef }: Props) {
  const queries = useSearch({ from: '/_auth/_user/home' });
  const navigate = useNavigate({ from: '/home' });
  const { data: profile } = useProfile();

  const listRef = useRef<HTMLUListElement>(null);
  const clearAllRef = useRef<HTMLButtonElement>(null);
  const pendingFocusIndexRef = useRef<number | null>(null);
  const [statusMessage, setStatusMessage] = useState('');

  const departementLabels = useMemo(() => {
    const map: Record<string, string> = {};
    for (const departement of profile?.topEntiteDepartements ?? []) {
      map[departement.code] = departement.label;
    }
    return map;
  }, [profile?.topEntiteDepartements]);

  const affectation = useMemo(() => getAffectationQuickFilterConfig(profile ?? null, queries), [profile, queries]);

  const tags = useMemo(
    () => getActiveFilterTags(queries, { departementLabels, affectation }),
    [queries, departementLabels, affectation],
  );
  const tagCount = tags.length;

  // Focus the next remaining tag (or the clear-all button) after a middle-of-list removal re-renders.
  useEffect(() => {
    if (pendingFocusIndexRef.current === null) return;
    const index = pendingFocusIndexRef.current;
    pendingFocusIndexRef.current = null;
    if (tagCount === 0) {
      clearAllRef.current?.focus();
      return;
    }
    const buttons = listRef.current?.querySelectorAll<HTMLButtonElement>('button');
    buttons?.[Math.min(index, tagCount - 1)]?.focus();
  }, [tagCount]);

  const focusFallback = useCallback(() => {
    fallbackFocusRef?.current?.focus();
  }, [fallbackFocusRef]);

  const removeTag = useCallback(
    (tag: FilterTag, index: number) => {
      // Removing the last tag unmounts the whole row: move focus to a persistent control first.
      if (tagCount <= 1) {
        focusFallback();
      } else {
        pendingFocusIndexRef.current = index;
      }
      setStatusMessage(`Filtre « ${tag.label} » retiré.`);
      navigate({
        search: (prev) => ({
          ...prev,
          [tag.category]: undefined,
          offset: undefined,
        }),
      });
    },
    [navigate, tagCount, focusFallback],
  );

  const clearAll = useCallback(() => {
    focusFallback();
    setStatusMessage('Tous les filtres ont été retirés.');
    navigate({
      search: (prev) => ({
        ...prev,
        search: undefined,
        entiteId: undefined,
        prioriteId: undefined,
        statutIds: undefined,
        departementCodes: undefined,
        domaineIds: undefined,
        offset: undefined,
      }),
    });
  }, [navigate, focusFallback]);

  return (
    <>
      {/* Persistent live region: stays mounted even when the row is empty so "Effacer les filtres" is announced. */}
      <p role="status" className="fr-sr-only">
        {statusMessage}
      </p>
      {tagCount > 0 && (
        <fieldset className={styles.selectedFilters}>
          <legend className="fr-sr-only">Filtres actifs</legend>
          <span className={`fr-text--regular ${styles.label}`} aria-hidden="true">
            Filtres actifs
          </span>
          <ul ref={listRef} className="fr-tags-group">
            {tags.map((tag, index) => (
              <li key={tag.key}>
                <Tag
                  as="button"
                  iconId="fr-icon-close-line"
                  onClick={() => removeTag(tag, index)}
                  nativeButtonProps={{ 'aria-label': `${tag.label}, retirer le filtre` }}
                >
                  {tag.label}
                </Tag>
              </li>
            ))}
          </ul>
          <Button
            ref={clearAllRef}
            type="button"
            priority="tertiary no outline"
            size="small"
            iconId="fr-icon-close-line"
            onClick={clearAll}
          >
            Effacer les filtres
          </Button>
        </fieldset>
      )}
    </>
  );
}
