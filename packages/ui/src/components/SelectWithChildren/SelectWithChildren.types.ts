export interface SelectWithChildrenOption {
  label: string;
  value: string;
  children?: SelectWithChildrenOption[];
}

export interface SelectWithChildrenProps {
  value: string[];
  onChange: (values: string[]) => void;
  label?: string;
  options: SelectWithChildrenOption[];
  id?: string;
  disabled?: boolean;
  readOnly?: boolean;
}
