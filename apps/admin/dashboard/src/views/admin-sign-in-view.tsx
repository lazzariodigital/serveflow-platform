'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import Box from '@mui/material/Box';
import Alert from '@mui/material/Alert';
import Typography from '@mui/material/Typography';
import LoadingButton from '@mui/lab/LoadingButton';
import IconButton from '@mui/material/IconButton';
import InputAdornment from '@mui/material/InputAdornment';
import { Iconify, Form, Field, FormHead } from '@serveflow/ui';
import { useFusionAuth } from '@serveflow/ui';

// ----------------------------------------------------------------------

interface SignInFormData {
  email: string;
  password: string;
}

interface TwoFactorFormData {
  code: string;
}

export type AdminSignInViewProps = {
  redirectPath?: string;
};

/**
 * Admin Sign-In View
 *
 * Simplified version for admin-dashboard (Control Plane):
 * - No tenant context required
 * - No social login (admin uses email/password only)
 * - No sign-up link (admins are created manually)
 */
export function AdminSignInView({
  redirectPath = '/',
}: AdminSignInViewProps) {
  const router = useRouter();
  // Use admin-specific application ID and tenant ID from env vars
  const { login, verifyTwoFactor, isLoading } = useFusionAuth({
    applicationId: process.env.NEXT_PUBLIC_FUSIONAUTH_ADMIN_APPLICATION_ID,
    tenantId: process.env.NEXT_PUBLIC_FUSIONAUTH_ADMIN_TENANT_ID,
  });
  const [errorMsg, setErrorMsg] = useState('');
  const [needsTwoFactor, setNeedsTwoFactor] = useState(false);
  const [twoFactorId, setTwoFactorId] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

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

      if (result.twoFactorId) {
        setTwoFactorId(result.twoFactorId);
        setNeedsTwoFactor(true);
      } else {
        router.push(redirectPath);
        router.refresh();
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
        description="Panel de administración de Serveflow"
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
    </>
  );
}
