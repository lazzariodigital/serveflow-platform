'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import Box from '@mui/material/Box';
import Link from '@mui/material/Link';
import Alert from '@mui/material/Alert';
import LoadingButton from '@mui/lab/LoadingButton';

import { Form, Field } from '../components/hook-form';
import { FormHead } from '../components/form-head';
import { FormDivider } from '../components/form-divider';
import { FormSocials } from '../components/form-socials';
import { useFronteggAuth } from '../hooks/use-frontegg-auth';

// ----------------------------------------------------------------------

interface SignUpFormData {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
}

export type SignUpViewProps = {
  signInPath?: string;
  redirectPath?: string;
};

export function SignUpView({
  signInPath = '/sign-in',
  redirectPath = '/',
}: SignUpViewProps) {
  const router = useRouter();
  const { signUp, loginWithGoogle, isLoading } = useFronteggAuth();
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const methods = useForm<SignUpFormData>({
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      password: '',
    },
  });

  const onSubmit = methods.handleSubmit(async (data) => {
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const result = await signUp({
        email: data.email,
        password: data.password,
        name: `${data.firstName} ${data.lastName}`.trim(),
        metadata: {
          firstName: data.firstName,
          lastName: data.lastName,
        },
      });

      // If signup returns tokens (auto-login), redirect immediately
      if (result.accessToken) {
        router.push(redirectPath);
        router.refresh();
        return;
      }

      // Otherwise, show success message - user needs to verify email
      setSuccessMsg(
        'Cuenta creada correctamente. Por favor, revisa tu correo electrónico para verificar tu cuenta.'
      );

      // Redirect to login after a delay
      setTimeout(() => {
        router.push(signInPath);
      }, 3000);
    } catch (error: unknown) {
      const fronteggError = error as { message?: string };
      setErrorMsg(fronteggError.message || 'Error al crear la cuenta. Por favor, inténtalo de nuevo.');
    }
  });

  const handleGoogleSignUp = () => {
    loginWithGoogle();
  };

  return (
    <>
      <FormHead
        title="Crear tu cuenta"
        description={
          <>
            ¿Ya tienes una cuenta?{' '}
            <Link href={signInPath} variant="subtitle2">
              Inicia sesión
            </Link>
          </>
        }
      />

      {errorMsg && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {errorMsg}
        </Alert>
      )}

      {successMsg && (
        <Alert severity="success" sx={{ mb: 3 }}>
          {successMsg}
        </Alert>
      )}

      <Form methods={methods} onSubmit={onSubmit}>
        <Box gap={3} display="flex" flexDirection="column">
          <Box gap={2} display="flex">
            <Field.Text name="firstName" label="Nombre" />
            <Field.Text name="lastName" label="Apellidos" />
          </Box>

          <Field.Text
            name="email"
            label="Correo electrónico"
            autoComplete="email"
          />

          <Field.Text
            name="password"
            label="Contraseña"
            type="password"
            autoComplete="new-password"
            helperText="Mínimo 8 caracteres"
          />

          <LoadingButton
            fullWidth
            size="large"
            type="submit"
            color="primary"
            variant="contained"
            loading={isLoading}
          >
            Crear cuenta
          </LoadingButton>
        </Box>
      </Form>

      <FormDivider />

      <FormSocials onGoogleClick={handleGoogleSignUp} />
    </>
  );
}
