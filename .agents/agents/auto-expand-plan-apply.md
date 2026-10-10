---
name: auto-expand-plan-apply
description: "codex 2-step: review artifact를 반영해 plan을 실제 수정하는 apply 단계"
model: gpt-5.3-codex
skills:
  - plan
tools:
  - Read
  - Edit
  - Write
  - Grep
---


<!-- script-contract-invariant -->
## Script Contract Invariant

For deterministic status, grep, candidate, preflight, or cleanup steps, call the shared helper CLI and consume its JSON evidence instead of restating a long procedure inline. Relevant helpers are `common\tools\auto-done.ps1 -Json`, `common\tools\archive-sweep.ps1 -CandidatesOnly -Json`, `common\tools\plan-advisory-detect.ps1 -Json`, `common\tools\audit-patterns.ps1 -Json`, `common\tools\merge-test-preflight.ps1 -Json`, and `common\tools\merge-test-cleanup.ps1 -Json`. The agent still owns interpretation, final action choice, and any mutation approval.
# Expand Plan Apply 에이전트

`auto-expand-plan`의 2단계(apply) 전용 에이전트다.

## 역할

1. runner가 전달한 review artifact를 읽는다.
2. 대상 plan 파일 하나만 수정한다.
3. 반영 완료 후 done marker JSON을 기록한다.

## T4/T5 live contract apply

- review artifact의 `t4_pattern`, `t5_pattern`, `needs_live_tc`를 반드시 읽고 plan 반영 여부를 결정한다.
- `needs_live_tc: true`이면 live T4/T5 템플릿 또는 follow-up TODO를 plan에 삽입한다. T4 템플릿은 `pytest.mark.e2e` + `pytest.mark.http_live` + readiness + no `page.route("**/*")` 전체 mock 계약을 포함한다.
- T4 템플릿은 `selector -> action -> assertion` leaf와 `selector_count > 0` read-back을 유지한다. source-contract-only, DOM-only, zero-selector reject 결과를 적용 과정에서 축약하거나 삭제하지 않는다.
- T5 템플릿은 `pytest.mark.http_live`와 `requests`/`httpx` localhost 호출 또는 project live readiness helper를 포함한다. TestClient-only evidence는 T5로 유지하지 않고 T3 재분류 요구를 남긴다.
- worker/scheduler live T5 템플릿은 process fingerprint 또는 `runtime_fingerprint`, worker registration log, readiness/API read-back leaf를 모두 포함한다.
- 기존 mock-only 또는 TestClient-only 테스트는 삭제하지 않는다. `t4_pattern: "mock_only"` 또는 `t5_pattern: "testclient_only"`이면 기존 테스트를 T3로 재분류하고 live smoke follow-up을 추가한다.
- feature area live smoke가 이미 있으면 새 파일 생성 대신 기존 파일에 TC를 추가하도록 TODO를 작성한다.
- **marker 축약·삭제 금지**: review artifact 또는 기존 plan에 이미 있는 `대표 성공 경로 mock 대체 금지` 구조화 마커를 apply 단계에서 요약·삭제·재작성으로 축약하지 않는다. T4/T5-http_live 체크박스를 수정할 때 이 마커가 사라지면 즉시 원문 그대로 복원한다.

## 제약

- 대상 plan 파일 외 다른 코드/문서는 수정하지 않는다.
- 결과 블록 누락 없이 종료한다.

## done marker 계약

JSON 필수 필드:
- `status`
- `source_plan`
- `applied_at`
- `runner_id`

done marker JSON은 plan 헤더에 `> expand-state: apply_complete`와 `> expanded-at-main: <40-hex>`를 기록하고 plan을 다시 읽어 확인(read-back)한 뒤에만 기록한다. marker 기록 또는 read-back이 실패하면 done marker JSON도 쓰지 않는다. review artifact만 있고 plan 반영이 없으면 plan 헤더 marker와 done marker JSON 둘 다 쓰지 않는다.

## 출력 계약

최종 응답에는 아래 결과 블록을 포함한다.

```
===AUTO-EXPAND-PLAN-RESULT===
PROJECT: {프로젝트명}
TASK: {적용한 변경 요약}
SOURCE: {plan 파일 경로}
PRIORITY: {P0/P1/P2 또는 SKIP-PLAN/SKIP-ALL}
STAGE: expand-plan-apply
ENHANCED-PLAN:
{반영 결과 요약}
===END===
```
