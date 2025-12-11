import { Injectable, OnModuleDestroy } from '@nestjs/common';
import mongoose, { Connection, Model } from 'mongoose';
import { env, SYSTEM_DB_NAME, TENANT_DB_PREFIX } from '@serveflow/config';
import {
  User,
  UserSchema,
  GlobalUser,
  GlobalUserSchema,
  Tenant,
  TenantSchema,
  Organization,
  OrganizationSchema,
} from './schemas';

@Injectable()
export class MongooseConnectionService implements OnModuleDestroy {
  private systemConnection: Connection | null = null;
  private tenantConnections = new Map<string, Connection>();

  // ════════════════════════════════════════════════════════════════
  // System Database Connection (db_serveflow_sys)
  // ════════════════════════════════════════════════════════════════

  async getSystemConnection(): Promise<Connection> {
    if (this.systemConnection) {
      return this.systemConnection;
    }

    this.systemConnection = await mongoose.createConnection(env.MONGODB_URI, {
      dbName: SYSTEM_DB_NAME,
      maxPoolSize: 50,
      minPoolSize: 5,
      maxIdleTimeMS: 30000,
    }).asPromise();

    // Registrar models del sistema
    this.systemConnection.model(GlobalUser.name, GlobalUserSchema);
    this.systemConnection.model(Tenant.name, TenantSchema);

    console.log(`[MongoDB] Connected to system database: ${SYSTEM_DB_NAME}`);

    return this.systemConnection;
  }

  // ════════════════════════════════════════════════════════════════
  // Tenant Database Connections (db_tenant_{slug})
  // ════════════════════════════════════════════════════════════════

  async getTenantConnection(dbName: string): Promise<Connection> {
    // Validar formato
    if (!dbName.startsWith(TENANT_DB_PREFIX)) {
      throw new Error(
        `Invalid tenant database name: ${dbName}. Must start with "${TENANT_DB_PREFIX}"`
      );
    }

    // Retornar si ya existe
    if (this.tenantConnections.has(dbName)) {
      return this.tenantConnections.get(dbName)!;
    }

    // Crear nueva conexión
    const connection = await mongoose.createConnection(env.MONGODB_URI, {
      dbName,
      maxPoolSize: 100,
      minPoolSize: 10,
      maxIdleTimeMS: 30000,
    }).asPromise();

    // Registrar models del tenant
    connection.model(User.name, UserSchema);
    connection.model(Organization.name, OrganizationSchema);

    this.tenantConnections.set(dbName, connection);

    console.log(`[MongoDB] Connected to tenant database: ${dbName}`);

    return connection;
  }

  async getTenantConnectionBySlug(slug: string): Promise<Connection> {
    const dbName = `${TENANT_DB_PREFIX}${slug.replace(/-/g, '_')}`;
    return this.getTenantConnection(dbName);
  }

  // ════════════════════════════════════════════════════════════════
  // Model Getters
  // ════════════════════════════════════════════════════════════════

  async getUserModel(dbName: string): Promise<Model<User>> {
    const connection = await this.getTenantConnection(dbName);
    return connection.model<User>(User.name);
  }

  async getGlobalUserModel(): Promise<Model<GlobalUser>> {
    const connection = await this.getSystemConnection();
    return connection.model<GlobalUser>(GlobalUser.name);
  }

  async getTenantModel(): Promise<Model<Tenant>> {
    const connection = await this.getSystemConnection();
    return connection.model<Tenant>(Tenant.name);
  }

  async getOrganizationModel(dbName: string): Promise<Model<Organization>> {
    const connection = await this.getTenantConnection(dbName);
    return connection.model<Organization>(Organization.name);
  }

  // ════════════════════════════════════════════════════════════════
  // Cleanup
  // ════════════════════════════════════════════════════════════════

  async onModuleDestroy() {
    console.log('[MongoDB] Closing all connections...');

    if (this.systemConnection) {
      await this.systemConnection.close();
    }

    for (const [dbName, connection] of this.tenantConnections) {
      await connection.close();
      console.log(`[MongoDB] Closed connection to ${dbName}`);
    }

    this.tenantConnections.clear();
    console.log('[MongoDB] All connections closed');
  }
}
