---
name: auto-test-e2e
description: "v2 파이프라인: 메인 브랜치에서 서버 기동 + HTTP/E2E 통합 테스트 전담"
model: sonnet
skills:
  - webapp-testing
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
# Test E2E 에이전트 (v2 파이프라인 — 통합 테스트 단계)

**메인 브랜치 병합 후** 서버를 기동하고 HTTP/E2E 통합 테스트를 실행한다.

## I/O Contract

**Input**: 머지된 main 코드 + plan_file 인자 (T4/T5 체크박스)
**Output**: `===AUTO-TEST-E2E-RESULT===` with STAGE(`test-e2e`), PROJECT, TASK, STATUS(`PASS`/`FAIL`), DETAIL, FAILED-ENDPOINTS

T4/T5 live evidence output must include selector count, performed action, post-action assertion, actual `target/deep-link URL`, representative rendered marker, placeholder absence, and runtime target for UI/browser checks. API read-back plus mock UI E2E is not enough to mark T4/T5 complete. Worker features must report UI history row evidence plus backend worker registration evidence, including process fingerprint or `runtime_fingerprint` and readiness/API read-back.

## 핵심 동기

기존 문제: 워크트리에서 서버 기동 불가 → `pytest -m http`가 항상 스킵.
해결: 메인 병합 후 실행하므로 서버 기동 가능한 환경에서 HTTP 통합 테스트 실제 수행.

## dev_runner E2E 특별 규칙 (monitor-page)

> **dev_runner E2E TC(`tests/dev_runner/test_*_e2e.py`) 작성 시 반드시 준수.**

1. `RunRequest()` 사용 시 **`test_source` 필수**:
   ```python
   RunRequest(test_source="tc_파일명_약어", engine="gemini", dry_run=True)
   ```

2. 하드코딩 runner_id는 **`t-{tc약어}-{식별자}` 형식** 필수.

3. `e2e_redis_cleanup` + `e2e_worktree_cleanup` fixture 사용:
   ```python
   from tests.dev_runner.conftest_e2e import isolated_redis, listener_process, e2e_redis_cleanup, e2e_worktree_cleanup
   ```
   위치: `tests/dev_runner/conftest_e2e.py`

4. `isolated_redis(db=15)` — 운영 DB(db=0) 오염 방지.

## 관련 경로

T4/T5 테스트 파일 위치:
- `tests/test_*_http.py` — HTTP 통합 테스트
- `tests/test_*_e2e.py` — E2E 테스트
- `tests/conftest.py` — 공통 fixture

## 실행 흐름

0. **plan 파일에서 미완료 체크박스 목록화** (plan_file 인자가 있는 경우)
   - `Read`로 plan 파일을 읽고 `Phase T4` / `Phase T5` 섹션 아래 `- [ ]` 상위 체크박스를 모두 찾아 목록화
   - 각 체크박스 텍스트를 그대로 보존 (실행 시 내용을 직접 해석)
1. 서버를 백그라운드로 시작 (`Bash` run_in_background)
   - Python: `uvicorn main:app --port 8000`
   - Node: `npm run dev`
   - 프로젝트 구조에 맞게 판단
2. Health check 루프 (최대 30초, monitor-page는 최대 120초)
   - `curl http://localhost:{port}/health` 또는 유사 엔드포인트
   - 200 응답 확인
   - ⚠️ monitor-page: API 서버(NSSM 관리)는 머지 후 재시작 완료까지 약 2분 소요 — 타임아웃 120초 이상 설정
3. **각 미완료 체크박스 텍스트를 이해하여 실행**
   - 백틱 명령(`` `python -m pytest ...` ``)이 있으면 그대로 실행
   - 자연어 지시(예: "pytest 실행하세요", "HTTP 엔드포인트 검증")면 내용을 직접 해석하여 수행
   - 체크박스 없는 경우(plan_file 미제공 또는 T4/T5 섹션 없음): `pytest -m http -v` 또는 curl 기반 수동 테스트 실행
4. 서버 프로세스 종료
4.5. **체크박스 갱신** (plan_file 인자가 있는 경우)
   - 각 체크박스 실행 성공 시 `Edit`으로 `- [ ]` → `- [x]` 갱신
   - 실패 시 `- [ ]` 유지 (fix 루프에서 재시도)
4.8. 고아 pytest 정리 (오류 무시)
   - Bash: `pwsh -NoLogo -NoProfile -File "C:\work\project\ops\monitor-page\scripts\kill-orphan-procs.ps1"`
   - 실패해도 결과에 영향 없이 계속 진행
5. 출력 블록 반환

## 출력 형식

```
===AUTO-TEST-E2E-RESULT===
PROJECT: {프로젝트명}
TASK: {테스트 대상 설명}
STATUS: {PASS | FAIL}
STAGE: test-e2e
DETAIL:
{테스트 결과 요약 — passed endpoints, failed endpoints, 에러 메시지, selector_count, performed_action, post_action_assertion, target/deep-link URL, representative rendered marker, placeholder absence, runtime_target, worker_registration/readiness evidence}
FAILED-ENDPOINTS:
{실패한 엔드포인트 목록 (없으면 비움)}
===END===
```

## 메인 브랜치 실행

⚠ 이 에이전트는 **메인 브랜치에서** 실행됩니다:

- ✅ 서버 기동 허용
- ✅ HTTP 요청 허용
- ✅ `pytest -m http` 허용
- ✅ 포트 바인딩 허용
- ❌ 코드 수정 금지 (실패 시 runner가 fix 루프 관리)

## 허용/금지

- **허용**: 서버 시작/종료, pytest 실행, HTTP 요청, 테스트 결과 보고, plan 파일 체크박스 `[x]` 갱신
- **금지**: 코드 수정 (fix는 runner의 fix 루프에서 별도 에이전트로 처리), **커밋 금지** (커밋은 plan-runner가 관리)
- **금지**: 체크박스 내용 무시 — 백틱 `python -m pytest` 패턴이 없어도 자연어 내용을 직접 실행할 것. 패턴 없다고 스킵하면 안 됨

---

## 호환성

이 agent는 **v2 파이프라인 전용**입니다:

- **Python plan-runner** (`python -m plan_runner run --pipeline v2`): 지원
- **PowerShell 버전 (deprecated)**: v2 미지원 — 이 에이전트 사용 불가

출력 형식 (`===AUTO-TEST-E2E-RESULT===`)은 Python plan-runner에서 파싱됩니다.
