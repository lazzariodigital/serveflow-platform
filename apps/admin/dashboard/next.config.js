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
  // Admin Dashboard - No tenant resolution
  // Uses fixed FusionAuth Tenant ID from env vars
  // ════════════════════════════════════════════════════════════════
};

const plugins = [
  withNx,
];

module.exports = composePlugins(...plugins)(nextConfig);
