# Architecture

## 1. 시스템 개요

Orderly는 **Nest.js 학습 및 포트폴리오 구축**을 목표로 하는 모노레포 기반 백엔드 중심 프로젝트입니다.  
`apps/`에는 도메인별 마이크로서비스를, `packages/`에는 공유 코어와 도구를 배치하여 **MSA**와 **EDA** 실험이 가능하도록 설계했습니다.  
프론트엔드(`web`)는 최소 기능만 제공하며, 백엔드 기능 검증과 이벤트 흐름 학습에 우선순위를 둡니다.

---

## 2. 서비스 토폴로지

| 이름                 | 스택                          | 주요 책임                                                        | 인터페이스        |
| -------------------- | ----------------------------- | ---------------------------------------------------------------- | ----------------- |
| **api-gateway**      | Nest.js REST Gateway          | 인증, BFF 계층, 퍼블릭 API 집약                                  | HTTP              |
| **auth-service**     | Nest.js, TypeORM, PostgreSQL  | 회원 가입/로그인, JWT 발급 및 검증, 인증 이벤트 발행            | REST + Kafka      |
| **orders-service**   | Nest.js, CQRS, PostgreSQL     | 주문 생성·상태 전이, 주문 조회용 읽기 모델, 주문 이벤트 발행    | REST + Kafka      |
| **payments-service** | Nest.js, Toss Payments API, PostgreSQL | 결제 승인/환불, 결제 이벤트 발행                         | REST + Kafka      |
| **catalog-service*** | Nest.js, TypeORM, PostgreSQL  | 상품 등록/수정/조회, 카탈로그 이벤트 발행 (MVP 2에서 활성화)     | REST + Kafka      |
| **web**              | Next.js 15, React 18          | 주문 생성·조회, 최소 인증 UI                                    | HTTP              |
| **shared-kernel**    | TypeScript 패키지             | DTO, 이벤트 스키마, 유틸, 공통 타입                              | npm 패키지        |

`*` catalog-service는 MVP 2부터 추가되는 확장 서비스입니다.

> 이벤트 브로커는 Apache Kafka로 표준화하며, 서비스별 토픽은 `shared-kernel` 이벤트 명명 규칙을 따른다.

> 이벤트 브로커는 Kafka를 사용하며, 모든 서비스는 게시/구독 패턴으로 이벤트를 처리합니다.

---

## 3. 디렉터리 구조

```
orderly/
├── apps/
│   ├── services/
│   │   ├── auth-service/
│   │   ├── orders-service/
│   │   ├── payments-service/
│   │   └── catalog-service/   # MVP 2부터 추가
│   ├── api-gateway/
│   └── web/
├── packages/
│   ├── shared-kernel/     # 이벤트 스키마, DTO, 공통 유틸
│   └── testing/           # 테스트 헬퍼 및 목 도구
├── docs/
│   ├── requirements.md
│   ├── architecture.md
│   └── tech-guidelines.md
└── turbo.json
```

---

## 4. 데이터 및 이벤트 흐름

1. 사용자가 `web`을 통해 요청을 생성하면 `api-gateway`로 전달된다.
2. `api-gateway`는 도메인에 따라 해당 마이크로서비스(auth/orders/payments 등)에 REST 호출을 위임한다.
3. 서비스는 PostgreSQL을 통한 트랜잭션 처리 후 결과를 반환하고, `shared-kernel`에 정의된 스키마로 Kafka 토픽에 도메인 이벤트를 발행한다.
4. Kafka는 발행된 이벤트를 소비 그룹에 전달한다. 예: `orders-service`가 결제 확인 이벤트를 소비하여 주문 상태를 갱신.
5. 읽기 모델 업데이트가 완료되면 `api-gateway`는 응답을 반환하고, 프론트엔드는 결과를 반영한다.

---

## 5. MVP 로드맵

- **MVP 1 – 주문 조회 중심**
  - 인증/회원, 주문 생성 및 상태 전이, CQRS 기반 읽기 모델 노출
  - 이벤트: `orders.order.created`, `orders.order.statusChanged`
- **MVP 2 – 결제 및 카탈로그 확장**
  - 상품 카탈로그(`catalog-service`), Toss Payments 결제 연동, 주문-결제 이벤트 흐름 정립
  - 이벤트: `payments.payment.succeeded`, `catalog.product.updated`
- **MVP 3 – 고객 경험 강화**
  - 리뷰/피드백, 관리자 기능, 로그·트레이싱 기반 관찰 가능성 추가
  - 이벤트: `reviews.review.created`, `admin.metrics.generated`

각 단계는 docker-compose 환경에서 독립적으로 실행·검증할 수 있도록 서비스 구성을 최소 단위로 확장합니다.

---

## 6. 개발 환경 및 인프라

- **컨테이너 오케스트레이션:** `docker-compose`  
  - 서비스 컨테이너(auth, orders, payments, catalog, api-gateway, web)  
  - 서비스별 전용 PostgreSQL 인스턴스 및 Kafka, 지원 도구(예: pgAdmin, kafka-ui)  
  - 공통 네트워크 `orderly-network`로 통신 일원화
- **환경 변수 관리:** 각 서비스별 `.env.development` → compose에서 주입
- **로컬 실행 절차:** `docker-compose up -d` → 마이그레이션/시드 → `npm run dev:<service>`

---

## 7. CI/CD 파이프라인

- PR 생성 시: `npm install` → 단위 테스트(`npm run test`) → Lint → 이벤트 계약 테스트
- `main` 브랜치: 통합 테스트, docker-compose 기반 컨테이너 빌드 검증
- 태그 배포: 서비스별 Docker 이미지 빌드 및 레지스트리 푸시 → 환경별 배포 자동화
- Codex Reviewer Agent는 커밋 규칙, 테스트, 이벤트/문서 동기화를 검증한 후 병합을 승인합니다.
