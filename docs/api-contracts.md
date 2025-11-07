# API Contracts & User Stories

Orderly의 서비스별 REST API 계약과 MVP 단계별 사용자 스토리를 정리합니다. 이 문서는 구현 및 테스트 계획 수립의 기반이 됩니다.

---

## 1. Auth Service

### REST Endpoints
| Method | Path | Description | Auth |
| ------ | ---- | ----------- | ---- |
| `POST` | `/v1/auth/register` | 사용자 가입 | Public |
| `POST` | `/v1/auth/login` | 로그인, JWT 발행 | Public |
| `GET` | `/v1/auth/profile` | 내 프로필 조회 | Bearer |
| `PATCH` | `/v1/auth/profile` | 프로필 업데이트 (선택) | Bearer |

### User Stories
- **AS A** 신규 사용자, **I WANT** 이메일로 가입하여 계정을 만들고 싶다.
- **AS A** 로그인한 사용자, **I WANT** 내 기본 정보를 확인하고 업데이트하고 싶다.
- **AS A** 관리자(향후), **I WANT** 특정 사용자의 상태를 변경하고 싶다.

---

## 2. Orders Service

### REST Endpoints
| Method | Path | Description | Auth |
| ------ | ---- | ----------- | ---- |
| `POST` | `/v1/orders` | 주문 생성 | Bearer |
| `GET` | `/v1/orders/products` | Mock 상품 목록 조회 (MVP 1) | Public |
| `GET` | `/v1/orders` | 내 주문 목록 조회 (읽기 모델) | Bearer |
| `GET` | `/v1/orders/:orderId` | 주문 상세 조회 | Bearer |
| `PATCH` | `/v1/orders/:orderId/cancel` | 주문 취소 | Bearer |
| `PATCH` | `/v1/orders/:orderId/status` | 상태 수동 변경(관리자) | Admin |

### User Stories
- **AS A** 인증된 고객, **I WANT** 장바구니 내역으로 주문을 생성하고 싶다.
- **AS A** 인증된 고객, **I WANT** 내 주문 목록과 각 상태를 확인하고 싶다.
- **AS A** 인증된 고객, **I WANT** 배송 전에 주문을 취소하고 싶다.
- **AS A** 운영자(관리자), **I WANT** 비정상 상태의 주문을 수동으로 업데이트하고 싶다.

#### POST `/v1/orders` – 주문 생성

- **Headers**
  - `X-User-Id`: API Gateway가 JWT를 검증한 뒤 전달하는 사용자 ID
  - 선택: `X-User-Email` (웹 클라이언트 식별용), `X-Correlation-Id`, `X-Causation-Id` (Kafka 메타데이터 전달)
- **Request Body**

```json
{
  "items": [
    {
      "productId": "c7d1f07c-1a7b-4c9b-8a06-3c3e8e0a3c1f",
      "quantity": 2,
      "unitPrice": {
        "amount": 19900,
        "currency": "KRW"
      }
    }
  ],
  "note": "Leave at the door",
  "clientReference": "web-checkout-20240401"
}
```

- **Response 201**

```json
{
  "id": "c4a65f29-7ca8-4a6f-8c9d-5f7e4af23ecc",
  "userId": "a2f3456e-829b-4f91-9d21-92da5dd45b32",
  "status": "CREATED",
  "total": {
    "amount": 39800,
    "currency": "KRW"
  },
  "items": [
    {
      "productId": "c7d1f07c-1a7b-4c9b-8a06-3c3e8e0a3c1f",
      "quantity": 2,
      "unitPrice": {
        "amount": 19900,
        "currency": "KRW"
      },
      "lineTotal": {
        "amount": 39800,
        "currency": "KRW"
      }
    }
  ],
  "note": "Leave at the door",
  "clientReference": "web-checkout-20240401",
  "createdAt": "2024-04-01T12:30:00.000Z",
  "updatedAt": "2024-04-01T12:30:00.000Z"
}
```

- **Emitted Event: `orders.order.created`**
  - `payload.orderId`: 주문 ID (UUID)
  - `payload.userId`: 사용자 ID (JWT `sub`)
  - `payload.total`: `{ amount, currency }`
  - `payload.items[]`: 주문 행(`productId`, `quantity`, `unitPrice`, `lineTotal`)
  - `payload.note`, `payload.clientReference`: 선택 필드
  - `metadata`: `correlationId`, `causationId`, `occurredAt`

#### GET `/v1/orders/products` – Mock 상품 목록

- **Response 200**

```json
[
  {
    "id": "0f0b9c0a-0d58-4a37-9882-5e39f68d3c0d",
    "name": "Espresso",
    "price": {
      "amount": 2500,
      "currency": "KRW"
    }
  },
  {
    "id": "7c070b25-92f7-4e72-9db9-8a1ab3f8ea9a",
    "name": "Cafe Latte",
    "price": {
      "amount": 4500,
      "currency": "KRW"
    }
  }
]
```

- **비고**
  - MVP 1에서는 Orders 서비스 내부의 in-memory 카탈로그가 응답한다.
  - 이후 `catalog-service`가 활성화되면 해당 엔드포인트는 폐기하거나 카탈로그 서비스의 프록시로 전환한다.

---

## 3. Payments Service (Mock, Toss-ready)

### REST Endpoints
| Method | Path | Description | Auth |
| ------ | ---- | ----------- | ---- |
| `POST` | `/v1/payments` | 결제 승인 요청 (내부 Mock Processor 호출) | Bearer |
| `POST` | `/v1/payments/webhook` | Mock 결제 결과 웹훅 수신 | Public (IP 제한) |
| `GET` | `/v1/payments/:paymentId` | 결제 상세 조회 | Bearer |
| `POST` | `/v1/payments/:paymentId/cancel` | 결제 취소/환불 | Bearer |

### User Stories
- **AS A** 주문 고객, **I WANT** 실제 카드 정보를 입력하지 않고도 Mock 결제 흐름으로 주문을 검증하고 싶다.
- **AS A** 시스템, **I WANT** Mock 웹훅을 통해 결제 성공/실패를 실시간으로 수신하고 주문 상태를 갱신하고 싶다.
- _Note:_ 실제 Toss Payments 연동은 포트폴리오 후속 과제로 예약되어 있으며, 현재 Mock API는 Toss 스펙과 최대한 유사한 계약을 유지한다.
- **AS A** 고객, **I WANT** 필요 시 결제를 취소하고 환불 상태를 확인하고 싶다.

---

## 4. Catalog Service (MVP 2)

### REST Endpoints
| Method | Path | Description | Auth |
| ------ | ---- | ----------- | ---- |
| `GET` | `/v1/products` | 상품 목록 조회 | Public |
| `GET` | `/v1/products/:productId` | 상품 상세 조회 | Public |
| `POST` | `/v1/products` | 상품 등록 | Admin |
| `PATCH` | `/v1/products/:productId` | 상품 수정 | Admin |
| `PATCH` | `/v1/products/:productId/status` | 상품 활성/비활성 | Admin |

### User Stories
- **AS A** 고객, **I WANT** 주문 전에 상품 정보(가격, 재고)를 확인하고 싶다.
- **AS A** 관리자, **I WANT** 상품 정보를 등록/수정하여 최신 상태로 관리하고 싶다.
- **Product Status**
  - `DRAFT` → 초안, 고객 비노출
  - `ACTIVE` → 판매 가능
  - `INACTIVE` → 일시 중지
  - `DISCONTINUED` → 판매 종료(주문 불가)

### Sample Product Payload
```json
{
  "id": "a3f4c2d1-9c78-4a0f-8ed6-b443e6c1ce01",
  "name": "Ethiopia Yirgacheffe 200g",
  "description": "플로럴 향이 돋보이는 싱글 오리진 원두",
  "price": { "amount": 18000, "currency": "KRW" },
  "status": "ACTIVE",
  "sku": "BEAN-ETH-200",
  "thumbnailUrl": "https://static.orderly.dev/catalog/beans/ethiopia.png"
}
```

---

## 5. API Gateway (BFF)

### Responsibilities
- 사용자 인증, 토큰 검증 및 전달
- 서비스별 API를 통합한 GraphQL/REST 인터페이스 (우선 REST)
- 백엔드 포 페런트(BFF) 형태로 웹 클라이언트 전용 엔드포인트 제공

### Example Routes
| Method | Path | Description |
| ------ | ---- | ----------- |
| `GET` | `/v1/me/orders` | 인증 사용자 주문 목록 Aggregation |
| `GET` | `/v1/me/orders/:orderId` | 주문 상세 (orders + payments 조합) |

---

## 6. Web App (Next.js)

### 핵심 화면 (MVP 1 기준)
- 로그인/회원가입 페이지
- 주문 생성 페이지 (상품 선택 + 결제 요청 트리거)
- 주문 목록/상세 페이지

### 사용자 스토리 예시
- **AS A** 고객, **I WANT** 간단한 UI에서 주문 상태를 확인할 수 있어야 한다.
- **AS A** 고객, **I WANT** 주문을 만들 때 필요한 정보만 입력하고 빠르게 결제 단계로 이동하고 싶다.

---

## 7. Story Backlog by MVP Phase

| MVP | User Story | 서비스 | 우선순위 |
| --- | ---------- | ------ | -------- |
| 1 | 사용자로서 이메일/비밀번호로 가입하고 로그인하고 싶다. | Auth | Must |
| 1 | 고객으로서 상품을 선택해 주문을 생성하고 싶다. | Orders | Must |
| 1 | 고객으로서 주문 상태를 확인하고 싶다. | Orders | Must |
| 1 | 시스템으로서 주문 생성 시 Kafka 이벤트를 발행하고 싶다. | Orders | Must |
| 2 | 고객으로서 Mock 결제 API로 주문을 결제하고 싶다. | Payments | Must |
| 2 | 시스템으로서 Mock 결제 웹훅을 수신해 주문 상태를 업데이트하고 싶다. | Payments + Orders | Must |
| 2 | 고객으로서 상품 목록과 상세 정보를 보고 싶다. | Catalog | Should |
| 3 | 고객으로서 리뷰를 남기고 싶다. | Reviews | Should |
| 3 | 관리자/운영자로서 주문/결제 지표를 확인하고 싶다. | Admin Dashboard | Should |

---

## 8. API 문서화 가이드

- Swagger/OpenAPI 3.0을 각 서비스에 적용하고, API Gateway는 통합 문서 제공 고려
- `api-docs/`에 서비스별 스냅샷 저장, 변경 시 docs/architecture와 함께 업데이트
- REST 응답은 표준화된 에러 구조(`code`, `message`, `details`)를 사용

---

## 9. 다음 단계

1. 각 서비스에서 DTO와 엔드포인트 시그니처를 정의하여 shared-kernel과 연동
2. `packages/testing`에서 API 계약 테스트 템플릿을 제공
3. MVP 1 스토리 기준 E2E 플로우(가입 → 주문 → 상태 조회) 테스트 계획 수립

이 문서는 MVP 진행 상황에 따라 업데이트되며, 추가 서비스 도입 시 동일한 형식으로 확장합니다.
