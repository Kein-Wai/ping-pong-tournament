import { useState } from 'react';
import { NumberInput } from '@mantine/core';

export interface SecondsFieldProps {
  label: string;
  ariaLabel: string;
  value: number;
  min: number;
  max: number;
  step: number;
  /** El valor ya confirmado: en rango al teclear, o lo que haya al salir del campo. */
  onCommit: (seconds: number) => void;
}

export const SecondsField = ({ label, ariaLabel, value, min, max, step, onCommit }: SecondsFieldProps) => {
  // Mientras se escribe se enseña el borrador: aplicar el tope en cada tecla impediría
  // teclear «90», porque el «9» saltaría al mínimo antes de poder escribir el «0».
  const [draft, setDraft] = useState<number | string | null>(null);

  const handleChange = (next: number | string) => {
    setDraft(next);
    if (typeof next === 'number' && next >= min && next <= max) onCommit(next);
  };

  const handleBlur = () => {
    if (typeof draft === 'number') onCommit(draft);
    setDraft(null);
  };

  return (
    <NumberInput
      size="xs"
      w={110}
      label={label}
      aria-label={ariaLabel}
      value={draft ?? value}
      onChange={handleChange}
      onBlur={handleBlur}
      min={min}
      max={max}
      step={step}
      suffix=" s"
      allowDecimal={false}
    />
  );
};
