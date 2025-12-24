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
import { useFusionAuth } from '../hooks/use-fusionauth';
import { useTenant } from '@serveflow/tenants/react';

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
  /**
   * Which app this sign-up is for - determines which FusionAuth application ID to use.
   * - 'dashboard': Uses tenant.fusionauthApplications.dashboard.id
   * - 'webapp': Uses tenant.fusionauthApplications.webapp.id
   * @default 'dashboard'
   */
  appType?: 'dashboard' | 'webapp';
};

export function SignUpView({
  signInPath = '/sign-in',
  redirectPath = '/',
  appType = 'dashboard',
}: SignUpViewProps) {
  const router = useRouter();
  const { tenant } = useTenant();

  // Get the correct applicationId based on appType
  const applicationId = appType === 'webapp'
    ? tenant?.fusionauthApplications?.webapp?.id
    : tenant?.fusionauthApplications?.dashboard?.id;

  const { signUp, loginWithGoogle, isLoading } = useFusionAuth({
    applicationId,
    tenantId: tenant?.fusionauthTenantId,
  });
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
      // Assign default role based on appType:
      // - webapp: 'client' (default role for self-registration per 03-PERMISOS.md)
      // - dashboard: no default role (admin creates users with specific roles)
      const defaultRoles = appType === 'webapp' ? ['client'] : [];

      const result = await signUp({
        email: data.email,
        password: data.password,
        firstName: data.firstName,
        lastName: data.lastName,
        roles: defaultRoles,
      });

      // If signup returns token (auto-login), redirect immediately
      if (result.token) {
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
      const authError = error as { message?: string };
      setErrorMsg(authError.message || 'Error al crear la cuenta. Por favor, inténtalo de nuevo.');
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
