'use client';

import type { GlobalUser } from '@serveflow/core';
import { createContext, useContext } from 'react';

// ----------------------------------------------------------------------

interface CurrentUserContextValue {
  user: GlobalUser;
}

const CurrentUserContext = createContext<CurrentUserContextValue | null>(null);

// ----------------------------------------------------------------------

interface CurrentUserProviderProps {
  user: GlobalUser;
  children: React.ReactNode;
}

export function CurrentUserProvider({ user, children }: CurrentUserProviderProps) {
  return (
    <CurrentUserContext.Provider value={{ user }}>
      {children}
    </CurrentUserContext.Provider>
  );
}

// ----------------------------------------------------------------------

export function useCurrentUser(): GlobalUser {
  const context = useContext(CurrentUserContext);

  if (!context) {
    throw new Error('useCurrentUser must be used within a CurrentUserProvider');
  }

  return context.user;
}

// ----------------------------------------------------------------------

export function useCurrentUserOptional(): GlobalUser | null {
  const context = useContext(CurrentUserContext);
  return context?.user ?? null;
}
