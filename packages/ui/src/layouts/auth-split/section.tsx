import type { BoxProps } from '@mui/material/Box';
import Box from '@mui/material/Box';
import Link from '@mui/material/Link';
import type { Breakpoint } from '@mui/material/styles';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import { varAlpha } from 'minimal-shared/utils';

// ----------------------------------------------------------------------

export type AuthSplitSectionProps = BoxProps & {
  title?: string;
  method?: string;
  imgUrl?: string;
  subtitle?: string;
  layoutQuery?: Breakpoint;
  methods?: {
    path: string;
    icon: string;
    label: string;
  }[];
};

export function AuthSplitSection({
  sx,
  method,
  methods,
  layoutQuery = 'md',
  title = 'Manage the job',
  imgUrl = `https://firebasestorage.googleapis.com/v0/b/matching-academy.appspot.com/o/freepik__background__14387%201.png?alt=media&token=314c9e74-114d-4484-9ae9-31bcc120e48b`,
  subtitle = 'More effectively with optimized workflows.',
  ...other
}: AuthSplitSectionProps) {
  return (
    <Box
      sx={[
        (theme) => ({
          ...theme.mixins.bgGradient({
            images: [
              `linear-gradient(0deg, ${varAlpha(theme.vars.palette.background.defaultChannel, 0.92)}, ${varAlpha(theme.vars.palette.background.defaultChannel, 0.92)})`,
              // `url(https://firebasestorage.googleapis.com/v0/b/matching-academy.appspot.com/o/dmitry-osipenko-v37kr3k_G3M-unsplash.png)`,
            ],
          }),
          px: 3,
          pb: 3,
          width: 1,
          maxWidth: 480,
          display: 'none',
          position: 'relative',
          pt: 'var(--layout-header-desktop-height)',
          [theme.breakpoints.up(layoutQuery)]: {
            gap: 8,
            display: 'flex',
            alignItems: 'center',
            flexDirection: 'column',
            justifyContent: 'center',
          },
        }),
        ...(Array.isArray(sx) ? sx : [sx]),
      ]}
      {...other}
    >
      <div>
        <Typography variant="h3" sx={{ textAlign: 'center' }}>
          {title}
        </Typography>

        {subtitle && (
          <Typography sx={{ color: 'text.secondary', textAlign: 'center', mt: 2 }}>
            {subtitle}
          </Typography>
        )}
      </div>

      <Box
        component="img"
        alt="Dashboard illustration"
        src={imgUrl}
        sx={{ width: 1, aspectRatio: '4/3', objectFit: 'contain' }}
      />

      {!!methods?.length && method && (
        <Box component="ul" sx={{ gap: 2, display: 'flex' }}>
          {methods.map((option) => {
            const selected = method === option.label.toLowerCase();

            return (
              <Box
                key={option.label}
                component="li"
                sx={{
                  ...(!selected && {
                    cursor: 'not-allowed',
                    filter: 'grayscale(1)',
                  }),
                }}
              >
                <Tooltip title={option.label} placement="top">
                  <Link
                    // component={RouterLink}
                    href={option.path}
                    sx={{ ...(!selected && { pointerEvents: 'none' }) }}
                  >
                    <Box
                      component="img"
                      alt={option.label}
                      src={option.icon}
                      sx={{ width: 32, height: 32 }}
                    />
                  </Link>
                </Tooltip>
              </Box>
            );
          })}
        </Box>
      )}
    </Box>
  );
}
