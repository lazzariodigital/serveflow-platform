import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
// Note: Tenant core schema has a different MVP structure. This Mongoose schema
// is the actual DB implementation which may evolve independently.

export type TenantDocument = HydratedDocument<Tenant>;

/**
 * Tenant Mongoose Schema
 * Location: db_serveflow_sys.tenants
 *
 * Note: Structure differs from @serveflow/core TenantMVP for practical reasons.
 * Core schema defines the ideal/target structure, Mongoose reflects current implementation.
 */
@Schema({
  collection: 'tenants',
  timestamps: true,
})
export class Tenant {
  @Prop({ required: true, unique: true, lowercase: true, index: true })
  slug!: string;

  @Prop({ required: true })
  name!: string;

  @Prop({ required: true })
  dbName!: string;

  @Prop({ required: true })
  fusionauthTenantId!: string;

  @Prop({ required: true })
  fusionauthApplicationId!: string;

  @Prop({
    required: true,
    enum: ['active', 'suspended', 'trial', 'churned'],
    default: 'trial',
    index: true,
  })
  status!: string;

  @Prop({
    required: true,
    enum: ['free', 'starter', 'pro', 'enterprise'],
    default: 'free',
    index: true,
  })
  plan!: string;

  @Prop({ type: Object })
  branding?: {
    logoUrl?: string;
    primaryColor?: string;
    secondaryColor?: string;
    faviconUrl?: string;
  };

  @Prop({ type: Object })
  theming?: {
    preset: string;
    customCSS?: string;
  };

  @Prop({ type: Object })
  settings?: {
    timezone: string;
    locale: string;
    currency: string;
    dateFormat?: string;
    timeFormat?: string;
  };

  @Prop()
  trialEndsAt?: Date;

  @Prop()
  subscriptionEndsAt?: Date;

  @Prop({ type: Object })
  metadata?: Record<string, unknown>;

  /**
   * Social auth configuration per tenant
   * Each tenant can have their own Google OAuth credentials
   */
  @Prop({ type: Object })
  authProviders?: {
    google?: {
      clientId: string;  // Google OAuth Client ID for this tenant
      enabled: boolean;
    };
    github?: {
      clientId: string;
      enabled: boolean;
    };
  };

  createdAt!: Date;
  updatedAt!: Date;
}

export const TenantSchema = SchemaFactory.createForClass(Tenant);

TenantSchema.index({ status: 1, plan: 1 });
TenantSchema.index({ fusionauthTenantId: 1 }, { unique: true });
TenantSchema.index({ fusionauthApplicationId: 1 }, { unique: true });
