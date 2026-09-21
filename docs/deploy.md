# 배포 runbook (narang.kim)

> 현재 상태: **cutover 예정**. narang.kim의 Cloudflare 이전(NS 전환, custom domain 연결, Render 정리)은 아직 수행되지 않았다. 절차는 계획서 `docs/plan/2026-09-21_narang-kim-cloudflare-migration.md`의 Phase O3~O5를 따른다. 아래 "cutover 이후" 항목은 전환이 끝난 뒤 적용되는 계약이다.

## 운영 대상

- Cloudflare Pages 프로젝트 `nrkim-home`, **Direct Upload** 방식.
- 배포 소스는 `cf-redirect/` 정적 사이트(`_redirects`, `index.html`).

## 배포 명령

```
wrangler pages deploy cf-redirect --project-name nrkim-home --branch main
```

인증 토큰/자격 증명은 이 문서·plan·커밋에 기록하지 않고 세션 환경변수 또는 wrangler 로그인으로만 전달한다.

## 리다이렉트 목적지 변경

목적지 artifact URL: `https://claude.ai/artifact/4Hhdi2DzQBaDLnsGzQ7aqe`

목적지를 바꿀 때는 아래를 **모두 같은 URL**로 수정한다.

1. `cf-redirect/_redirects`의 302 target.
2. `cf-redirect/index.html`의 meta refresh URL과 fallback link.
3. Render rollback을 유지하는 7일 동안에는 `fe/next.config.ts`의 root `redirects()` destination도 같은 artifact URL로 동기화한다. Render 서비스 제거 후에는 이 동기화 의무가 끝난다.

수정 후 위 배포 명령을 다시 실행한다.

## 도메인 / DNS

- `narang.kim`은 Porkbun 등록 도메인이다. cutover 이후 DNS zone owner는 Cloudflare다.
- `narang.kim`과 `www.narang.kim`은 동일 Pages 프로젝트 `nrkim-home`의 custom domain으로 연결하므로 hostname별 `_redirects` 규칙은 필요 없다.
- `pages.dev`와 custom domain은 동일한 정적 배포를 사용한다. custom domain activation과 인증서는 Cloudflare가 관리한다.

## 롤백

- 롤백용 Porkbun 기본 네임서버 4개:
  - `salvador.ns.porkbun.com`
  - `fortaleza.ns.porkbun.com`
  - `maceio.ns.porkbun.com`
  - `curitiba.ns.porkbun.com`
- Render 서비스는 cutover 후 7일간 삭제하지 않고 rollback 경로로 유지한다. 문제가 있으면 Porkbun에서 위 기본 NS로 되돌린다.
