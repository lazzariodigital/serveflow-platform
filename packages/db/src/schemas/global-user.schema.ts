import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import type {
  GlobalUserStatus,
  GlobalUser as GlobalUserType,
  TenantAccessEntry,
} from '@serveflow/core';

import { HydratedDocument } from 'mongoose';

export type GlobalUserDocument = HydratedDocument<GlobalUser>;

/**
 * GlobalUser Mongoose Schema
 * Implements: GlobalUserType from @serveflow/core
 * Location: db_serveflow_sys.global_users
 */
@Schema({
  collection: 'global_users',
  timestamps: true,
})
export class GlobalUser implements Omit<GlobalUserType, 'createdAt' | 'updatedAt'> {
  @Prop({ required: true, unique: true, index: true })
  fusionauthUserId!: string;

  @Prop({ required: true, unique: true, lowercase: true, index: true })
  email!: string;

  @Prop({ required: true })
  firstName!: string;

  @Prop({ required: true })
  lastName!: string;

  @Prop()
  imageUrl?: string;

  @Prop({
    type: String,
    required: true,
    enum: ['active', 'inactive', 'suspended'],
    default: 'active',
    index: true,
  })
  status!: GlobalUserStatus;

  @Prop({ type: [Object], default: [] })
  accessibleTenants?: TenantAccessEntry[];

  @Prop()
  lastLoginAt?: Date;

  // NOTA: NO hay campo "type" - eso viene de roles (Bloque 3)

  createdAt!: Date;
  updatedAt!: Date;
}

export const GlobalUserSchema = SchemaFactory.createForClass(GlobalUser);

GlobalUserSchema.index({ 'accessibleTenants.tenantId': 1 }, { sparse: true });
