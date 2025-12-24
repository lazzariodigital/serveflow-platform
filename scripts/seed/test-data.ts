// ════════════════════════════════════════════════════════════════
// Test Data for Serveflow
// ════════════════════════════════════════════════════════════════
// Based on documentation examples from 03-PERMISOS.md
// ════════════════════════════════════════════════════════════════

export interface TestTenant {
  slug: string;
  name: string;
  plan: 'starter' | 'professional' | 'enterprise';
  branding?: {
    primaryColor?: string;
    appName?: string;
    logoUrl?: string;
  };
}

export interface TestOrganization {
  slug: string;
  name: string;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
    coordinates?: {
      lat: number;
      lng: number;
    };
  };
  contact?: {
    phone?: string;
    email?: string;
  };
  settings?: {
    timezone: string;
    currency: string;
  };
}

export interface TestUser {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  roles: string[];
  organizationIds: string[]; // Empty array = access to ALL organizations
  primaryOrganizationId?: string;
}

export interface TestTenantData {
  tenant: TestTenant;
  organizations: TestOrganization[];
  users: TestUser[];
}

// ════════════════════════════════════════════════════════════════
// TENANT 1: Gimnasio FitMax (Enterprise - 5 sedes para pruebas)
// ════════════════════════════════════════════════════════════════
export const gimnasioFitmax: TestTenantData = {
  tenant: {
    slug: 'gimnasio-fitmax',
    name: 'Gimnasio FitMax',
    plan: 'enterprise',
    branding: {
      primaryColor: '#FF5722',
      appName: 'FitMax',
    },
  },
  organizations: [
    {
      slug: 'madrid-centro',
      name: 'Madrid Centro',
      address: {
        street: 'Calle Gran Vía 28',
        city: 'Madrid',
        state: 'Madrid',
        postalCode: '28013',
        country: 'Spain',
        coordinates: { lat: 40.4200, lng: -3.7050 },
      },
      contact: {
        phone: '+34 91 123 4567',
        email: 'centro@fitmax.es',
      },
      settings: { timezone: 'Europe/Madrid', currency: 'EUR' },
    },
    {
      slug: 'madrid-norte',
      name: 'Madrid Norte',
      address: {
        street: 'Paseo de la Castellana 200',
        city: 'Madrid',
        state: 'Madrid',
        postalCode: '28046',
        country: 'Spain',
        coordinates: { lat: 40.4650, lng: -3.6900 },
      },
      contact: {
        phone: '+34 91 234 5678',
        email: 'norte@fitmax.es',
      },
      settings: { timezone: 'Europe/Madrid', currency: 'EUR' },
    },
    {
      slug: 'madrid-sur',
      name: 'Madrid Sur',
      address: {
        street: 'Avenida de Andalucía 15',
        city: 'Madrid',
        state: 'Madrid',
        postalCode: '28041',
        country: 'Spain',
        coordinates: { lat: 40.3750, lng: -3.6950 },
      },
      contact: {
        phone: '+34 91 345 6789',
        email: 'sur@fitmax.es',
      },
      settings: { timezone: 'Europe/Madrid', currency: 'EUR' },
    },
    {
      slug: 'barcelona-eixample',
      name: 'Barcelona Eixample',
      address: {
        street: 'Passeig de Gràcia 50',
        city: 'Barcelona',
        state: 'Cataluña',
        postalCode: '08007',
        country: 'Spain',
        coordinates: { lat: 41.3930, lng: 2.1640 },
      },
      contact: {
        phone: '+34 93 123 4567',
        email: 'eixample@fitmax.es',
      },
      settings: { timezone: 'Europe/Madrid', currency: 'EUR' },
    },
    {
      slug: 'valencia-centro',
      name: 'Valencia Centro',
      address: {
        street: 'Calle Colón 25',
        city: 'Valencia',
        state: 'Valencia',
        postalCode: '46004',
        country: 'Spain',
        coordinates: { lat: 39.4700, lng: -0.3760 },
      },
      contact: {
        phone: '+34 96 123 4567',
        email: 'valencia@fitmax.es',
      },
      settings: { timezone: 'Europe/Madrid', currency: 'EUR' },
    },
  ],
  users: [
    // Admin con acceso a TODAS las organizaciones (organizationIds: [])
    {
      email: 'admin@fitmax.es',
      password: 'Test1234!',
      firstName: 'Carlos',
      lastName: 'López',
      roles: ['admin'],
      organizationIds: [], // Full access
    },
    // Empleado con acceso a sedes de Madrid
    {
      email: 'empleado.madrid@fitmax.es',
      password: 'Test1234!',
      firstName: 'Juan',
      lastName: 'García',
      roles: ['employee'],
      organizationIds: ['madrid-centro', 'madrid-norte', 'madrid-sur'],
      primaryOrganizationId: 'madrid-centro',
    },
    // Empleado con acceso solo a Barcelona
    {
      email: 'empleado.barcelona@fitmax.es',
      password: 'Test1234!',
      firstName: 'Anna',
      lastName: 'Puig',
      roles: ['employee'],
      organizationIds: ['barcelona-eixample'],
      primaryOrganizationId: 'barcelona-eixample',
    },
    // Provider (entrenador) con acceso a Madrid Centro y Norte
    {
      email: 'trainer@fitmax.es',
      password: 'Test1234!',
      firstName: 'Pedro',
      lastName: 'Martínez',
      roles: ['provider'],
      organizationIds: ['madrid-centro', 'madrid-norte'],
      primaryOrganizationId: 'madrid-centro',
    },
    // Cliente con acceso a todas las sedes
    {
      email: 'cliente.premium@fitmax.es',
      password: 'Test1234!',
      firstName: 'María',
      lastName: 'Fernández',
      roles: ['client'],
      organizationIds: [], // Premium client - all locations
    },
    // Cliente con acceso solo a Madrid Centro
    {
      email: 'cliente@fitmax.es',
      password: 'Test1234!',
      firstName: 'Luis',
      lastName: 'Sánchez',
      roles: ['client'],
      organizationIds: ['madrid-centro'],
      primaryOrganizationId: 'madrid-centro',
    },
  ],
};

// ════════════════════════════════════════════════════════════════
// TENANT 2: Studio Pilates (Professional - 2 sedes)
// ════════════════════════════════════════════════════════════════
export const studioPilates: TestTenantData = {
  tenant: {
    slug: 'studio-pilates',
    name: 'Studio Pilates Madrid',
    plan: 'professional',
    branding: {
      primaryColor: '#9C27B0',
      appName: 'Studio Pilates',
    },
  },
  organizations: [
    {
      slug: 'chamberi',
      name: 'Chamberí',
      address: {
        street: 'Calle Ponzano 45',
        city: 'Madrid',
        state: 'Madrid',
        postalCode: '28003',
        country: 'Spain',
      },
      contact: {
        phone: '+34 91 456 7890',
        email: 'chamberi@studiopilates.es',
      },
      settings: { timezone: 'Europe/Madrid', currency: 'EUR' },
    },
    {
      slug: 'salamanca',
      name: 'Salamanca',
      address: {
        street: 'Calle Serrano 80',
        city: 'Madrid',
        state: 'Madrid',
        postalCode: '28006',
        country: 'Spain',
      },
      contact: {
        phone: '+34 91 567 8901',
        email: 'salamanca@studiopilates.es',
      },
      settings: { timezone: 'Europe/Madrid', currency: 'EUR' },
    },
  ],
  users: [
    // Admin
    {
      email: 'admin@studiopilates.es',
      password: 'Test1234!',
      firstName: 'Laura',
      lastName: 'Gómez',
      roles: ['admin'],
      organizationIds: [], // Full access
    },
    // Instructora Chamberí
    {
      email: 'instructora@studiopilates.es',
      password: 'Test1234!',
      firstName: 'Elena',
      lastName: 'Ruiz',
      roles: ['provider'],
      organizationIds: ['chamberi'],
      primaryOrganizationId: 'chamberi',
    },
    // Cliente
    {
      email: 'cliente@studiopilates.es',
      password: 'Test1234!',
      firstName: 'Carmen',
      lastName: 'Díaz',
      roles: ['client'],
      organizationIds: ['chamberi', 'salamanca'],
      primaryOrganizationId: 'chamberi',
    },
  ],
};

// ════════════════════════════════════════════════════════════════
// TENANT 3: CrossFit Box (Starter - 1 sede)
// ════════════════════════════════════════════════════════════════
export const crossfitBox: TestTenantData = {
  tenant: {
    slug: 'crossfit-box',
    name: 'CrossFit Box Madrid',
    plan: 'starter',
    branding: {
      primaryColor: '#F44336',
      appName: 'CrossFit Box',
    },
  },
  organizations: [
    {
      slug: 'main',
      name: 'Box Principal',
      address: {
        street: 'Calle Industrial 15',
        city: 'Madrid',
        state: 'Madrid',
        postalCode: '28020',
        country: 'Spain',
      },
      contact: {
        phone: '+34 91 678 9012',
        email: 'info@crossfitbox.es',
      },
      settings: { timezone: 'Europe/Madrid', currency: 'EUR' },
    },
  ],
  users: [
    // Admin (también es coach)
    {
      email: 'admin@crossfitbox.es',
      password: 'Test1234!',
      firstName: 'Miguel',
      lastName: 'Torres',
      roles: ['admin', 'provider'],
      organizationIds: [],
    },
    // Coach
    {
      email: 'coach@crossfitbox.es',
      password: 'Test1234!',
      firstName: 'Sara',
      lastName: 'López',
      roles: ['provider'],
      organizationIds: ['main'],
      primaryOrganizationId: 'main',
    },
    // Atleta
    {
      email: 'atleta@crossfitbox.es',
      password: 'Test1234!',
      firstName: 'Pablo',
      lastName: 'Martín',
      roles: ['client'],
      organizationIds: ['main'],
      primaryOrganizationId: 'main',
    },
  ],
};

// ════════════════════════════════════════════════════════════════
// All test tenants
// ════════════════════════════════════════════════════════════════
export const allTestTenants: TestTenantData[] = [
  gimnasioFitmax,
  studioPilates,
  crossfitBox,
];

// Export individual tenants for selective seeding
export default allTestTenants;
