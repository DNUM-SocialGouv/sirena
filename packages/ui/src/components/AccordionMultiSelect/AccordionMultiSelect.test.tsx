import { fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { AccordionMultiSelect } from './AccordionMultiSelect';
import type { AccordionMultiSelectOption } from './AccordionMultiSelect.types';
import '@testing-library/jest-dom';

const hierarchicalOptions: AccordionMultiSelectOption[] = [
  {
    label: 'Cat A',
    value: 'CAT_A',
    children: [
      { label: 'A1', value: 'A1', description: 'Description A1' },
      { label: 'A2', value: 'A2' },
    ],
  },
  {
    label: 'Cat B',
    value: 'CAT_B',
    children: [{ label: 'B1', value: 'B1' }],
  },
];

const flatOptions: AccordionMultiSelectOption[] = [
  { label: 'Flat 1', value: 'F1' },
  { label: 'Flat 2', value: 'F2' },
];

function Wrapper({
  options = hierarchicalOptions,
  initialValue = [],
  onChangeSpy,
  ...rest
}: {
  options?: AccordionMultiSelectOption[];
  initialValue?: string[];
  onChangeSpy?: (values: string[]) => void;
} & Partial<React.ComponentProps<typeof AccordionMultiSelect>>) {
  const [value, setValue] = useState<string[]>(initialValue);
  return (
    <AccordionMultiSelect
      label="Mes motifs"
      options={options}
      value={value}
      onChange={(next) => {
        setValue(next);
        onChangeSpy?.(next);
      }}
      {...rest}
    />
  );
}

const getTrigger = () => screen.getByRole('button', { name: /Mes motifs/ });

const labelForCheckbox = (checkbox: HTMLElement) => checkbox.closest('.fr-checkbox-group')?.querySelector('label');

describe('AccordionMultiSelect', () => {
  it('renders the trigger closed with the placeholder summary', () => {
    render(<Wrapper placeholder="Sélectionner un ou plusieurs motifs" />);
    const trigger = getTrigger();

    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    const panelId = trigger.getAttribute('aria-controls');
    expect(panelId).toBeTruthy();
    expect(document.getElementById(panelId as string)).toHaveAttribute('hidden');
    expect(screen.getByText('Sélectionner un ou plusieurs motifs')).toBeInTheDocument();
  });

  it('keeps the panel hidden until the trigger is clicked, then shows it', () => {
    render(<Wrapper />);
    const trigger = getTrigger();

    expect(screen.queryByRole('button', { name: /Cat A/ })).not.toBeInTheDocument();

    fireEvent.click(trigger);

    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    const panelId = trigger.getAttribute('aria-controls');
    expect(document.getElementById(panelId as string)).not.toHaveAttribute('hidden');
    expect(screen.getByRole('button', { name: /Cat A/ })).toBeInTheDocument();
  });

  it('expands a category and keeps aria-expanded synced with the hidden panel', () => {
    render(<Wrapper />);
    fireEvent.click(getTrigger());

    const categoryButton = screen.getByRole('button', { name: /Cat A/ });
    expect(categoryButton).toHaveAttribute('aria-expanded', 'false');
    const categoryPanelId = categoryButton.getAttribute('aria-controls');
    expect(categoryPanelId).toBeTruthy();
    expect(screen.queryByRole('checkbox', { name: /A1/ })).not.toBeInTheDocument();

    fireEvent.click(categoryButton);

    expect(categoryButton).toHaveAttribute('aria-expanded', 'true');
    expect(document.getElementById(categoryPanelId as string)).not.toHaveAttribute('hidden');
    expect(screen.getByRole('checkbox', { name: /A1/ })).toBeInTheDocument();
  });

  it('opens only one category at a time (DSFR accordion group)', () => {
    render(<Wrapper />);
    fireEvent.click(getTrigger());
    const catA = screen.getByRole('button', { name: /Cat A/ });
    const catB = screen.getByRole('button', { name: /Cat B/ });

    fireEvent.click(catA);
    expect(catA).toHaveAttribute('aria-expanded', 'true');

    fireEvent.click(catB);
    expect(catB).toHaveAttribute('aria-expanded', 'true');
    expect(catA).toHaveAttribute('aria-expanded', 'false');
  });

  it('renders category toggles without a heading wrapper by default', () => {
    render(<Wrapper />);
    fireEvent.click(getTrigger());

    expect(screen.queryByRole('heading', { name: /Cat A/ })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Cat A/ })).toBeInTheDocument();
  });

  it('wraps category toggles in a heading when categoryHeadingLevel is set (e.g. FAQ)', () => {
    render(<Wrapper categoryHeadingLevel={3} />);
    fireEvent.click(getTrigger());

    expect(screen.getByRole('heading', { level: 3, name: /Cat A/ })).toBeInTheDocument();
  });

  it('renders native checkboxes explicitly associated to their label', () => {
    render(<Wrapper />);
    fireEvent.click(getTrigger());
    fireEvent.click(screen.getByRole('button', { name: /Cat A/ }));

    const checkbox = screen.getByRole('checkbox', { name: /A1/ });
    expect(checkbox).toHaveAttribute('type', 'checkbox');
    expect(checkbox.id).toBeTruthy();
    expect(labelForCheckbox(checkbox)).toHaveAttribute('for', checkbox.id);
    expect(screen.getByText('Description A1')).toBeInTheDocument();
  });

  it('selects and deselects a child option using the PARENT/CHILD value format', () => {
    const onChangeSpy = vi.fn();
    render(<Wrapper onChangeSpy={onChangeSpy} />);
    fireEvent.click(getTrigger());
    fireEvent.click(screen.getByRole('button', { name: /Cat A/ }));

    fireEvent.click(screen.getByRole('checkbox', { name: /A1/ }));
    expect(onChangeSpy).toHaveBeenLastCalledWith(['CAT_A/A1']);

    fireEvent.click(screen.getByRole('checkbox', { name: /A1/ }));
    expect(onChangeSpy).toHaveBeenLastCalledWith([]);
  });

  it('shows the selected count in the summary and the selected count next to the corresponding category', () => {
    render(<Wrapper initialValue={['CAT_A/A1', 'CAT_A/A2']} itemNoun={{ singular: 'motif', plural: 'motifs' }} />);

    expect(screen.getByText('2 motifs sélectionnés')).toBeInTheDocument();

    fireEvent.click(getTrigger());
    expect(screen.getByText(/\(2\)/)).toBeInTheDocument();
  });

  it('announces the number of selected items in each category', () => {
    render(<Wrapper initialValue={['CAT_A/A1', 'CAT_A/A2']} itemNoun={{ singular: 'motif', plural: 'motifs' }} />);
    fireEvent.click(getTrigger());

    expect(screen.getByRole('button', { name: /Cat A/ })).toHaveAccessibleName(/2 motifs sélectionnés/);
    expect(screen.getByText(/2 motifs sélectionnés/, { selector: '.fr-sr-only' })).toBeInTheDocument();
  });

  it('uses the singular form for a single selection', () => {
    render(<Wrapper initialValue={['CAT_A/A1']} itemNoun={{ singular: 'motif', plural: 'motifs' }} />);
    expect(screen.getByText('1 motif sélectionné')).toBeInTheDocument();
  });

  it('agrees the participle with the default feminine noun (singular)', () => {
    render(<Wrapper initialValue={['CAT_A/A1']} />);
    expect(screen.getByText('1 option sélectionnée')).toBeInTheDocument();
  });

  it('agrees the participle with the default feminine noun (plural)', () => {
    render(<Wrapper initialValue={['CAT_A/A1', 'CAT_A/A2']} />);
    expect(screen.getByText('2 options sélectionnées')).toBeInTheDocument();
  });

  it('renders flat options as checkboxes directly, without category accordions', () => {
    const onChangeSpy = vi.fn();
    render(<Wrapper options={flatOptions} onChangeSpy={onChangeSpy} />);
    fireEvent.click(getTrigger());

    const checkbox = screen.getByRole('checkbox', { name: 'Flat 1' });
    expect(checkbox.id).toBeTruthy();
    expect(labelForCheckbox(checkbox)).toHaveAttribute('for', checkbox.id);

    fireEvent.click(checkbox);
    expect(onChangeSpy).toHaveBeenLastCalledWith(['F1']);
  });

  it('closes the panel when focus moves to an element outside (keyboard Tab out)', () => {
    render(
      <>
        <Wrapper />
        <button type="button" data-testid="next-field">
          Next
        </button>
      </>,
    );
    const trigger = getTrigger();
    fireEvent.click(trigger);
    expect(trigger).toHaveAttribute('aria-expanded', 'true');

    fireEvent.blur(trigger, { relatedTarget: screen.getByTestId('next-field') });
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
  });

  it('keeps the panel open when focus moves to an inner control', () => {
    render(<Wrapper />);
    const trigger = getTrigger();
    fireEvent.click(trigger);
    const categoryButton = screen.getByRole('button', { name: /Cat A/ });

    fireEvent.blur(trigger, { relatedTarget: categoryButton });
    expect(trigger).toHaveAttribute('aria-expanded', 'true');
  });

  it('keeps the panel open on a checkbox click that does not move focus (Firefox/Safari)', () => {
    render(<Wrapper />);
    const trigger = getTrigger();
    fireEvent.click(trigger);

    fireEvent.blur(trigger, { relatedTarget: null });
    expect(trigger).toHaveAttribute('aria-expanded', 'true');

    fireEvent.blur(trigger, { relatedTarget: document.body });
    expect(trigger).toHaveAttribute('aria-expanded', 'true');
  });

  it('closes the panel on Escape', () => {
    render(<Wrapper />);
    const trigger = getTrigger();
    fireEvent.click(trigger);
    expect(trigger).toHaveAttribute('aria-expanded', 'true');

    fireEvent.keyDown(trigger, { key: 'Escape' });
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
  });

  it('renders an error message linked to the trigger', () => {
    render(<Wrapper state="error" stateRelatedMessage="Champ requis" />);
    const trigger = getTrigger();

    expect(trigger).toHaveAttribute('aria-invalid', 'true');
    const describedBy = trigger.getAttribute('aria-describedby');
    expect(describedBy).toBeTruthy();
    expect(screen.getByText('Champ requis')).toHaveAttribute('id', describedBy);
  });

  it('does not open when readOnly', () => {
    render(<Wrapper readOnly />);
    const trigger = getTrigger();

    fireEvent.click(trigger);
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
  });
});
