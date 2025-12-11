// ════════════════════════════════════════════════════════════════
// Hook Form Components
// ════════════════════════════════════════════════════════════════

export { Form, type FormProps } from './form-provider';
export { RHFTextField, type RHFTextFieldProps } from './rhf-text-field';

// Field shorthand
export const Field = {
  Text: RHFTextField,
} as const;

// Re-export RHFTextField as an alias for backwards compatibility
import { RHFTextField } from './rhf-text-field';
