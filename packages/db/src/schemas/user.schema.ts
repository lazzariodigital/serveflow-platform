import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import type {
  IdType,
  ProviderProfile,
  UserLegal,
  UserPreferences,
  UserStatus,
  User as UserType,
} from '@serveflow/core';

import { HydratedDocument } from 'mongoose';

export type UserDocument = HydratedDocument<User>;

/**
 * User Mongoose Schema
 * Implements: UserType from @serveflow/core
 * Location: db_tenant_{slug}.users
 */
@Schema({
  collection: 'users',
  timestamps: true,
})
export class User implements Omit<UserType, 'createdAt' | 'updatedAt'> {
  // ════════════════════════════════════════════════════════════════
  // REQUIRED - Campos obligatorios
  // ════════════════════════════════════════════════════════════════

  @Prop({ required: true, unique: true, index: true })
  fronteggUserId!: string;

  @Prop({ required: true, unique: true, lowercase: true, index: true })
  email!: string;

  @Prop({ required: true })
  firstName!: string;

  @Prop({ required: true })
  lastName!: string;

  @Prop({
    type: String,
    enum: ['active', 'inactive', 'suspended', 'pending', 'archived'],
    default: 'pending',
    index: true,
  })
  status!: UserStatus;

  @Prop({ required: true, default: false })
  isVerified!: boolean;

  @Prop({ type: [String], default: [], index: true })
  organizationIds!: string[];

  // ════════════════════════════════════════════════════════════════
  // OPTIONAL - Campos opcionales
  // ════════════════════════════════════════════════════════════════

  @Prop()
  imageUrl?: string;

  @Prop()
  primaryOrganizationId?: string;

  @Prop()
  createdBy?: string;

  @Prop()
  lastLoginAt?: Date;

  @Prop()
  phoneNumber?: string;

  @Prop()
  idNumber?: string;

  @Prop({ type: String, enum: ['dni', 'passport', 'nie', 'other'] })
  idType?: IdType;

  @Prop()
  birthDate?: Date;

  @Prop({ type: Object })
  address?: {
    street?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
  };

  @Prop({ type: Object })
  preferences?: UserPreferences;

  @Prop({ type: Object })
  legal?: UserLegal;

  @Prop({ type: Object })
  providerProfile?: ProviderProfile;

  // Timestamps automáticos por { timestamps: true }
  createdAt!: Date;
  updatedAt!: Date;
}

export const UserSchema = SchemaFactory.createForClass(User);

// ════════════════════════════════════════════════════════════════
// Índices adicionales
// ════════════════════════════════════════════════════════════════

UserSchema.index({ phoneNumber: 1 }, { sparse: true });
UserSchema.index({ status: 1, organizationIds: 1 });
UserSchema.index({ 'providerProfile.specializations': 1 }, { sparse: true });
