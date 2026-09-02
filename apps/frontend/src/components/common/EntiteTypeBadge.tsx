import type { ComponentPropsWithoutRef } from 'react';

const colorClassByType: Record<string, string> = {
  ARS: 'color-pink-tuile',
  CD: 'color-green-archipel',
  DD: 'color-yellow-moutarde',
};

const colorClassByRelation = {
  owner: 'color-pink-tuile',
  foreign: 'color-yellow-moutarde',
} as const;

type Props = Omit<ComponentPropsWithoutRef<'p'>, 'children'> & {
  as?: 'p' | 'span';
  entiteTypeId: string;
  label: string;
  relation?: keyof typeof colorClassByRelation;
};

export function EntiteTypeBadge({
  as: Component = 'p',
  entiteTypeId,
  label,
  relation,
  className,
  ...nativeProps
}: Props) {
  const colorClass = relation ? colorClassByRelation[relation] : (colorClassByType[entiteTypeId] ?? 'color-pink-tuile');

  return (
    <Component
      {...nativeProps}
      className={['fr-tag', 'fr-tag--sm', colorClass, className].filter(Boolean).join(' ')}
      data-entity-relation={relation}
    >
      {label}
    </Component>
  );
}
