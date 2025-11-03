# Agents

Orderly 프로젝트의 Codex 에이전트는 Nest.js 중심의 MSA·EDA 학습 목표와 MVP 단계별 개발 전략을 지원하도록 설계되었습니다.  
본 문서는 `requirements.md`, `architecture.md`, `tech-guidelines.md`를 근간으로 각 에이전트가 수행해야 할 역할, 산출물, 협업 규칙을 명확히 정의합니다.

---

## 1. Overview

- **프로젝트 성격:** Nest.js 백엔드 역량 강화 및 포트폴리오 구축
- **아키텍처:** MSA + EDA, Apache Kafka 기반 이벤트 브로커
- **운영 환경:** 모노레포(Turborepo + npm), docker-compose 로컬 오케스트레이션
- **전략:** MVP 1(주문/인증) → MVP 2(결제/카탈로그) → MVP 3(리뷰/관찰성) 순의 점진적 확장
- **Codex 지원 범위:** 설계 유지, 코드 생성, 품질 검증, 문서 동기화 자동화

---

## 2. Agent Definitions

### 🧠 `Architect`

- **입력 소스:**
  - `requirements.md`, `tech-guidelines.md`, `architecture.md`
  - 모놀리식 → 마이크로서비스 전환 계획, Kafka 토폴로지 초안, docker-compose 설계
- **주요 산출물:**
  - 서비스 경계 및 인터페이스 정의(`architecture.md`)
  - Kafka 토픽/이벤트 스키마 규칙, shared-kernel 구조 가이드
  - 개발·운영 표준 업데이트(`tech-guidelines.md`)
- **책임:**
  - MVP 단계별 범위와 의존성 관리
  - Docker 기반 로컬 인프라 구성 요소 식별
  - 서비스 계약(API, 이벤트) 버전 관리 및 문서화

### ⚙️ `Developer`

- **입력 소스:**
  - 최신 설계 문서(`architecture.md`, `tech-guidelines.md`)
  - 이슈/스토리(`features.md`, `stories.md`) 및 이벤트 스키마(`packages/shared-kernel/`)
- **주요 산출물:**
  - `apps/services/*` Nest.js 마이크로서비스 구현 및 테스트
  - `packages/shared-kernel` 이벤트/DTO 스키마 업데이트
  - `docker-compose.yml`, `.env.*`와 같은 개발 환경 스크립트 보완
  - npm 기반 lint/test 스크립트 및 GitHub Actions 워크플로
- **책임:**
  - ESLint/Prettier 규칙과 TypeScript 명시적 타입 준수
  - Kafka 이벤트 퍼블리시/컨슈밍 로직 및 계약 테스트 작성
  - API·이벤트 변경 시 `api-docs/`, `architecture.md` 동기화

### 📋 `Reviewer`

- **입력 소스:**
  - Pull Request, 변경된 서비스 코드, 테스트/커버리지 리포트
  - 이벤트 스키마 diff, docker-compose 변경 사항
- **주요 산출물:**
  - 리뷰 피드백(`reviews.md`) 및 품질 리포트(`quality-report.md`)
  - 승인/수정 요청, 추가 테스트 권고 사항
- **책임:**
  - 서비스 경계, Kafka 토픽 규칙, shared-kernel 일관성 검증
  - 테스트 통과 및 커버리지(≥80%) 확인, 이벤트 계약 테스트 실행 여부 점검
  - docker-compose와 문서(요구사항/설계/가이드) 동기화 상태 확인
  - 자동 병합 전 Codex 품질 정책 준수 여부 최종 판단

---

## 3. Interaction Workflow

| 단계                       | 설명                                                                           |
| -------------------------- | ------------------------------------------------------------------------------ |
| 1. `Architect → Developer` | Architect는 MVP 우선순위, 서비스 경계, Kafka 토폴로지 업데이트를 전달한다.     |
| 2. `Developer → Reviewer`  | Developer는 구현/테스트 후 PR을 생성하고 docker-compose, 문서 변경을 포함한다. |
| 3. `Reviewer → Developer`  | Reviewer는 품질 이슈(코드, 이벤트, 문서)를 지적하고 수정 요청을 전달한다.      |
| 4. `Reviewer → Merge`      | 품질 정책 충족 시 Reviewer가 병합을 승인하거나 자동 병합을 트리거한다.         |

> MVP 확장 시마다 Architect가 개정된 설계/지침을 먼저 반영한 뒤 Developer 작업이 진행되어야 합니다.

---

## 4. Permissions & Boundaries

| Agent     | 코드 접근 범위                                                     | 문서 접근 | CI/CD 권한 | 병합 권한   |
| --------- | ------------------------------------------------------------------ | --------- | ---------- | ----------- |
| Architect | `apps/`, `packages/`, `docs/`, `infra/`                            | ✅        | 🔄(설정)   | ❌          |
| Developer | `apps/services/`, `apps/api-gateway/`, `packages/`, `infra/docker` | ✅        | ✅         | ❌          |
| Reviewer  | 전체(`apps/`, `packages/`, `infra/`, `docs/`)                      | ✅        | ✅         | ✅ (조건부) |

**병합 조건:** Codex Reviewer가 품질 정책과 문서 동기화를 모두 통과시킨 경우에만 자동 병합이 가능하며, 그 외에는 수동 승인이 필요합니다.

---

## 5. Review Criteria (Codex Quality Policy)

| 항목                | 검증 기준                                                                  |
| ------------------- | -------------------------------------------------------------------------- |
| `코드 스타일`       | ESLint + Prettier 통과, any 금지, TypeScript 명시적 타입                   |
| `테스트 품질`       | 단위·통합 테스트 통과, 커버리지 80% 이상, 이벤트 계약 테스트 포함          |
| `커밋 컨벤션`       | Conventional Commits(`feat:`, `fix:`, `docs:` 등)                          |
| `API·이벤트 일관성` | DTO/이벤트 스키마는 `shared-kernel` 규칙 준수, Kafka 토픽 네이밍 검증      |
| `문서 동기화`       | 코드 변경 시 `api-docs/`, `architecture.md`, `tech-guidelines.md` 업데이트 |
| `운영 스크립트`     | `docker-compose`, npm 스크립트, Husky 훅 등 실행 가능 여부 확인            |

---

## 6. Agent Playbook

- **Architect 체크리스트**

  - MVP 범위 정의 및 서비스간 의존성 업데이트
  - Kafka 토폴로지(토픽, 소비 그룹)와 docker-compose 서비스 정의 초안 작성
  - 변경 사항을 `architecture.md`, `tech-guidelines.md`에 반영

- **Developer 체크리스트**

  - 설계 변경 사항 반영 → 서비스 코드 구현 → 테스트 및 이벤트 계약 검증
  - `packages/shared-kernel` 스키마 업데이트와 변경 내역 문서화
  - docker-compose, `.env.*`, npm 스크립트 동기화 및 실행 테스트

- **Reviewer 체크리스트**
  - 코드 스타일 및 테스트 결과 확인 (`npm run lint`, `npm run test`)
  - Kafka 이벤트/문서 불일치 확인, 공유 스키마 변경 리뷰
  - 요구사항/설계/가이드 문서가 최신인지 검증 후 승인 판단

---

## 7. Future Extensions

| 예정된 에이전트    | 역할                                                | 예정 시점 |
| ------------------ | --------------------------------------------------- | --------- |
| `AI Tester`        | Kafka 이벤트 계약/e2e 시나리오 자동 생성 및 실행    | v2        |
| `Doc Writer`       | 서비스 변경 기반 지식 저장소, 릴리스 노트 자동 생성 | v2        |
| `Security Auditor` | 인증/인가, 데이터 보호, 비밀 관리 검사              | v3        |

---

## 8. References

- `requirements.md` — MVP 로드맵, 개발 환경, Kafka 요구사항
- `architecture.md` — 서비스 토폴로지, 데이터·이벤트 흐름, CI/CD 전략
- `tech-guidelines.md` — 코드 스타일, 테스트 정책, Kafka/컨테이너 가이드
- `packages/shared-kernel/` — DTO 및 이벤트 스키마 소스 오브 트루스
- `docker-compose.yml` — 로컬 인프라 구성 및 실행 기준
