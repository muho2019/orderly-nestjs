import { EventMetadata } from './order-created.event';
import { ProductDto } from './product.dto';

export const CATALOG_PRODUCT_CREATED_EVENT = 'catalog.product.created' as const;

export interface CatalogProductCreatedEventPayload {
  product: ProductDto;
}

export interface CatalogProductCreatedEvent {
  name: typeof CATALOG_PRODUCT_CREATED_EVENT;
  version: 1;
  payload: CatalogProductCreatedEventPayload;
  metadata: EventMetadata;
}
