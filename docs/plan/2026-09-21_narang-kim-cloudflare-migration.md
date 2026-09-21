
# narang.kim 도메인을 Render에서 Cloudflare Pages로 이전

> 작성일시: 2026-09-21 22:30
> 기준커밋: 5d75229
> 대상 프로젝트: nrkim-home
> 상태: 검토완료
> review-verdict: keep
> review-state: apply_complete
> reviewed-at: 2026-09-21
> surface 분류: 공통 정책
> branch:
> worktree:
> worktree-owner:
> pre-merge-boundary: M
> t4t5-required: 없음
> t4t5-exempt: T4=NO_APP_CODE(cf-redirect/_redirects + cf-redirect/index.html 정적 리다이렉트만 변경), T5-http=NO_APP_CODE(cf-redirect/_redirects + cf-redirect/index.html 앱 HTTP 코드 변경 없음), T5-http_live=NO_APP_CODE(cf-redirect/_redirects + cf-redirect/index.html 정적 리다이렉트이며 live 검증은 Phase O4 curl), T4-operational-merge=NO_RUNNER_MERGE_CHANGE(cf-redirect/_redirects + cf-redirect/index.html만 대상이며 plan-runner merge policy/runtime 변경 없음)
> 진행률: 4/35 (11%)
> 요약: Render 무료 플랜 슬립(콜드스타트 ~50초)으로 `narang.kim` 접속이 불안정하다 — 도메인을 Cloudflare로 옮겨 기존 링크 `narang.kim`이 슬립 없이 artifact로 리다이렉트되게 한다.

---

## 개요

`narang.kim`(Porkbun 등록)은 현재 Render 서비스 `nrkim-home`을 가리키며, `/` 접속 시 Next.js `redirects()`가 artifact(`https://claude.ai/artifact/4Hhdi2DzQBaDLnsGzQ7aqe`)로 307 리다이렉트한다. Render 무료 플랜은 유휴 시 슬립해 첫 응답이 ~50초 걸린다.

Cloudflare Pages 프로젝트 `nrkim-home`(Direct Upload, `cf-redirect/` 정적 사이트)은 이미 배포되어 `https://nrkim-home.pages.dev/`가 같은 artifact로 302 한다. 남은 일은 **기존 링크(`narang.kim`)를 이 Pages 프로젝트로 연결**하는 도메인 이전이다.

### 현황 실측 (2026-09-21, 공용 리졸버 8.8.8.8 기준 — Phase O1에서 Porkbun 대시보드로 재확인)

| 항목 | 값 |
|------|-----|
| 네임서버 | `*.ns.porkbun.com` 4개 (salvador/fortaleza/maceio/curitiba) |
| apex A | `216.24.57.1` (Render) |
| `www` | CNAME → `nrkim-home.onrender.com` |
| MX / TXT | 조회되지 않음 |
| 기타 레코드 | 사용자 확인(2026-09-21): Render용 레코드 외 사용 중인 DNS 레코드 없음 |
| Registry DNSSEC | 사용자 확인(Porkbun 콘솔): 0 records — DS 없음, NS 변경 시 DNSSEC 해제 불요 |

### 순서 검토 결과

사용자 초안(새 배포 → 네임서버 변경 → 연동 확인 → 배포순서 정리)을 다음과 같이 보정한다.

1. **현황 조사를 맨 앞에 추가** — 네임서버를 옮기면 그 도메인의 DNS 레코드 전체가 새 zone으로 넘어가므로 옮기기 전에 확인이 필요하다. 사용자 확인 결과 Render용 외 레코드가 없고 DNSSEC도 0건이므로, 조사 단계는 확인·기록 위주의 짧은 단계가 된다.
2. **Pages 커스텀 도메인은 네임서버 변경 전에 가능한 범위까지 사전 등록** — apex 도메인은 Cloudflare DNS가 authoritative가 된 뒤에야 활성화가 확정된다. Cloudflare의 Pending zone은 production 상태로 간주하지 않으며, NS 전환 직후 Phase O4에서 zone/custom domain/HTTPS를 즉시 검증하고 실패 시 Porkbun 기본 NS로 원복한다.
3. Render는 **연동 확인 후 일정 기간 유지**(롤백 경로)하고 그 뒤 정리한다.

## 승인된 요구사항

- 도메인 `narang.kim`, 레지스트라 Porkbun.
- 기존 배포 링크(`narang.kim`)가 Cloudflare Pages로 연결되어 `/`가 artifact로 리다이렉트된다.
- 진행 순서: 새 배포 → 네임서버 변경 → Cloudflare 연동 확인 → 차후 배포 순서 정리 (Phase O1 조사 단계만 앞에 추가).
- DNS 레코드는 Render용을 제외하면 사용하지 않는다 → Cloudflare zone에는 Render 레코드를 가져오지 않는다(자동 import된 Render용 A/CNAME 삭제, Pages 연결이 대체). 세부 판단은 Claude에게 위임.
- Registry DNSSEC 0 records(사용자 확인).
- Claude가 콘솔 등으로 자동 처리할 수 있는 단계는 계획서에 표기한다(아래 "자동화 가능 범위").
- `nrkim-home`을 wtools `projects.json`에 등록한다(완료 — wtools `47ae64314`).

## 검토 옵션/제안 (미승인)

- Next 앱 잔여 경로(`/aif-c01`, `fe/src/app/util/route.ts` puppeteer API) 이전 — Pages 정적 배포에서는 동작하지 않으므로 현재 범위에서 제외. 필요하면 별도 plan(Workers 등).
- Git 연동 자동배포 — Direct Upload 프로젝트는 Git Integration으로 전환할 수 없어 새 Pages 프로젝트가 필요하다. 요청 전까지 수행하지 않는다.

## 수행하지 않을 작업

- Render 서비스 즉시 삭제(연동 확인 후 관찰 기간을 두고 정리).
- Next 앱 코드/`fe/` 수정.
- 미승인 제안(위) 실행.

## 자동화 가능 범위 (2026-09-21 실측)

| 구분 | 단계 | 방법 / 조건 |
|------|------|-------------|
| **Claude 자동** | Phase 1 runbook 작성, 검증(`curl`/`nslookup`/`wrangler pages deployment list`), 계획서·runbook 갱신 | 추가 권한 불요 |
| **Claude 자동 (조건부)** | Cloudflare zone 추가, Pages 커스텀 도메인 추가, Cloudflare DNS 레코드 정리 | 현재 `wrangler` OAuth 토큰은 `pages(write)`, `zone(read)`만 보유 — zone 생성/DNS 편집(zone:edit, dns:edit) 없음. 다음 중 하나가 필요: (a) 사용자가 Cloudflare API 토큰(Zone:Edit, DNS:Edit, Pages:Edit)을 세션 환경변수로 제공, (b) 사용자가 브라우저에 로그인한 상태에서 Claude in Chrome으로 대시보드를 조작 |
| **Claude 자동 (조건부)** | Porkbun 네임서버 변경 | (a) Porkbun API 키 + 도메인별 "API Access" 활성화 후 `updateNs` 호출, 또는 (b) 로그인된 브라우저에서 Claude in Chrome 조작. 도메인 NS 변경은 되돌리기 쉽지만 즉시 서비스에 영향을 주므로 실행 직전 사용자 확인을 받는다 |
| **사용자 직접** | Cloudflare/Porkbun 로그인, 위 자격 증명 제공 또는 브라우저 로그인 유지, Render 서비스 삭제 최종 확인 | 계정 인증·삭제 승인 |

> 자격 증명/토큰은 plan·문서·커밋에 기록하지 않는다. 세션 환경변수로만 전달한다.

## 기술적 고려사항

- 네임서버 변경 후 전파는 수 분~48시간. Porkbun 기본 NS 4개가 원복 경로다.
- DNSSEC: Porkbun Registry DNSSEC 0 records로 확인되어 NS 변경 전 DS 해제는 필요 없다. (Cloudflare 쪽 DNSSEC는 기본 꺼져 있으며 이번 범위에서 켜지 않는다.)
- Cloudflare zone 등록 시 자동 스캔으로 들어오는 레코드 중 Render용(apex A `216.24.57.1`, `www` CNAME)은 남기지 않는다. 그 외 레코드는 없어야 한다(있으면 사용자에게 확인). apex/`www`는 Pages 커스텀 도메인 연결이 관리한다. Pending zone은 production으로 간주하지 않으며, NS 전환 후 zone/custom domain/HTTPS 활성화가 확인되지 않으면 Porkbun 기본 NS로 즉시 원복한다.
- `www.narang.kim`도 함께 연결한다(현재 CNAME이 Render를 가리킴).
- 인증서는 Cloudflare가 자동 발급한다(Pages 커스텀 도메인 Active 이후).

## 기존 데이터 영향

- 계약 변경 여부: N/A (DNS/호스팅 이전, 앱 데이터/DB 없음)
- 기존 active/enabled 데이터 영향: N/A + 근거: 저장 데이터 없는 리다이렉트 사이트
- invalidated 데이터 처리: N/A
- 완료 evidence: Phase O4 curl/dig read-back

## 상태 머신 6축 TC matrix (조건부)

N/A: 상태 머신 detector seed 없음

## 구현 후 후속작업 고정 (조건부)

| 요소 | 내용 |
|------|------|
| 재점검 시점 | Render 정리(Phase O5) 완료 후 `/done`. 관찰 기간(7일) 뒤 재점검 |
| 작업 위치 | Next 앱 잔여 경로 이관이 필요해지면 `nrkim-home` `docs/plan`에 신규 plan |
| 종결 규칙 | 후속 후보 없으면 "없음 + 근거"로 닫는다 |

---

## TODO

### Phase 0: Worktree 준비

0. [ ] **worktree 준비 상태를 문서에 고정** — `/implement` 진입 게이트
   - [ ] `{plan}`: `> branch:`, `> worktree:`, `> worktree-owner:` 슬롯을 유지한다 (blank는 신규 초기 상태)
   - [ ] `{plan}`: `worktree 생성 또는 재개`는 `/implement` owner flow이며 `worktree cwd 고정`을 별도 확인한다

### Phase 1: 배포 runbook 문서화 (pre-merge)

1. [ ] **차후 배포 절차를 레포 문서로 고정**
   - [ ] `docs/deploy.md`: 신규 작성 — 현재 배포 대상(Cloudflare Pages `nrkim-home`, Direct Upload), 배포 명령(`wrangler pages deploy cf-redirect --project-name nrkim-home --branch main`), 리다이렉트 목적지 변경 방법(`cf-redirect/_redirects`, `index.html` 두 곳), 롤백(Porkbun NS 원복 + Render 유지 기간) 기재
   - [ ] `docs/deploy.md`: `narang.kim` DNS 현황·소유(Porkbun 등록, Cloudflare DNS 이전 후 zone 관리) 기재
   - [ ] `cf-redirect/_redirects`: `www.narang.kim` 처리 필요 여부 확인 — 커스텀 도메인 둘 다 같은 Pages 프로젝트를 가리키므로 별도 규칙 불요인지 근거 기록

### Phase M: Merge Handoff

M. [ ] **머지 핸드오프** — `/merge` owner
   - [ ] Phase 1 산출물(`docs/deploy.md`)을 main에 반영한다

### Phase O1: 현황 확인 (owner, read-only)

O1. [ ] **네임서버 변경 전 DNS 현황 확인** — [Claude 자동 + 사용자 확인 완료분 반영]
   - [x] 사용자 확인: Render용 외 사용 중인 DNS 레코드 없음, MX/TXT 없음(공용 리졸버 실측과 일치)
   - [x] 사용자 확인: Porkbun Registry DNSSEC 0 records — NS 변경 전 DS 해제 불요
   - [x] Porkbun transfer lock은 registrar transfer용이며 NS 변경 절차와 별개임을 공식 도움말 기준으로 확인 — 네임서버 변경에는 unlock 단계가 없음
   - [ ] 사용 가능한 자동화 경로를 확정한다: Cloudflare API 토큰 제공 여부, Porkbun API 키 제공 여부, 브라우저 로그인 상태 — [사용자 결정]

### Phase O2: Cloudflare 사전 구성 (owner, 새 배포 준비)

O2. [ ] **zone 등록 및 Pages 커스텀 도메인 사전 연결**
   - [ ] Cloudflare: `narang.kim` zone 추가(Free 플랜), 발급된 Cloudflare NS 2개를 기록한다 — [Claude 자동(조건부: API 토큰 또는 Chrome)]
   - [ ] Cloudflare zone: 자동 스캔된 레코드에서 Render용 apex A/`www` CNAME을 삭제하고, 그 외 레코드가 없는지 확인한다(있으면 중단하고 사용자 확인) — [Claude 자동(조건부)]
   - [ ] Pages 프로젝트 `nrkim-home`에 커스텀 도메인 `narang.kim`, `www.narang.kim`을 추가한다 (zone Active 전에는 pending 상태 정상) — [Claude 자동(조건부)]
   - [ ] `https://nrkim-home.pages.dev/`가 302로 artifact를 반환하는지 재확인한다 — [Claude 자동]

### Phase O3: 네임서버 전환 (owner)

O3. [ ] **Porkbun 네임서버를 Cloudflare로 변경** — 실행 직전 사용자 확인 필수
   - [x] Porkbun DNS 레코드 TTL 사전 하향은 생략 — 이번 전환은 parent NS delegation 변경이며 기존 zone은 Render A/CNAME뿐이므로, 레코드 TTL보다 Phase O4 검증 + NS 원복 경로를 cutover 안전장치로 사용한다
   - [ ] Porkbun: `narang.kim` 네임서버를 Phase O2에서 기록한 Cloudflare NS 2개로 교체한다 — [Claude 자동(조건부: Porkbun API 또는 Chrome) / 사용자]
   - [ ] 원복 경로 기록: Porkbun 기본 NS 4개(salvador/fortaleza/maceio/curitiba `.ns.porkbun.com`)

### Phase O4: 연동 확인 (owner) — 전부 [Claude 자동]

O4. [ ] **Cloudflare 연동 확인**
   - [ ] Cloudflare zone 상태가 Active인지 확인한다(대시보드 + `nslookup -type=NS` 전파). Cloudflare NS 위임이 확인됐는데 zone/custom domain/HTTPS가 활성화되지 않으면 Porkbun 기본 NS 4개로 원복한다
   - [ ] Pages 커스텀 도메인 `narang.kim`, `www.narang.kim`이 Active이고 인증서가 발급되었는지 확인한다
   - [ ] `curl -sI https://narang.kim/`: `302`(또는 `301`) + `location: https://claude.ai/artifact/4Hhdi2DzQBaDLnsGzQ7aqe`, 응답이 즉시(콜드스타트 없이) 오는지 확인한다
   - [ ] `curl -sI https://www.narang.kim/`: 동일 결과 확인
   - [ ] `nslookup -type=NS narang.kim 8.8.8.8` 및 1.1.1.1 등 다른 리졸버에서 Cloudflare NS로 전파되었는지 확인한다

### Phase O5: 정리 (owner)

O5. [ ] **Render 정리와 배포 절차 확정** — Render 삭제는 [사용자 직접], 문서 갱신은 [Claude 자동]
   - [ ] 관찰 기간(7일) 동안 `narang.kim`이 정상이고 Render 트래픽이 없는지 확인한다
   - [ ] Render: 서비스에서 커스텀 도메인 `narang.kim`/`www` 제거 후 서비스 중지/삭제한다(삭제 전 사용자 확인)
   - [ ] `docs/deploy.md`: 최종 상태(Cloudflare zone, Pages 커스텀 도메인, Render 제거일)를 반영해 갱신한다

### Phase Z: Post-Merge Cleanup

Z. [ ] **정리**
   - [ ] plan 완료 처리(`/done`) 및 `.worktrees/drafts` scratch 정리 상태 read-back