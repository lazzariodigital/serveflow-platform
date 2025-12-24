import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type OrganizationDocument = HydratedDocument<Organization>;

/**
 * Organization Mongoose Schema (Sedes/Sucursales)
 * Location: db_tenant_{slug}.organizations
 *
 * Represents a physical location or branch of the tenant's business.
 * Users can be assigned to one or more organizations via organizationIds.
 *
 * Key principle: organizationIds: [] means access to ALL organizations.
 */
@Schema({
  collection: 'organizations',
  timestamps: true,
})
export class Organization {
  // ════════════════════════════════════════════════════════════════
  // REQUIRED - Campos obligatorios
  // ════════════════════════════════════════════════════════════════

  @Prop({ required: true, unique: true, index: true })
  slug!: string;

  @Prop({ required: true })
  name!: string;

  @Prop({ required: true, default: true, index: true })
  isActive!: boolean;

  // ════════════════════════════════════════════════════════════════
  // OPTIONAL - Campos opcionales
  // ════════════════════════════════════════════════════════════════

  @Prop()
  description?: string;

  @Prop({ type: Object })
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

  @Prop({ type: Object })
  contact?: {
    phone?: string;
    email?: string;
  };

  @Prop({
    type: Object,
    default: () => ({
      timezone: 'Europe/Madrid',
      currency: 'EUR',
    }),
  })
  settings!: {
    timezone: string;
    currency: string;
    businessHours?: Record<string, unknown>;
  };

  // Timestamps automáticos por { timestamps: true }
  createdAt!: Date;
  updatedAt!: Date;
}

export const OrganizationSchema = SchemaFactory.createForClass(Organization);

// ════════════════════════════════════════════════════════════════
// Índices adicionales
// ════════════════════════════════════════════════════════════════

OrganizationSchema.index({ isActive: 1, name: 1 });
OrganizationSchema.index({ 'address.city': 1 }, { sparse: true });
