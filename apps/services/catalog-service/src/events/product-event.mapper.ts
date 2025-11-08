import {
  CatalogProductCreatedEvent,
  CatalogProductUpdatedEvent,
  CatalogProductStatusChangedEvent,
  CATALOG_PRODUCT_CREATED_EVENT,
  CATALOG_PRODUCT_UPDATED_EVENT,
  CATALOG_PRODUCT_STATUS_CHANGED_EVENT,
  EventMetadata,
  ProductStatus
} from '@orderly/shared-kernel';
import { ProductEntity } from '../entities/product.entity';

export function mapProductCreatedEvent(
  product: ProductEntity,
  metadata: EventMetadata
): CatalogProductCreatedEvent {
  return {
    name: CATALOG_PRODUCT_CREATED_EVENT,
    version: 1,
    metadata,
    payload: {
      product: mapProduct(product)
    }
  };
}

export function mapProductUpdatedEvent(
  product: ProductEntity,
  metadata: EventMetadata,
  changedFields: string[]
): CatalogProductUpdatedEvent {
  return {
    name: CATALOG_PRODUCT_UPDATED_EVENT,
    version: 1,
    metadata,
    payload: {
      product: mapProduct(product),
      changedFields
    }
  };
}

export function mapProductStatusChangedEvent(
  product: ProductEntity,
  previousStatus: ProductStatus,
  metadata: EventMetadata,
  reason?: string
): CatalogProductStatusChangedEvent {
  return {
    name: CATALOG_PRODUCT_STATUS_CHANGED_EVENT,
    version: 1,
    metadata,
    payload: {
      productId: product.id,
      previousStatus,
      currentStatus: product.status,
      reason
    }
  };
}

function mapProduct(product: ProductEntity) {
  return {
    id: product.id,
    name: product.name,
    description: product.description ?? undefined,
    price: {
      amount: product.priceAmount,
      currency: product.priceCurrency
    },
    status: product.status,
    sku: product.sku ?? undefined,
    thumbnailUrl: product.thumbnailUrl ?? undefined
  };
}
