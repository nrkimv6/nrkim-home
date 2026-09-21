# 배포 runbook (narang.kim)

> 현재 상태: **cutover 완료 (2026-09-22 KST)**. narang.kim은 Cloudflare DNS(`nelci.ns.cloudflare.com`, `rodrigo.ns.cloudflare.com`)로 전환됐고, `narang.kim`/`www.narang.kim`이 Pages 프로젝트 `nrkim-home`의 custom domain으로 연결돼 artifact로 302 리다이렉트한다. Render 서비스는 cutover 전에 사용자가 이미 삭제했다. 경과는 계획서 `docs/plan/2026-09-21_narang-kim-cloudflare-migration.md`를 따른다.

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

Render 서비스는 삭제됐으므로 `fe/next.config.ts`의 root `redirects()`는 더 이상 서비스되지 않고 동기화 의무도 없다.

수정 후 위 배포 명령을 다시 실행한다.

## 도메인 / DNS

- `narang.kim`은 Porkbun 등록 도메인이다. 네임서버는 Cloudflare(`nelci.ns.cloudflare.com`, `rodrigo.ns.cloudflare.com`)이고 DNS zone owner는 Cloudflare 계정이다.
- Cloudflare zone에는 Render용 A/CNAME을 두지 않는다. apex와 `www`의 CNAME(`nrkim-home.pages.dev`)은 Pages custom domain 연결이 관리한다.
- `narang.kim`과 `www.narang.kim`은 동일 Pages 프로젝트 `nrkim-home`의 custom domain으로 연결하므로 hostname별 `_redirects` 규칙은 필요 없다.
- `pages.dev`와 custom domain은 동일한 정적 배포를 사용한다. custom domain activation과 인증서는 Cloudflare가 관리한다.

## 롤백

- Render 서비스는 2026-09-22 cutover 이전에 삭제됐다. **Porkbun 기본 NS로 되돌려도 Render로 복귀하지 않는다.** 이전 Porkbun 기본 NS(참고용): `salvador`/`fortaleza`/`maceio`/`curitiba` `.ns.porkbun.com`.
- 장애 시 복구는 Pages 쪽에서 한다: Pages 대시보드에서 이전 deployment로 rollback하거나 위 배포 명령을 다시 실행한다.
- Porkbun의 Registry DNSSEC는 0 records(2026-09-21 확인)였고, Cloudflare 쪽 DNSSEC는 켜지 않았다.
