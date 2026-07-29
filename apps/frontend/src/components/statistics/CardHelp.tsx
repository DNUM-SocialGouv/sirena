import { Tooltip } from '@codegouvfr/react-dsfr/Tooltip';
import type { CSSProperties } from 'react';

export type CardHelpPosition = 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'inline';

const POSITION_STYLE: Record<Exclude<CardHelpPosition, 'inline'>, CSSProperties> = {
  'top-right': { position: 'absolute', top: 0, right: 0, zIndex: 1 },
  'top-left': { position: 'absolute', top: 0, left: 0, zIndex: 1 },
  'bottom-right': { position: 'absolute', bottom: 0, right: 0, zIndex: 1 },
  'bottom-left': { position: 'absolute', bottom: 0, left: 0, zIndex: 1 },
};

export function CardHelp({
  description,
  position = 'top-right',
}: {
  description?: string | null;
  position?: CardHelpPosition;
}) {
  const text = description?.trim();
  if (!text) return null;
  const style = position === 'inline' ? undefined : POSITION_STYLE[position];
  return (
    <span style={style}>
      <Tooltip kind="click" title={text} />
    </span>
  );
}
