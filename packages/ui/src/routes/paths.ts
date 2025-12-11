// ----------------------------------------------------------------------

const ROOTS = {
  AUTH: '/auth',
  DASHBOARD: '/dashboard',
  APP: '/app',
};

// ----------------------------------------------------------------------

export const paths = {
  faqs: '/faqs',
  minimalStore: 'https://mui.com/store/items/minimal-dashboard/',
  // AUTH
  auth: {
    amplify: {
      signIn: `${ROOTS.AUTH}/amplify/sign-in`,
      verify: `${ROOTS.AUTH}/amplify/verify`,
      signUp: `${ROOTS.AUTH}/amplify/sign-up`,
      updatePassword: `${ROOTS.AUTH}/amplify/update-password`,
      resetPassword: `${ROOTS.AUTH}/amplify/reset-password`,
    },
    jwt: {
      signIn: `${ROOTS.AUTH}/jwt/sign-in`,
      signUp: `${ROOTS.AUTH}/jwt/sign-up`,
    },
    firebase: {
      signIn: `${ROOTS.AUTH}/firebase/sign-in`,
      verify: `${ROOTS.AUTH}/firebase/verify`,
      signUp: `${ROOTS.AUTH}/firebase/sign-up`,
      resetPassword: `${ROOTS.AUTH}/firebase/reset-password`,
    },
    auth0: {
      signIn: `${ROOTS.AUTH}/auth0/sign-in`,
    },
    supabase: {
      signIn: `${ROOTS.AUTH}/supabase/sign-in`,
      verify: `${ROOTS.AUTH}/supabase/verify`,
      signUp: `${ROOTS.AUTH}/supabase/sign-up`,
      updatePassword: `${ROOTS.AUTH}/supabase/update-password`,
      resetPassword: `${ROOTS.AUTH}/supabase/reset-password`,
    },
  },
  // DASHBOARD
  dashboard: {
    root: ROOTS.DASHBOARD,
    bookings: `${ROOTS.DASHBOARD}/bookings`,
    classes: `${ROOTS.DASHBOARD}/classes`,
    users: {
      root: `${ROOTS.DASHBOARD}/users`,
      new: `${ROOTS.DASHBOARD}/user/new`,
      details: (id: string) => `${ROOTS.DASHBOARD}/user/detail/${id}`,
      students: `${ROOTS.DASHBOARD}/users/students`,
      clients: `${ROOTS.DASHBOARD}/users/clients`,
      contacts: `${ROOTS.DASHBOARD}/users/contacts`,
      members: `${ROOTS.DASHBOARD}/users/members`,
      providers: `${ROOTS.DASHBOARD}/users/providers`,
    },
    clients: {
      root: `${ROOTS.DASHBOARD}/clients`,
      details: (id: string) => `${ROOTS.DASHBOARD}/clients/detail/${id}`,
    },
    events: {
      root: `${ROOTS.DASHBOARD}/events`,
      details: (id: string) => `${ROOTS.DASHBOARD}/events/detail/${id}`,
    },
    organization: {
      detail: `${ROOTS.DASHBOARD}/organization/detail/`,
      services: {
        root: `${ROOTS.DASHBOARD}/organization/services`,
        details: (id: string) => `${ROOTS.DASHBOARD}/organization/services/detail/${id}`,
      },
      users: {
        root: `${ROOTS.DASHBOARD}/organization/users`,
        details: (id: string) => `${ROOTS.DASHBOARD}/organization/users/detail/${id}`,
      },
      resources: {
        root: `${ROOTS.DASHBOARD}/organization/resources`,
        details: (id: string) => `${ROOTS.DASHBOARD}/organization/resources/detail/${id}`,
      },
      vouchers: {
        root: `${ROOTS.DASHBOARD}/organization/vouchers`,
        vouchersRules: `${ROOTS.DASHBOARD}/organization/vouchersRules`,
      },
      settings: {
        root: `${ROOTS.DASHBOARD}/organization/settings`,
        publicSpace: `${ROOTS.DASHBOARD}/organization/settings/public-space`,
        configuration: `${ROOTS.DASHBOARD}/organization/settings/configuration`,
      },
    },
    orders: {
      root: `${ROOTS.DASHBOARD}/orders`,
      details: (id: string) => `${ROOTS.DASHBOARD}/orders/${id}`,
    },
    payments: `${ROOTS.DASHBOARD}/payments`,
    whatsapp: `${ROOTS.DASHBOARD}/whatsapp`,
  },
  publicBooking: {
    root: '/bookings',
    service: '/bookings/service',
    details: '/bookings/details',
    summary: '/bookings/summary',
    payment: '/bookings/payment',
    confirmation: '/bookings/confirmation',
  },
  // APP (User Area)
  app: {
    root: ROOTS.APP,
    calendar: `${ROOTS.APP}/calendar`,
    bookings: {
      root: `${ROOTS.APP}/bookings`,
      details: (id: string) => `${ROOTS.APP}/bookings/${id}`,
    },
    classes: {
      root: `${ROOTS.APP}/classes`,
      details: (id: string) => `${ROOTS.APP}/classes/${id}`,
    },
    orders: {
      root: `${ROOTS.APP}/orders`,
      details: (id: string) => `${ROOTS.APP}/orders/${id}`,
    },
    vouchers: {
      root: `${ROOTS.APP}/vouchers`,
      details: (id: string) => `${ROOTS.APP}/vouchers/${id}`,
    },
    wallet: {
      root: `${ROOTS.APP}/wallet`,
      movement: (id: string) => `${ROOTS.APP}/wallet/movement/${id}`,
      history: `${ROOTS.APP}/wallet/history`,
    },
    account: `${ROOTS.APP}/account`,
    settings: `${ROOTS.APP}/settings`,
  },
};
