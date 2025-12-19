'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import Box from '@mui/material/Box';
import Link from '@mui/material/Link';
import Alert from '@mui/material/Alert';
import Typography from '@mui/material/Typography';
import LoadingButton from '@mui/lab/LoadingButton';
import IconButton from '@mui/material/IconButton';
import InputAdornment from '@mui/material/InputAdornment';
import { Iconify } from '../components/iconify';

import { Form, Field } from '../components/hook-form';
import { FormHead } from '../components/form-head';
import { FormDivider } from '../components/form-divider';
import { FormSocials } from '../components/form-socials';
import { useFusionAuth } from '../hooks/use-fusionauth';
import { useTenant, useTenantAuthProviders } from '@serveflow/tenants/react';

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
  const { tenant } = useTenant();
  const { login, verifyTwoFactor, completeGoogleLogin, isLoading } = useFusionAuth({
    applicationId: tenant?.fusionauthApplicationId,
    tenantId: tenant?.fusionauthTenantId,
  });
  const authProviders = useTenantAuthProviders();
  const [errorMsg, setErrorMsg] = useState('');
  const [needsTwoFactor, setNeedsTwoFactor] = useState(false);
  const [twoFactorId, setTwoFactorId] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  // Get Google Client ID from tenant config (per-tenant OAuth)
  const googleClientId = authProviders?.google?.enabled ? authProviders.google.clientId : undefined;
  const showSocialLogin = !!googleClientId;

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

      console.log('[SignIn] Login result:', result);

      // Check if MFA is required (FusionAuth returns twoFactorId for 2FA)
      if (result.twoFactorId) {
        setTwoFactorId(result.twoFactorId);
        setNeedsTwoFactor(true);
      } else {
        // Login successful, redirect
        console.log('[SignIn] Redirecting to:', redirectPath);
        router.push(redirectPath);
        router.refresh(); // Refresh to update auth state
      }
    } catch (error: unknown) {
      const authError = error as { message?: string };
      setErrorMsg(authError.message || 'Error al iniciar sesión. Verifica tus credenciales.');
    }
  });

  const onSubmitTwoFactor = twoFactorMethods.handleSubmit(async (data) => {
    if (!twoFactorId) {
      setErrorMsg('Token MFA no encontrado. Por favor, vuelve a iniciar sesión.');
      setNeedsTwoFactor(false);
      return;
    }

    setErrorMsg('');

    try {
      await verifyTwoFactor({
        twoFactorId,
        code: data.code,
      });
      router.push(redirectPath);
      router.refresh();
    } catch (error: unknown) {
      const authError = error as { message?: string };
      setErrorMsg(authError.message || 'Código de verificación inválido');
    }
  });

  /**
   * Handle Google Sign-In via SDK (recommended white-label approach)
   * Receives the credential token from Google and completes login with FusionAuth
   */
  const handleGoogleCredential = async (credential: string) => {
    setErrorMsg('');
    setIsGoogleLoading(true);

    try {
      const result = await completeGoogleLogin(credential);

      console.log('[SignIn] Google login result:', result);

      // Check if user needs to complete registration
      if (result.needsRegistration) {
        // For now, redirect to sign-up or show a message
        setErrorMsg('Tu cuenta de Google no está registrada. Por favor, regístrate primero.');
        return;
      }

      // Check if 2FA is required
      if (result.twoFactorId) {
        setTwoFactorId(result.twoFactorId);
        setNeedsTwoFactor(true);
        return;
      }

      // Login successful, redirect
      console.log('[SignIn] Google login successful, redirecting to:', redirectPath);
      router.push(redirectPath);
      router.refresh();
    } catch (error: unknown) {
      const authError = error as { message?: string };
      setErrorMsg(authError.message || 'Error al iniciar sesión con Google');
    } finally {
      setIsGoogleLoading(false);
    }
  };

  /**
   * Handle Google SDK errors
   */
  const handleGoogleError = (error: Error) => {
    console.error('[SignIn] Google SDK error:', error);
    setErrorMsg(error.message || 'Error con Google Sign-In');
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
                setTwoFactorId(null);
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
            type={showPassword ? 'text' : 'password'}
            autoComplete="current-password"
            slotProps={{
              input: {
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      onClick={() => setShowPassword(!showPassword)}
                      edge="end"
                      aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                    >
                      <Iconify icon={showPassword ? 'solar:eye-bold' : 'solar:eye-closed-bold'} />
                    </IconButton>
                  </InputAdornment>
                ),
              },
            }}
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

      {showSocialLogin && (
        <>
          <FormDivider />

          <FormSocials
            googleClientId={googleClientId}
            onGoogleCredential={handleGoogleCredential}
            onGoogleError={handleGoogleError}
            loading={isGoogleLoading}
            disabled={isLoading}
          />
        </>
      )}
    </>
  );
}
