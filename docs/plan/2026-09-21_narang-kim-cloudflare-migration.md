
# narang.kim 도메인을 Render에서 Cloudflare Pages로 이전

> 작성일시: 2026-09-21 22:30
> 기준커밋: 5d75229
> 대상 프로젝트: nrkim-home
> 상태: 검토완료
> review-verdict: keep
> review-state: apply_complete
> reviewed-at: 2026-09-21
> expand-state: apply_complete
> expanded-at-main: 7865c36cd36c182169f48b116d87802c6944e008
> surface 분류: 공통 정책
> branch:
> worktree:
> worktree-owner:
> pre-merge-boundary: M
> t4t5-required: 없음
> t4t5-exempt: T4=NO_APP_CODE(cf-redirect/_redirects + cf-redirect/index.html 정적 리다이렉트만 변경), T5-http=NO_APP_CODE(cf-redirect/_redirects + cf-redirect/index.html 앱 HTTP 코드 변경 없음), T5-http_live=NO_APP_CODE(cf-redirect/_redirects + cf-redirect/index.html 정적 리다이렉트이며 live 검증은 Phase O4 curl), T4-operational-merge=NO_RUNNER_MERGE_CHANGE(cf-redirect/_redirects + cf-redirect/index.html만 대상이며 plan-runner merge policy/runtime 변경 없음)
> 진행률: 4/75 (5%)
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

- main drift 점검(확장 시점): 기준커밋 `5d75229` 이후 변경은 plan/receipt 문서뿐이며 `cf-redirect/_redirects`, `cf-redirect/index.html`, `fe/src/app/util/route.ts`에는 overlap 없음. `drift_mode=baseline_compare`; 확장 기준 main=`7865c36cd36c182169f48b116d87802c6944e008`.

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

### Phase 0: 구현 격리 준비

0. - [ ] **구현 owner가 사용할 격리 상태를 문서에 고정** — 구현 진입 게이트
   - [ ] `docs/plan/2026-09-21_narang-kim-cloudflare-migration.md`: 구현 시작 직전에 `> branch:` 값을 실제 구현 브랜치로 채우고 현재 main HEAD에서 분기됐는지 read-back한다
   - [ ] `docs/plan/2026-09-21_narang-kim-cloudflare-migration.md`: ChatGPT Web 경로라면 `web/narang-kim-cloudflare-migration` 브랜치를 사용하고 `> worktree:`/ `> worktree-owner:`는 로컬 linked worktree 미사용 상태로 기록한다
   - [ ] `docs/plan/2026-09-21_narang-kim-cloudflare-migration.md`: 로컬 `/implement` 경로를 사용할 경우 기존 worktree owner 계약에 따라 worktree cwd를 별도로 확인하고 Web 브랜치 계약과 혼용하지 않는다

### Phase 1: 배포 runbook 문서화 (pre-merge)

1. - [ ] **Cloudflare Pages Direct Upload 배포 runbook을 생성**
   - [ ] `docs/deploy.md`: 파일을 신규 생성하고 현재 운영 대상이 Cloudflare Pages 프로젝트 `nrkim-home`의 Direct Upload임을 적는다
   - [ ] `docs/deploy.md`: 배포 명령 `wrangler pages deploy cf-redirect --project-name nrkim-home --branch main`을 한 개의 실행 명령으로 기록한다
   - [ ] `docs/deploy.md`: 리다이렉트 목적지를 바꿀 때 `cf-redirect/_redirects`의 302 target을 수정해야 한다고 기록한다
   - [ ] `docs/deploy.md`: 리다이렉트 목적지를 바꿀 때 `cf-redirect/index.html`의 meta refresh와 fallback link도 같은 URL로 수정해야 한다고 기록한다
   - [ ] `docs/deploy.md`: Render rollback을 유지하는 7일 동안에는 `fe/next.config.ts`의 root redirect destination도 같은 artifact URL로 동기화하고 Render 제거 후 이 동기화 의무가 끝난다고 기록한다
   - [ ] `docs/deploy.md`: `narang.kim`은 Porkbun 등록 도메인이며 cutover 이후 DNS zone owner는 Cloudflare라고 기록한다
   - [ ] `docs/deploy.md`: 롤백용 Porkbun 기본 NS 4개(salvador/fortaleza/maceio/curitiba `.ns.porkbun.com`)와 Render 7일 유지 원칙을 기록한다

2. - [ ] **정적 리다이렉트 계약과 커스텀 도메인 동작을 문서화**
   - [ ] `cf-redirect/_redirects`: 현재 root 규칙이 artifact URL로 302를 반환하는지 read-back하고 `docs/deploy.md`의 목적지와 일치시킨다
   - [ ] `cf-redirect/index.html`: meta refresh URL과 fallback anchor URL이 `_redirects` target과 같은지 read-back한다
   - [ ] `fe/next.config.ts`: Render rollback 기간의 root `redirects()` destination이 현재 artifact URL과 일치하는지 read-back한다
   - [ ] `docs/deploy.md`: `narang.kim`과 `www.narang.kim`을 동일 Pages 프로젝트의 custom domain으로 연결하므로 hostname별 별도 `_redirects` 규칙은 필요 없다고 기록한다
   - [ ] `docs/deploy.md`: `pages.dev`와 custom domain 모두 동일 정적 배포를 사용하고 custom domain activation/certificate는 Cloudflare가 관리한다고 기록한다

### Phase M: Merge Handoff

M. - [ ] **Phase 1 문서 변경을 main으로 넘긴다** — merge owner
   - [ ] 구현 브랜치 diff에서 `docs/deploy.md`가 의도한 신규 문서이고 `cf-redirect/_redirects`/`cf-redirect/index.html`은 계획하지 않은 변경이 없는지 확인한다
   - [ ] 구현 브랜치의 검증 결과가 green인 상태에서 PR 또는 동등한 merge 경로로 main에 반영한다
   - [ ] merge 후 main에서 `docs/deploy.md`를 다시 읽어 Direct Upload 명령, DNS owner, 롤백 NS 4개가 남아 있는지 확인한다

### Phase O1: 현황 확인 (owner, read-only)

O1. - [ ] **네임서버 전환 전 계정·DNS 전제조건을 확정**
   - [x] 공용 DNS와 사용자 확인을 대조해 Render용 외 사용 중인 DNS 레코드와 MX/TXT가 없음을 확인했다
   - [x] Porkbun Registry DNSSEC가 0 records임을 확인해 NS 변경 전 DS 해제가 불필요함을 확정했다
   - [x] Porkbun transfer lock은 registrar transfer용이며 nameserver 변경 절차에는 unlock 단계가 없음을 공식 도움말 기준으로 확인했다
   - [ ] Cloudflare 자동화 경로를 API 토큰(Zone:Edit, DNS:Edit, Pages:Edit) 또는 로그인된 브라우저 중 하나로 선택하고 자격 증명은 문서에 저장하지 않는다
   - [ ] Porkbun 자동화 경로를 API(`API Access` 활성화 포함) 또는 로그인된 브라우저 중 하나로 선택하고 자격 증명은 문서에 저장하지 않는다

### Phase O2: Cloudflare 사전 구성 (owner, 새 배포 준비)

O2-1. - [ ] **Cloudflare zone을 cutover 전 상태로 준비**
   - [ ] Cloudflare에서 `narang.kim` zone을 Free 플랜으로 추가한다
   - [ ] Cloudflare가 배정한 authoritative nameserver 2개를 정확한 FQDN으로 read-back해 운영 기록에 남긴다
   - [ ] DNS Records에서 자동 스캔 결과를 읽고 Render apex A `216.24.57.1`과 `www` CNAME 외 레코드가 나타나면 O3로 진행하지 않고 사용자 확인을 받는다
   - [ ] 확인된 Render apex A `216.24.57.1`을 Cloudflare zone에서 삭제한다
   - [ ] 확인된 `www` CNAME `nrkim-home.onrender.com`을 Cloudflare zone에서 삭제한다
   - [ ] zone이 Pending인 동안 production-ready로 간주하지 않고 O3 실행 전까지 현재 Porkbun NS 위임을 유지한다

O2-2. - [ ] **Pages custom domain을 가능한 범위까지 사전 등록**
   - [ ] `https://nrkim-home.pages.dev/`에 HEAD 요청을 보내 302와 artifact `Location`을 확인한다
   - [ ] Pages 프로젝트 `nrkim-home`에 apex custom domain `narang.kim`을 추가한다
   - [ ] Pages 프로젝트 `nrkim-home`에 custom domain `www.narang.kim`을 추가한다
   - [ ] 두 custom domain의 상태가 Active가 아니면 Pending/Verifying 상태와 사유를 read-back해 기록한다
   - [ ] 두 custom domain이 최소한 Pages 프로젝트에 등록된 상태임을 확인한 뒤에만 O3 사용자 확인 단계로 넘긴다

### Phase O3: 네임서버 전환 (owner)

O3. - [ ] **Porkbun authoritative nameserver를 Cloudflare로 전환** — 실행 직전 사용자 확인 필수
   - [x] Porkbun DNS 레코드 TTL 사전 하향은 생략한다 — 이번 작업은 parent NS delegation 변경이고 기존 zone은 Render A/CNAME뿐이므로 O4 검증과 NS 원복을 안전장치로 사용한다
   - [ ] O2에서 기록한 Cloudflare NS 2개를 다시 read-back해 O3 입력값과 문자 단위로 일치하는지 확인한다
   - [ ] 사용자에게 지금 NS 전환을 실행할지 명시적으로 확인받고 승인 전에는 Porkbun 설정을 변경하지 않는다
   - [ ] Porkbun에서 기존 NS 4개를 제거하고 O2의 Cloudflare NS 2개로 교체한다
   - [ ] 변경 직후 Porkbun 화면/API read-back에서 설정된 NS 2개가 O2 값과 일치하는지 확인한다
   - [ ] 전환 시각과 원복 NS 4개(salvador/fortaleza/maceio/curitiba `.ns.porkbun.com`)를 운영 기록에 남긴다

### Phase O4: 연동 확인 (owner)

O4-1. - [ ] **DNS 위임과 Cloudflare activation을 확인**
   - [ ] `nslookup -type=NS narang.kim 8.8.8.8` 결과가 O2의 Cloudflare NS 2개와 일치하는지 확인한다
   - [ ] 1.1.1.1 리졸버에서도 `narang.kim` NS가 같은 Cloudflare NS 2개로 보이는지 확인한다
   - [ ] Cloudflare dashboard/API에서 zone `narang.kim` 상태가 Active인지 확인한다
   - [ ] Pages apex custom domain `narang.kim`이 Active이고 인증서가 발급된 상태인지 확인한다
   - [ ] Pages custom domain `www.narang.kim`이 Active이고 인증서가 발급된 상태인지 확인한다

O4-2. - [ ] **실제 HTTPS redirect와 cold-start 제거를 확인**
   - [ ] `curl -sI https://narang.kim/` 결과가 301 또는 302이고 `Location`이 artifact URL인지 확인한다
   - [ ] `curl -sI https://www.narang.kim/` 결과가 301 또는 302이고 `Location`이 같은 artifact URL인지 확인한다
   - [ ] apex에 연속 3회 요청해 각 요청의 `time_total`을 기록하고 Render의 약 50초 cold-start 패턴이 재현되지 않는지 확인한다
   - [ ] `www`에도 연속 3회 요청해 동일하게 cold-start 패턴이 재현되지 않는지 확인한다
   - [ ] Cloudflare NS 위임이 관측된 뒤 zone/custom domain/HTTPS 중 하나라도 실패하면 Porkbun NS를 원복하고, 모두 통과하면 rollback 미실행으로 기록한다

### Phase O5: 정리 (owner)

O5-1. - [ ] **7일 관찰 기간 후 Render 의존성이 사라졌는지 재확인**
   - [ ] NS 전환일로부터 7일이 지난 뒤 apex HTTPS redirect를 다시 확인한다
   - [ ] 같은 시점에 `www` HTTPS redirect를 다시 확인한다
   - [ ] Render dashboard에서 관찰 기간 동안 `narang.kim`/ `www`에 의존하는 의미 있는 트래픽이 없는지 확인한다
   - [ ] Render 제거 직전에 사용자에게 custom domain 제거와 서비스 중지/삭제를 실행할지 다시 확인받는다

O5-2. - [ ] **Render 서비스와 최종 runbook 상태를 정리**
   - [ ] 사용자 승인 후 Render 서비스에서 `narang.kim` custom domain을 제거한다
   - [ ] 사용자 승인 후 Render 서비스에서 `www.narang.kim` custom domain을 제거한다
   - [ ] 사용자 승인 범위에 따라 Render 서비스를 중지하거나 삭제한다
   - [ ] `docs/deploy.md`: 최종 DNS owner가 Cloudflare이고 두 Pages custom domain이 Active임을 반영한다
   - [ ] `docs/deploy.md`: Render 제거일과 제거 후에는 Porkbun NS 원복만으로 Render rollback이 성립하지 않는다는 점을 기록한다

### Phase Z: Post-Merge Cleanup

Z. - [ ] **plan lineage를 종결**
   - [ ] 모든 Phase의 미완료 체크박스가 0인지 read-back하고 남아 있으면 `/done`을 실행하지 않는다
   - [ ] `/done` owner로 plan을 완료 처리하고 canonical plan이 archive/ledger 규칙에 맞게 이동했는지 read-back한다
   - [ ] `docs/history/web-review/2026-09-21_narang-kim-cloudflare-migration.json` receipt가 최종 plan lineage와 충돌하지 않는지 확인한다
