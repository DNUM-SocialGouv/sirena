const colorClassByType: Record<string, string> = {
  ARS: 'color-pink-tuile',
  CD: 'color-green-archipel',
  DD: 'color-yellow-moutarde',
};

type Props = {
  entiteTypeId: string;
  label: string;
  className?: string;
};

export function EntiteTypeBadge({ entiteTypeId, label, className }: Props) {
  const colorClass = colorClassByType[entiteTypeId] ?? 'color-pink-tuile';
  return <p className={['fr-tag', 'fr-tag--sm', colorClass, className].filter(Boolean).join(' ')}>{label}</p>;
}
