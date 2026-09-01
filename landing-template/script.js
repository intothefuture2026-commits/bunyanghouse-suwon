// script.js  —  분양 랜딩페이지 인터랙션

document.addEventListener('DOMContentLoaded', () => {
  applyConfig();
  initHeroSlider();
  initNav();
  buildOverviewCard();
  initGallery();
  initFloorplan();
  initFAQ();
  initQuickForm();
  initContactForm();
  initTermsToggle();
  initScrollEffects();
  initPopup();
});

/* ──────────────────────────────────────────
   Config → DOM 바인딩
────────────────────────────────────────── */
function applyConfig() {
  const C = CONFIG;
  const phone = C.phone;
  const telHref = 'tel:' + phone.replace(/-/g, '');

  // 페이지 타이틀
  document.title = C.propertyName + ' — 분양안내';

  // 네비 로고
  el('navLogo').textContent = C.propertyName;

  // 전화번호 일괄
  el('navPhoneNum').textContent   = phone;
  el('mobilePhoneNum').textContent = phone;
  setHref('navPhoneBtn', telHref);
  setHref('mobilePhoneBtn', telHref);
  setHref('bottomCallBtn', telHref);
  setHref('floatCallBtn', telHref);

  // 프로모션 배너 링크 (전화 / 문자)
  const smsHref = 'sms:' + phone.replace(/-/g, '');
  qsa('.js-promo').forEach(a => {
    if (a.dataset.promo === 'call')      a.href = telHref;
    else if (a.dataset.promo === 'sms')  a.href = smsHref;
  });

  // 빠른 문의 카드
  if (C.quickForm) {
    const qf = C.quickForm;
    setHref('qfCallLink', telHref);
    setText('qfHeading',    qf.heading);
    setText('qfCallLabel',  qf.callLabel);
    setText('qfCallNum',    phone);
    setText('qfVisitLabel', qf.visitLabel);
    setText('qfVisitDesc',  qf.visitDesc);
    setText('qfAddrLabel',  qf.addrLabel);
    setText('qfAddr',       qf.address);
    setText('qfSubmit',     qf.submitLabel);
  }

  // 네비 메뉴 (PC + 모바일)
  buildNavMenu();

  // 히어로 텍스트/혜택은 SEO·Google Ads 크롤링을 위해
  // index.html 에 실제 텍스트로 고정되어 있으므로 JS로 덮어쓰지 않습니다.

  // 프리미엄 포인트
  buildPremiumCards();

  // 위치
  buildLocationPoints();

  // 하단 버튼
  el('bottomCallLabel').textContent  = C.bottomBar.callLabel;
  el('bottomVisitLabel').textContent = C.bottomBar.visitLabel;
  if (C.bottomBar.kakaoLabel) setText('bottomKakaoLabel', C.bottomBar.kakaoLabel);

  // 하단 버튼바 위 안내 배너 (모바일 전용)
  const bbNotice = el('bottomBarNotice');
  if (bbNotice) {
    if (C.bottomBar.noticeHtml) bbNotice.innerHTML = C.bottomBar.noticeHtml;
    else bbNotice.remove();
  }

  // 카카오 버튼 (플로팅 + 하단바)
  const kakaoBtns = document.querySelectorAll('.floating-btn.kakao, .bottom-bar-btn.kakao');
  kakaoBtns.forEach((btn) => {
    if (C.kakaoUrl) {
      btn.href   = C.kakaoUrl;
      btn.target = '_blank';
      btn.rel    = 'noopener noreferrer';
    }
  });

  // 푸터
  const f = C.footer || {};
  el('footerLogoName').textContent    = C.propertyName;
  el('footerInfo').textContent        = '대표번호: ' + phone;
  el('footerDisclaimer').textContent  = f.disclaimer || '';

  const bizLines = [f.builder, f.contact].filter(Boolean);
  const bizEl = el('footerBiz');
  if (bizEl) bizEl.textContent = bizLines.join('  |  ');

  if (f.privacyUrl) setHref('footerPrivacyLink', f.privacyUrl);
  if (f.copyright) setText('footerCopy', f.copyright);
}

function buildNavMenu() {
  const C = CONFIG;
  const navList    = el('navList');
  const mobileList = el('mobileNavList');

  C.navMenu.forEach(item => {
    const li = document.createElement('li');
    const a  = document.createElement('a');
    a.href        = item.href;
    a.textContent = item.label;
    li.appendChild(a);
    navList.appendChild(li);

    const mLi = li.cloneNode(true);
    mLi.querySelector('a').addEventListener('click', closeMobileMenu);
    mobileList.appendChild(mLi);
  });
}

function buildPremiumCards() {
  const grid = el('premiumGrid');
  CONFIG.premiumPoints.forEach((pt, idx) => {
    const card = document.createElement('div');
    card.className = 'premium-card';

    const hasVideo = pt.video && pt.video.trim() !== '';
    const hasImage = pt.image && pt.image.trim() !== '';
    const ext      = hasVideo ? pt.video.split('.').pop().toLowerCase() : '';
    const mime     = ext === 'webm' ? 'video/webm' : 'video/mp4';

    let mediaInner = '';
    if (hasVideo) {
      mediaInner = `<video class="card-media-video" autoplay muted loop playsinline>
          <source src="${pt.video}" type="${mime}">
          ${hasImage ? `<img class="card-media-img" src="${pt.image}" alt="${pt.title}" loading="lazy" decoding="async">` : ''}
        </video>`;
    } else if (hasImage) {
      mediaInner = `<img class="card-media-img" src="${pt.image}" alt="${pt.title}" loading="lazy" decoding="async">`;
    }

    card.innerHTML = `
      <div class="card-media">${mediaInner}</div>
      <div class="card-body">
        <span class="card-num" aria-hidden="true">0${idx + 1}</span>
        <h3 class="card-title">${pt.title}</h3>
      </div>
    `;
    grid.appendChild(card);
  });
}

function buildLocationPoints() {
  const wrap = el('locationPoints');
  CONFIG.locationPoints.forEach(pt => {
    const card = document.createElement('div');
    card.className = 'location-point-card';
    const itemsHtml = pt.items.map(item => `<li class="pt-item">${item}</li>`).join('');
    card.innerHTML = `
      <p class="pt-label">${pt.label}</p>
      <ul class="pt-list">${itemsHtml}</ul>
    `;
    wrap.appendChild(card);
  });
}

/* ──────────────────────────────────────────
   네비게이션
────────────────────────────────────────── */
function initNav() {
  const hamburger  = el('hamburger');
  const mobileMenu = el('mobileMenu');

  hamburger.addEventListener('click', () => {
    const isOpen = mobileMenu.classList.contains('open');
    isOpen ? closeMobileMenu() : openMobileMenu();
  });

  // 모바일 메뉴 외부 클릭 시 닫기
  document.addEventListener('click', e => {
    if (!el('navHeader').contains(e.target)) closeMobileMenu();
  });
}

function openMobileMenu() {
  el('mobileMenu').classList.add('open');
  el('mobileMenu').setAttribute('aria-hidden', 'false');
  const ham = el('hamburger');
  ham.classList.add('active');
  ham.setAttribute('aria-label', '메뉴 닫기');
  ham.setAttribute('aria-expanded', 'true');
}

function closeMobileMenu() {
  el('mobileMenu').classList.remove('open');
  el('mobileMenu').setAttribute('aria-hidden', 'true');
  const ham = el('hamburger');
  ham.classList.remove('active');
  ham.setAttribute('aria-label', '메뉴 열기');
  ham.setAttribute('aria-expanded', 'false');
}

/* ──────────────────────────────────────────
   단지 개요 — 이미지 + 표
────────────────────────────────────────── */
function buildOverviewCard() {
  const ov  = CONFIG.overview;
  const img = el('overviewImg');
  if (ov.image) img.src = ov.image;
  el('overviewCaption').textContent = ov.caption || '';

  const tbody = el('overviewTbody');
  ov.rows.forEach(row => {
    const tr = document.createElement('tr');
    tr.innerHTML = `<td class="ov-label">${row.label}</td><td class="ov-value">${row.value}</td>`;
    tbody.appendChild(tr);
  });
}

/* ──────────────────────────────────────────
   갤러리
────────────────────────────────────────── */
function initGallery() {
  const C      = CONFIG;
  const tabBar = el('galleryTabBar');

  C.galleryTabs.forEach((tab, idx) => {
    const btn = document.createElement('button');
    btn.className   = 'tab-btn' + (idx === 0 ? ' active' : '');
    btn.textContent = tab.label;
    btn.type        = 'button';
    btn.setAttribute('role', 'tab');
    btn.addEventListener('click', () => {
      tabBar.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      renderGallery(tab.id, tab.label);
    });
    tabBar.appendChild(btn);
  });

  renderGallery(C.galleryTabs[0].id, C.galleryTabs[0].label);
}

function renderGallery(tabId, label) {
  const grid   = el('galleryGrid');
  const images = (CONFIG.galleryImages?.[tabId] || []).filter(Boolean);
  grid.dataset.tab = tabId;
  grid.innerHTML = '';

  if (images.length > 0) {
    images.forEach((src, i) => {
      const item = document.createElement('div');
      item.className = 'gallery-item';
      item.setAttribute('role', 'img');
      item.setAttribute('aria-label', `${label} ${i + 1}`);
      const img = document.createElement('img');
      img.src = src;
      img.alt = `${label} ${i + 1}`;
      img.loading = 'lazy';
      item.appendChild(img);
      grid.appendChild(item);
    });
  } else {
    // 실제 이미지 없을 때 플레이스홀더 6개
    for (let i = 1; i <= 6; i++) {
      const item = document.createElement('div');
      item.className = 'gallery-item';
      item.setAttribute('role', 'img');
      item.setAttribute('aria-label', `${label} ${i}`);
      item.innerHTML = `<div class="img-placeholder">${label} ${i}</div>`;
      grid.appendChild(item);
    }
  }
}

/* ──────────────────────────────────────────
   평면도
────────────────────────────────────────── */
function initFloorplan() {
  const C       = CONFIG;
  const tabBar  = el('floorplanTabBar');
  const content = el('floorplanContent');

  C.floorplanTabs.forEach((tab, idx) => {
    // 탭 버튼
    const btn = document.createElement('button');
    btn.className   = 'tab-btn' + (idx === 0 ? ' active' : '');
    btn.textContent = tab.label;
    btn.type        = 'button';
    btn.setAttribute('role', 'tab');
    btn.addEventListener('click', () => {
      tabBar.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      qsa('.floorplan-panel').forEach(p => p.classList.remove('active'));
      const target = document.getElementById('fp-' + tab.id);
      if (target) target.classList.add('active');
    });
    tabBar.appendChild(btn);

    // 패널
    const panel = document.createElement('div');
    panel.className = 'floorplan-panel' + (idx === 0 ? ' active' : '');
    panel.id        = 'fp-' + tab.id;
    panel.setAttribute('role', 'tabpanel');

    const data    = C.floorplanImages?.[tab.id] || {};
    const mainSrc = data.main || '';
    const gallery = (data.gallery || []).filter(Boolean);
    const info    = tab.info || {};

    const mainImgHtml = mainSrc
      ? `<img class="fp-main-img" src="${mainSrc}" alt="${tab.label} 평면도" loading="lazy">`
      : `평면도 이미지<br>${tab.label}`;

    const statusHtml = tab.status
      ? `<span class="fp-status">${tab.status}</span>`
      : '';

    const detailsHtml = (info.details || [])
      .map(d => `<p class="fp-detail">${d}</p>`).join('');

    const galleryHtml = gallery.length > 0
      ? `<div class="fp-gallery">
           <h3 class="fp-gallery-title">${tab.label} 내부 갤러리</h3>
           <div class="fp-gallery-grid">
             ${gallery.map((src, i) =>
               `<div class="fp-gallery-item">
                  <img src="${src}" alt="${tab.label} 내부 ${i + 1}" loading="lazy">
                </div>`
             ).join('')}
           </div>
         </div>`
      : '';

    panel.innerHTML = `
      <div class="fp-main-wrap">
        <div class="floorplan-img">${mainImgHtml}${statusHtml}</div>
        <div class="floorplan-info">
          ${info.subtitle  ? `<p class="fp-subtitle">${info.subtitle}</p>`   : ''}
          ${info.highlight ? `<p class="fp-highlight">${info.highlight}</p>` : ''}
          ${detailsHtml}
          ${info.priceBig  ? `<p class="fp-price-big">${info.priceBig}</p>`  : ''}
          ${info.footnote  ? `<p class="fp-footnote">${info.footnote}</p>`   : ''}
        </div>
      </div>
      ${galleryHtml}
    `;
    content.appendChild(panel);
  });

  initFpLightbox();
}

/* ──────────────────────────────────────────
   평면도 갤러리 라이트박스
────────────────────────────────────────── */
function initFpLightbox() {
  // 오버레이 생성 (1회)
  const lb = document.createElement('div');
  lb.id        = 'fpLightbox';
  lb.className = 'fp-lightbox';
  lb.setAttribute('aria-hidden', 'true');
  lb.innerHTML = `
    <div class="fp-lb-backdrop"></div>
    <button class="fp-lb-close" aria-label="닫기">✕</button>
    <div class="fp-lb-img-wrap">
      <img class="fp-lb-img" src="" alt="확대 이미지">
    </div>
  `;
  document.body.appendChild(lb);

  const lbImg = lb.querySelector('.fp-lb-img');

  function openLb(src) {
    lbImg.src = src;
    lb.classList.add('open');
    lb.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
  }

  function closeLb() {
    lb.classList.remove('open');
    lb.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  }

  lb.querySelector('.fp-lb-backdrop').addEventListener('click', closeLb);
  lb.querySelector('.fp-lb-close').addEventListener('click', closeLb);
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeLb(); });

  // 갤러리 이미지에 클릭 이벤트 부착
  document.querySelectorAll('.fp-gallery-item img').forEach(img => {
    img.style.cursor = 'zoom-in';
    img.addEventListener('click', () => openLb(img.src));
  });
}

/* ──────────────────────────────────────────
   FAQ 아코디언
────────────────────────────────────────── */
function initFAQ() {
  const accordion = el('faqAccordion');

  CONFIG.faqs.forEach((faq, idx) => {
    const item = document.createElement('div');
    item.className = 'accordion-item';

    const qBtn = document.createElement('button');
    qBtn.className = 'accordion-q';
    qBtn.type      = 'button';
    qBtn.setAttribute('aria-expanded', 'false');
    qBtn.setAttribute('aria-controls', `faq-a-${idx}`);
    qBtn.innerHTML = `
      <span class="q-prefix" aria-hidden="true">Q</span>
      <span class="q-text">${faq.q}</span>
      <span class="q-arrow" aria-hidden="true">▼</span>
    `;

    const aDiv = document.createElement('div');
    aDiv.className = 'accordion-a';
    aDiv.id        = `faq-a-${idx}`;
    aDiv.setAttribute('role', 'region');
    aDiv.innerHTML = `<p>${faq.a}</p>`;

    item.appendChild(qBtn);
    item.appendChild(aDiv);
    accordion.appendChild(item);

    qBtn.addEventListener('click', () => {
      const isOpen = item.classList.contains('open');
      // 다른 항목 닫기
      qsa('.accordion-item.open').forEach(openItem => {
        openItem.classList.remove('open');
        openItem.querySelector('.accordion-q').setAttribute('aria-expanded', 'false');
      });
      if (!isOpen) {
        item.classList.add('open');
        qBtn.setAttribute('aria-expanded', 'true');
      }
    });
  });
}

/* ──────────────────────────────────────────
   리드(신청) 전송 — 솔라피 발송 서버로 POST
   - CONFIG.api.leadEndpoint 없으면 전송 생략(true 반환)
   - 성공: 서버가 2xx 응답
────────────────────────────────────────── */
async function submitLead(payload) {
  const endpoint = (CONFIG.api && CONFIG.api.leadEndpoint || '').trim();
  if (!endpoint) return { ok: true, skipped: true };

  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...payload,
        page: location.href,
        ts:   new Date().toISOString(),
      }),
    });
    return { ok: res.ok };
  } catch (e) {
    return { ok: false, error: String(e) };
  }
}

/* 버튼 로딩 상태 토글 */
function setSubmitting(btn, on, labelWhenIdle) {
  if (!btn) return;
  btn.disabled = on;
  btn.textContent = on ? '전송 중…' : labelWhenIdle;
}

/* ──────────────────────────────────────────
   빠른 문의 카드 (히어로 아래)
────────────────────────────────────────── */
function initQuickForm() {
  const form = el('quickForm');
  if (!form) return;

  const name   = el('qfName');
  const p1     = el('qfPhone1');
  const p2     = el('qfPhone2');
  const p3     = el('qfPhone3');
  const agree  = el('qfAgree');
  const toggle = el('qfTermsToggle');
  const box    = el('qfTermsBox');

  bindPhoneInputs(p1, p2, p3);

  toggle.addEventListener('click', () => {
    const hidden = box.hasAttribute('hidden');
    if (hidden) { box.removeAttribute('hidden'); toggle.textContent = '닫기'; toggle.setAttribute('aria-expanded', 'true'); }
    else        { box.setAttribute('hidden', ''); toggle.textContent = '보기'; toggle.setAttribute('aria-expanded', 'false'); }
  });

  const submitBtn  = el('qfSubmit');
  const idleLabel  = (CONFIG.quickForm && CONFIG.quickForm.submitLabel) || submitBtn.textContent;

  form.addEventListener('submit', async e => {
    e.preventDefault();

    if (!name.value.trim()) { alert('성함을 입력해주세요.'); name.focus(); return; }
    const digits = p1.value.trim() + p2.value.trim() + p3.value.trim();
    if (digits.length < 9) { alert('연락처를 정확히 입력해주세요.'); p1.focus(); return; }
    if (!agree.checked) { alert('개인정보 수집·이용에 동의해주세요.'); agree.focus(); return; }

    setSubmitting(submitBtn, true, idleLabel);
    const result = await submitLead({
      source:  'quickForm',
      name:    name.value.trim(),
      phone:   digits,
      agree:   true,
      company: (form.querySelector('[name="company"]') || {}).value || '',
    });
    setSubmitting(submitBtn, false, idleLabel);

    if (!result.ok) {
      alert('전송 중 오류가 발생했습니다. 잠시 후 다시 시도하시거나 1844-1588로 문의해주세요.');
      return;
    }

    alert('신청이 완료되었습니다.\n모델하우스 위치 안내를 곧 보내드리겠습니다.');
    form.reset();

    const target = (CONFIG.quickForm && CONFIG.quickForm.scrollTo)
      ? document.querySelector(CONFIG.quickForm.scrollTo) : null;
    if (target) target.scrollIntoView({ behavior: 'smooth' });
  });
}

/* ──────────────────────────────────────────
   상담 신청 폼
────────────────────────────────────────── */
function initContactForm() {
  const form   = el('contactForm');
  const phone1 = el('phone1');
  const phone2 = el('phone2');
  const phone3 = el('phone3');

  // 숫자만 입력 + 자동 포커스 이동
  phone1.addEventListener('input', () => {
    phone1.value = phone1.value.replace(/\D/g, '');
    if (phone1.value.length >= 3) phone2.focus();
  });
  phone2.addEventListener('input', () => {
    phone2.value = phone2.value.replace(/\D/g, '');
    if (phone2.value.length >= 4) phone3.focus();
  });
  phone3.addEventListener('input', () => {
    phone3.value = phone3.value.replace(/\D/g, '');
  });

  const submitBtn = form.querySelector('.btn-submit');
  const idleLabel = submitBtn ? submitBtn.textContent : '상담 신청하기';

  form.addEventListener('submit', async e => {
    e.preventDefault();

    const name  = el('inputName').value.trim();
    const p1    = phone1.value.trim();
    const p2    = phone2.value.trim();
    const p3    = phone3.value.trim();
    const agree = el('agreeAll').checked;

    if (!name) {
      alert('성함을 입력해주세요.');
      el('inputName').focus();
      return;
    }
    if (!p1 || !p2 || !p3 || (p1 + p2 + p3).length < 9) {
      alert('연락처를 정확히 입력해주세요.');
      phone1.focus();
      return;
    }
    if (!agree) {
      alert('개인정보 수집·이용에 동의해주세요.');
      el('agreeAll').focus();
      return;
    }

    setSubmitting(submitBtn, true, idleLabel);
    const result = await submitLead({
      source:    'contactForm',
      name:      name,
      phone:     p1 + p2 + p3,
      visitDate: el('visitDate') ? el('visitDate').value : '',
      visitTime: el('visitTime') ? el('visitTime').value : '',
      message:   el('message')   ? el('message').value.trim() : '',
      agree:     true,
      company:   (form.querySelector('[name="company"]') || {}).value || '',
    });
    setSubmitting(submitBtn, false, idleLabel);

    if (!result.ok) {
      alert('전송 중 오류가 발생했습니다. 잠시 후 다시 시도하시거나 1844-1588로 문의해주세요.');
      return;
    }

    alert(`상담 신청이 완료되었습니다.\n담당자가 ${p1}-${p2}-${p3}으로 빠르게 연락드리겠습니다.`);
    form.reset();
  });
}

/* ──────────────────────────────────────────
   약관 토글
────────────────────────────────────────── */
function initTermsToggle() {
  const btn = el('termsToggle');
  const box = el('termsBox');

  btn.addEventListener('click', () => {
    const isHidden = box.hasAttribute('hidden');
    if (isHidden) {
      box.removeAttribute('hidden');
      btn.textContent = '내용 닫기 ▴';
      btn.setAttribute('aria-expanded', 'true');
    } else {
      box.setAttribute('hidden', '');
      btn.textContent = '내용 보기 ▾';
      btn.setAttribute('aria-expanded', 'false');
    }
  });
}

/* ──────────────────────────────────────────
   스크롤 효과
────────────────────────────────────────── */
function initScrollEffects() {
  const nav       = el('navHeader');
  const floating  = el('floatingSide');
  const bottomBar = el('bottomBar');
  const bbNotice  = el('bottomBarNotice');

  const onScroll = () => {
    const y       = window.scrollY;
    const scrolled = y > 100;
    nav.classList.toggle('visible',  scrolled);
    nav.classList.toggle('scrolled', y > 60);
    bottomBar.classList.toggle('visible', scrolled);
    if (bbNotice) bbNotice.classList.toggle('visible', scrolled);
    floating.classList.toggle('visible', y > 400);
  };

  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll(); // 초기 실행
}

/* ──────────────────────────────────────────
   히어로 슬라이더
────────────────────────────────────────── */
function initHeroSlider() {
  const track  = el('heroTrack');
  const images = (CONFIG.hero.images || []).filter(Boolean);
  const count  = images.length > 0 ? images.length : 2;

  /* ── 슬라이드 생성 ── */
  for (let i = 0; i < count; i++) {
    const slide = document.createElement('div');
    slide.className = 'hero-slide';

    if (images[i]) {
      const img = document.createElement('img');
      img.alt      = `히어로 슬라이드 ${i + 1}`;
      img.loading  = i === 0 ? 'eager' : 'lazy';
      img.decoding = 'async';
      if (i === 0) img.fetchPriority = 'high';
      img.src      = images[i];
      slide.appendChild(img);
    } else {
      const bg = document.createElement('div');
      bg.className   = 'hero-slide-bg';
      bg.textContent = `SLIDE ${i + 1}`;
      slide.appendChild(bg);
    }

    const overlay = document.createElement('div');
    overlay.className = 'hero-slide-overlay';
    slide.appendChild(overlay);
    track.appendChild(slide);
  }

  /* ── 페이드 전환 ── */
  const slides = Array.from(track.querySelectorAll('.hero-slide'));
  let current = 0;

  function showSlide(index) {
    current = ((index % count) + count) % count;
    slides.forEach((s, i) => s.classList.toggle('active', i === current));
  }

  function nextSlide() {
    showSlide(current + 1);
  }

  showSlide(0);
  setInterval(nextSlide, 3000);
}

/* ──────────────────────────────────────────
   혜택 안내 팝업
────────────────────────────────────────── */
function initPopup() {
  const overlay = document.getElementById('popupOverlay');
  if (!overlay) return;

  const cfg = CONFIG.popup || {};
  const HIDE_KEY = 'hs_popup_hide_until';

  // 비활성이거나 '오늘 하루 보지 않기' 기간 내면 제거
  let hideUntil = 0;
  try { hideUntil = parseInt(localStorage.getItem(HIDE_KEY) || '0', 10) || 0; } catch (e) {}
  if (!cfg.enabled || Date.now() < hideUntil) {
    overlay.remove();
    return;
  }

  const img  = document.getElementById('popupImg');
  const link = document.getElementById('popupLink');
  if (cfg.image && img) img.src = cfg.image;
  if (link) {
    if (cfg.link) {
      link.setAttribute('href', cfg.link);
    } else {
      link.removeAttribute('href');
      link.style.cursor = 'default';
    }
  }

  function closePopup() {
    overlay.classList.add('hidden');
    overlay.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  }
  function hideToday() {
    try {
      const midnight = new Date();
      midnight.setHours(24, 0, 0, 0);          // 다음 자정까지
      localStorage.setItem(HIDE_KEY, String(midnight.getTime()));
    } catch (e) {}
    closePopup();
  }

  document.getElementById('popupClose').addEventListener('click', closePopup);
  document.getElementById('popupCloseBtn').addEventListener('click', closePopup);
  document.getElementById('popupHideToday').addEventListener('click', hideToday);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) closePopup(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closePopup(); });
  if (link) link.addEventListener('click', () => { if (link.getAttribute('href')) closePopup(); });

  overlay.classList.remove('hidden');
  overlay.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';
}

/* ──────────────────────────────────────────
   유틸
────────────────────────────────────────── */
const el  = id  => document.getElementById(id);
const qs  = sel => document.querySelector(sel);
const qsa = sel => document.querySelectorAll(sel);

function setHref(id, href) {
  const node = el(id);
  if (node) node.href = href;
}

function setText(id, text) {
  const node = el(id);
  if (node && text != null) node.textContent = text;
}

/* 연락처 3분할 입력: 숫자만 + 자동 포커스 이동 */
function bindPhoneInputs(p1, p2, p3) {
  p1.addEventListener('input', () => {
    p1.value = p1.value.replace(/\D/g, '');
    if (p1.value.length >= 3) p2.focus();
  });
  p2.addEventListener('input', () => {
    p2.value = p2.value.replace(/\D/g, '');
    if (p2.value.length >= 4) p3.focus();
  });
  p3.addEventListener('input', () => {
    p3.value = p3.value.replace(/\D/g, '');
  });
}
