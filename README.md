# bunyanghouse-suwon

힐스테이트 수원파크포레 분양 랜딩페이지.
`suwon.bunyanghouse.com` 으로 배포 (Cloudflare Pages).

## 구조

```
landing-template/   정적 랜딩페이지 (배포 대상 = Pages 출력 디렉터리)
  config.js         현장별 설정 — 이 파일 + images/ 만 교체하면 다른 현장에 재사용
  index.html
  script.js
  style.css
  privacy.html
  images/
backend/            리드(상담신청) 전송용 Cloudflare Worker
  cloudflare-worker.js
  .env.example      Worker 환경변수 이름 참고용 (실제 값은 CF 대시보드에 Secret 등록)
  README.md         Worker 배포/연동 방법
```

## 배포 (Cloudflare Pages)

- 빌드 명령어: 없음
- 출력(루트) 디렉터리: `landing-template`
- 커스텀 도메인: `suwon.bunyanghouse.com` (Cafe24 DNS에 CNAME 추가)

## 리드 전송

`landing-template/config.js` 의 `api.leadEndpoint` 가 Worker 주소를 가리킴.
Worker 의 `ALLOWED_ORIGIN` 은 `https://suwon.bunyanghouse.com` 으로 설정.
