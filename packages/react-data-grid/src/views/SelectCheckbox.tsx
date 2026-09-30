import { useEffect, useRef, type MouseEvent } from 'react';

export interface SelectCheckboxProps {
  checked: boolean;
  indeterminate?: boolean;
  disabled?: boolean;
  label: string;
  onToggle(event: MouseEvent<HTMLInputElement>): void;
}

/**
 * Selection checkbox. It is not a tab stop: keyboard users select with Space
 * on the focused row/card/item (roving focus, FR-041).
 */
export function SelectCheckbox({
  checked,
  indeterminate,
  disabled,
  label,
  onToggle,
}: SelectCheckboxProps) {
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (ref.current) ref.current.indeterminate = !!indeterminate && !checked;
  }, [indeterminate, checked]);
  return (
    <input
      ref={ref}
      type="checkbox"
      className="aits-checkbox"
      tabIndex={-1}
      checked={checked}
      disabled={disabled}
      aria-label={label}
      onClick={(event) => {
        event.stopPropagation();
        onToggle(event);
      }}
      onChange={() => {
        /* handled in onClick to read modifier keys */
      }}
    />
  );
}
