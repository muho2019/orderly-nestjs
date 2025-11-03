# Orderly

Orderly는 **Nest.js 기반 마이크로서비스 아키텍처(MSA)**를 중심으로 설계된 주문·결제 플랫폼 학습 프로젝트입니다. 이 저장소는 백엔드 아키텍처 역량과 **AI 도구(Codex) 활용 능력**을 실무 수준으로 증명하기 위한 포트폴리오 용도로 제작되었습니다.

## 왜 Orderly인가?

- **MVP에서 확장까지**: 인증/주문을 시작으로 결제(Toss Payments), 카탈로그, 리뷰까지 단계적으로 확장하는 로드맵을 통해 시스템 성장 과정과 우선순위 설정 능력을 보여 줍니다.
- **MSA & EDA 실습**: 서비스별 독립 데이터베이스, Apache Kafka 기반 이벤트 중심 설계로 도메인 간 결합도를 낮추고 확장성과 복원력을 신경 쓴 구조입니다.
- **실무형 개발 환경**: Turborepo + npm workspaces, docker-compose 오케스트레이션, 공통 shared-kernel 패키지로 모듈 재사용과 협업을 고려했습니다.
- **문서 우선 + AI 협업**: requirements, architecture, tech-guidelines, agents 문서를 Codex 에이전트와 함께 유지하며, AI를 활용한 설계·개발·리뷰 자동화 흐름을 체험했습니다.

## 시스템 구성

```
orderly/
├── apps/
│   ├── api-gateway/           # BFF, 인증, 이벤트 팬아웃 조정
│   ├── services/
│   │   ├── auth-service/      # JWT 인증, 회원 도메인 (전용 DB)
│   │   ├── orders-service/    # 주문 생성/상태 관리, CQRS 읽기 모델
│   │   ├── payments-service/  # Toss Payments 연동, 결제 이벤트
│   │   └── catalog-service/   # 상품 카탈로그 (MVP2 이후 활성화)
│   └── web/                   # 최소 UI (백엔드 검증 목적)
├── packages/
│   ├── shared-kernel/         # DTO · 이벤트 스키마 · 공통 유틸
│   └── testing/               # 통합/계약 테스트 헬퍼
├── docs/                      # 요구사항 · 아키텍처 · 가이드 · 에이전트 정의
└── docker-compose.yml         # Kafka + 서비스별 PostgreSQL + 유틸리티
```

## MVP 로드맵

1. **MVP 1 – 주문 조회 중심**
   - 인증/회원 도메인, 주문 생성·상태 전이, CQRS 기반 읽기 모델
   - Kafka 이벤트: `orders.order.created`, `orders.order.statusChanged`
2. **MVP 2 – 결제 & 카탈로그 확장**
   - Toss Payments 연동, 상품 카탈로그, 주문-결제 이벤트 흐름 정립
   - Kafka 이벤트: `payments.payment.succeeded`, `catalog.product.updated`
3. **MVP 3 – 고객 경험 강화**
   - 리뷰/피드백, 관리자 기능, 관찰 가능성(로그·트레이싱)
   - Kafka 이벤트: `reviews.review.created`, `admin.metrics.generated`

이 단계별 접근은 학습 곡선과 비즈니스 가치 사이에서 균형을 잡는 방식을 보여 줍니다.

## 기술 스택 하이라이트

- **백엔드**: Nest.js, TypeScript, TypeORM, Kafka, Toss Payments API
- **프론트엔드**: Next.js 15, React 18 (검증용 최소 UI)
- **인프라**: docker-compose, PostgreSQL (서비스별 인스턴스)
- **모노레포 툴링**: Turborepo, npm workspaces, eslint/prettier 표준
- **테스트**: Jest, Supertest, 계약 테스트 유틸 패키지
- **AI 협업**: Codex Architect/Developer/Reviewer 에이전트를 통해 요구사항 → 설계 → 구현 → 리뷰가 자동화된 흐름을 경험

## 문서 & 에이전트 운영

- `docs/requirements.md` – MVP 로드맵과 기술 요구사항
- `docs/architecture.md` – 서비스 토폴로지, 이벤트 흐름, CI/CD 전략
- `docs/tech-guidelines.md` – 코드 스타일, 테스트, Kafka/컨테이너 가이드
- `docs/agents.md` – Codex Architect/Developer/Reviewer 역할 및 체크리스트

문서와 코드가 자동화된 Codex 에이전트 흐름을 통해 동기화되도록 설계했습니다.

## 빠른 시작

```bash
npm install
npm run dev -- --filter=@orderly/auth-service
# 또는 docker-compose로 모든 서비스 기동
docker-compose up -d
```

> 첫 실행 시 `apps/services/*`는 스켈레톤 상태이므로 Nest CLI로 모듈을 추가하거나, shared-kernel 이벤트 스키마를 정의하면서 도메인을 확장할 수 있습니다.

## 앞으로의 계획

- 이벤트 계약 테스트 자동화(`@orderly/testing` 고도화)
- Observability 스택 연동 (OpenTelemetry, Prometheus, Grafana)
- CI 파이프라인에서 컨테이너 이미지를 자동 빌드·검증
