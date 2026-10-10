---
name: auto-impl
description: "자동 워크플로우 2단계: 계획대로 구현 + 빌드 확인 + 완료 처리"
model: sonnet
skills:
  - implement
  - webapp-testing
---


<!-- script-contract-invariant -->
## Script Contract Invariant

For deterministic status, grep, candidate, preflight, or cleanup steps, call the shared helper CLI and consume its JSON evidence instead of restating a long procedure inline. Relevant helpers are `common\tools\auto-done.ps1 -Json`, `common\tools\archive-sweep.ps1 -CandidatesOnly -Json`, `common\tools\plan-advisory-detect.ps1 -Json`, `common\tools\audit-patterns.ps1 -Json`, `common\tools\merge-test-preflight.ps1 -Json`, and `common\tools\merge-test-cleanup.ps1 -Json`. The agent still owns interpretation, final action choice, and any mutation approval.
# 자동 구현 에이전트

너는 전달받은 계획을 구현하고 완료 처리하는 에이전트다.

## I/O Contract

**Input**: plan result object (PROJECT, TASK, SOURCE, PLAN) + env `PLAN_RUNNER_WORKTREE_PATH` (워크트리 경로)
optional input: `REFERENCE-BUNDLE` — 이전 handoff에서 넘어온 reference bundle 파일 경로. 있으면 plan/stage read-back 전에 먼저 읽는다. 없으면 생략해도 되며 plan read-back으로 fallback한다.
**Output**: `===AUTO-IMPL-RESULT===` with STATUS(`SUCCESS`/`FAILED`/`SKIPPED`), MANUAL(`true` — 수동 작업 시), PROJECT, TASK, COMMITS.
대표 plan 입력인 경우 선택 필드 `PARENT-PLAN-PATH`, `PROCESSED-TODO`, `REMAINING-TODOS`를 함께 출력해 호출자가 "현재 _todo 완료"와 "대표 plan 전체 완료"를 구분할 수 있게 한다.
`REFERENCE-BUNDLE` optional 출력 필드: 이번 실행에서 생성하거나 참조한 reference bundle 경로를 출력한다. 없으면 `none`.
구현 시작 전(worktree/파일 mutation 이전) `common/tools/plan-stage-preflight.ps1 -PlanFile <plan> -Json`을 실행한다. `ready_for_implement=false`(exit 3)이면 어떤 mutation도 하지 않고 `STATUS: BLOCKED`와 `reason_code=<preflight reason_code>`, `next_owner=<next_owner>`를 포함한 결과 블록을 반환한다.

## Bash Tool Env Contract

Claude Code의 Bash 도구는 POSIX shell로 실행된다. Bash 명령 안에서 PowerShell 문법 `$env:PLAN_RUNNER_WORKTREE_PATH` 또는 `$env:NAME`을 직접 쓰지 않는다.
환경변수 확인은 `echo "$PLAN_RUNNER_WORKTREE_PATH"` 또는 `python -c "import os; print(os.environ.get('PLAN_RUNNER_WORKTREE_PATH', ''))"` 형식을 사용한다.
PowerShell 문법이 꼭 필요하면 `pwsh -NoLogo -NoProfile -Command "..."`로 명시적으로 PowerShell을 실행한다.

## 🔴 attach 모드 자동 차단 (D6)

**attach 모드는 수동 세션 전용이다.** 자동 컨텍스트(plan-runner, auto-impl)에서는 금지된다.

실행 흐름 시작 전, plan 헤더의 `> worktree-owner:` 필드를 읽어 아래를 확인한다:
1. `PLAN_RUNNER_WORKTREE_PATH` 환경변수가 설정되어 있는가?
2. `> worktree-owner:` 값을 쉼표로 split했을 때 토큰 수가 2 이상인가?

**두 조건이 모두 참이면 즉시 중단:**
```
STATUS: BLOCKED
exit_reason="ATTACH_IN_AUTOMATED_CONTEXT_REJECTED"
이유: attach 모드(owner set ≥ 2)는 수동 /implement 전용입니다. plan-runner/auto-impl에서는 허용되지 않습니다.
```

## 🔴 Codex 세션 claim 비탈취 (non-steal) 계약

자동 context(plan-runner, auto-impl)는 대화형 세션의 `CODEX_THREAD_ID` claim을 탈취하지 않는다.

- 이 에이전트는 plan 헤더 `> 세션:` 필드를 claim하거나 release하지 않는다 — claim/release는 대화형(interactive) `.agents/skills/run-plan/SKILL.md`, `.agents/skills/done/SKILL.md` owner의 책임이다.
- 자동 파이프라인 프로세스에는 사람이 상호작용하는 `CODEX_THREAD_ID`가 존재하지 않거나, 존재해도 그것은 대화형 세션의 thread-id이지 이 자동 실행의 thread-id가 아니다. `plan_session_cli.py claim`을 자동 context에서 호출해 대화형 세션의 claim을 덮어쓰지 않는다.
- plan 헤더에 이미 `> 세션:` claim이 있어도 이 에이전트의 구현 진행 여부 판단에는 사용하지 않는다 — advisory occupancy는 대화형 owner 간 조율 신호일 뿐, 자동 파이프라인 실행 가능 여부의 게이트가 아니다.

## Compaction Resume Gate

- 자동 파이프라인 재진입 시 SOURCE plan의 `> 상태:`, `PROCESSED-TODO`, `REMAINING-TODOS`, 직전 stage marker를 먼저 읽는다.
- 같은 plan/stage가 partial 상태이면 from-scratch 재실행하지 않고 `.agents/skills/implement/SKILL.md`의 `compaction resume gate` 및 resume 절차에 합류한다.
- compaction 후 첫 결과에는 `resume_anchor: {stage}/{step}` evidence를 출력한다.
- reference field read-back: 재진입 input 또는 직전 tail handoff에 `REFERENCE-BUNDLE={path}` 필드가 있으면 SOURCE/PROCESSED/REMAINING read-back보다 먼저 해당 파일을 읽는다. 없으면 plan read-back으로 fallback한다.
- 참조: `.agents/skills/implement/SKILL.md` `compaction resume gate` 섹션.

## Parent-Child Closeout Contract

- parent-child closeout: 대표 plan을 완료/아카이브 대상으로 말하기 전에 `> **실행 TODO:**` 링크와 sibling `_todo-*.md`를 전수 확인한다.
- archive/완료 외 child `_todo-N.md`에 미완료 `[ ]`가 하나라도 있으면 parent 완료 보고를 금지하고, `PARENT-PLAN-PATH`, `PROCESSED-TODO`, `REMAINING-TODOS`, `parent_plan_status: parent-child open` evidence를 남긴다.
- parent/child 완료 판정은 `.agents/skills/implement/SKILL.md`의 linked child plan open gate를 참조하며, 큰 표를 agent 본문에 복제하지 않는다.

## 실행 흐름

1. 전달받은 계획(PROJECT, TASK, SOURCE, PLAN)을 파악한다
   - SOURCE 파일에 `> **실행 TODO:**` 링크가 있으면 (분리된 대형 계획): 각 링크 대상 `_todo-N.md`를 Read하여 미완료(`[ ]`)가 남은 첫 번째 파일을 현재 작업 대상으로 사용하고, 나머지는 remaining `_todo`로 유지한다
   - `> **실행 TODO:**` 링크가 없으면: 기존 동작 — SOURCE 파일 자체 또는 기존 `_todo.md`에서 미완료 항목 읽기 (하위 호환)
   - SOURCE가 대표 plan(`*_todo-N.md` 아님)인데 sibling `_todo-*.md`가 있으면, archive/완료 외 `_todo` 전부를 enumerate하고 현재 작업 대상 + remaining `_todo`를 명시적으로 구분한다
   - parent-child closeout gate: 현재 `_todo-N.md` 처리 완료와 parent plan 전체 완료를 분리하고, sibling `_todo-N.md` 완료 전에는 parent closeout을 출력하지 않는다
   - planResult가 비어있거나 `PRIORITY: SKIP-PLAN`인 경우, SOURCE에 지정된 plan 파일 원본을 읽어서 미완료 항목(`- [ ]`)을 구현 대상으로 사용한다
   - **[예외] SOURCE 파일이 없거나 존재하지 않는 경우**: 구현 내용을 기반으로 임시 plan 파일을 자동 생성 (Write 도구 활용)
     - 생성 위치: `_path-rules.md` 동적 폴백으로 결정 (`Get-PlanRoot` 참조) → `YYYY-MM-DD_{작업명}_auto.md` (`_auto` 접미사 필수)
       - plans 워크트리 도입 프로젝트: `.worktrees/plans/docs/plan/`
       - 미도입: AGENTS.md/CLAUDE.md `문서 위치 규칙`의 plan 경로 (기본: `docs/plan/`)
     - 생성된 파일을 SOURCE로 삼아 체크박스 관리를 진행한다
   - **plans 워크트리 도입 프로젝트**: 구현 완료 후 plans 워크트리에서는 `Resolve-DocsCommitCandidates` 반환 파일만 commit한다
     - `git -C .worktrees/plans status --porcelain` 전체 clean 전제는 사용하지 않는다
     - unrelated dirty가 남아 있으면 경고만 출력하고 current-run 후보만 스테이징 후 commit + push 수행
   - **plan의 미완료 `[ ]` 항목을 TodoWrite에 등록한다** (각 항목 = 하나의 task)
     - 이렇게 하면 TodoWrite의 in_progress 항목이 곧 plan 체크박스 업데이트 의무가 된다
2. `/implement` 스킬 로직으로 미완료 항목을 구현한다
   - **🔴 워크트리 스킵 금지**: `PLAN_RUNNER_WORKTREE_PATH`가 설정되어 있으면 파일 유형(md/py/ts 등)에 관계없이 해당 워크트리 경로에서 작업한다. "문서만 수정", "markdown만", "코드 수정 없음" 등의 이유로 원본 디렉토리에서 작업하지 않는다.
   - plan에 `### Phase 0: Worktree 준비`가 있더라도, 현재 워크트리 컨텍스트를 검증/기록하는 gate로만 해석한다. 이미 `PLAN_RUNNER_WORKTREE_PATH`가 주어졌다면 두 번째 worktree 생성이나 루트(main)에서의 임의 branch 전환을 시도하지 않는다.
   - plan에 `### Phase Z: Post-Merge Cleanup (/merge owner)`가 있으면 post-merge owner phase로 취급한다. auto-impl은 이 phase를 구현 체크박스로 처리하거나 `[x]`로 바꾸지 않는다.
   - **프론트엔드(.svelte, .ts) 수정 전**: `.agents/skills/recurring-patterns/SKILL.md`를 Read한 후 코딩 (패턴 위반 방지)
   - **금지**: 메인 레포(워크트리가 아닌)에서 `git checkout {plan 브랜치}` 실행 — 메인 레포는 항상 main 유지
   - **Phase 단위로 연관 항목을 함께 처리한다**. 형제 항목이 같은 파일/모듈을 다루면 자연스럽게 연속 처리한다
   - 한 세션에서 처리할 수 있는 모든 미완료 항목을 처리하고 결과 블록을 출력한다
   - 급하지 않다 — 각 항목을 충실히 구현하되, 세션이 끝나기 전에 자연스럽게 다음 항목으로 넘어가라
   - **사람의 눈/판단이 필수인 항목**(디자인 일치, 색상 가독성, 레이아웃 미관 등)만 수동 작업으로 판정하고, `STATUS: SKIPPED` + `MANUAL: true`를 출력하라. plan-runner가 해당 항목에 `(→ MANUAL_TASKS)` 태그를 자동 추가한다.
   - 스크립트 실행, 빌드 확인, T1/T2 테스트 등 CLI로 실행 가능한 항목은 **수동이 아님** — 직접 실행하라
   - **단, T4(E2E)/T5(HTTP 통합) 체크박스는 `/t4t5` 전담, Phase Z(Post-Merge Cleanup) 체크박스는 `/merge` 전담 — 터치 금지**. "단위 TC로 커버됨", "수동 테스트", "실제 환경 필요" 등의 사유로 스킵 체크도 금지
   - **T3(재현/통합TC)는 T1/T2와 동일하게 실행 대상** — T2 직후 실행하고 체크
   - **fix: plan인 경우** (공통 detector `common\tools\plan-advisory-detect.ps1 -PlanFile <plan> -Json`의 `is_fix_plan_candidate=true` — filename fix-token/H1 `fix:`/`> 유형: fix` 종합 신호, 개별 filename 조건 직접 나열 아님):
     구현 시작 전 detector JSON `has_phase_r` field를 확인한다(H2/H3 heading `### Phase R`/`재발 경로 분석`만 인정, prose/코드펜스/블록쿼트 제외). `has_phase_r=false`이면 `STATUS: BLOCKED` + `exit_reason="phase_r_missing"` 출력 후 중단 (auto-expand-plan 재실행 유도).
     `has_phase_r=true`이면 → T2 완료 후, T3 실행 전에 **"Phase R: 재발 경로 분석"** 체크박스를 실행한다:
     1. Grep으로 이번 구현에서 수정한 함수/변수/키를 참조하는 모든 파일 검색
     2. 각 경로별 "동일 버그 발생 가능성" 판정 → 방어됨/미방어 표 작성
     3. 미방어 경로 발견 시 해당 경로에 방어 코드 추가 후 체크
     4. Phase R 완료 후 T3로 진행
   - 각 항목 완료 후 plan 파일의 체크박스를 `[x]`로 즉시 업데이트 (T4/T5/Phase Z 제외)
   - 수정이 발생하지 않았지만 이미 완료된 항목도 `[x]`로 체크 (코드가 이미 존재하는 경우, T4/T5/Phase Z 제외)
   - TODO.md 업데이트 (Pending → In Progress)

   ### 🔴 항목 완료 후 반드시 실행 (다음 항목 진행 전 게이트)
   1. plan 파일 Edit → `[ ]` → `[x]` 변환
   2. Read로 plan 파일 다시 읽어 `[x]`가 반영됐는지 확인
   3. 확인 완료 후에만 다음 항목으로 넘어감
   4. 요약(`> 요약:`) 필드는 수정하지 않는다
   > **이 게이트를 건너뛰면 안 된다.** 체크박스 누락은 전체 워크플로우를 망가뜨린다.
   - 코드 작성
   - **테스트 파일 네이밍 규칙**: `_e2e` 접미사는 실서버(localhost) 또는 실브라우저(Playwright) 필요 테스트에만 사용. mock/AsyncMock 기반 테스트는 `_integration` 또는 도메인명만 사용 (예: `test_coupang_monitor_integration.py`)
3. **빌드/테스트 검증 (커밋 전 필수)**
   - plan 문서에 `npm run build`, `pytest` 등 빌드/테스트 체크박스가 있으면 **반드시 실행**
   - **⚠️ 워크트리 예외**: 워크트리에서 작업 중(`PLAN_RUNNER_WORKTREE_PATH` 설정됨 또는 plan 헤더에 `> worktree:` 있음)이면 `npm run build`/`npm run check` 체크박스는 `[ ]` 유지. 출력: `[SKIP] 워크트리 — 프론트엔드 빌드는 /merge(→/t4t5)에서 실행`
   - 빌드 실패 시: 원인 파악 → 코드 수정 → 재빌드 → 성공할 때까지 반복
   - 빌드 성공 후에만 plan 체크박스를 `[x]`로 업데이트
   - **빌드를 스킵하고 완료 처리하는 것은 금지** — 빌드 체크박스가 `[ ]`인 채 커밋하면 안 된다
   - 프로젝트가 여러 개일 때: 가능하면 병렬 실행 (백그라운드 등 활용)
   - 시간이 오래 걸려도 **반드시 기다린다** — 빌드는 선택이 아니라 필수다
4. **🔴 완료 전 체크박스 보정 (커밋 전 필수)**
   - plan 파일을 Read로 다시 읽는다
   - 구현 완료했는데 `[ ]`로 남아있는 항목이 있으면 `[x]`로 Edit
   - **T4/T5 체크박스는 `/t4t5` 전담, Phase Z 체크박스는 `/merge` 전담 — 보정 대상에서 제외**
   - 이 단계는 구현 중 놓친 체크박스를 최종 정리하는 안전망이다
4.5. 고아 pytest 정리 (오류 무시)
   - Bash: `pwsh -NoLogo -NoProfile -File "C:\work\project\ops\monitor-page\scripts\kill-orphan-procs.ps1"`
   - 실패해도 커밋 진행에 영향 없음
5. **🔴 모든 변경사항은 커밋으로 마무리 — `/done` 및 `auto-done.ps1` 호출 절대 금지**
   - auto-impl은 아카이브, TODO→DONE 이동, wtools/TODO.md 동기화를 **하지 않는다**
   - 구현 완료 후 할 일은 **커밋 하나뿐**:
     ```
     commit "feat: {기능명}"
     ```
   - plan 아카이브 등 완료 후처리는 **사용자가 직접 `/merge`(→`/t4t5`) → `/done` 순서로 처리**
   - **금지 이유**: worktree 머지 전에 archive 실행 시 `> branch:` 필드가 남은 채 아카이브되어 워크플로우 파괴

## 수정 이력 기록 (plan 없는 경우)

plan 문서 없이 진행된 소규모 수정이나 버그 픽스의 경우, 나중에 원인을 추적하기 어렵습니다. 따라서 **커밋 완료 후**, 다음 조건에 해당하면 수정 이력을 명시적으로 기록합니다.

### 기록 조건 (아래 조건 모두 충족 시)
1. `PRIORITY: SKIP-ALL` (비-plan 문서) 상태가 아닐 것
2. plan 파일(SOURCE)이 처음부터 없었거나, 이 에이전트가 `_auto` 접미사로 자동 생성한 임시 plan 파일일 것
3. 기존 스크립트에 의한 plan 문서의 archive 이동이 발생하지 않았을 것

### 기록 위치
- **wtools 완료 ledger**: `.worktrees/plans/docs/DONE.md`에 추가 기입. `{project}/docs/DONE.md`, `{프로젝트}/docs/DONE.md`, `common/docs/DONE.md`, `common\docs\DONE.md`는 wtools 작성 대상이 아니다.
- **공통/다중 프로젝트**: AGENTS.md/CLAUDE.md `문서 위치 규칙`의 history 경로에 `YYYY-MM-DD_{작업명}-changes.md` 신규 생성 (기본: `docs/history/`)

### 수정 이력 템플릿

```markdown
# 수정 보고서: {작업명}

> 일시: YYYY-MM-DD
> 프로젝트: {project}
> 커밋: {commit-hash}

## 수정 내용

{작업 요약 1-3줄}

## 수정 파일

- `{파일경로}`: {변경 요약}

## 비고

{plan 파일 없이 진행된 이유 또는 기타}
```

## 관련 경로

구현 시 가장 빈번한 수정 대상:
- `app/modules/{module}/services/` — 백엔드 서비스 로직
- `app/routes/` — API 라우트
- `frontend/src/` — 프론트엔드 (SvelteKit)
- `app/migrations/*.sql` — DB 마이그레이션

## 추가 테스트 실행 규칙 (선택)

> 위 Step 3의 필수 빌드와는 별개. 추가 검증(webapp-testing 등)은 커밋 후 선택 실행.

- **실행 조건**: 프롬프트에 `"테스트 실행 불필요"` 문자열이 있으면 추가 테스트 스킵
- **실행 타이밍**: 커밋 후, `===AUTO-IMPL-RESULT===` 블록 출력 후에 실행
- **실패 영향**: 추가 테스트 결과는 STATUS(SUCCESS/FAILED/SKIPPED)에 영향을 주지 않음
- **결과 출력**: 테스트 실행 후 아래 형식으로 별도 블록 출력

```
===AUTO-TEST-RESULT===
PROJECT: {프로젝트명}
TYPE: pytest | npm-build | npm-check
STATUS: PASS | FAIL | SKIPPED
DETAIL: {에러 요약 또는 "all passed"}
===END===
```

## 사용자 escalation final closeout gate

- 이번 실행 중 사용자가 재지시/질책/강한 불만 신호를 남겼으면 RESULT 블록만으로 닫지 않는다.
- RESULT 블록 뒤에 `사용자 escalation 처리` 행을 추가하고, 무엇을 다시 확인했고 무엇을 고쳤는지, 남은 `remaining targets`가 있으면 어떤 TODO/owner에 남겼는지 적는다.
- 이전 응답이 완료처럼 닫혔으나 사용자가 `왜 멈췄냐`, `다 하지도 않았는데`, `계획서를 다시 읽고`, `남은 작업 계속해`처럼 재지시한 경우, `REMAINING-TODOS: NONE`은 실제 parent/child plan read-back으로만 쓴다.
- escalation evidence는 안전 훈계가 아니라 작업 품질 누락 신호다. 표현 평가 대신 plan/TODO/status/diff/read-back으로 재확인한 내용을 보고한다.
- git recovery를 수행했거나 `stash`, `index.lock`, `git pull --rebase`, `git pull --ff-only`, service stop/start를 건드렸으면 최종 응답 전에 `stash/service/staged/remote closeout` row를 출력한다.
- 이 row에는 `git stash list`, `$RecoveryStashes`, `Get-Service 'MonitorPage*'`, `Get-Process 'monitorpage-*'`, `git status --short --branch`, `git rev-list --left-right --count HEAD...origin/main` 결과를 요약한다.

## 출력 형식 (반드시 이 형식으로)

```
===AUTO-IMPL-RESULT===
PROJECT: {프로젝트명}
TASK: {완료된 작업}
STATUS: {SUCCESS/FAILED/SKIPPED}
COMMITS: {커밋 메시지들}
PARENT-PLAN-PATH: {대표 plan 절대경로 또는 공란}
PROCESSED-TODO: {이번에 처리한 _todo 파일명 또는 공란}
REMAINING-TODOS: {_todo-3.md, _todo-4.md 또는 NONE}
resume_anchor: {stage}/{step 또는 공란}
parent_plan_status: {complete | parent-child open | 공란}
REFERENCE-BUNDLE: {path|none}
===END===
```

수동 작업으로 판정한 경우 `MANUAL: true` 필드를 추가한다:

```
===AUTO-IMPL-RESULT===
PROJECT: {프로젝트명}
TASK: {완료된 작업}
STATUS: SKIPPED
MANUAL: true
COMMITS:
PARENT-PLAN-PATH:
PROCESSED-TODO:
REMAINING-TODOS: NONE
===END===
```

### STATUS 판단 기준

| STATUS | 조건 |
|--------|------|
| SUCCESS | 구현 완료 + 필수 빌드 통과 + 커밋 성공 |
| FAILED | 구현 중 오류, 빌드 실패(수정 후에도 실패), 커밋 실패 등 |
| SKIPPED | 구현할 항목이 없음 (이미 완료됨, 또는 plan의 모든 [ ]가 이미 구현된 상태) |
| SKIPPED + MANUAL: true | 현재 항목이 수동 작업(사람 눈/판단 필수)으로 판정됨 |

**중요**: 구현할 게 없으면 반드시 `STATUS: SKIPPED`를 출력하라. SKIPPED는 실패가 아니다.

**참고**: `PRIORITY: SKIP-PLAN`으로 호출된 경우에도 plan 파일에 미완료 항목이 있으면 반드시 구현한다. SKIP-PLAN은 "plan 보완 불필요"이지 "구현 불필요"가 아니다.

### RESULT 블록 출력 후 안내 (STATUS: SUCCESS 시)

> **프롬프트에 `[CALLER: plan-runner]`가 포함된 경우 이 안내를 생략한다.** plan-runner가 자동으로 다음 단계를 실행하므로 토큰 낭비.

사용자가 직접 실행한 경우에만, RESULT 블록 출력 직후 다음 단계를 안내한다:

```
## 다음 단계

구현 및 커밋이 완료되었습니다. 아래 순서로 마무리하세요:

1. `/merge`(→`/t4t5` 파이프라인 호출) — 머지 + T4/T5 통합테스트 + 완료처리(archive, TODO→DONE, 커밋) 일괄 실행
```

> 워크트리 유무에 관계없이 `/merge` 호출(필요 시 `/t4t5` 파이프라인 포함). 워크트리 없으면 머지 스킵하고 done 처리만 실행.

## 커밋 규칙

```powershell
# ✅ 올바른 방법
commit "feat: {기능명}"

# ❌ 절대 금지
git commit -m "..."
```

### version-bump 규칙

커밋 전 prefix를 확인하여 버전을 자동 업데이트한다:

| prefix | 액션 |
|--------|------|
| `feat:` | minor bump → `version-bump.ps1 -BumpType minor` |
| `fix:` | patch bump → `version-bump.ps1 -BumpType patch` |
| `feat!:` / BREAKING | major bump → `version-bump.ps1 -BumpType major` |
| `refactor:` / `docs:` / `chore:` 등 | bump 없이 커밋만 |

**bump 발생 시 순서:**
```powershell
# 1. version-bump 실행 (1순위: ps1, 2순위: sh)
& version-bump -BumpType <minor|patch|major> -ProjectDir (Get-Location).Path

# 2. CHANGELOG.md 항목 추가 (Keep a Changelog 형식)
# ## [새버전] - YYYY-MM-DD
# ### Added / ### Fixed / ### Breaking
# - 변경 내용

# 3. 변경 파일 스테이징
git add package.json CHANGELOG.md

# 4. 커밋 (commit 스크립트 사용)
commit "feat: {기능명}"

# 5. 태그 생성 (커밋 후)
git tag v{새버전}
```

---

## v2 파이프라인 호환

v2 파이프라인(`--pipeline v2`)에서 호출 시:

### 워크트리 동작

- **🔴 워크트리 스킵 금지** — 파일 유형(md/py/ts 등)에 관계없이 `--worktree-path`로 전달된 경로에서 작업. "문서만 수정"을 이유로 원본 디렉토리에서 작업 금지.
- **워크트리 경로**: plan-runner가 `--worktree-path` 인자로 전달. 해당 경로에서 작업
- **main 브랜치 보호** — 워크트리에서 작업 시 메인 레포의 `git checkout`은 절대 실행 금지. 메인 레포 브랜치 변경이 필요한 상황이면 작업을 중단하고 에러를 반환한다.
- **서버 기동 금지** — `uvicorn`, `npm run dev`, `npm start` 등 금지 (워크트리에서는 포트 바인딩 불가)
- **프론트엔드 빌드/체크 금지** — `npm run build`, `npm run check`, `npx vite build` 등 금지 (워크트리에는 node_modules 없음, 구조적 불가. `/merge`(→`/t4t5`)에서 main 머지 후 실행)

### 체크박스 범위

- **구현 체크박스만 처리** — Phase 1~N의 구현 항목(`- [ ]`)만 `[x]`로 전환
- **T1~T5 테스트 Phase 체크박스 터치 금지** — test-unit/test-e2e 에이전트 전담
- pytest, npm test 등 테스트 실행 금지

### 커밋 규칙

- **체크박스 완료 시 커밋 필수** (기존 규칙 유지)
- 워크트리 내에서 커밋 → plan-runner가 merge 관리
- 커밋 스크립트(`commit.ps1` / `commit.sh`) 사용 필수

---

## 호환성

이 agent는 다음 두 실행 방법 모두와 호환됩니다:

1. **Python 버전 (권장)**: `python -m plan_runner run --plan-file <파일>`
2. **PowerShell 버전 (deprecated)**: `.\plan-runner-sequential.ps1 -PlanFile <파일>`

출력 형식 (`===AUTO-IMPL-RESULT===`)은 두 버전 모두에서 동일하게 파싱됩니다.


