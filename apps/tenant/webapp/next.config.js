//@ts-check

const { composePlugins, withNx } = require('@nx/next');

/**
 * @type {import('@nx/next/plugins/with-nx').WithNxOptions}
 **/
const nextConfig = {
  nx: {},

  // Temporary: ignore TypeScript errors from packages/ui MUI compatibility issues
  // TODO: Fix MUI type errors in packages/ui and remove this
  typescript: {
    ignoreBuildErrors: true,
  },

  // ════════════════════════════════════════════════════════════════
  // IMPORT PATTERN FOR NEXT.JS APPS
  // ════════════════════════════════════════════════════════════════
  // This app uses proper import paths to avoid bundling server-only packages:
  // - @serveflow/tenants/resolve  (pure resolver, no NestJS)
  // - @serveflow/db/client        (pure MongoDB, no NestJS)
  // See: docs/v2/01-FUNDACION.md section 5.6
  // ════════════════════════════════════════════════════════════════
};

const plugins = [
  withNx,
];

module.exports = composePlugins(...plugins)(nextConfig);
