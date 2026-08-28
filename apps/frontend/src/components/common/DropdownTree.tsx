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
  lockedHint: (label: string) => string;
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

type LevelContext = {
  idPrefix: string;
  selected: Set<string>;
  expanded: Set<string>;
  branchesWithSelection: Set<string>;
  labels: DropdownTreeLabels;
  onToggleValue: (node: TreeNode) => void;
  onToggleExpanded: (path: string) => void;
};

type NodeProps = LevelContext & {
  node: TreeNode;
  depth: number;
  path: string;
  isLocked: boolean;
  lockedHintId?: string;
};

function Option({ node, depth, path, idPrefix, selected, isLocked, lockedHintId, onToggleValue }: NodeProps) {
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
        checked={isLocked || selected.has(node.value)}
        disabled={isLocked}
        aria-describedby={isLocked ? lockedHintId : undefined}
        onChange={() => onToggleValue(node)}
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
  isLocked,
  lockedHintId,
  idPrefix,
  selected,
  expanded,
  branchesWithSelection,
  labels,
  onToggleValue,
  onToggleExpanded,
}: NodeProps) {
  const allId = `${idPrefix}-${path}-all`;
  const descriptionId = `${allId}-description`;
  const optionsId = `${idPrefix}-${path}-options`;
  const ownLockedHintId = `${idPrefix}-${path}-locked`;

  const isChecked = isLocked || selected.has(node.value);
  const isExpanded = expanded.has(path);
  const isMixed = !isChecked && branchesWithSelection.has(path);

  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (inputRef.current) inputRef.current.indeterminate = isMixed;
  }, [isMixed]);

  return (
    <>
      <div className={styles.header} data-expanded={isExpanded} style={{ '--depth': depth } as CSSProperties}>
        <div className={`${styles.selectAll} ${fr.cx('fr-checkbox-group', 'fr-checkbox-group--sm')}`}>
          <input
            ref={inputRef}
            type="checkbox"
            id={allId}
            value={node.value}
            checked={isChecked}
            disabled={isLocked}
            aria-describedby={isLocked && lockedHintId ? `${descriptionId} ${lockedHintId}` : descriptionId}
            onChange={() => onToggleValue(node)}
          />
          <label className="fr-sr-only" htmlFor={allId}>
            {labels.selectAll(node.label)}
          </label>
          <span id={descriptionId} className="fr-sr-only">
            {labels.selectAllHint}
          </span>
        </div>

        <button
          type="button"
          className={`${styles.trigger} fr-btn fr-btn--tertiary-no-outline fr-btn--icon-right ${isExpanded ? 'fr-icon-arrow-up-s-line' : 'fr-icon-arrow-down-s-line'}`}
          aria-expanded={isExpanded}
          aria-controls={optionsId}
          onClick={() => onToggleExpanded(path)}
        >
          {node.label}
        </button>
      </div>

      <fieldset id={optionsId} className={styles.options} hidden={!isExpanded}>
        <legend className="fr-sr-only">{labels.optionsLegend(node.label)}</legend>
        {isChecked ? (
          <p
            className={`${styles.lockedHint} ${fr.cx('fr-hint-text')}`}
            id={ownLockedHintId}
            style={{ '--depth': depth + 1 } as CSSProperties}
          >
            {labels.lockedHint(node.label)}
          </p>
        ) : null}
        <Level
          nodes={childrenOf(node)}
          depth={depth + 1}
          parentPath={path}
          isLocked={isChecked}
          lockedHintId={isChecked ? ownLockedHintId : lockedHintId}
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
  isLocked: boolean;
  lockedHintId?: string;
};

function Level({ nodes, depth, parentPath, isLocked, lockedHintId, ...context }: LevelProps): ReactNode {
  const pathOf = (i: number) => (parentPath === undefined ? `${i}` : `${parentPath}-${i}`);
  const hasCategories = nodes.some((node) => childrenOf(node).length > 0);

  const renderNode = (node: TreeNode, i: number) => {
    const shared = { ...context, node, depth, path: pathOf(i), isLocked, lockedHintId };
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
  const [expanded, setExpanded] = useState(() => pathsWithSelectedDescendant(nodes, new Set(selectedValues)));
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

    requestAnimationFrame(() => {
      const first = panel?.querySelector<HTMLInputElement>('input:not([disabled])');
      first?.focus();
    });

    return () => panel?.removeEventListener('focusout', onFocusOut);
  }, [isOpen, panelRef, triggerRef, close]);

  const openOrClose = () => {
    if (!isOpen) {
      setExpanded((current) => new Set([...current, ...pathsWithSelectedDescendant(nodes, selected)]));
    }
    toggle();
  };

  const toggleExpanded = (path: string) => {
    setExpanded((current) => {
      const next = new Set(current);
      next.has(path) ? next.delete(path) : next.add(path);
      return next;
    });
  };

  const toggleValue = (node: TreeNode) => {
    const below = new Set(descendantValues(node));

    if (selected.has(node.value)) {
      const next = selectedValues.filter((value) => value !== node.value && !below.has(value));
      setAnnouncement(
        `${node.label} désélectionné. ${plural(next.length, 'sélection restante', 'sélections restantes')}.`,
      );
      onChange(next);
      return;
    }

    const absorbed = selectedValues.filter((value) => below.has(value)).length;
    setAnnouncement(
      absorbed > 0
        ? `${node.label} sélectionné en entier : ${plural(absorbed, 'sélection plus précise remplacée', 'sélections plus précises remplacées')}.`
        : `${node.label} sélectionné.`,
    );
    onChange([...selectedValues.filter((value) => !below.has(value)), node.value]);
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
              isLocked={false}
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
