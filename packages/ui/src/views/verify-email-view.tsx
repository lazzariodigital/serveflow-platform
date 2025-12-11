'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import Box from '@mui/material/Box';
import Alert from '@mui/material/Alert';
import LoadingButton from '@mui/lab/LoadingButton';
import Typography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';

import { Form, Field } from '../components/hook-form';
import { FormHead } from '../components/form-head';
import { useFronteggAuth } from '../hooks/use-frontegg-auth';

// ----------------------------------------------------------------------

interface VerifyFormData {
  code: string;
}

export type VerifyEmailViewProps = {
  redirectPath?: string;
  signInPath?: string;
};

export function VerifyEmailView({
  redirectPath = '/',
  signInPath = '/sign-in',
}: VerifyEmailViewProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { activateAccount, resendActivationEmail, isLoading } = useFronteggAuth();
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [isResending, setIsResending] = useState(false);
  const [isAutoVerifying, setIsAutoVerifying] = useState(false);
  const [userEmail, setUserEmail] = useState('');

  const methods = useForm<VerifyFormData>({
    defaultValues: { code: '' },
  });

  // Check for activation token in URL (from email link)
  const activationToken = searchParams.get('token');
  const userId = searchParams.get('userId');
  const emailParam = searchParams.get('email');

  // Store email for resend functionality
  useEffect(() => {
    if (emailParam) {
      setUserEmail(emailParam);
    }
  }, [emailParam]);

  // Auto-activate if token is in URL
  useEffect(() => {
    const autoActivate = async () => {
      if (activationToken && userId) {
        setIsAutoVerifying(true);
        try {
          await activateAccount({
            token: activationToken,
            userId,
          });
          setSuccessMsg('¡Cuenta verificada correctamente! Redirigiendo...');
          setTimeout(() => {
            router.push(redirectPath);
            router.refresh();
          }, 2000);
        } catch (error: unknown) {
          const fronteggError = error as { message?: string };
          setErrorMsg(fronteggError.message || 'Error al verificar la cuenta. El enlace puede haber expirado.');
        } finally {
          setIsAutoVerifying(false);
        }
      }
    };

    autoActivate();
  }, [activationToken, userId, activateAccount, router, redirectPath]);

  const onSubmit = methods.handleSubmit(async (data) => {
    setErrorMsg('');
    setSuccessMsg('');

    if (!userId) {
      setErrorMsg('No se encontró el ID de usuario. Por favor, usa el enlace del email.');
      return;
    }

    try {
      await activateAccount({
        token: data.code,
        userId,
      });
      setSuccessMsg('¡Cuenta verificada correctamente! Redirigiendo...');
      setTimeout(() => {
        router.push(redirectPath);
        router.refresh();
      }, 2000);
    } catch (error: unknown) {
      const fronteggError = error as { message?: string };
      setErrorMsg(fronteggError.message || 'Código de verificación inválido');
    }
  });

  const handleResend = async () => {
    if (!userEmail) {
      setErrorMsg('No se encontró el email. Por favor, vuelve a registrarte.');
      return;
    }

    setIsResending(true);
    setErrorMsg('');

    try {
      await resendActivationEmail(userEmail);
      setSuccessMsg('Código reenviado. Por favor, revisa tu correo electrónico.');
    } catch (error: unknown) {
      const fronteggError = error as { message?: string };
      setErrorMsg(fronteggError.message || 'Error al reenviar el código');
    } finally {
      setIsResending(false);
    }
  };

  // Show loading while auto-verifying from email link
  if (isAutoVerifying) {
    return (
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: 300,
          gap: 2,
        }}
      >
        <CircularProgress />
        <Typography>Verificando tu cuenta...</Typography>
      </Box>
    );
  }

  return (
    <>
      <FormHead
        title="Verifica tu correo"
        description="Te hemos enviado un código de verificación a tu correo electrónico"
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
          <Field.Text
            name="code"
            label="Código de verificación"
            placeholder="Introduce el código de 6 dígitos"
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

          {userEmail && (
            <LoadingButton
              fullWidth
              size="large"
              color="inherit"
              variant="text"
              onClick={handleResend}
              loading={isResending}
            >
              Reenviar código
            </LoadingButton>
          )}

          <Typography
            variant="body2"
            sx={{ textAlign: 'center', cursor: 'pointer', color: 'text.secondary' }}
            onClick={() => router.push(signInPath)}
          >
            Volver al inicio de sesión
          </Typography>
        </Box>
      </Form>
    </>
  );
}
