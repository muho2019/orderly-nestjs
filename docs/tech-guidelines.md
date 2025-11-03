# Tech Guidelines

## 1. 언어 및 프레임워크

- **모노레포 관리:** Turborepo + npm workspaces
- **패키지 매니저:** npm
- **백엔드:** Nest.js + TypeScript (서비스별 독립 앱 구성)
- **프론트엔드:** Next.js 15 + React 18 + TypeScript (백엔드 검증용 최소 UI)
- **DB:** PostgreSQL (서비스별 독립 데이터베이스)
- **ORM:** TypeORM
- **테스트:** Jest
- **컨테이너 오케스트레이션:** docker-compose (로컬 개발 환경)
- **이벤트 브로커:** Apache Kafka

---

## 2. MVP 개발 원칙

- **점진적 확장:** MVP 1(주문/인증) → MVP 2(결제/카탈로그) → MVP 3(리뷰/관찰성) 순으로 범위 확장
- **백엔드 우선:** 프론트엔드는 필요한 화면만 구현하여 백엔드 기능 검증에 집중
- **MSA 지향:** 서비스 경계를 명확히 하고 도메인별 독립 배포 가능성을 유지
- **EDA 지향:** 모든 도메인 이벤트는 게시/구독 패턴을 따르며, 이벤트 스키마는 공유 패키지에서 정의
- **DDD 적용:** 각 서비스는 바운디드 컨텍스트 내 애그리게잇·값 객체·도메인 서비스를 명확히 분리하고 shared-kernel과 계약 테스트로 협력
- **결제 연동 표준:** Toss Payments REST API를 사용하고 비즈니스 로직은 `payments-service`에서만 호출

---

## 3. 코드 스타일

- ESLint (`@typescript-eslint/recommended`)
- Prettier 통합
- 모든 코드에 명시적 타입 선언
- 네이밍 규칙:
  - 클래스: PascalCase
  - 함수/변수: camelCase
  - 상수: UPPER_SNAKE_CASE
  - 폴더: kebab-case

---

## 4. 커밋 규칙 (Conventional Commits)

| 타입        | 설명                            |
| ----------- | ------------------------------- |
| `feat:`     | 새로운 기능 추가                |
| `fix:`      | 버그 수정                       |
| `refactor:` | 코드 구조 변경                  |
| `docs:`     | 문서 수정                       |
| `test:`     | 테스트 추가/수정                |
| `chore:`    | 빌드/패키지 관리 등 비기능 변경 |

예시:

```

feat(api): add order cancellation endpoint
fix(web): correct cart item count display

```

---

## 5. 테스트 기준

- 모든 서비스는 단위 테스트 필수
- 커버리지 목표: **80% 이상**
- 테스트 명명 규칙: `*.spec.ts`
- API 통합 테스트는 `supertest` 기반으로 작성
- 이벤트 흐름은 통합 테스트 또는 계약 테스트로 검증

---

## 6. API 문서화

- Swagger 자동 문서화 (`@nestjs/swagger`)
- DTO에 반드시 `@ApiProperty()` 지정
- 버전별 엔드포인트 관리 (`/v1/`, `/v2/`)
- 새로운 REST API 또는 이벤트를 추가할 때 `api-docs/` 문서를 동시에 갱신

---

## 7. 폴더 구조 규칙 (Nest.js)

```

apps/
├── services/
│   ├── auth-service/
│   ├── orders-service/
│   └── payments-service/
├── api-gateway/
└── web/

packages/
├── shared-kernel/     # DTO, 이벤트 스키마, 공통 유틸
└── testing/           # 테스트 유틸리티

```

---

## 8. 이벤트 중심 아키텍처 가이드

- 동기 통신은 REST, 비동기 통신은 Kafka 이벤트 스트림으로 분리
- 이벤트 명명 규칙: `<boundedContext>.<aggregate>.<eventName>` (예: `orders.order.created`)
- 이벤트 페이로드에는 `correlationId`, `causationId`, `occurredAt` 필드를 포함
- 이벤트 스키마와 타입은 `packages/shared-kernel/events`에서 중앙 관리하고, Kafka 토픽명은 이벤트 명명 규칙을 따른다
- 서비스 간 의존성은 Kafka 소비 그룹을 통한 느슨한 결합으로 유지
- Kafka 클러스터 설정은 `.k8s/` 또는 `infra/` 디렉터리에서 관리하며, 로컬은 docker-compose에서 `kafka` 서비스로 제공

---

## 9. 컨테이너 개발환경 가이드

- `docker-compose.yml`에는 서비스, 데이터베이스, 이벤트 브로커를 정의해 로컬에서 MSA 토폴로지를 재현
- 각 서비스는 `.env.development` 등 환경별 설정 파일을 통해 컨테이너 환경 변수를 주입
- 공용 네트워크 이름은 `orderly-network`를 사용하여 서비스 간 통신을 단일 네트워크로 묶음
- 기동 순서: 데이터베이스 → 이벤트 브로커 → 백엔드 서비스 → API 게이트웨이 → 웹 앱
- 표준 명령: `docker-compose up -d`로 기동, `docker-compose down --remove-orphans`로 정리

---

## 10. npm 스크립트 규칙

- 공통 스크립트 네이밍:
  - `npm run lint` → 전체 워크스페이스 ESLint 검사
  - `npm run test` → 단위 테스트 실행
  - `npm run test:e2e` → 통합/시나리오 테스트
  - `npm run dev:<service>` → 서비스별 개발 서버 실행
- Husky는 npm 기반으로 설정 (`npm set-script prepare "husky install"`)
- `postinstall` 훅에서 워크스페이스 초기화 및 코드 생성 작업 실행

---

## 11. 리뷰 기준

Codex Reviewer Agent는 다음을 점검합니다:

- ESLint 오류 0건
- 커밋 메시지 형식 준수
- 테스트 통과 및 커버리지 기준 충족
- 타입 안정성 보장 (any 사용 금지)
- 이벤트 스키마 및 `api-docs/` 문서 동기화 여부 확인
