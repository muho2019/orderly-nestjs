# Test Strategy & Quality Gates

Orderly 프로젝트의 테스트 접근 방식과 품질 게이트 기준을 정의합니다. Codex Reviewer가 자동 검증할 항목과 실제 구현 시 참고할 지침을 포함합니다.

---

## 1. 테스트 분류

| 레벨 | 책임 | 도구 | 적용 범위 |
| ----- | ---- | ---- | -------- |
| Unit | 함수/클래스 단위 로직 검증 | Jest | 서비스별 유즈케이스, 유틸 함수 |
| Integration | 모듈 간 상호작용 검증 | Jest + Supertest | REST 컨트롤러, 서비스, DB 연결 |
| Contract (Event/API) | Kafka 이벤트/REST 계약 검증 | Jest + Custom Harness (`@orderly/testing`) | shared-kernel 스키마와 실제 페이로드 일치 여부 |
| E2E (선택) | 사용자 시나리오 검증 | Playwright or Cypress (후속) | 가입 → 주문 → 결제 → 상태 조회 |

---

## 2. 서비스별 테스트 요구사항

### Auth Service
- 비밀번호 해싱, JWT 발급/검증 단위 테스트
- 가입/로그인 REST API 통합 테스트
- User 상태 변경 이벤트 발행 계약 테스트 (향후)

### Orders Service
- 주문 생성/상태 전이 유즈케이스 단위 테스트
- CQRS 읽기 모델 업데이트 통합 테스트
- `orders.order.created`, `orders.order.statusChanged` 이벤트 스키마 검증

### Payments Service
- Mock Payments Processor 연동 모듈 단위 테스트 (HTTP 클라이언트 모킹)
- 웹훅 수신 시 주문 상태 업데이트 통합 테스트 (orders-service 연동 시 계약 테스트)
- 결제 이벤트(`payments.*`) 스키마 검증 및 Toss 호환성 보장

### Catalog Service
- 상품 CRUD 유즈케이스 단위 테스트
- 관리자 API 통합 테스트 (인증/권한) – MVP2 이후
- `catalog.product.*` 이벤트 계약 테스트

### Web App
- 페이지/컴포넌트 스냅샷 테스트 (선택)
- API 통합 모킹으로 주문 생성 플로우 테스트 (Next.js App Router 기준)

---

## 3. 품질 게이트 기준

| 항목 | 기준 | 검증 방법 |
| ---- | ---- | -------- |
| Lint | ESLint 오류 0건 | `npm run lint` 또는 Turborepo 파이프라인 |
| Unit Test | 필수 서비스 커버 | `npm run test` (워크스페이스별) |
| Coverage | 80% 이상 | Jest 커버리지 리포트 (`--coverage`) |
| Contract Test | 이벤트/REST 스키마 준수 | `npm run test:contract` (추가 예정) |
| Build | 프로덕션 빌드 통과 | `npm run build` |

Codex Reviewer는 PR마다 위 항목을 확인합니다.

---

## 4. 테스트 자동화 흐름

1. **Local Dev**
   - `npm run lint`
   - `npm run test` (서비스 단위)
   - 필요 시 `npm run test:e2e` (추가 후)

2. **CI Pipeline**
   - Install → Lint → Unit/Integration → Contract → Build → (E2E 옵션)
   - docker-compose 기반 DB/Kafka를 CI에서 기동하여 통합 테스트 실행

3. **Artifacts**
   - Jest 커버리지 리포트 (`coverage/`)
   - contract validation 결과 (JSON)
   - 로깅/스크린샷 (E2E)

---

## 5. 데이터/환경 전략

- 테스트 DB는 서비스별 Postgres 컨테이너를 사용, 각 테스트마다 트랜잭션 롤백 또는 DB 리셋
- Kafka는 테스트용 embedded broker(mock) 또는 docker-compose 기반 실브로커를 활용
- Payments 연동은 기본적으로 Mock Processor를 사용하며, 향후 Toss sandbox 연결 시에도 동일한 계약 테스트를 재사용

---

## 6. 테스트 유틸 (`@orderly/testing`)

- Nest.js TestingModule 빌더 헬퍼
- Kafka 이벤트 퍼블리셔/컨슈머 Mock
- REST API Supertest 래퍼 (토큰 주입, 공통 헤더)
- 계약 테스트 스키마 검증 유틸 (`validateEvent(payload, schema)`)

---

## 7. CI/CD 품질 게이트 통합

- GitHub Actions 워크플로에서 Turborepo 파이프라인 (`lint`, `test`, `build`) 실행
- 실패 시 Codex Reviewer가 PR을 차단 및 피드백 제공
- 커버리지 리포트가 80% 미만인 경우 PR 요건 불충족으로 표시 (체크 런 실패)

---

## 8. 향후 확장

- Playwright 기반 E2E 테스트 추가 (Next.js UI + API 연동)
- Pact, AsyncAPI 등 정식 계약 테스트 도구 도입 검토
- Observability 기반 회귀 테스트(로그/메트릭 분석) 탐색

이 전략은 프로젝트 진행 상황에 따라 업데이트되며, Codex Reviewer/Developer 에이전트가 지속적으로 점검합니다.
