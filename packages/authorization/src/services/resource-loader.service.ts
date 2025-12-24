import { Injectable } from '@nestjs/common';
import { ObjectId } from 'mongodb';

export interface ResourceAttributes {
  _id?: string;  // MongoDB ObjectId as string - usado para comparar con organizationIds
  organizationId?: string;
  userId?: string;
  ownerId?: string;
  status?: string;
  [key: string]: unknown;
}

@Injectable()
export class ResourceLoaderService {
  // Mapeo de resource kind a collection
  // Debe coincidir con SYSTEM_RESOURCES en @serveflow/core
  private readonly collectionMap: Record<string, string> = {
    organization: 'organizations',
    user: 'users',
    event: 'events',
    service: 'services',
    resource: 'resources',
    role: 'tenant_roles',
    settings: 'settings',
  };

  /**
   * Carga atributos de un recurso desde MongoDB
   */
  async loadAttributes(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mongooseConnection: any,
    resourceKind: string,
    resourceId: string
  ): Promise<ResourceAttributes> {
    if (!resourceId) {
      return {};
    }

    const collectionName = this.collectionMap[resourceKind];
    if (!collectionName) {
      return {};
    }

    try {
      const collection = mongooseConnection.db.collection(collectionName);

      // Para organization, el ID es el slug
      const query =
        resourceKind === 'organization'
          ? { slug: resourceId }
          : { _id: new ObjectId(resourceId) };

      const doc = await collection.findOne(query);

      if (!doc) {
        return {};
      }

      return {
        _id: doc._id?.toString(),
        organizationId: doc.organizationId?.toString() || doc.slug,
        userId: doc.userId?.toString(),
        ownerId: doc.ownerId?.toString() || doc.userId?.toString(),
        status: doc.status || (doc.isActive ? 'active' : 'inactive'),
      };
    } catch {
      return {};
    }
  }
}
