/**
 * 힐스테이트 수원파크포레 — 상담신청 수신 → 솔라피 문자발송
 * Cloudflare Workers 용 (무료 플랜 가능)
 *
 * 배포:
 *   1) https://dash.cloudflare.com → Workers & Pages → Create Worker
 *   2) 이 파일 내용을 붙여넣고 Deploy
 *   3) Settings → Variables and Secrets 에 아래 값 등록 (Secret 로)
 *        SOLAPI_API_KEY        : 솔라피 API Key
 *        SOLAPI_API_SECRET     : 솔라피 API Secret
 *        SOLAPI_SENDER_NUMBER  : 솔라피에 사전등록한 발신번호 (하이픈 없이, 예 01012345678)
 *                                ※ 예전 이름 SENDER_NUMBER 도 계속 인식됨
 *        ADMIN_NUMBER          : 신청 알림 받을 관리자 번호 (하이픈 없이, 콤마로 여러 명 가능)
 *        ALLOWED_ORIGIN        : 사이트 주소 (예 https://example.com)  ※ 여러 개면 콤마로. 미설정 시 모든 Origin 허용
 *        SITE_NAME            : (선택) 문자 제목에 쓸 사업명 (기본: "힐스테이트 수원파크포레")
 *        DRY_RUN             : (선택) "1" 이면 실제 발송 안 하고 로그만 — 개발/테스트용
 *        NOTIFY_APPLICANT    : (선택) "0" 이면 신청자 자동회신 문자 끔 (기본: 보냄)
 *   4) 배포된 주소(https://xxxx.workers.dev)를 config.js 의 api.leadEndpoint 에 입력
 *
 * KV 네임스페이스 "RL" 을 바인딩하면 rate limit + 중복발송 방지가 활성화됩니다 (선택, 권장).
 */

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin') || '';
    const allow  = (env.ALLOWED_ORIGIN || '').split(',').map(s => s.trim()).filter(Boolean);
    // ALLOWED_ORIGIN 미설정 시: 요청 Origin 그대로 허용(느슨). 설정 시: 목록에 있을 때만.
    const corsOrigin = allow.length
      ? (allow.includes(origin) ? origin : allow[0])
      : (origin || '*');

    const cors = {
      'Access-Control-Allow-Origin': corsOrigin,
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Vary': 'Origin',
    };

    if (request.method === 'OPTIONS') return new Response(null, { headers: cors });
    if (request.method !== 'POST')    return json({ ok: false, error: 'method' }, 405, cors);

    // Origin 검증
    if (allow.length && !allow.includes(origin)) {
      return json({ ok: false, error: 'origin' }, 403, cors);
    }

    let data;
    try { data = await request.json(); } catch { return json({ ok: false, error: 'bad json' }, 400, cors); }

    // ── 입력 검증 ──────────────────────────────
    const name  = String(data.name || '').trim().slice(0, 40);
    const phone = String(data.phone || '').replace(/\D/g, '');
    const source = String(data.source || 'form').slice(0, 20);
    if (!name || !/^01[016789]\d{7,8}$/.test(phone) || data.agree !== true) {
      return json({ ok: false, error: 'invalid' }, 400, cors);
    }
    // 허니팟(선택): data.company 값이 있으면 봇으로 간주
    if (data.company) return json({ ok: true });

    const dryRun = env.DRY_RUN === '1' || env.DRY_RUN === 'true';

    // ── 중복 발송 방지 + Rate limit (KV 바인딩 "RL" 있을 때만) ──
    if (env.RL) {
      // 같은 번호+폼에서 5분 내 재제출이면 발송 생략(성공 응답만)
      const dedupKey = `dedup:${source}:${phone}`;
      if (await env.RL.get(dedupKey)) {
        log('dedup skip', { source, phone });
        return json({ ok: true, deduped: true }, 200, cors);
      }

      // IP·번호당 시간당 5회 제한
      const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
      for (const key of [`ip:${ip}`, `ph:${phone}`]) {
        const n = parseInt(await env.RL.get(key) || '0', 10);
        if (n >= 5) {
          log('rate limited', { source, phone, key: key.split(':')[0] });
          return json({ ok: false, error: 'rate' }, 429, cors);
        }
        await env.RL.put(key, String(n + 1), { expirationTtl: 3600 }); // 1시간 5회
      }

      // 발송을 시작하기 전에 dedup 마커 선점 (동시 이중클릭 방어)
      await env.RL.put(dedupKey, '1', { expirationTtl: 300 }); // 5분
    }

    // ── 발신번호 (대시보드 변수명 SOLAPI_SENDER_NUMBER / SENDER_NUMBER 둘 다 허용) ──
    const sender = String(env.SOLAPI_SENDER_NUMBER || env.SENDER_NUMBER || '').replace(/\D/g, '');
    if (!sender) {
      log('발신번호 미설정 — SOLAPI_SENDER_NUMBER 확인 필요', { source, phone });
      if (env.RL) { try { await env.RL.delete(`dedup:${source}:${phone}`); } catch {} }
      return json({ ok: false, error: 'config' }, 500, cors);
    }

    // ── 문자 내용 구성 ─────────────────────────
    const SITE  = env.SITE_NAME || '힐스테이트 수원파크포레';
    const visit = [data.visitDate, data.visitTime].filter(Boolean).join(' ');
    const adminText =
      `[${SITE} 상담신청]\n` +
      `성함: ${name}\n연락처: ${phone}` +
      (visit ? `\n방문희망: ${visit}` : '') +
      (data.message ? `\n문의: ${String(data.message).slice(0, 200)}` : '') +
      (data.source ? `\n(${source})` : '');

    const userText =
      `[${SITE}]\n상담 신청이 접수되었습니다. 담당자가 곧 연락드리겠습니다.\n문의 1844-1588`;

    const admins = (env.ADMIN_NUMBER || '').split(',').map(s => s.replace(/\D/g, '')).filter(Boolean);
    const notifyApplicant = env.NOTIFY_APPLICANT !== '0' && env.NOTIFY_APPLICANT !== 'false';

    // ── 개발/테스트 모드: 실제 발송 없이 로그만 ──
    if (dryRun) {
      log('DRY_RUN — 발송 생략', { source, phone, admins: admins.map(maskPhone), notifyApplicant });
      return json({ ok: true, dryRun: true }, 200, cors);
    }

    // ── 솔라피 발송 ────────────────────────────
    try {
      for (const admin of admins) {
        const r = await solapiSend(env, { to: admin, from: sender, text: adminText });
        log('솔라피 접수(관리자)', { source, phone, type: r.type, code: r.statusCode });
      }
      if (notifyApplicant) {
        const r = await solapiSend(env, { to: phone, from: sender, text: userText });
        log('솔라피 접수(신청자)', { source, phone, type: r.type, code: r.statusCode });
      }
    } catch (e) {
      // 실패 로그 (개인정보/시크릿 노출 없이). 클라이언트에는 상세 미노출.
      log('솔라피 발송 실패', { source, phone, reason: sanitizeErr(e) });
      // dedup 마커 해제 — 사용자가 재시도할 수 있도록
      if (env.RL) { try { await env.RL.delete(`dedup:${source}:${phone}`); } catch {} }
      return json({ ok: false, error: 'send' }, 502, cors);
    }

    log('발송 완료', { source, phone, adminCount: admins.length, notifyApplicant });
    return json({ ok: true }, 200, cors);
  },
};

function json(obj, status, cors) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { 'Content-Type': 'application/json', ...cors },
  });
}

/* 로그: 전화번호는 가운데 마스킹, 시크릿은 애초에 넣지 않음 */
function log(msg, fields = {}) {
  const safe = { ...fields };
  if (safe.phone) safe.phone = maskPhone(safe.phone);
  console.log(`[lead] ${msg}`, JSON.stringify(safe));
}

function maskPhone(p) {
  const d = String(p).replace(/\D/g, '');
  if (d.length < 7) return '***';
  return d.slice(0, 3) + '****' + d.slice(-4);
}

/* 솔라피 에러에서 상태코드/요지만 추출 — 응답 본문에 개인정보가 섞일 수 있어 통째 로깅 안 함 */
function sanitizeErr(e) {
  const s = String(e && e.message || e);
  const m = s.match(/solapi[^]*/i);
  return (m ? m[0] : s).slice(0, 150);
}

/* 솔라피 단건 발송 (REST v4, HMAC-SHA256 서명)
   ⚠️ 솔라피는 접수 실패 시에도 HTTP 200 + 본문에 실패코드를 담아 보낼 수 있어,
   HTTP 상태만이 아니라 본문의 statusCode('2'로 시작해야 정상 접수)까지 확인한다. */
async function solapiSend(env, message) {
  const date = new Date().toISOString();
  const salt = crypto.randomUUID().replace(/-/g, '');
  const sig  = await hmacSha256Hex(env.SOLAPI_API_SECRET, date + salt);

  const res  = await fetch('https://api.solapi.com/messages/v4/send', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `HMAC-SHA256 apiKey=${env.SOLAPI_API_KEY}, date=${date}, salt=${salt}, signature=${sig}`,
    },
    body: JSON.stringify({ message }),
  });

  const raw = await res.text();
  let body; try { body = JSON.parse(raw); } catch { body = null; }

  if (!res.ok) {
    const code = body && (body.errorCode || body.statusCode);
    const msg  = body && (body.errorMessage || body.statusMessage);
    throw new Error(`solapi ${res.status} ${code || ''} ${msg || raw.slice(0, 120)}`);
  }

  // HTTP 200 이어도 접수 실패가 본문에 담겨 옴 — 정상 접수 코드(2xxx)만 통과
  const code = body && (body.statusCode || body.errorCode);
  if (!(typeof code === 'string' && code[0] === '2')) {
    const msg = body && (body.statusMessage || body.errorMessage);
    throw new Error(`solapi reject ${code || '?'} ${msg || raw.slice(0, 120)}`);
  }

  return body;
}

async function hmacSha256Hex(secret, data) {
  const key = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'],
  );
  const buf = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(data));
  return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
}
