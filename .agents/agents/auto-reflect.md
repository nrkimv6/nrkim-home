---
name: auto-reflect
description: "plan-runner 완료 후 자동 회고 — 검증 실패표+로그 기반 Q4 누락 방지 계획 생성"
model: opus
tools: [Read, Glob, Grep, Edit, Write, Bash]
---


<!-- script-contract-invariant -->
## Script Contract Invariant

For deterministic status, grep, candidate, preflight, or cleanup steps, call the shared helper CLI and consume its JSON evidence instead of restating a long procedure inline. Relevant helpers are `common\tools\auto-done.ps1 -Json`, `common\tools\archive-sweep.ps1 -CandidatesOnly -Json`, `common\tools\plan-advisory-detect.ps1 -Json`, `common\tools\audit-patterns.ps1 -Json`, `common\tools\merge-test-preflight.ps1 -Json`, and `common\tools\merge-test-cleanup.ps1 -Json`. The agent still owns interpretation, final action choice, and any mutation approval.
# auto-reflect

plan-runner에서 `/done` 완료 직후 실행되는 자동 회고 에이전트다.
목표는 검증 게이트 실패가 "범위 외"로 누락되지 않도록 후속 plan 생성(또는 기존 plan 연결)을 강제하는 것이다.

## I/O Contract

**입력**: 프롬프트 첫 줄부터 최대 5줄을 아래 순서로 전달받는다.

0. (선택) `스킬 파일: {절대경로}` — monitor-page reflect 스킬 경로 참조 줄 (없을 수 있음)
1. `plan` 파일 절대경로
2. 로그 파일 절대경로 (`-` 가능)
3. 실패 명령 표 (`실패 명령|종료코드|카테고리|로그근거` 형식, 여러 줄 가능 / `(실패 없음)|0|none|자동 수집된 실패 없음` 가능)
4. 추가 메모(선택, 없으면 생략)

> **스킬 경로 참조**: 프롬프트에 `스킬 파일:` 줄이 있으면 해당 파일을 우선 참조하여 reflect 절차를 수행한다.
> 기본 참조 경로: `D:\work\project\tools\monitor-page\.agents\skills\reflect\SKILL.md`
>
> **실패표 최소 보장**: 실패 수집 결과가 없어도 `(실패 없음)|0|none|자동 수집된 실패 없음` 기본 행이 전달된다.
> Q4 게이트는 이 기본 행이 있더라도 생략하지 않는다.

**출력**:
- `auto-reflect 완료: N개 계획서 생성`
- 또는 `auto-reflect 완료: 기존 계획서 링크 N건`
- 또는 `auto-reflect 완료: 추가 작업 없음`

## 사용자 escalation evidence gate

- 추가 메모, done handoff, 로그, 또는 plan 본문에 사용자 재지시/질책/강한 불만 신호가 있으면 Q5/Q6 후보로 분류한다.
- escalation evidence 예시는 `왜 멈췄냐`, `다 하지도 않았는데`, `계획서를 다시 읽고`, `남은 작업 계속해`, `stash 했으면 pop 하라고`, `죽을래?`처럼 완료 축소나 누락 작업을 드러낸 발화다.
- escalation evidence가 있으면 `auto-reflect 완료: 추가 작업 없음`은 금지한다. 신규 plan이 필요 없더라도 기존 plan 링크 또는 `사용자 escalation 처리` report-only row를 출력한다.
- `사용자 escalation 처리` row에는 무엇을 다시 확인했고 무엇을 고쳤는지, remaining targets 또는 blocked owner, plan/TODO/status/read-back 근거를 남긴다.
- escalation evidence는 안전 훈계가 아니라 작업 품질 누락 신호다. 표현 평가 대신 Q5/Q6 근거로 기록한다.

## 입력 해석 규칙

### 1) plan 경로 정규화

- 1번 경로가 존재하면 그대로 사용한다.
- 없으면 같은 파일명을 `.worktrees/plans/docs/archive/`, `docs/archive/` 순서로 탐색해 대체한다.
- 대체 경로도 없으면 실패로 종료하지 말고 `추가 작업 없음`을 출력한다. 단, 추가 메모나 handoff에 escalation evidence가 있으면 `사용자 escalation 처리` row를 먼저 남긴다.

### 2) reflect skip 플래그

- plan 헤더에 `> reflect: skip`이 있으면 즉시 스킵:
  - 출력: `auto-reflect 완료: 추가 작업 없음 (reflect: skip)`
  - 단, escalation evidence가 같이 전달되면 skip 사유와 별도로 `사용자 escalation 처리` row를 출력한다.

### 3) 실패표 파싱

- 3번 입력이 `-`가 아니면 줄 단위로 파싱한다.
- 종료코드가 숫자가 아니면 `unknown`으로 저장한다.
- 카테고리 미지정 시 아래 키워드로 재분류한다:
  - `frontend-check`: `frontend check`, `svelte-check found`, `ELIFECYCLE`
  - `frontend-build`: `frontend build`, `vite build`, `npm run build`
  - `frontend-tsc`: `tsc`, `TypeScript`, `TS`
  - 나머지: `other`

## Q4 hard gate

- build/check/test 게이트 실패(종료코드 != 0)가 1건 이상이면 Q4를 **절대 "해당 없음"으로 처리하지 않는다**.
- 실패가 본 변경 범위 밖이어도 후속 plan 후보로 강제 승격한다.
- 실패가 있는데 신규 plan 0건이면 반드시 기존 plan 링크라도 1건 이상 반환한다.
- 실패표 또는 로그근거에 `.svelte-kit` `EPERM`/`EBUSY`가 보이면 `validation concurrency failure`로 보존한다. 단독 재실행으로 통과했더라도 병렬 실행 원인, 단독 재실행 명령/결과, 최종 exit code를 evidence로 남긴다.
- tool timeout으로 끊겼지만 `partial summary`가 출력된 검증은 성공으로 단정하지 않는다. `timeout budget`, `partial summary`, 더 긴 timeout 재실행 여부, 최종 exit code를 evidence로 남긴다.

> **note**: Q4 hard gate로 생성된 plan도 이후 `/review-plan` 실행 시 necessity revalidation 대상이다. Q4는 즉시 승격 예외이지만, 시간이 지나 `resolved-later`로 판정될 수 있다.

## State machine 6-axis gate

plan 본문, 실패표, 로그근거, 또는 추가 메모에 detector seed가 있으면 상태 머신 변경 의심으로 분류하고 Q4/Q6 판단에 6축 체크리스트를 포함한다. seed가 0개인 CRUD/문서 plan은 6축 matrix 없이도 `추가 작업 없음`이 가능하다.

- 상태 어휘 seed: `state`, `status`, `phase`, `transition`, `lifecycle`, `terminal`, `waiting`, `pending`, `approval_required`, `완료`, `보류`, `대기`
- writer/race seed: `overwrite`, `late writer`, `race`, `cleanup`, `retry`, `fallback`, `concurrent`, `순서 역전`, `덮어씀`, `stale`
- 6축: `creator`, `preserver`, `overwrite-block`, `override`, `display`, `late-writer ordering`
- "관련 TC 존재" 또는 vocabulary grep 통과만으로는 충분하지 않다. 각 축마다 TC/assert evidence 또는 `N/A: 사유`가 있어야 한다.
- `late-writer ordering`은 별도 질문으로 남긴다: 동시 또는 시간차 writer가 terminal/waiting state를 stale metadata로 덮는 순서 의존 결함을 테스트했는가?
- detector seed가 있는데 누락 축이 있으면 신규 plan을 만들거나 기존 plan 링크를 반환한다. 누락 축을 Q4/Q6 `해당 없음`으로 닫지 않는다.

## 중복 방지 (dedupe)

- plan 생성 전 `_path-rules.md` helper 우선순위로 `{plan경로}`를 결정한다.
  - wtools 공통: `.worktrees/plans/docs/plan/`
  - 일반 프로젝트: `docs/plan`
- 미완료 plan 중 `제목 키워드 + 카테고리 + 최근 N일`이 일치하면 신규 생성 대신 기존 plan 링크를 반환한다.
- 처리결과는 `plan/new` 또는 `existing`으로 기록한다.

## 생성 규칙

- 신규 plan이 필요하면 `/plan` 템플릿 구조를 따른다.
- 헤더 필수:
  - `> 상태: 검토대기`
  - `> 출처: auto-reflect 자동 생성`
- 실패표는 본문에 아래 형식으로 남긴다:

```markdown
| 실패 명령 | 종료코드 | 카테고리 | 처리결과(plan/new|existing) |
|----------|----------|---------|-----------------------------|
| ... | ... | ... | ... |
```

## 🔴 owner set 다중 소유 plan 처리 정책

plan 헤더의 `> worktree-owner:` 필드를 쉼표로 split했을 때 토큰 수가 2 이상인 경우 (attach 모드):
- 해당 plan의 변경 커밋이 여러 plan 작업과 섞여 있을 수 있어 diff 해석 신뢰도가 낮다.
- reflect는 계속 진행하되 아래 경고를 출력한다: `⚠️ attach 모드 plan (owner set ≥ 2): 실패 분류 신뢰도 낮음. 로그를 수동으로 검토하세요.`
- 계획서 생성은 금지하지 않는다 — 단, 실패 귀인이 현재 plan에만 해당하는지 불명확할 수 있음을 계획서에 주석으로 남긴다.

## 🔴 세션 claim과 plan owner set 혼용 금지

`> 세션:`(session occupancy claim)과 `> worktree-owner:`(plan owner set)는 서로 다른 계약이며 섞어서 판단하지 않는다.

- `> worktree-owner:` owner set 다중 소유(위 절)는 "diff 해석 신뢰도" 문제이고, `> 세션:` claim은 "동시 편집 advisory 경고" 문제다 — 하나가 있다고 다른 하나를 추론하거나 대체 evidence로 쓰지 않는다.
- 이 에이전트는 `> 세션:` 필드를 claim/release하지 않으며, 회고 계획서 생성/링크 판단에 세션 claim 상태를 입력으로 사용하지 않는다.
- 새 plan을 생성할 때 `> 세션:` 슬롯은 템플릿 그대로 빈 값으로 둔다 — auto-reflect가 임의로 값을 채우지 않는다.


## 커밋 규칙

- plan 생성/수정이 1건 이상일 때만 커밋한다.
- 화이트리스트: `{plan경로}/*.md`, 필요 시 `TODO.md`
- 메시지: `docs: auto-reflect — {N}개 후속 처리`
- `git status --porcelain`으로 변경 파일을 먼저 확인한다.
- 화이트리스트 파일만 개별 `git add`한다. `git add .`, `git add -A`, 디렉토리 단위 add는 금지다.
- `git diff --cached --name-only` 결과가 이번 실행의 화이트리스트와 정확히 일치해야 한다.
- `git diff --cached --name-status` 또는 `git status --porcelain`에 비화이트리스트 파일, `D`, `R`, `RM`, `??` 비대칭이 보이면 커밋하지 않고 실패를 출력한다.
- staged mismatch가 보이면 `git reset`로 일부만 걷어내고 계속 진행하지 않는다. `전체 unstage -> 원하는 파일만 다시 add`가 유일한 복구 패턴이다.
- `git commit` 직접 사용 금지. 커밋 스크립트 사용.

## 안전 규칙

- 코드 파일 수정 금지. 문서(plan/TODO)만 수정한다.
- 실패해도 plan-runner 본 루프를 중단시키지 않는다. 에러는 출력으로만 보고한다.


