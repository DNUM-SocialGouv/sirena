import { render, screen } from '@testing-library/react';
import { ColumnScrollControls } from './ColumnScrollControls';

beforeAll(() => {
  global.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;
});

const rect = (left: number, right: number): DOMRect => ({ left, right }) as DOMRect;

type ContainerOptions = {
  scrollLeft: number;
  clientWidth: number;
  scrollWidth: number;
  columnOffsets: number[];
};

function buildContainer({ scrollLeft, clientWidth, scrollWidth, columnOffsets }: ContainerOptions) {
  const container = document.createElement('div');
  container.getBoundingClientRect = () => rect(0, 0);
  Object.defineProperty(container, 'scrollLeft', { value: scrollLeft, writable: true });
  Object.defineProperty(container, 'clientWidth', { value: clientWidth, configurable: true });
  Object.defineProperty(container, 'scrollWidth', { value: scrollWidth, configurable: true });
  container.scrollTo = vi.fn();

  const thead = document.createElement('thead');
  const tr = document.createElement('tr');
  columnOffsets.forEach((offset, index) => {
    const columnRight = columnOffsets[index + 1] ?? scrollWidth;
    const th = document.createElement('th');
    th.getBoundingClientRect = () => rect(offset - scrollLeft, columnRight - scrollLeft);
    tr.appendChild(th);
  });
  thead.appendChild(tr);
  container.appendChild(thead);

  return container;
}

const getPrevButton = () => screen.getByRole('button', { name: /Colonnes précédentes/ });
const getNextButton = () => screen.getByRole('button', { name: /Colonnes suivantes/ });

describe('ColumnScrollControls', () => {
  it('renders both navigation buttons', () => {
    const container = buildContainer({
      scrollLeft: 0,
      clientWidth: 300,
      scrollWidth: 900,
      columnOffsets: [0, 300, 600],
    });
    render(<ColumnScrollControls containerRef={{ current: container }} tableId="table-1" />);

    expect(getPrevButton()).toBeInTheDocument();
    expect(getNextButton()).toBeInTheDocument();
  });

  it('exposes an accessible group and wires aria-controls to the table', () => {
    const container = buildContainer({
      scrollLeft: 0,
      clientWidth: 300,
      scrollWidth: 900,
      columnOffsets: [0, 300, 600],
    });
    render(<ColumnScrollControls containerRef={{ current: container }} tableId="table-42" />);

    expect(screen.getByRole('toolbar', { name: /Navigation horizontale des colonnes/ })).toBeInTheDocument();
    expect(getPrevButton()).toHaveAttribute('aria-controls', 'table-42');
    expect(getNextButton()).toHaveAttribute('aria-controls', 'table-42');
  });

  it('disables both buttons when there is no horizontal overflow', () => {
    const container = buildContainer({
      scrollLeft: 0,
      clientWidth: 900,
      scrollWidth: 900,
      columnOffsets: [0, 300, 600],
    });
    render(<ColumnScrollControls containerRef={{ current: container }} tableId="table-1" />);

    expect(getPrevButton()).toBeDisabled();
    expect(getNextButton()).toBeDisabled();
  });

  it('disables "previous" and enables "next" when scrolled fully left', () => {
    const container = buildContainer({
      scrollLeft: 0,
      clientWidth: 300,
      scrollWidth: 900,
      columnOffsets: [0, 300, 600],
    });
    render(<ColumnScrollControls containerRef={{ current: container }} tableId="table-1" />);

    expect(getPrevButton()).toBeDisabled();
    expect(getNextButton()).toBeEnabled();
  });

  it('enables "previous" and disables "next" when scrolled fully right', () => {
    const container = buildContainer({
      scrollLeft: 600,
      clientWidth: 300,
      scrollWidth: 900,
      columnOffsets: [0, 300, 600],
    });
    render(<ColumnScrollControls containerRef={{ current: container }} tableId="table-1" />);

    expect(getPrevButton()).toBeEnabled();
    expect(getNextButton()).toBeDisabled();
  });

  it('reveals the next column on "next" click by aligning its right edge to the viewport', () => {
    const container = buildContainer({
      scrollLeft: 0,
      clientWidth: 300,
      scrollWidth: 600,
      columnOffsets: [0, 200, 400],
    });
    render(<ColumnScrollControls containerRef={{ current: container }} tableId="table-1" />);

    getNextButton().click();

    expect(container.scrollTo).toHaveBeenCalledWith({ left: 100, behavior: 'smooth' });
  });

  it('falls back to left-aligning a column wider than the viewport on "next" click', () => {
    const container = buildContainer({
      scrollLeft: 0,
      clientWidth: 300,
      scrollWidth: 700,
      columnOffsets: [0, 100],
    });
    render(<ColumnScrollControls containerRef={{ current: container }} tableId="table-1" />);

    getNextButton().click();

    expect(container.scrollTo).toHaveBeenCalledWith({ left: 100, behavior: 'smooth' });
  });

  it('reveals the previous column on "previous" click by aligning its left edge to the viewport', () => {
    const container = buildContainer({
      scrollLeft: 600,
      clientWidth: 300,
      scrollWidth: 900,
      columnOffsets: [0, 300, 600],
    });
    render(<ColumnScrollControls containerRef={{ current: container }} tableId="table-1" />);

    getPrevButton().click();

    expect(container.scrollTo).toHaveBeenCalledWith({ left: 300, behavior: 'smooth' });
  });
});
