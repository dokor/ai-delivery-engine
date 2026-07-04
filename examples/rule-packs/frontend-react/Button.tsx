// react/component-conventions + react/design-tokens — one component per file,
// PascalCase, typed props, and design tokens instead of hardcoded values.
import { tokens } from './tokens';

export interface ButtonProps {
  label: string;
  onClick: () => void;
}

export function Button({ label, onClick }: ButtonProps) {
  return (
    <button style={{ background: tokens.color.primary, padding: tokens.space.sm }} onClick={onClick}>
      {label}
    </button>
  );
}
