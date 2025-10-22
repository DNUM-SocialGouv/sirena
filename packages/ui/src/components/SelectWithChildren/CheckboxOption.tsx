import { Checkbox } from '@codegouvfr/react-dsfr/Checkbox';
import styles from './SelectWithChildren.module.css';
import type { SelectWithChildrenOption } from './SelectWithChildren.types';

interface CheckboxOptionProps {
  option: SelectWithChildrenOption;
  isSelected: boolean;
  onToggle: () => void;
  onKeyDown: (event: React.KeyboardEvent) => void;
  setRef: (el: HTMLDivElement | null) => void;
  isFocused: boolean;
}

export const CheckboxOption = ({ option, isSelected, onToggle, onKeyDown, setRef, isFocused }: CheckboxOptionProps) => {
  return (
    <div
      ref={setRef}
      className={styles.submotifItem}
      role="option"
      aria-selected={isSelected}
      tabIndex={isFocused ? 0 : -1}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onToggle();
        } else {
          onKeyDown(e);
        }
      }}
    >
      <Checkbox
        options={[
          {
            label: option.label,
            nativeInputProps: {
              checked: isSelected,
              onChange: onToggle,
              'aria-label': option.label,
            },
          },
        ]}
      />
    </div>
  );
};
