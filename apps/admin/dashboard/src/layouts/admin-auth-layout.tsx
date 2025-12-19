'use client';

import type { HeaderSectionProps, LayoutSectionProps, MainSectionProps } from '@serveflow/ui';
import { HeaderSection, LayoutSection, MainSection, Logo } from '@serveflow/ui';

import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import type { Breakpoint } from '@mui/material/styles';
import { merge } from 'es-toolkit';

// ----------------------------------------------------------------------

/**
 * Admin Auth Layout
 *
 * Simplified auth layout for admin-dashboard (Control Plane):
 * - No tenant context required
 * - Fixed Serveflow branding
 * - Clean split layout
 */

type LayoutBaseProps = Pick<LayoutSectionProps, 'sx' | 'children' | 'cssVars'>;

export type AdminAuthLayoutProps = LayoutBaseProps & {
  layoutQuery?: Breakpoint;
  slotProps?: {
    header?: HeaderSectionProps;
    main?: MainSectionProps;
    section?: AdminAuthSectionProps;
    content?: AdminAuthContentProps;
  };
};

// Section props (left side)
interface AdminAuthSectionProps {
  title?: string;
  subtitle?: string;
  sx?: LayoutSectionProps['sx'];
}

// Content props (right side with form)
interface AdminAuthContentProps {
  sx?: LayoutSectionProps['sx'];
}

export function AdminAuthLayout({
  sx,
  cssVars,
  children,
  slotProps,
  layoutQuery = 'md',
}: AdminAuthLayoutProps) {
  const renderHeader = () => {
    const headerSlotProps: HeaderSectionProps['slotProps'] = {
      container: { maxWidth: false },
    };

    const headerSlots: HeaderSectionProps['slots'] = {
      topArea: (
        <Alert severity="info" sx={{ display: 'none', borderRadius: 0 }}>
          This is an info Alert.
        </Alert>
      ),
      leftArea: (
        <>
          {/* Serveflow logo (no tenant branding) */}
          <Logo />
        </>
      ),
      rightArea: (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 1, sm: 1.5 } }}>
          {/* Settings or help links can go here */}
        </Box>
      ),
    };

    return (
      <HeaderSection
        disableElevation
        layoutQuery={layoutQuery}
        {...slotProps?.header}
        slots={{ ...headerSlots, ...slotProps?.header?.slots }}
        slotProps={merge(headerSlotProps, slotProps?.header?.slotProps ?? {})}
        sx={[
          { position: { [layoutQuery]: 'fixed' } },
          ...(Array.isArray(slotProps?.header?.sx) ? slotProps.header.sx : [slotProps?.header?.sx]),
        ]}
      />
    );
  };

  const renderFooter = () => null;

  const renderMain = () => (
    <MainSection
      {...slotProps?.main}
      sx={[
        (theme) => ({ [theme.breakpoints.up(layoutQuery)]: { flexDirection: 'row' } }),
        ...(Array.isArray(slotProps?.main?.sx) ? slotProps.main.sx : [slotProps?.main?.sx]),
      ]}
    >
      {/* Left section with branding */}
      <AdminAuthSection
        layoutQuery={layoutQuery}
        {...slotProps?.section}
      />
      {/* Right section with form */}
      <AdminAuthContent layoutQuery={layoutQuery} {...slotProps?.content}>
        {children}
      </AdminAuthContent>
    </MainSection>
  );

  return (
    <LayoutSection
      headerSection={renderHeader()}
      footerSection={renderFooter()}
      cssVars={{ '--layout-auth-content-width': '420px', ...cssVars }}
      sx={sx}
    >
      {renderMain()}
    </LayoutSection>
  );
}

// ----------------------------------------------------------------------
// Section Component (Left side with branding)
// ----------------------------------------------------------------------

function AdminAuthSection({
  title = 'Serveflow Admin',
  subtitle = 'Panel de administración',
  layoutQuery = 'md',
  sx,
}: AdminAuthSectionProps & { layoutQuery?: Breakpoint }) {
  return (
    <Box
      sx={[
        (theme) => ({
          ...theme.mixins.hideScrollY,
          display: 'none',
          position: 'relative',
          flex: '1 1 auto',
          [theme.breakpoints.up(layoutQuery)]: {
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'column',
          },
        }),
        ...(Array.isArray(sx) ? sx : [sx]),
      ]}
    >
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
          p: 4,
        }}
      >
        <Box
          component="h1"
          sx={{
            typography: 'h3',
            mb: 2,
          }}
        >
          {title}
        </Box>
        {subtitle && (
          <Box
            component="p"
            sx={{
              typography: 'body1',
              color: 'text.secondary',
            }}
          >
            {subtitle}
          </Box>
        )}
      </Box>
    </Box>
  );
}

// ----------------------------------------------------------------------
// Content Component (Right side with form)
// ----------------------------------------------------------------------

function AdminAuthContent({
  children,
  layoutQuery = 'md',
  sx,
}: AdminAuthContentProps & { children: React.ReactNode; layoutQuery?: Breakpoint }) {
  return (
    <Box
      sx={[
        (theme) => ({
          px: 2,
          py: 5,
          width: 1,
          mx: 'auto',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          maxWidth: 'var(--layout-auth-content-width)',
          [theme.breakpoints.up(layoutQuery)]: {
            py: 0,
            px: 8,
            maxWidth: 480,
          },
        }),
        ...(Array.isArray(sx) ? sx : [sx]),
      ]}
    >
      {children}
    </Box>
  );
}
