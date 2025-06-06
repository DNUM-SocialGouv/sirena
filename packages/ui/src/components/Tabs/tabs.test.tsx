import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { useState } from 'react';
import { describe, expect, it } from 'vitest';
import { type TabDescriptor, Tabs } from './Tabs';
import '@testing-library/jest-dom';

const tabsData: TabDescriptor[] = [
  { label: 'Tab 1', tabPanelId: 'panel-1', tabId: 'tab-1' },
  { label: 'Tab 2', tabPanelId: 'panel-2', tabId: 'tab-2' },
  { label: 'Tab 3', tabPanelId: 'panel-3', tabId: 'tab-3' },
];

function TabsWrapper() {
  const [activeTab, setActiveTab] = useState(0);
  const panels = [<div key="1">Content 1</div>, <div key="2">Content 2</div>, <div key="3">Content 3</div>];
  return (
    <Tabs tabs={tabsData} activeTab={activeTab} onUpdateActiveTab={setActiveTab}>
      {panels[activeTab]}
    </Tabs>
  );
}

describe('Tabs Component', () => {
  it('renders first panel by default', () => {
    render(<TabsWrapper />);
    expect(screen.getByText('Content 1')).toBeInTheDocument();
  });

  it('clicking Tab 2 shows next panel', () => {
    render(<TabsWrapper />);
    fireEvent.click(screen.getByText('Tab 2'));
    waitFor(() => {
      expect(screen.getByText('Content 2')).toBeInTheDocument();
    });
  });
});
