import { fr } from '@codegouvfr/react-dsfr';
import { type CSSProperties, Fragment, type ReactNode, useEffect, useId, useMemo, useRef, useState } from 'react';
import { useDisclosureMenu } from '@/hooks/useDisclosureMenu';
import styles from './DropdownTree.module.css';

export type TreeNode = {
  value: string;
  label: string;
  children?: TreeNode[];
};

export type DropdownTreeLabels = {
  selectAll: (label: string) => string;
  selectAllHint: string;
  optionsLegend: (label: string) => string;
  allSelectedHint: (label: string) => string;
};

const plural = (count: number, one: string, many: string) => `${count} ${count > 1 ? many : one}`;

const childrenOf = (node: TreeNode) => node.children ?? [];

const descendantValues = (node: TreeNode): string[] =>
  childrenOf(node).flatMap((child) => [child.value, ...descendantValues(child)]);

const pathsWithSelectedDescendant = (nodes: TreeNode[], selected: Set<string>): Set<string> => {
  const paths = new Set<string>();

  const visit = (node: TreeNode, path: string): boolean => {
    const hasSelectedBelow = childrenOf(node)
      .map((child, i) => visit(child, `${path}-${i}`))
      .some(Boolean);
    if (hasSelectedBelow) paths.add(path);
    return hasSelectedBelow || selected.has(node.value);
  };

  nodes.forEach((node, i) => {
    visit(node, `${i}`);
  });
  return paths;
};

const ancestorPaths = (path: string) => {
  const parts = path.split('-');
  return parts.map((_, i) => parts.slice(0, i + 1).join('-'));
};

const expansionForSelection = (nodes: TreeNode[], selected: Set<string>) => {
  const paths = [...pathsWithSelectedDescendant(nodes, selected)];
  if (paths.length === 0) return new Set<string>();

  const [firstRoot] = paths.map((path) => path.split('-')[0]).sort();
  const branch = paths.filter((path) => path.startsWith(firstRoot));
  const deepest = branch.reduce((a, b) => (b.split('-').length > a.split('-').length ? b : a));
  return new Set(ancestorPaths(deepest));
};

const collapseFullBranches = (nodes: TreeNode[], values: string[]): string[] => {
  const present = new Set(values);
  const added = new Set<string>();
  const dropped = new Set<string>();

  const isFull = (node: TreeNode): boolean => {
    if (present.has(node.value)) return true;

    const children = childrenOf(node);
    if (children.length === 0) return false;
    if (!children.map(isFull).every(Boolean)) return false;

    added.add(node.value);
    for (const value of descendantValues(node)) dropped.add(value);
    return true;
  };

  nodes.forEach((node) => {
    isFull(node);
  });

  return [...values, ...added].filter((value) => !dropped.has(value));
};

type LevelContext = {
  idPrefix: string;
  selected: Set<string>;
  expanded: Set<string>;
  branchesWithSelection: Set<string>;
  labels: DropdownTreeLabels;
  onToggleValue: (node: TreeNode, ancestors: TreeNode[]) => void;
  onToggleExpanded: (path: string) => void;
};

type NodeProps = LevelContext & {
  node: TreeNode;
  depth: number;
  path: string;
  ancestors: TreeNode[];
  isAncestorSelected: boolean;
};

function Option({ node, depth, path, ancestors, idPrefix, selected, isAncestorSelected, onToggleValue }: NodeProps) {
  const optionId = `${idPrefix}-${path}`;

  return (
    <div
      className={`${styles.option} ${fr.cx('fr-checkbox-group', 'fr-checkbox-group--sm')}`}
      style={{ '--depth': depth } as CSSProperties}
    >
      <input
        type="checkbox"
        id={optionId}
        value={node.value}
        checked={isAncestorSelected || selected.has(node.value)}
        onChange={() => onToggleValue(node, ancestors)}
      />
      <label className={fr.cx('fr-label')} htmlFor={optionId}>
        {node.label}
      </label>
    </div>
  );
}

function Category({
  node,
  depth,
  path,
  ancestors,
  isAncestorSelected,
  idPrefix,
  selected,
  expanded,
  branchesWithSelection,
  labels,
  onToggleValue,
  onToggleExpanded,
}: NodeProps) {
  const allId = `${idPrefix}-${path}-all`;
  const optionsId = `${idPrefix}-${path}-options`;

  const isChecked = isAncestorSelected || selected.has(node.value);
  const isExpanded = expanded.has(path);
  const isMixed = !isChecked && branchesWithSelection.has(path);

  const inputRef = useRef<HTMLInputElement>(null);
  // `indeterminate` n'existe que comme propriété DOM : aucun attribut HTML ne la porte.
  useEffect(() => {
    if (inputRef.current) inputRef.current.indeterminate = isMixed;
  }, [isMixed]);

  return (
    <>
      <div className={styles.header} data-expanded={isExpanded} style={{ '--depth': depth } as CSSProperties}>
        <button
          type="button"
          className={`${styles.trigger} fr-btn fr-btn--tertiary-no-outline fr-btn--icon-right ${isExpanded ? 'fr-icon-arrow-up-s-line' : 'fr-icon-arrow-down-s-line'}`}
          aria-expanded={isExpanded}
          aria-controls={optionsId}
          onClick={() => onToggleExpanded(path)}
        >
          {node.label}
        </button>

        <div className={`${styles.selectAll} ${fr.cx('fr-checkbox-group', 'fr-checkbox-group--sm')}`}>
          <input
            ref={inputRef}
            type="checkbox"
            id={allId}
            value={node.value}
            checked={isChecked}
            onChange={() => onToggleValue(node, ancestors)}
          />
          <label className={fr.cx('fr-label')} htmlFor={allId}>
            <span className="fr-sr-only">{`${labels.selectAll(node.label)}. ${labels.selectAllHint}`}</span>
          </label>
        </div>
      </div>

      <fieldset id={optionsId} className={styles.options} hidden={!isExpanded}>
        <legend className="fr-sr-only">{labels.optionsLegend(node.label)}</legend>
        {isChecked ? (
          <p
            className={`${styles.allSelectedHint} ${fr.cx('fr-hint-text')}`}
            style={{ '--depth': depth + 1 } as CSSProperties}
          >
            {labels.allSelectedHint(node.label)}
          </p>
        ) : null}
        <Level
          nodes={childrenOf(node)}
          depth={depth + 1}
          parentPath={path}
          ancestors={[...ancestors, node]}
          isAncestorSelected={isChecked}
          idPrefix={idPrefix}
          selected={selected}
          expanded={expanded}
          branchesWithSelection={branchesWithSelection}
          labels={labels}
          onToggleValue={onToggleValue}
          onToggleExpanded={onToggleExpanded}
        />
      </fieldset>
    </>
  );
}

type LevelProps = LevelContext & {
  nodes: TreeNode[];
  depth: number;
  parentPath?: string;
  ancestors: TreeNode[];
  isAncestorSelected: boolean;
};

function Level({ nodes, depth, parentPath, ancestors, isAncestorSelected, ...context }: LevelProps): ReactNode {
  const pathOf = (i: number) => (parentPath === undefined ? `${i}` : `${parentPath}-${i}`);
  const hasCategories = nodes.some((node) => childrenOf(node).length > 0);

  const renderNode = (node: TreeNode, i: number) => {
    const shared = { ...context, node, depth, path: pathOf(i), ancestors, isAncestorSelected };
    return childrenOf(node).length > 0 ? <Category {...shared} /> : <Option {...shared} />;
  };

  if (!hasCategories) {
    return nodes.map((node, i) => <Fragment key={node.value}>{renderNode(node, i)}</Fragment>);
  }

  return (
    <ul className={styles.categories}>
      {nodes.map((node, i) => (
        <li key={node.value}>{renderNode(node, i)}</li>
      ))}
    </ul>
  );
}

type Props = {
  buttonLabel: string;
  selectedValuesLabel: (count: number) => string;
  legend: string;
  nodes: TreeNode[];
  selectedValues: string[];
  labels: DropdownTreeLabels;
  onChange: (values: string[]) => void;
  onOpen?: () => void;
  onClose?: () => void;
};

export function DropdownTree({
  buttonLabel,
  selectedValuesLabel,
  legend,
  nodes,
  selectedValues,
  labels,
  onChange,
  onOpen,
  onClose,
}: Props) {
  const menuId = useId();
  const { isOpen, toggle, close, panelRef, triggerRef } = useDisclosureMenu({ onOpen, onClose });
  const selected = useMemo(() => new Set(selectedValues), [selectedValues]);
  const hasSelection = selectedValues.length > 0;
  const branchesWithSelection = useMemo(() => pathsWithSelectedDescendant(nodes, selected), [nodes, selected]);
  const [expanded, setExpanded] = useState(() => expansionForSelection(nodes, new Set(selectedValues)));
  const [announcement, setAnnouncement] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    const panel = panelRef.current;

    const onFocusOut = (e: FocusEvent) => {
      const next = e.relatedTarget as Node | null;
      if (!next) return;
      if (panel?.contains(next) || triggerRef.current?.contains(next)) return;
      close({ restoreFocus: false });
    };
    panel?.addEventListener('focusout', onFocusOut);

    return () => panel?.removeEventListener('focusout', onFocusOut);
  }, [isOpen, panelRef, triggerRef, close]);

  const openOrClose = () => {
    if (!isOpen) {
      const fromSelection = expansionForSelection(nodes, selected);
      if (fromSelection.size > 0) setExpanded(fromSelection);
    }
    toggle();
  };

  const toggleExpanded = (path: string) => {
    setExpanded((current) =>
      current.has(path)
        ? new Set([...current].filter((open) => open !== path && !open.startsWith(`${path}-`)))
        : new Set(ancestorPaths(path)),
    );
  };

  const announceRemoval = (label: string, remaining: number) => {
    setAnnouncement(`${label} désélectionné. ${plural(remaining, 'sélection restante', 'sélections restantes')}.`);
  };

  const toggleValue = (node: TreeNode, ancestors: TreeNode[]) => {
    const selectedAncestor = ancestors.findIndex((ancestor) => selected.has(ancestor.value));

    if (selectedAncestor !== -1) {
      const chain = [...ancestors.slice(selectedAncestor), node];
      const kept = chain
        .slice(0, -1)
        .flatMap((parent, i) => childrenOf(parent).filter((child) => child !== chain[i + 1]));
      const [branch] = chain;
      const next = collapseFullBranches(nodes, [
        ...selectedValues.filter((value) => value !== branch.value),
        ...kept.map((child) => child.value),
      ]);

      announceRemoval(node.label, next.length);
      onChange(next);
      return;
    }

    const below = new Set(descendantValues(node));

    if (selected.has(node.value)) {
      const next = selectedValues.filter((value) => value !== node.value && !below.has(value));
      announceRemoval(node.label, next.length);
      onChange(next);
      return;
    }

    const absorbed = selectedValues.filter((value) => below.has(value)).length;
    setAnnouncement(
      absorbed > 0
        ? `${node.label} sélectionné en entier : ${plural(absorbed, 'sélection plus précise remplacée', 'sélections plus précises remplacées')}.`
        : `${node.label} sélectionné.`,
    );
    onChange(collapseFullBranches(nodes, [...selectedValues.filter((value) => !below.has(value)), node.value]));
  };

  return (
    <div className={styles.dropdownTree}>
      <p role="status" aria-live="polite" className="fr-sr-only">
        {announcement}
      </p>
      <button
        ref={triggerRef}
        type="button"
        className={`${styles.button} fr-btn fr-btn--tertiary fr-btn--icon-right ${isOpen ? 'fr-icon-arrow-up-s-line' : 'fr-icon-arrow-down-s-line'}`}
        aria-expanded={isOpen}
        aria-controls={isOpen ? menuId : undefined}
        onClick={openOrClose}
      >
        {buttonLabel}
        {hasSelection && (
          <>
            <span aria-hidden="true">
              {' '}({selectedValues.length})
            </span>
            <span className="fr-sr-only">{`, ${selectedValuesLabel(selectedValues.length)}`}</span>
          </>
        )}
      </button>

      {isOpen ? (
        <div id={menuId} ref={panelRef} className={`${styles.dropdown} fr-card`}>
          <fieldset className={styles.fieldset}>
            <legend className="fr-sr-only">{legend}</legend>
            <Level
              nodes={nodes}
              depth={0}
              ancestors={[]}
              isAncestorSelected={false}
              idPrefix={menuId}
              selected={selected}
              expanded={expanded}
              branchesWithSelection={branchesWithSelection}
              labels={labels}
              onToggleValue={toggleValue}
              onToggleExpanded={toggleExpanded}
            />
          </fieldset>
        </div>
      ) : null}
    </div>
  );
}
