import { MOTIFS_HIERARCHICAL_DATA } from '../constants/motifs.constant';

export interface MotifOption {
  label: string;
  value: string;
  children?: MotifOption[];
}

export function getAllOptionsFlat(options: MotifOption[]): MotifOption[] {
  const result: MotifOption[] = [];

  const traverse = (opts: MotifOption[]) => {
    for (const opt of opts) {
      result.push(opt);
      if (opt.children) {
        traverse(opt.children);
      }
    }
  };

  traverse(options);
  return result;
}

export function valueToLabel(value: string, options: MotifOption[] = MOTIFS_HIERARCHICAL_DATA): string | undefined {
  const flatOptions = getAllOptionsFlat(options);
  return flatOptions.find((opt) => opt.value === value)?.label;
}

export function labelToValue(label: string, options: MotifOption[] = MOTIFS_HIERARCHICAL_DATA): string | undefined {
  const flatOptions = getAllOptionsFlat(options);
  return flatOptions.find((opt) => opt.label === label)?.value;
}

export function labelsToValues(labels: string[], options: MotifOption[] = MOTIFS_HIERARCHICAL_DATA): string[] {
  return labels.map((label) => labelToValue(label, options) || label);
}

export function valuesToLabels(values: string[], options: MotifOption[] = MOTIFS_HIERARCHICAL_DATA): string[] {
  return values.map((value) => valueToLabel(value, options) || value);
}
