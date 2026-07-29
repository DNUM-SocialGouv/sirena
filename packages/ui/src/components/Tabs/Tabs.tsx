import {
  type HTMLAttributes,
  memo,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
  useCallback,
  useRef,
  useState,
} from 'react';
import { CSSTransition, SwitchTransition } from 'react-transition-group';
import { TabsItem } from './TabsItem';
import './Tabs.css';

const keyToEventDict = {
  ArrowRight: 'next',
  ArrowLeft: 'previous',
  Home: 'first',
  End: 'last',
} as const;

export type TabKey = keyof typeof keyToEventDict;
export type TabActions = (typeof keyToEventDict)[keyof typeof keyToEventDict];

export type TabDescriptor = {
  label: string;
  tabPanelId: string;
  tabId: string;
  title?: string;
  disabled?: boolean;
};

export type TabsProps = {
  tabs: TabDescriptor[];
  activeTab: number;
  onUpdateActiveTab: (newIndex: number) => void;
  children: ReactNode;
} & HTMLAttributes<HTMLDivElement>;

type TabsListItemProps = {
  tab: TabDescriptor;
  index: number;
  selected: boolean;
  onChangeTab: (newIndex: number) => void;
};

const TabsListItem = ({ tab, index, selected, onChangeTab }: TabsListItemProps) => {
  const handleClick = useCallback(() => onChangeTab(index), [onChangeTab, index]);

  return (
    <TabsItem
      panelId={tab.tabPanelId}
      selected={selected}
      tabId={tab.tabId}
      onTabClick={handleClick}
      title={tab.title}
      disabled={tab.disabled}
    >
      {tab.label}
    </TabsItem>
  );
};

const TabsComponent = ({ tabs, activeTab, onUpdateActiveTab, children, className, ...props }: TabsProps) => {
  const panelRef = useRef<HTMLDivElement>(null);

  const [direction, setDirection] = useState<'left' | 'right'>('right');

  const changeTab = useCallback(
    (newIndex: number) => {
      setDirection(newIndex < activeTab ? 'left' : 'right');
      onUpdateActiveTab(newIndex);
    },
    [activeTab, onUpdateActiveTab],
  );

  const onTabKeyDown = (action: TabActions) => {
    switch (action) {
      case 'next':
        changeTab(activeTab === tabs.length - 1 ? 0 : activeTab + 1);
        break;
      case 'previous':
        changeTab(activeTab === 0 ? tabs.length - 1 : activeTab - 1);
        break;
      case 'first':
        changeTab(0);
        break;
      case 'last':
        changeTab(tabs.length - 1);
        break;
    }
  };

  const onKeyDownCapture = (event: ReactKeyboardEvent) => {
    if (event.key in keyToEventDict) {
      event.preventDefault();
      onTabKeyDown(keyToEventDict[event.key as TabKey]);
    }
  };

  return (
    <div className={`fr-tabs ${className || ''}`} {...props}>
      <ul
        className="fr-tabs__list"
        // biome-ignore lint/a11y/noNoninteractiveElementToInteractiveRole: needed by the dsfr
        role="tablist"
        aria-label="Informations et suivi de la requête"
        onKeyDownCapture={onKeyDownCapture}
      >
        {tabs.map((tab, index) => (
          <TabsListItem
            key={tab.tabId}
            tab={tab}
            index={index}
            selected={index === activeTab}
            onChangeTab={changeTab}
          />
        ))}
      </ul>

      <SwitchTransition mode="out-in">
        <CSSTransition key={activeTab} classNames={`fade-${direction}`} timeout={400} nodeRef={panelRef}>
          <div
            ref={panelRef}
            id={tabs[activeTab]?.tabPanelId}
            className="fr-tabs__panel fr-tabs__panel--selected"
            role="tabpanel"
            aria-labelledby={tabs[activeTab]?.tabId}
          >
            {children}
          </div>
        </CSSTransition>
      </SwitchTransition>
    </div>
  );
};

export const Tabs = memo(TabsComponent);
