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

  it('wraps each tab in a presentation li inside the tablist (RGAA 7.1)', () => {
    render(<TabsWrapper />);
    const tablist = screen.getByRole('tablist');
    const items = Array.from(tablist.children);
    expect(items).toHaveLength(tabsData.length);
    for (const item of items) {
      expect(item.tagName).toBe('LI');
      expect(item).toHaveAttribute('role', 'presentation');
      expect(item.firstElementChild).toHaveAttribute('role', 'tab');
    }
  });

  it('clicking Tab 2 shows next panel', async () => {
    render(<TabsWrapper />);
    fireEvent.click(screen.getByText('Tab 2'));
    await waitFor(() => {
      expect(screen.getByText('Content 2')).toBeInTheDocument();
      expect(screen.queryByText('Content 1')).not.toBeInTheDocument();
    });
  });
});
