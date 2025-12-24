import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type RoleTemplateDocument = HydratedDocument<RoleTemplate>;

/**
 * RoleTemplate Mongoose Schema
 * Location: db_serveflow_sys.role_templates
 *
 * Define plantillas base de roles que se copian a cada tenant al crearlo.
 * Los 4 templates base (admin, employee, provider, client) son isSystemTemplate=true
 * y no pueden eliminarse.
 */
@Schema({
  collection: 'role_templates',
  timestamps: true,
})
export class RoleTemplate {
  // ════════════════════════════════════════════════════════════════
  // IDENTIFICACION
  // ════════════════════════════════════════════════════════════════

  @Prop({ required: true, unique: true, lowercase: true, index: true })
  slug!: string; // "admin", "employee", "provider", "client"

  @Prop({ required: true })
  name!: string; // "Administrador"

  @Prop({ required: true })
  description!: string;

  // ════════════════════════════════════════════════════════════════
  // CONFIGURACION DE APPS
  // ════════════════════════════════════════════════════════════════

  @Prop({
    type: [String],
    enum: ['dashboard', 'webapp'],
    default: [],
  })
  defaultAllowedApps!: ('dashboard' | 'webapp')[];

  // ════════════════════════════════════════════════════════════════
  // FLAGS
  // ════════════════════════════════════════════════════════════════

  @Prop({ required: true, default: false })
  isSuperRole!: boolean; // true para admin

  @Prop({ required: true, default: false })
  isDefault!: boolean; // true para client (self-registration)

  @Prop({ required: true, default: true })
  isSystemTemplate!: boolean; // No se puede eliminar

  // ════════════════════════════════════════════════════════════════
  // PERMISOS (para Cerbos - futuro)
  // ════════════════════════════════════════════════════════════════

  @Prop({ type: Object, default: {} })
  basePermissions!: Record<string, unknown>;

  // ════════════════════════════════════════════════════════════════
  // METADATA
  // ════════════════════════════════════════════════════════════════

  @Prop({ default: 0 })
  sortOrder!: number;

  // Timestamps automaticos por { timestamps: true }
  createdAt!: Date;
  updatedAt!: Date;
}

export const RoleTemplateSchema = SchemaFactory.createForClass(RoleTemplate);

// ════════════════════════════════════════════════════════════════
// Indices adicionales
// ════════════════════════════════════════════════════════════════

RoleTemplateSchema.index({ isSystemTemplate: 1 });
RoleTemplateSchema.index({ sortOrder: 1 });
