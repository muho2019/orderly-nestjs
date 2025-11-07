import { EventMetadata } from './order-created.event';
import { ProductStatus } from './product-status.enum';

export const CATALOG_PRODUCT_STATUS_CHANGED_EVENT = 'catalog.product.statusChanged' as const;

export interface CatalogProductStatusChangedPayload {
  productId: string;
  previousStatus: ProductStatus;
  currentStatus: ProductStatus;
  reason?: string;
}

export interface CatalogProductStatusChangedEvent {
  name: typeof CATALOG_PRODUCT_STATUS_CHANGED_EVENT;
  version: 1;
  payload: CatalogProductStatusChangedPayload;
  metadata: EventMetadata;
}
