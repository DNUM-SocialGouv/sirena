import { type KeyboardEvent as ReactKeyboardEvent, type ReactNode, memo, useEffect, useRef, useState } from 'react';
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
};

export type TabsProps = {
  tabs: TabDescriptor[];
  activeTab: number;
  onUpdateActiveTab: (newIndex: number) => void;
  children: ReactNode;
};

const TabsComponent = ({ tabs, activeTab, onUpdateActiveTab, children }: TabsProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const tablistRef = useRef<HTMLUListElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const isFirstRenderRef = useRef(true);

  const [direction, setDirection] = useState<'right' | 'left'>('right');
  const pendingIndexRef = useRef<number | null>(null);

  // biome-ignore lint/correctness/useExhaustiveDependencies: we need to trigger this when direction change even if we don't use direction
  useEffect(() => {
    if (pendingIndexRef.current !== null) {
      onUpdateActiveTab(pendingIndexRef.current);
      pendingIndexRef.current = null;
    }
  }, [direction, onUpdateActiveTab]);

  useEffect(() => {
    if (isFirstRenderRef.current) {
      isFirstRenderRef.current = false;
      return;
    }
    const currentTabId = tabs[activeTab]?.tabId;
    if (currentTabId && containerRef.current) {
      const btn = containerRef.current.querySelector<HTMLButtonElement>(`#${currentTabId}`);
      btn?.focus();
    }
  }, [activeTab, tabs]);

  const computeDirection = (newIndex: number): 'left' | 'right' => {
    return newIndex < activeTab ? 'left' : 'right';
  };

  const changeTab = (newIndex: number) => {
    const newDir = computeDirection(newIndex);
    if (newDir === direction) {
      onUpdateActiveTab(newIndex);
    } else {
      setDirection(newDir);
      pendingIndexRef.current = newIndex;
    }
  };

  const selectTab = (newIndex: number) => {
    changeTab(newIndex);
  };

  const selectPrevious = () => {
    const newIndex = activeTab === 0 ? tabs.length - 1 : activeTab - 1;
    changeTab(newIndex);
  };

  const selectNext = () => {
    const newIndex = activeTab === tabs.length - 1 ? 0 : activeTab + 1;
    changeTab(newIndex);
  };

  const selectFirst = () => {
    changeTab(0);
  };

  const selectLast = () => {
    changeTab(tabs.length - 1);
  };

  const onTabKeyDown = (action: TabActions) => {
    const tabActions = {
      next: selectNext,
      previous: selectPrevious,
      first: selectFirst,
      last: selectLast,
    };
    tabActions[action]();
  };

  const onKeyDownCapture = (event: ReactKeyboardEvent) => {
    if (event.key in keyToEventDict) {
      const act = keyToEventDict[event.key as TabKey];
      onTabKeyDown(act);
    }
  };

  return (
    <div ref={containerRef} className="fr-tabs">
      <ul
        ref={tablistRef}
        className="fr-tabs__list"
        role="tablist"
        aria-label="[A modifier | nom du système d’onglet]"
        onKeyDownCapture={onKeyDownCapture}
      >
        {tabs.map((tab, index) => (
          <TabsItem
            key={tab.tabId}
            panelId={tab.tabPanelId}
            selected={index === activeTab}
            tabId={tab.tabId}
            onTabClick={() => selectTab(index)}
          >
            {tab.label}
          </TabsItem>
        ))}
      </ul>

      <SwitchTransition mode="out-in">
        {/* TODO: Find away to prevent 2x render caused by key */}
        <CSSTransition key={activeTab} classNames={`fade-${direction}`} timeout={400} nodeRef={panelRef}>
          <div
            ref={panelRef}
            id={tabs[activeTab]?.tabPanelId}
            className="fr-tabs__panel fr-tabs__panel--selected"
            role="tabpanel"
            aria-labelledby={tabs[activeTab].tabId}
          >
            {children}
          </div>
        </CSSTransition>
      </SwitchTransition>
    </div>
  );
};

export const Tabs = memo(TabsComponent);
