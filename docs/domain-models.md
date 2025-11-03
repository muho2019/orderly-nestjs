# Domain Models & Event Schemas

Orderly는 주문·결제·카탈로그·인증 도메인을 독립 서비스로 구성하며, Kafka 이벤트를 통해 느슨하게 결합합니다. 본 문서는 도메인 핵심 엔티티, 관계, 상태, 그리고 공유 이벤트 스키마 초안을 정의합니다.

---

## 1. Auth Domain

### 핵심 엔티티
- **User**
  - `id`: UUID
  - `email`, `passwordHash`, `status`
  - `createdAt`, `updatedAt`

### 상태/규칙
- `status`: `ACTIVE`, `SUSPENDED`, `DELETED`
- 이메일 중복 방지, 비밀번호 해싱(`bcrypt`)

### 이벤트
| 이벤트 키 | 설명 | 페이로드 |
| --------- | ---- | -------- |
| `auth.user.registered` | 신규 회원 가입 | `{ userId, email, occurredAt }`
| `auth.user.suspended` | 계정 정지 | `{ userId, reason, occurredAt }`

---

## 2. Orders Domain

### 핵심 엔티티
- **Order**
  - `id`: UUID
  - `userId`: FK → Auth.User
  - `items`: 배열 (productId, quantity, price)
  - `totalAmount`, `currency`
  - `status`: `CREATED`, `CONFIRMED`, `FULFILLED`, `CANCELLED`
  - `paymentId`: 결제 참조 ID
  - `createdAt`, `updatedAt`
- **OrderItem** (읽기 모델, CQRS)
  - 주문 목록/상세 조회용 테이블/뷰

### 상태 전이
```
CREATED -> CONFIRMED -> FULFILLED
         \
          \-> CANCELLED
```
- 결제 실패, 고객 취소 등으로 `CANCELLED`

### 이벤트
| 이벤트 키 | 설명 | 페이로드 |
| --------- | ---- | -------- |
| `orders.order.created` | 주문 생성 | `{ orderId, userId, amount, status, occurredAt }`
| `orders.order.statusChanged` | 상태 변경 | `{ orderId, prevStatus, nextStatus, causationId, occurredAt }`

---

## 3. Payments Domain (Toss Payments)

### 핵심 엔티티
- **Payment**
  - `id`: UUID (내부)
  - `orderId`: FK → Orders.Order
  - `provider`: `TOSS`
  - `providerPaymentKey`
  - `amount`, `currency`
  - `status`: `PENDING`, `APPROVED`, `FAILED`, `CANCELLED`
  - `approvedAt`, `failedAt`

### 상태 전이
```
PENDING -> APPROVED -> (완료)
   |          |
   |          -> CANCELLED (사후 취소)
   -> FAILED
```

### 이벤트
| 이벤트 키 | 설명 | 페이로드 |
| --------- | ---- | -------- |
| `payments.payment.requested` | 결제 승인 요청 | `{ paymentId, orderId, amount, occurredAt }`
| `payments.payment.succeeded` | 결제 성공 | `{ paymentId, orderId, amount, providerPaymentKey, occurredAt }`
| `payments.payment.failed` | 결제 실패 | `{ paymentId, orderId, reason, occurredAt }`
| `payments.payment.cancelled` | 결제 취소/환불 | `{ paymentId, orderId, reason, occurredAt }`

---

## 4. Catalog Domain

### 핵심 엔티티
- **Product**
  - `id`: UUID
  - `name`, `description`
  - `price`, `currency`
  - `stock`
  - `status`: `ACTIVE`, `INACTIVE`
  - `createdAt`, `updatedAt`
- **Category** (향후)

### 이벤트
| 이벤트 키 | 설명 | 페이로드 |
| --------- | ---- | -------- |
| `catalog.product.created` | 상품 등록 | `{ productId, name, price, stock, occurredAt }`
| `catalog.product.updated` | 상품 수정 | `{ productId, changes, occurredAt }`
| `catalog.product.statusChanged` | 활성/비활성 변경 | `{ productId, prevStatus, nextStatus, occurredAt }`

---

## 5. Review Domain (MVP 3)

### 핵심 엔티티
- **Review**
  - `id`: UUID
  - `orderId`, `productId`, `userId`
  - `rating`, `comment`
  - `createdAt`

### 이벤트
| 이벤트 키 | 설명 | 페이로드 |
| --------- | ---- | -------- |
| `reviews.review.created` | 리뷰 작성 | `{ reviewId, orderId, productId, userId, rating, occurredAt }`

---

## 6. Shared Kernel & Schema Governance

- 이벤트 스키마는 `packages/shared-kernel/events`에 JSON Schema 또는 TypeScript 인터페이스로 정의
- 공통 필드: `correlationId`, `causationId`, `occurredAt`
- 이벤트 명명 규칙: `<boundedContext>.<aggregate>.<eventName>`
- 스키마 변경 시 semver 규칙을 따른 버전 관리(예: `orders.order.created.v2`)

---

## 7. 관계 다이어그램 (요약)

```
User (Auth) 1----* Order (Orders)
Order 1----1 Payment (Payments)
Order 1----* OrderItem (Read Model)
Product (Catalog) 1----* OrderItem (via productId)
Review (Reviews) *----1 Order / Product / User
```

- 각 서비스는 자체 DB를 보유하며 FK는 논리적 관계로만 유지(실제 DB FK 사용 X)
- 데이터 동기화는 이벤트 기반으로 처리

---

## 8. 다음 단계

1. `packages/shared-kernel`에 위 이벤트 스키마를 TypeScript 타입으로 정의
2. 계약 테스트에서 각 이벤트 페이로드 유효성 검증 추가 (`@orderly/testing`)
3. 상태 전이와 이벤트 발행을 서비스 코드에서 구현 시 참조하도록 가이드

이 문서는 MVP 진행에 따라 지속적으로 업데이트되며, 새로운 도메인 도입 시 동일한 패턴으로 확장합니다.
