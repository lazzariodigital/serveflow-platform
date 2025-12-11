'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import Box from '@mui/material/Box';
import Link from '@mui/material/Link';
import Alert from '@mui/material/Alert';
import Typography from '@mui/material/Typography';
import LoadingButton from '@mui/lab/LoadingButton';

import { Form, Field } from '../components/hook-form';
import { FormHead } from '../components/form-head';
import { FormDivider } from '../components/form-divider';
import { FormSocials } from '../components/form-socials';
import { useFronteggAuth } from '../hooks/use-frontegg-auth';

// ----------------------------------------------------------------------

interface SignInFormData {
  email: string;
  password: string;
}

interface TwoFactorFormData {
  code: string;
}

export type SignInViewProps = {
  signUpPath?: string;
  redirectPath?: string;
};

export function SignInView({
  signUpPath = '/sign-up',
  redirectPath = '/',
}: SignInViewProps) {
  const router = useRouter();
  const { login, verifyMfa, loginWithGoogle, isLoading } = useFronteggAuth();
  const [errorMsg, setErrorMsg] = useState('');
  const [needsTwoFactor, setNeedsTwoFactor] = useState(false);
  const [mfaToken, setMfaToken] = useState<string | null>(null);

  const methods = useForm<SignInFormData>({
    defaultValues: { email: '', password: '' },
  });

  const twoFactorMethods = useForm<TwoFactorFormData>({
    defaultValues: { code: '' },
  });

  const onSubmit = methods.handleSubmit(async (data) => {
    setErrorMsg('');

    try {
      const result = await login({
        email: data.email,
        password: data.password,
      });

      // Check if MFA is required
      if (result.mfaRequired && result.mfaToken) {
        setMfaToken(result.mfaToken);
        setNeedsTwoFactor(true);
      } else {
        // Login successful, redirect
        router.push(redirectPath);
        router.refresh(); // Refresh to update auth state
      }
    } catch (error: unknown) {
      const fronteggError = error as { message?: string };
      setErrorMsg(fronteggError.message || 'Error al iniciar sesión. Verifica tus credenciales.');
    }
  });

  const onSubmitTwoFactor = twoFactorMethods.handleSubmit(async (data) => {
    if (!mfaToken) {
      setErrorMsg('Token MFA no encontrado. Por favor, vuelve a iniciar sesión.');
      setNeedsTwoFactor(false);
      return;
    }

    setErrorMsg('');

    try {
      await verifyMfa({
        mfaToken,
        code: data.code,
      });
      router.push(redirectPath);
      router.refresh();
    } catch (error: unknown) {
      const fronteggError = error as { message?: string };
      setErrorMsg(fronteggError.message || 'Código de verificación inválido');
    }
  });

  const handleGoogleSignIn = () => {
    loginWithGoogle();
  };

  // Two-factor authentication view
  if (needsTwoFactor) {
    return (
      <>
        <FormHead
          title="Autenticación de dos factores"
          description="Introduce el código de verificación de tu aplicación de autenticación"
        />

        {errorMsg && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {errorMsg}
          </Alert>
        )}

        <Form methods={twoFactorMethods} onSubmit={onSubmitTwoFactor}>
          <Box gap={3} display="flex" flexDirection="column">
            <Field.Text
              name="code"
              label="Código de verificación"
              placeholder="Introduce el código de 6 dígitos"
              autoFocus
            />

            <LoadingButton
              fullWidth
              size="large"
              type="submit"
              color="primary"
              variant="contained"
              loading={isLoading}
            >
              Verificar
            </LoadingButton>

            <Typography
              variant="body2"
              sx={{ textAlign: 'center', cursor: 'pointer', color: 'text.secondary' }}
              onClick={() => {
                setNeedsTwoFactor(false);
                setMfaToken(null);
                setErrorMsg('');
                twoFactorMethods.reset();
              }}
            >
              Volver al inicio de sesión
            </Typography>
          </Box>
        </Form>
      </>
    );
  }

  // Regular sign in view
  return (
    <>
      <FormHead
        title="Iniciar sesión"
        description={
          <>
            ¿No tienes una cuenta?{' '}
            <Link href={signUpPath} variant="subtitle2">
              Regístrate
            </Link>
          </>
        }
      />

      {errorMsg && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {errorMsg}
        </Alert>
      )}

      <Form methods={methods} onSubmit={onSubmit}>
        <Box gap={3} display="flex" flexDirection="column">
          <Field.Text
            name="email"
            label="Correo electrónico"
            autoComplete="email"
          />

          <Field.Text
            name="password"
            label="Contraseña"
            type="password"
            autoComplete="current-password"
          />

          <LoadingButton
            fullWidth
            size="large"
            type="submit"
            color="primary"
            variant="contained"
            loading={isLoading}
          >
            Iniciar sesión
          </LoadingButton>
        </Box>
      </Form>

      <FormDivider />

      <FormSocials onGoogleClick={handleGoogleSignIn} />
    </>
  );
}
