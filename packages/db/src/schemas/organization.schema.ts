import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
// Note: Organization core schema has a different MVP structure with schedule/location.
// This Mongoose schema is a simpler current implementation.

export type OrganizationDocument = HydratedDocument<Organization>;

/**
 * Organization Mongoose Schema
 * Location: db_tenant_{slug}.organizations
 *
 * Note: Structure differs from @serveflow/core OrganizationMVP for practical reasons.
 * Core schema defines the ideal/target structure, Mongoose reflects current implementation.
 */
@Schema({
  collection: 'organizations',
  timestamps: true,
})
export class Organization {
  @Prop({ required: true })
  name!: string;

  @Prop()
  description?: string;

  @Prop({
    required: true,
    enum: ['active', 'inactive', 'archived'],
    default: 'active',
    index: true,
  })
  status!: string;

  @Prop({ type: Object })
  address?: {
    street?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
  };

  @Prop()
  phone?: string;

  @Prop()
  email?: string;

  @Prop({ type: Object })
  settings?: {
    timezone: string;
    locale: string;
    workingHours?: Record<string, unknown>;
  };

  createdAt!: Date;
  updatedAt!: Date;
}

export const OrganizationSchema = SchemaFactory.createForClass(Organization);
