'use client';

import type { UseFormReturn, FieldValues } from 'react-hook-form';
import { FormProvider as RHFForm } from 'react-hook-form';

// ----------------------------------------------------------------------

export type FormProps<T extends FieldValues = FieldValues> = {
  onSubmit?: () => void;
  children: React.ReactNode;
  methods: UseFormReturn<T>;
};

export function Form<T extends FieldValues>({
  children,
  onSubmit,
  methods,
}: FormProps<T>) {
  return (
    <RHFForm {...methods}>
      <form onSubmit={onSubmit} noValidate autoComplete="off">
        {children}
      </form>
    </RHFForm>
  );
}
