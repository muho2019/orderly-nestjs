# Domain Models & Event Schemas

Orderly는 주문·결제·카탈로그·인증 도메인을 독립 서비스로 구성하며, Kafka 이벤트를 통해 느슨하게 결합합니다. 각 도메인은 DDD의 바운디드 컨텍스트로 정의되고, 애그리게잇 루트·값 객체(Value Object)·도메인 서비스와 협력 규칙을 명확히 구분합니다. 본 문서의 목적은 도메인 경계와 이벤트 계약을 명시해 구현·테스트 시 일관성을 유지하는 것입니다.

---

## 1. Auth Context

### Aggregate & Value Objects
- **User (Aggregate Root)**  
  필드: `userId`, `email`, `credentials`, `status`, `name`, `createdAt`, `updatedAt`  
  - `credentials`는 `Credentials` 값 객체로 구성(`passwordHash`, `salt` 등)
  - 이메일은 불변 식별자이며 중복 허용 안 됨
- **ContactInfo (Value Object, 향후)** – 연락처, 알림 채널

### Domain Services / Policies
- `UserDomainService.register(command)`  
  - 이메일 중복 검증 → 비밀번호 해싱 → User 애그리게잇 생성 → `auth.user.registered` 발행
- `UserDomainService.changeStatus(user, nextStatus)`  
  - 상태 전이 규칙: `ACTIVE ↔ SUSPENDED`, `DELETED`는 종단 상태
  - 이벤트 `auth.user.suspended`, `auth.user.deleted` 발행

### Events & Consumers
| 이벤트 키 | 의미 | 주요 구독 컨텍스트 |
| --------- | ---- | ----------------- |
| `auth.user.registered` | User 애그리게잇 생성 | Orders (고객 식별), Payments (빌링), Notifications |
| `auth.user.suspended` | 사용자 활동 제한 | Orders (주문 차단), Analytics |

---

## 2. Orders Context

### Aggregate & Value Objects
- **Order (Aggregate Root)**  
  필드: `orderId`, `userId`, `status`, `money`, `lines`, `paymentId`, `createdAt`, `updatedAt`
  - **OrderLine (Value Object)**: `productId`, `quantity`, `unitPrice`, `lineAmount`
  - **Money (Value Object)**: `amount`, `currency` (모든 금액은 이 객체로 표현)
  - **DeliveryInfo (Value Object, 향후)**: 배송지, 연락처
- **OrderReadModel (Projection)** – CQRS 읽기 테이블/뷰. 애그리게잇이 아님.

### Domain Services / Policies
- `OrderDomainService.placeOrder(command)`  
  - Catalog/Inventory 검증 → 총액 계산 → idempotency 키 검증 → Order 애그리게잇 생성
  - `clientReference`를 사용자별 idempotency 키로 사용하며, 성공 시 `orders.order.created` 이벤트와 correlation/causation 메타데이터를 발행
  - MVP 1에서는 catalog-service가 준비되기 전까지 in-memory Mock 카탈로그로 상품 존재/가격을 검증
- `OrderAggregate.confirm(paymentEvent)`  
  - 결제 성공 이벤트 수신 시 `CONFIRMED` 전이
- `OrderAggregate.cancel(reason)`  
  - 고객 취소, 결제 실패, 관리자 조치 등 정책 분기

### State Diagram
```
CREATED --(결제 성공)--> CONFIRMED --(배송 완료)--> FULFILLED
   |                         |
   |                         +--(관리자/시스템)--> CANCELLED
   +--(결제 실패/고객 취소)--> CANCELLED
```

### Events & Consumers
| 이벤트 키 | 의미 | 주요 구독 컨텍스트 |
| --------- | ---- | ----------------- |
| `orders.order.created` | Order 애그리게잇 생성 | Payments, Catalog, Web |
| `orders.order.statusChanged` | 상태 전이(이전/다음 상태 포함) | Payments(환불), Web UI, Analytics |

---

## 3. Payments Context (Mock Payments)

### Aggregate & Value Objects
- **Payment (Aggregate Root)**  
  필드: `paymentId`, `orderId`, `provider`, `status`, `money`, `providerPaymentKey`, `requestedAt`, `approvedAt`, `failedAt`
  - `money`: `Money` 값 객체
  - `result`: `PaymentResult` 값 객체 (응답 코드, 메시지, 승인번호)
- **WebhookEvent (Domain Event Entity)** – Mock 결제 웹훅 원본 보관용 (향후 Toss 원본 저장으로 확장)

### Domain Services / Policies
- `PaymentDomainService.requestPayment(orderAggregate)`  
  - Mock Processor API 호출, idempotency 키 사용, `payments.payment.requested` 발행 (실제 Toss 호출로 대체 가능하도록 인터페이스 분리)
- `PaymentDomainService.handleWebhook(event)`  
  - 서명 검증 → Payment 애그리게잇 상태 전이 → 주문 컨텍스트에 이벤트 전달
- 환불/취소 정책은 `PaymentAggregate.cancel(reason)`에서 수행하고 `payments.payment.cancelled` 발행

### State Diagram
```
PENDING --(승인 성공)--> APPROVED
   |                     |
   |                     +--(환불)--> CANCELLED
   +--(승인 실패)--> FAILED
```

### Events & Consumers
| 이벤트 키 | 의미 | 주요 구독 컨텍스트 |
| --------- | ---- | ----------------- |
| `payments.payment.requested` | 결제 승인 요청 시작 (Mock Processor 호출 기준) | Orders(주문 상태 잠금), Notifications |
| `payments.payment.succeeded` | 결제 승인 완료 | Orders(확정), Web, Analytics |
| `payments.payment.failed` | 결제 실패/거절 | Orders(취소), Web |
| `payments.payment.cancelled` | 환불/취소 처리 | Orders(상태 업데이트), Accounting |

---

## 4. Catalog Context

### Aggregate & Value Objects
- **Product (Aggregate Root)**  
  필드: `productId`, `name`, `description`, `pricing`, `inventory`, `status`, `sku`, `media`, `createdAt`, `updatedAt`
  - `pricing`: `Money`
  - `inventory`: `Inventory` 값 객체 (`stock`, `reserved`, `available`)
  - `status`: `ProductStatus` (`DRAFT`, `ACTIVE`, `INACTIVE`, `DISCONTINUED`)
- **Category (Aggregate Root, 향후)** – 상품 계층 구조

### Domain Services / Policies
- `CatalogDomainService.createProduct(command)`  
  - 중복 이름 검증, 초기 재고 설정, `catalog.product.created` 발행
- `CatalogDomainService.adjustInventory(productId, delta)`  
  - 주문 컨텍스트와 이벤트로 협력 (보류 수량, 확정 감소)
- 가격/재고 변경은 감사 추적을 위한 도메인 이벤트와 함께 처리

### Events & Consumers
| 이벤트 키 | 의미 | 주요 구독 컨텍스트 |
| --------- | ---- | ----------------- |
| `catalog.product.created` | 상품 애그리게잇 생성 | Orders(주문 가능 상품), Web |
| `catalog.product.updated` | 상품 정보 변경 | Web, Analytics |
| `catalog.product.statusChanged` | 판매 가능 여부 변경 | Orders(주문 제한), Web |

---

## 5. Review Context (MVP 3)

### Aggregate & Value Objects
- **Review (Aggregate Root)**  
  필드: `reviewId`, `orderId`, `productId`, `userId`, `rating`, `comment`, `createdAt`
  - `rating`: `Rating` 값 객체 (1~5 범위 검증)
  - `comment`: `ReviewComment` 값 객체 (길이 제한, 금칙어 필터)

### Domain Services / Policies
- `ReviewDomainService.submitReview(command)`  
  - 주문 완료 상태인지 확인, 동일 주문에 대한 중복 리뷰 방지
- 향후 `ModerationPolicy`로 부적절한 리뷰 필터링 적용

### Events & Consumers
| 이벤트 키 | 의미 | 주요 구독 컨텍스트 |
| --------- | ---- | ----------------- |
| `reviews.review.created` | 리뷰 작성 | Catalog(평점 업데이트), Analytics, Notifications |

---

## 6. Cross-Cutting Patterns

- **Shared Kernel**  
  - 이벤트/DTO 스키마는 `packages/shared-kernel/events`에 정의하고, `packages/testing`에서 계약 테스트 제공
  - 이벤트 명명 규칙: `<boundedContext>.<aggregate>.<eventName>`
  - 공통 필드: `correlationId`, `causationId`, `occurredAt`
- **Idempotency & Consistency**  
  - Orders/Payments 컨텍스트는 idempotency 키(주문 번호, mockPaymentKey)를 활용하며, 실제 Toss 키와 호환되도록 포맷을 맞춘다
  - Outbox 패턴은 추후 도입하여 이벤트 발행 일관성 보장

---

## 7. Relationship Overview

```
User (Auth) 1----* Order (Orders)
Order 1----1 Payment (Payments)
Order 1----* OrderLine (Value Object)
Product (Catalog) 1----* OrderLine (via productId snapshot)
Review (Reviews) *----1 Order / Product / User
```

- 실제 데이터베이스 FK는 컨텍스트 내에만 존재하며, 컨텍스트 간 연결은 이벤트로 유지
- OrderLine은 서비스 호출 시점의 상품 스냅샷을 값 객체로 보관해 가격 변경에 영향받지 않도록 한다

---

## 8. Next Steps

1. `packages/shared-kernel`에 이벤트/DTO 타입을 정의하고 버전 관리 전략 수립  
2. `@orderly/testing`에서 이벤트 스키마 계약 테스트 헬퍼 구현 (`validateEvent(payload, schema)`)  
3. 각 애그리게잇에 대해 idempotency, 도메인 서비스 구현 가이드를 추가 문서로 확장  

컨텍스트별 설계는 MVP 진행 상황에 맞추어 지속적으로 업데이트하며, 새로운 도메인이 추가될 경우 동일한 구조로 문서를 보강합니다.
