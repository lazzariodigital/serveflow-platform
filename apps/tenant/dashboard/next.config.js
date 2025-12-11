//@ts-check

 
const { composePlugins, withNx } = require('@nx/next');

/**
 * @type {import('@nx/next/plugins/with-nx').WithNxOptions}
 **/
const nextConfig = {
  // Use this to set Nx-specific options
  // See: https://nx.dev/recipes/next/next-config-setup
  nx: {},

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
  // Add more Next.js plugins to this list if needed.
  withNx,
];

module.exports = composePlugins(...plugins)(nextConfig);
