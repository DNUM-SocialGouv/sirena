import {
  type HTMLAttributes,
  memo,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
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

const TabsComponent = ({
  tabs,
  activeTab,
  onUpdateActiveTab,
  children,
  className,
  ...props
}: TabsProps) => {
  const panelRef = useRef<HTMLDivElement>(null);

  const [direction, setDirection] = useState<'left' | 'right'>('right');

  const computeDirection = (newIndex: number): 'left' | 'right' =>
    newIndex < activeTab ? 'left' : 'right';

  const changeTab = (newIndex: number) => {
    setDirection(computeDirection(newIndex));
    onUpdateActiveTab(newIndex);
  };

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
          <TabsItem
            key={tab.tabId}
            panelId={tab.tabPanelId}
            selected={index === activeTab}
            tabId={tab.tabId}
            onTabClick={() => changeTab(index)}
            title={tab.title}
            disabled={tab.disabled}
          >
            {tab.label}
          </TabsItem>
        ))}
      </ul>

      <SwitchTransition mode="out-in">
        <CSSTransition
          key={activeTab}
          classNames={`fade-${direction}`}
          timeout={400}
          nodeRef={panelRef}
        >
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
