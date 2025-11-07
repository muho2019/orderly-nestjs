import { EventMetadata } from './order-created.event';
import { ProductDto } from './product.dto';

export const CATALOG_PRODUCT_UPDATED_EVENT = 'catalog.product.updated' as const;

export interface CatalogProductUpdatedEventPayload {
  product: ProductDto;
  changedFields: string[];
}

export interface CatalogProductUpdatedEvent {
  name: typeof CATALOG_PRODUCT_UPDATED_EVENT;
  version: 1;
  payload: CatalogProductUpdatedEventPayload;
  metadata: EventMetadata;
}
