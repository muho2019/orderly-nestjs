# Customer Journey Map

Orderly 프로젝트는 Nest.js 기반 MSA 학습 및 포트폴리오 구축을 목표로 하지만, 실제 사용자 경험을 명확히 설계하는 것이 MVP 우선순위와 도메인 경계를 다듬는 데 중요합니다. 아래 고객 여정 맵은 주요 페르소나를 정의하고 MVP 단계별 핵심 접점과 백엔드 요구사항을 정리합니다.

---

## 1. Personas

| 페르소나 | 설명 | 주요 목표 | MVP 범위 |
| -------- | ---- | -------- | -------- |
| **고객** | 주문/결제 서비스를 이용하는 일반 사용자 | 원하는 상품을 빠르게 주문하고 결제 상태를 확인 | MVP 1~3 전체 |
| **관리자** | 상품/주문 상태를 관리하고 고객 문의에 응대 | 주문 처리 현황 파악, 예외 상황 대응 | MVP 3 이후 단계 |
| **시스템** | 결제, 알림 등 외부 서비스 | 이벤트 흐름을 통해 상태를 자동 업데이트 | MVP 1~3 전체 |

> 초기 MVP에서는 고객 페르소나를 중심으로 구현하며, 관리자는 관찰 가능성과 함께 확장 예정입니다.

---

## 2. Journey Overview by MVP Phase

### MVP 1 – 주문 조회 중심

- **목표:** 기본 인증과 주문 생성/조회 플로우를 안정적으로 제공
- **주요 단계 & 접점**
  1. **가입/로그인** – `auth-service` (JWT 발급), `web` 최소 UI (폼)
  2. **상품 탐색** – `orders-service` 내 고정 Mock 카탈로그 목록으로 대체(향후 catalog-service로 교체)
  3. **주문 생성** – `orders-service` REST API, Kafka 이벤트(`orders.order.created`)
  4. **주문 상태 확인** – CQRS 읽기 모델, `web`에서 주문 내역 목록 및 상세 확인
- **백엔드 요구사항**
  - 사용자 인증/권한 관리, 주문 상태 Enum, 이벤트 발행과 읽기 모델 동기화
  - 주문 상태 변화 시 Kafka 이벤트(`orders.order.statusChanged`) 발행
- **성공 지표**
  - 가입 → 주문 생성까지 평균 플로우 성공률 90% 이상 (테스트 기준)
  - 주문 상태 조회 API의 200ms 이하 응답 시간

### MVP 2 – 결제 & 카탈로그 확장

- **목표:** 실거래 플로우에 앞서 Mock Payments 기반 결제 경험과 상품 관리 기능 도입 (실제 Toss 연동은 후속)
- **주요 단계 & 접점**
  1. **상품 탐색 및 상세** – `catalog-service` REST API, 최소 UI에서 상품 목록/상세 제공
  2. **결제 요청** – `payments-service`가 Mock Payments Processor와 통신하여 결제 승인 처리 (향후 Toss API로 대체 계획)
  3. **결제 결과 확인** – Kafka 이벤트(`payments.payment.succeeded`)를 수신해 주문 상태 갱신
  4. **재고/상품 변경** – 관리자 API (향후 확장), 이벤트(`catalog.product.updated`)
- **백엔드 요구사항**
  - 서비스별 독립 DB로 트랜잭션 경계 유지
  - 결제 실패/취소 이벤트 처리, 연동 실패 시 보상 전략 정의
  - shared-kernel에 결제 DTO/이벤트 스키마 정의
- **성공 지표**
  - 결제 성공률 95% 이상 (샌드박스 기준)
  - 주문-결제 이벤트 동기화 지연 5초 이하

### MVP 3 – 고객 경험 강화

- **목표:** 후기/피드백, 관리자 도구, 관찰 가능성 확장
- **주요 단계 & 접점**
  1. **구매 후기 작성** – 리뷰 API, 이벤트(`reviews.review.created`)
  2. **관리자 대시보드** – 주문/상품 통합 관리 화면, 모니터링 지표 표시
  3. **알림/후속 조치** – 이벤트 기반 알림, SLA 모니터링
- **백엔드 요구사항**
  - 로그/트레이싱(OpenTelemetry) 도입
  - 관리자 권한 구분, 감사 로깅
  - 품질 지표 수집(`admin.metrics.generated`)
- **성공 지표**
  - 리뷰 작성 성공률 90% 이상 (테스트 기준)
  - 주요 서비스 메트릭 대시보드 제공 (지연, 실패율)

---

## 3. Touchpoints Matrix

| 여정 단계        | 주요 접점/서비스                   | 이벤트/데이터 | 관련 문서 |
| ---------------- | ---------------------------------- | ------------- | --------- |
| 가입/로그인      | `auth-service`, `web`               | JWT 토큰      | requirements, tech-guidelines |
| 주문 생성        | `orders-service`, Kafka             | `orders.order.created` | architecture, shared-kernel |
| 결제 처리        | `payments-service`, Mock Payments Processor   | `payments.payment.succeeded` | architecture, requirements |
| 주문 상태 조회   | `orders-service` 읽기 모델, `api-gateway` | `orders.order.statusChanged` | architecture |
| 카탈로그 업데이트 | `catalog-service`, 관리자 UI         | `catalog.product.updated` | MVP 2 계획 |
| 리뷰 등록        | 리뷰 서비스(향후), web              | `reviews.review.created` | MVP 3 계획 |

각 접점은 `docs/tech-guidelines.md`에서 정의된 코드 스타일과 테스트 정책을 따른다.

---

## 4. AI Collaboration Notes

- Codex Architect/Developer/Reviewer 에이전트를 통해 고객 여정 문서도 코드/설계와 함께 버전 관리
- 고객 여정 변경 시 `requirements.md`와 연동하여 MVP 우선순위를 재검토
- 향후 `Doc Writer` 에이전트를 도입해 고객 여정 업데이트와 릴리스 노트를 연계 예정

---

## 5. Next Steps

1. MVP 1 범위 내에서 주문 생성/조회 플로우에 대한 사용자 스토리 명세 작성
2. shared-kernel에 주문/결제/카탈로그 이벤트 스키마를 정의하고 계약 테스트 초안 준비
3. 고객 여정에 맞춘 프론트엔드 최소 UI 와 API Mock 설계

고객 여정 맵은 프로젝트 진행 중에도 지속적으로 업데이트되며, 서비스 확장에 따라 새로운 페르소나(예: 파트너, 물류) 및 접점이 추가될 수 있습니다.
