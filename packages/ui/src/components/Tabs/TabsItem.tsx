import { useRef } from 'react';

export type TabItemProps = {
  panelId: string;
  selected: boolean;
  tabId: string;
  children: React.ReactNode;
  onTabClick: (tabId: string) => void;
  title?: string;
  disabled?: boolean;
};

export const TabsItem = ({ panelId, selected, tabId, children, onTabClick, title, disabled }: TabItemProps) => {
  const buttonRef = useRef<HTMLButtonElement>(null);

  return (
    <button
      id={tabId}
      type="button"
      ref={buttonRef}
      className="fr-tabs__tab"
      tabIndex={selected ? 0 : -1}
      role="tab"
      aria-selected={selected}
      aria-controls={panelId}
      onClick={disabled ? undefined : () => onTabClick(tabId)}
      title={title}
      disabled={disabled}
    >
      {children}
    </button>
  );
};
