import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type TenantRoleDocument = HydratedDocument<TenantRole>;

/**
 * TenantRole Mongoose Schema
 * Location: db_tenant_{slug}.tenant_roles
 *
 * Roles configurados para un tenant especifico.
 * Se inicializan desde RoleTemplate al crear el tenant.
 * Cada tenant puede modificar sus roles y crear roles custom.
 */
@Schema({
  collection: 'tenant_roles',
  timestamps: true,
})
export class TenantRole {
  // ════════════════════════════════════════════════════════════════
  // REFERENCIA AL TEMPLATE
  // ════════════════════════════════════════════════════════════════

  @Prop({ index: true })
  templateSlug?: string; // Referencia al template original (null si es custom)

  // ════════════════════════════════════════════════════════════════
  // IDENTIFICACION
  // ════════════════════════════════════════════════════════════════

  @Prop({ required: true, unique: true, lowercase: true, index: true })
  slug!: string;

  @Prop({ required: true })
  name!: string;

  @Prop()
  description?: string;

  // ════════════════════════════════════════════════════════════════
  // CONFIGURACION DE APPS
  // ════════════════════════════════════════════════════════════════

  @Prop({
    type: [String],
    enum: ['dashboard', 'webapp'],
    default: [],
  })
  allowedApps!: ('dashboard' | 'webapp')[];

  // ════════════════════════════════════════════════════════════════
  // FLAGS
  // ════════════════════════════════════════════════════════════════

  @Prop({ required: true, default: false })
  isSuperRole!: boolean;

  @Prop({ required: true, default: false })
  isDefault!: boolean; // Solo un rol puede ser default (self-registration)

  @Prop({ required: true, default: true })
  isActive!: boolean;

  @Prop({ required: true, default: false })
  isFromTemplate!: boolean; // true si viene de un RoleTemplate

  @Prop({ required: true, default: false })
  isCustom!: boolean; // true si fue creado manualmente por el tenant

  // ════════════════════════════════════════════════════════════════
  // PERMISOS (para Cerbos - futuro)
  // ════════════════════════════════════════════════════════════════

  @Prop({ type: Object, default: {} })
  permissions!: Record<string, unknown>;

  // ════════════════════════════════════════════════════════════════
  // FUSIONAUTH SYNC
  // ════════════════════════════════════════════════════════════════

  /**
   * FusionAuth Role IDs per application
   * Each role can exist in multiple apps with different IDs
   */
  @Prop({ type: Object })
  fusionauthRoleIds?: {
    dashboard?: string;
    webapp?: string;
  };

  // ════════════════════════════════════════════════════════════════
  // METADATA
  // ════════════════════════════════════════════════════════════════

  @Prop({ default: 0 })
  sortOrder!: number;

  // Timestamps automaticos por { timestamps: true }
  createdAt!: Date;
  updatedAt!: Date;
}

export const TenantRoleSchema = SchemaFactory.createForClass(TenantRole);

// ════════════════════════════════════════════════════════════════
// Indices adicionales
// ════════════════════════════════════════════════════════════════

TenantRoleSchema.index({ isActive: 1, isDefault: 1 });
TenantRoleSchema.index({ isFromTemplate: 1 });
TenantRoleSchema.index({ isCustom: 1 });
TenantRoleSchema.index({ 'fusionauthRoleIds.dashboard': 1 }, { sparse: true });
TenantRoleSchema.index({ 'fusionauthRoleIds.webapp': 1 }, { sparse: true });
TenantRoleSchema.index({ sortOrder: 1 });
