import { fireEvent, render, screen } from '@testing-library/react';
import { type TabItemProps, TabsItem } from './TabsItem';

describe('TabsItem Component', () => {
  const defaultProps: TabItemProps = {
    panelId: 'panel-1',
    selected: false,
    tabId: 'tab-1',
    children: 'Tab Label',
    onTabClick: vi.fn(),
  };

  it('renders button with correct attributes when not selected', () => {
    render(<TabsItem {...defaultProps} />);
    const button = screen.getByRole('tab');

    expect(button).toHaveAttribute('id', 'tab-1');
    expect(button).toHaveAttribute('aria-controls', 'panel-1');
    expect(button).toHaveAttribute('aria-selected', 'false');
    expect(button).toHaveAttribute('tabindex', '-1');
    expect(button).toHaveTextContent('Tab Label');
  });

  it('renders button with correct attributes when selected', () => {
    render(<TabsItem {...defaultProps} selected={true} />);
    const button = screen.getByRole('tab');

    expect(button).toHaveAttribute('aria-selected', 'true');
    expect(button).toHaveAttribute('tabindex', '0');
  });

  it('calls onTabClick with tabId when clicked', () => {
    const onTabClickMock = vi.fn();
    render(<TabsItem {...defaultProps} selected={true} onTabClick={onTabClickMock} />);
    const button = screen.getByRole('tab');
    fireEvent.click(button);
    expect(onTabClickMock).toHaveBeenCalledWith('tab-1');
  });
});
