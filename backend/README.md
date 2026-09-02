# 상담신청 → 솔라피 문자발송 연동

정적 사이트(HTML/JS)에서는 **솔라피 API를 직접 호출할 수 없습니다.**
API Key/Secret이 브라우저에 노출되면 누구나 님 계정으로 문자를 보낼 수 있기 때문입니다.
→ 사이에 **작은 서버(엔드포인트)** 를 하나 둡니다.

```
방문자 폼 제출
   │  POST (JSON: 이름, 전화, ...)
   ▼
[엔드포인트]  ← 여기서 솔라피 Key/Secret 사용 (서버에만 저장)
   │  솔라피 API 호출
   ▼
관리자에게 신청 알림 문자  +  (선택) 신청자에게 접수 확인 문자
```

## 1. 솔라피에서 준비

1. https://solapi.com 가입
2. **발신번호 등록** (내 번호 인증) — 등록 안 하면 발송 불가
3. **API Key / API Secret** 발급 (내 정보 → API Key 관리)
4. 잔액 충전 (SMS 건당 약 9~20원)

## 2. 엔드포인트 배포 (Cloudflare Workers, 무료)

`cloudflare-worker.js` 사용:

1. https://dash.cloudflare.com → **Workers & Pages → Create Worker** → 이름 지정 → Deploy
2. **Edit code** 에서 `cloudflare-worker.js` 내용 전체 붙여넣기 → Deploy
3. **Settings → Variables and Secrets** 에 등록 (Secret 로) — 변수명은 `.env.example` 참고:
   | 이름 | 값 | 필수 |
   |---|---|---|
   | `SOLAPI_API_KEY` | 솔라피 API Key | ✅ |
   | `SOLAPI_API_SECRET` | 솔라피 API Secret | ✅ |
   | `SOLAPI_SENDER_NUMBER` | 등록한 발신번호 (하이픈 없이) ※ 예전 이름 `SENDER_NUMBER` 도 인식 | ✅ |
   | `ADMIN_NUMBER` | 신청 알림 받을 번호 (하이픈 없이, 콤마로 여러 명) | ✅ |
   | `ALLOWED_ORIGIN` | 사이트 주소 (예 `https://example.com`, 콤마로 여러 개). 미설정 시 모든 Origin 허용 | 권장 |
   | `SITE_NAME` | 문자 제목에 쓸 사업명 (기본 `힐스테이트 수원파크포레`) | 선택 |
   | `DRY_RUN` | `1` 이면 실제 발송 없이 로그만 (개발/테스트용) | 선택 |
   | `NOTIFY_APPLICANT` | `0` 이면 신청자 자동회신 문자 끔 (기본: 보냄) | 선택 |
4. (권장) **Settings → Bindings → KV Namespace** 추가:
   변수명 `RL` 로 바인딩 →
   - 같은 번호+폼에서 5분 내 재제출 시 **중복 발송 차단**
   - IP·전화번호당 시간당 5회 **rate limit**
5. 배포 주소 복사: `https://<worker이름>.<계정>.workers.dev`

## 3. 사이트에 연결

`landing-template/config.js`:

```js
api: {
  leadEndpoint: "https://<worker이름>.<계정>.workers.dev",
},
```

이 값만 넣으면 두 폼(빠른문의 / 상담신청) 모두 자동으로 이 주소로 전송됩니다.
비워두면 실제 발송 없이 "접수 완료" 안내만 표시됩니다.

## 프론트가 보내는 payload

```json
{
  "source": "quickForm" | "contactForm",
  "name": "홍길동",
  "phone": "01012345678",
  "visitDate": "2026-09-05",   // contactForm만
  "visitTime": "14-15",        // contactForm만
  "message": "문의내용",       // contactForm만
  "agree": true,
  "page": "https://...",
  "ts": "2026-09-01T00:00:00.000Z"
}
```

응답: 성공 시 HTTP 200 `{"ok":true}` / 실패 시 4xx·5xx

## 보안 체크 (worker에 이미 포함)

- ✅ Key/Secret 은 서버 환경변수에만
- ✅ CORS 를 `ALLOWED_ORIGIN` 으로 제한
- ✅ 서버측 입력 검증 (이름 길이, 휴대폰 형식, 동의 여부)
- ✅ 허니팟 필드(`company`) — 값 있으면 무시
- ✅ KV 바인딩 시 IP·번호당 시간당 5회 rate limit + 5분 내 중복 발송 차단
- ✅ 발송 성공/실패 로그 (`console.log`, 전화번호 가운데 마스킹, 시크릿·응답본문 미기록)
- ✅ 실패 시 클라이언트에 상세 오류 미노출 (`{ok:false, error:"send"}` 만)
- ✅ `DRY_RUN=1` 로 개발환경에서 실제 발송 차단
- ⬜ 필요 시 Cloudflare Turnstile(무료 캡차) 추가 가능

## 발송 검증 방법

1. `DRY_RUN=1` 로 두고 폼 제출 → Worker **Logs**(실시간 로그) 탭에서
   `[lead] DRY_RUN — 발송 생략` 확인
2. `DRY_RUN` 제거 후 본인 번호로 폼 제출 → 관리자 문자 + 신청자 문자 수신 확인
3. 솔라피 콘솔 → **메시지 내역** 에서 발송 결과(성공/실패) 대조
4. 실패 시 Worker Logs 에 `[lead] 솔라피 발송 실패 {"reason":"solapi 4xx"}` 기록됨

## 대안

- **Vercel / Netlify Functions**: `solapi` npm 패키지 사용 (`npm i solapi`), 위와 동일 구조
- **Google Apps Script**: 서버 없이 가능하지만 CORS·rate limit 제어가 약함
