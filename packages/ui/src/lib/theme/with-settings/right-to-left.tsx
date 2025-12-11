'use client';

import { CacheProvider } from '@emotion/react';
import type { Direction } from '@mui/material/styles';
import createCache from '@emotion/cache';
import rtlPlugin from 'stylis-plugin-rtl';
import { useEffect } from 'react';

// ----------------------------------------------------------------------

type RtlProps = {
  direction: Direction;
  children: React.ReactNode;
};

const cacheRtl = () =>
  createCache({
    key: 'rtl',
    stylisPlugins: [rtlPlugin],
  });

export function Rtl({ children, direction }: RtlProps) {
  useEffect(() => {
    document.dir = direction;
  }, [direction]);

  if (direction === 'rtl') {
    return <CacheProvider value={cacheRtl()}>{children}</CacheProvider>;
  }

  return <>{children}</>;
}
