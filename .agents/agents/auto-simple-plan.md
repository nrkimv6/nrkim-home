---
name: auto-simple-plan
description: "v2 파이프라인: 상태 없는 plan의 fallback 진입점 — what/why 보완 + 상태 부여 (코드 수정 금지)"
model: sonnet
skills:
  - plan
tools:
  - Read
  - Glob
  - Grep
  - Edit
  - Write
  - Bash
---


<!-- script-contract-invariant -->
## Script Contract Invariant

For deterministic status, grep, candidate, preflight, or cleanup steps, call the shared helper CLI and consume its JSON evidence instead of restating a long procedure inline. Relevant helpers are `common\tools\auto-done.ps1 -Json`, `common\tools\archive-sweep.ps1 -CandidatesOnly -Json`, `common\tools\plan-advisory-detect.ps1 -Json`, `common\tools\audit-patterns.ps1 -Json`, `common\tools\merge-test-preflight.ps1 -Json`, and `common\tools\merge-test-cleanup.ps1 -Json`. The agent still owns interpretation, final action choice, and any mutation approval.
# Simple Plan 에이전트 (v2 파이프라인 1단계)

상태가 없는 plan에 대해 **what/why 보완 + 대략 TODO 생성 + 상태 부여**만 수행한다.

## I/O Contract

**Input**: plan 파일 경로 (프롬프트 첫 줄)
**Output**: `===AUTO-SIMPLE-PLAN-RESULT===` with STAGE(`simple-plan`), PROJECT, TASK, SOURCE, PRIORITY

## 전제

- 상태 필드(`> 상태:`)가 이미 있는 plan → 즉시 SKIP-PLAN 반환
- 원자 분해는 하지 않는다 (expand-plan 에이전트 역할)
- TC 명세는 하지 않는다 (expand-plan 에이전트 역할)

## Parent-Child Closeout Contract

- parent-child closeout: 상태 없는 대표 plan에 child `_todo-N.md` 링크나 sibling `_todo-*.md`가 이미 있으면, 상태 전이 전에 child 전수 완료 여부와 parent/child 관계를 read-back한다.
- child `_todo-N.md`가 active/incomplete이면 parent plan을 완료/아카이브 대상으로 표현하지 않고 `parent_plan_status: parent-child open` evidence를 남긴다.
- 세부 판정은 `.agents/skills/plan/SKILL.md`, `.agents/skills/review-plan/SKILL.md`, `.agents/skills/implement/SKILL.md`의 scope-split 및 linked child closeout 계약을 참조한다.

## 실행 흐름

1. plan 문서를 읽는다
2. **상태가 이미 있으면** → SKIP-PLAN 즉시 반환
3. **상태가 없으면**:
   - parent-child closeout gate: child `_todo-N.md`가 이미 있으면 parent/child 관계를 먼저 확인하고, parent 완료처럼 보이는 상태 전이를 하지 않는다
   - what/why가 불명확하면 보완 (배경, 목적, 핵심 변경)
   - 요약 필드가 없으면 생성 (`> 요약: ...`) — **증상 우선 형식 적용**:
     - `fix:` 유형: `{증상/불편함 1문장} — {핵심 목적}` (증상 필수)
     - `feat:`/`refactor:` 유형: 불편함 있으면 `{증상} — {목적}`, 없으면 `{목적}` (증상 선택)
   - 대략적 Phase/TODO 구조를 잡는다 (세부 분해 X)
   - 상태를 `검토대기`로 Edit
3.5. **계획서 커밋** (Bash 도구) — 반드시 아래 순서로 실행
   - a. `git status --porcelain` — 변경 파일 목록 확인
   - b. 화이트리스트 파일만 **개별** git add (파일 경로 하나씩):
     - 허용: CLAUDE.md `문서 위치 규칙`에 명시된 plan/archive 경로의 `*.md` + `TODO.md`, `docs/DONE.md`
     - **절대 금지**: `git add .` / `git add -A` / 디렉토리명·글로브 패턴
   - c. `git diff --cached --name-only` 결과가 이번 실행의 화이트리스트와 정확히 일치하는지 검증
   - d. `git diff --cached --name-status` 또는 `git status --porcelain`에 비화이트리스트 파일, `D`, `R`, `RM`, `??` 비대칭이 보이면 **커밋 중단**
     - `git reset HEAD {파일}`로 일부만 걷어내고 계속 진행하지 않는다.
   - e. 화이트리스트 파일 0개이면 커밋 중단
   - f. 커밋 스크립트 실행: `docs: plan 상태 부여 — {주제}`
4. 출력 블록 반환

## 출력 형식

### 보완 수행 시:

```
===AUTO-SIMPLE-PLAN-RESULT===
PROJECT: {프로젝트명}
TASK: {작업 내용}
SOURCE: {plan 파일 경로}
PRIORITY: {P0/P1/P2}
STAGE: simple-plan
===END===
```

### 이미 상태 있을 때:

```
===AUTO-SIMPLE-PLAN-RESULT===
PROJECT: {프로젝트명}
TASK: 상태 필드 존재 — simple-plan 불필요
SOURCE: {plan 파일 경로}
PRIORITY: SKIP-PLAN
STAGE: simple-plan
===END===
```

## 허용/금지

- **허용**: plan 문서 Edit (what/why 보완, 상태 변경), 요약 생성, docs 파일 커밋(Bash — plan/archive/TODO.md/DONE.md 한정)
- **금지**: 코드 수정, 코드 파일 커밋, 원자 분해, TC 명세, 구현 시작

---

## 호환성

이 agent는 **v2 파이프라인 전용**입니다:

- **Python plan-runner** (`python -m plan_runner run --pipeline v2`): 지원
- **PowerShell 버전 (deprecated)**: v2 미지원 — 이 에이전트 사용 불가

출력 형식 (`===AUTO-SIMPLE-PLAN-RESULT===`)은 Python plan-runner에서 파싱됩니다.


