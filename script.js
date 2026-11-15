(() => {
  'use strict';

  /* ---------- Данные ---------- */
  const SESSION_SECONDS = 600; // 10 минут
  const FIELDS = [
    ['Серия и номер', '00 00 000000'], ['Дата выдачи', 'ДД.ММ.ГГ'], ['Код подразделения', '000-000'],
    ['Кем выдан', 'Как в паспорте'], ['ФИО', 'Ваше ФИО'], ['Дата рождения', 'ДД.ММ.ГГ'],
    ['Место рождения', 'Как в паспорте'], ['Адрес регистрации', 'Город, улица, дом']
  ];
  const MANUAL_FIELDS = [
    ['Пол', 'Женский / Мужской'], ['Гражданство', 'Российская Федерация'], ['Регион и город', 'Начните вводить'],
    ['Улица, дом, квартира', 'Как в прописке'], ['Индекс', '000000'], ['Телефон', '+7 000 000-00-00'],
    ['Электронная почта', 'mail@example.ru'], ['СНИЛС', '000-000-000 00'], ['ИНН', '12 цифр'],
    ['Работодатель', 'Название организации'], ['Средний доход в месяц', '₽']
  ];
  const STEPS = [
    ['Вход', 'Логин и пароль от Госуслуг', 'Госуслуги'],
    ['Код из СМС', 'Подтверждаете, что это вы', 'Госуслуги'],
    ['Проверка', 'Перепроверьте нас', 'Сравни'],
    ['Согласия', 'Коротко и простыми словами', 'Сравни'],
    ['Обратно в анкету', 'На то же место, поля заполнены', 'Сравни']
  ];
  const ICONS = {
    person: 'M20 21a8 8 0 0 0-16 0M12 13a5 5 0 1 0 0-10 5 5 0 0 0 0 10z',
    passport: 'M3 5h18v14H3zM7 9h4M7 13h6M15 9h2',
    home: 'M3 11l9-7 9 7M5 10v10h14V10',
    phone: 'M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2',
    doc: 'M6 3h9l4 4v14H6zM14 3v5h5M9 13h6M9 17h6',
    income: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM12 7v10M9 10h4.5a1.5 1.5 0 0 1 0 3H9'
  };
  const GROUPS = [
    { t: 'Личные данные', src: 'Госуслуги', icon: 'person', rows: [
      ['fio', 'ФИО', 'Антонихина Мария Витальевна'], ['bday', 'Дата рождения', '12.04.1994'],
      ['bplace', 'Место рождения', 'г. Москва'], ['sex', 'Пол', 'Женский'], ['cit', 'Гражданство', 'Российская Федерация']] },
    { t: 'Паспорт', src: 'МВД', icon: 'passport', rows: [
      ['series', 'Серия и номер', '45 00 123456'], ['issued', 'Дата выдачи', '20.05.2014'],
      ['by', 'Кем выдан', 'ГУ МВД России по г. Москве'], ['code', 'Код подразделения', '770-001']] },
    { t: 'Адрес регистрации', src: 'МВД', icon: 'home', rows: [
      ['city', 'Регион и город', 'г. Москва'], ['street', 'Улица, дом, квартира', 'ул. Примерная, д. 1, кв. 1'], ['zip', 'Индекс', '101000']] },
    { t: 'Контакты', src: 'Госуслуги', icon: 'phone', rows: [
      ['tel', 'Телефон', '+7 900 000-00-00'], ['mail', 'Электронная почта', 'mail@example.ru']] },
    { t: 'Документы', src: 'СФР, ФНС', icon: 'doc', rows: [
      ['snils', 'СНИЛС', '000-000-000 00'], ['inn', 'ИНН', '770000000000']] },
    { t: 'Работа и доход', src: 'СФР', icon: 'income', rows: [
      ['job', 'Работодатель', 'ООО «Пример»'], ['income', 'Средний доход', '180 000 ₽ в месяц'], ['period', 'Период', 'За последние 12 месяцев']] }
  ];
  const ORIGINAL = {};
  GROUPS.forEach(g => g.rows.forEach(([k, , v]) => { ORIGINAL[k] = v; }));
  const TOTAL = Object.keys(ORIGINAL).length;

  /* ---------- Состояние ---------- */
  const state = {
    screen: 'form',
    data: { ...ORIGINAL },
    editing: false,
    session: false,
    closed: false,
    left: SESSION_SECONDS,
    showAll: false
  };
  let timers = [];

  /* ---------- Утилиты ---------- */
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const svgPath = d => `<svg viewBox="0 0 24 24"><path d="${d}"/></svg>`;
  const plural = (n, one, few, many) => {
    const m10 = n % 10, m100 = n % 100;
    if (m10 === 1 && m100 !== 11) return one;
    if (m10 >= 2 && m10 <= 4 && (m100 < 10 || m100 >= 20)) return few;
    return many;
  };

  /* ---------- Отрисовка статичных списков ---------- */
  $('#formFields').innerHTML = FIELDS.map(([label, ph], i) =>
    `<label class="field" for="f${i}">${esc(label)}<input id="f${i}" type="text" placeholder="${esc(ph)}" autocomplete="off"></label>`).join('');

  $('#manualFields').innerHTML = MANUAL_FIELDS.map(([label, ph], i) =>
    `<label class="field" for="m${i}">${esc(label)}<input id="m${i}" type="text" placeholder="${esc(ph)}" autocomplete="off"></label>`).join('');

  $('#steps').innerHTML = STEPS.map(([t, d, w], i) => {
    const last = i === STEPS.length - 1;
    return `<li><div class="steps__rail"><span class="steps__num">${i + 1}</span>${last ? '' : '<span class="steps__line"></span>'}</div>
      <div class="steps__body"><div class="steps__top"><b>${t}</b><span>${w}</span></div><span>${d}</span></div></li>`;
  }).join('');

  $$('[data-total]').forEach(el => { el.textContent = `${TOTAL} ${plural(TOTAL, 'поле', 'поля', 'полей')}`; });

  function renderGroups() {
    $('#groups').innerHTML = GROUPS.map(g => `
      <section class="card group">
        <div class="group__head"><span class="tile">${svgPath(ICONS[g.icon])}</span><b>${g.t}</b><span>${g.src}</span></div>
        ${g.rows.map(([k, label]) => {
          const v = state.data[k];
          if (state.editing) {
            return `<label class="drow"><small>${esc(label)}</small><input data-key="${k}" value="${esc(v)}"></label>`;
          }
          const changed = v !== ORIGINAL[k] ? '<span class="tag">Изменено</span>' : '';
          return `<div class="drow"><small>${esc(label)}</small><b>${esc(v)}</b>${changed}</div>`;
        }).join('')}
      </section>`).join('');
  }

  function renderDone() {
    const flat = [];
    GROUPS.forEach(g => g.rows.forEach(([k, label]) => flat.push([label, state.data[k]])));
    const row = ([l, v]) => `<div class="drow"><small>${esc(l)}</small><b>${esc(v)}</b></div>`;
    const box = $('#doneRows');
    if (!box.dataset.built || box.dataset.built !== JSON.stringify(state.data)) {
      box.innerHTML = flat.slice(0, 5).map(row).join('') +
        `<div class="collapse more-collapse" id="moreRows" inert><div class="collapse__inner">${flat.slice(5).map(row).join('')}</div></div>`;
      box.dataset.built = JSON.stringify(state.data);
    }
    setCollapse($('#moreRows'), state.showAll);
    const rest = flat.length - 5;
    const btn = $('#toggleAll');
    btn.textContent = state.showAll ? 'Свернуть' : `Ещё ${rest} ${plural(rest, 'поле', 'поля', 'полей')} – показать`;
    btn.setAttribute('aria-expanded', String(state.showAll));
  }

  /* ---------- Навигация ---------- */
  const sheetLayer = $('#sheetLayer');

  function clearTimers() { timers.forEach(clearTimeout); timers = []; }

  function show(name) {
    $$('.screen').forEach(s => s.classList.toggle('is-active', s.dataset.screen === name));
  }

  function go(name) {
    clearTimers();
    if (name === 'sheet') { openSheet(); return; }
    sheetLayer.hidden = true;
    sheetLayer.classList.remove('is-closing');
    state.screen = name;
    show(name);

    const scroller = $(`[data-screen="${name}"] [data-gate]`);
    if (scroller) {
      scroller.scrollTop = 0;
      setReady(scroller.dataset.gate, false);
      requestAnimationFrame(() => checkFit(scroller));
    } else {
      const s = $(`[data-screen="${name}"]`);
      if (s) s.scrollTop = 0;
    }

    if (name === 'check') renderGroups();
    if (name === 'done') { state.showAll = false; renderDone(); }
    if (name === 'sent') { endSession(); runBar('sent', 4000, flashOut); }
    if (name === 'forgot') runBar('forgot', 3000, () => go('offers'));
    if (name === 'sentManual') runBar('sentManual', 3500, () => go('offers'));
  }

  function openSheet() {
    if (state.screen !== 'form' && state.screen !== 'manual2') { state.screen = 'form'; show('form'); }
    sheetLayer.classList.remove('is-closing');
    sheetLayer.hidden = false;
    const sheet = $('.sheet', sheetLayer);
    sheet.scrollTop = 0;
    // перезапуск анимации
    sheet.style.animation = 'none'; void sheet.offsetWidth; sheet.style.animation = '';
    $('[data-go="gos"]', sheetLayer).focus({ preventScroll: true });
    playSteps();
  }

  /* Шаги в шторке загораются по очереди */
  let stepTimers = [];
  function playSteps() {
    stepTimers.forEach(clearTimeout); stepTimers = [];
    const items = $$('#steps li');
    items.forEach(li => li.classList.remove('is-on', 'is-current', 'is-passed'));
    items.forEach((li, i) => {
      stepTimers.push(setTimeout(() => {
        if (i > 0) { items[i - 1].classList.remove('is-current'); items[i - 1].classList.add('is-passed'); }
        li.classList.add('is-on', 'is-current');
      }, 500 + i * 2700));
    });
  }

  function closeSheet() {
    if (sheetLayer.hidden || sheetLayer.classList.contains('is-closing')) return;
    sheetLayer.classList.add('is-closing');
    stepTimers.forEach(clearTimeout); stepTimers = [];
    timers.push(setTimeout(() => { sheetLayer.hidden = true; sheetLayer.classList.remove('is-closing'); }, 390));
  }

  function runBar(name, ms, done) {
    const bar = $(`[data-screen="${name}"] [data-anim]`);
    bar.style.transition = 'none';
    bar.style.width = '4%';
    void bar.offsetWidth;
    bar.style.transition = `width ${ms}ms linear`;
    requestAnimationFrame(() => { bar.style.width = '100%'; });
    timers.push(setTimeout(done, ms + 300));
  }

  /* Сияшка: лампочка сжимается, потом заливает экран белым */
  function flashOut() {
    const app = $('#app');
    const img = $('[data-screen="sent"] .otter__img img');
    const flash = $('#flash');
    const white = $('#whiteout');
    const a = app.getBoundingClientRect();
    const r = img.getBoundingClientRect();
    const nw = img.naturalWidth || 800, nh = img.naturalHeight || 920;
    const s = Math.min(r.width / nw, r.height / nh);
    const x = r.left - a.left + (r.width - nw * s) / 2 + 0.8225 * nw * s;
    const y = r.top - a.top + (r.height - nh * s) / 2 + 0.2674 * nh * s;
    flash.getAnimations().forEach(x => x.cancel());
    white.getAnimations().forEach(x => x.cancel());
    flash.style.left = x + 'px';
    flash.style.top = y + 'px';
    const T = 'translate(-50%, -50%)';
    const grow = Math.ceil(Math.hypot(a.width, a.height) / 110 * 2.4);
    const anim = flash.animate([
      { transform: `${T} scale(1)`, opacity: 0, offset: 0 },
      { transform: `${T} scale(1.15)`, opacity: 1, offset: 0.12 },
      { transform: `${T} scale(.22)`, opacity: 1, offset: 0.42 },
      { transform: `${T} scale(.22)`, opacity: 1, offset: 0.5 },
      { transform: `${T} scale(${grow})`, opacity: 1, offset: 1 }
    ], { duration: 1700, easing: 'cubic-bezier(.55, 0, .45, 1)', fill: 'forwards' });
    white.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 350, delay: 1450, fill: 'forwards' });
    timers.push(setTimeout(() => {
      go('forgot');
      flash.getAnimations().forEach(x => x.cancel());
      white.getAnimations().forEach(x => x.cancel());
      white.style.opacity = '1';
      white.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 700, easing: 'ease-out' }).finished.then(() => { white.style.opacity = '0'; });
    }, 1900));
    return anim;
  }

  function reset() {
    state.data = { ...ORIGINAL };
    state.editing = false;
    state.session = false;
    state.closed = false;
    state.left = SESSION_SECONDS;
    $$('#formFields input').forEach(i => { i.value = ''; });
    setCollapse($('#perks'), false);
    $('#perksToggle').setAttribute('aria-expanded', 'false');
    $('[data-perks-label]').textContent = 'показать';
    $$('.acc').forEach(a => setAcc(a, false));
    const sw = $('.switch'); sw.setAttribute('aria-checked', 'false');
    $('#agree').checked = false;
    $$('#manualFields input').forEach(i => { i.value = ''; });
    setEditMode(false);
    paintSession();
    go('form');
  }

  /* ---------- Кнопки, которые белеют после прокрутки ---------- */
  const ready = { check: false, consent: false, done: false };

  function setReady(key, value) {
    ready[key] = value;
    paintGates();
  }

  function paintGates() {
    $$('[data-gated]').forEach(btn => {
      const key = btn.dataset.gated;
      let ok = ready[key];
      if (key === 'consent') ok = ok && $('#agree').checked;
      btn.classList.toggle('is-ready', ok);
      btn.setAttribute('aria-disabled', String(!ok));
      btn.title = ok ? '' : (key === 'consent' && ready[key] ? 'Отметьте согласие' : 'Пролистайте до конца');
    });
  }

  function atBottom(el) { return el.scrollTop + el.clientHeight >= el.scrollHeight - 24; }
  function checkFit(el) { if (atBottom(el)) setReady(el.dataset.gate, true); }

  $$('[data-gate]').forEach(el => {
    el.addEventListener('scroll', () => { if (!ready[el.dataset.gate] && atBottom(el)) setReady(el.dataset.gate, true); }, { passive: true });
  });

  $$('[data-gated]').forEach(btn => {
    btn.addEventListener('click', () => {
      const key = btn.dataset.gated;
      if (btn.classList.contains('is-ready')) { go(btn.dataset.next); return; }
      if (!ready[key]) {
        const el = $(`[data-gate="${key}"]`);
        el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
      }
    });
  });

  /* ---------- Таймер сеанса ---------- */
  function startSession() {
    state.session = true;
    state.closed = false;
    state.left = SESSION_SECONDS;
    paintSession();
  }
  function endSession() {
    if (!state.session) return;
    state.closed = true;
    paintSession();
  }
  function paintSession() {
    const mm = Math.floor(state.left / 60);
    const ss = String(state.left % 60).padStart(2, '0');
    $$('[data-clock]').forEach(el => { el.textContent = `${mm}:${ss}`; });
    $$('[data-bar]').forEach(el => { el.style.width = `${(state.left / SESSION_SECONDS) * 100}%`; });
    $$('[data-live]').forEach(el => { el.hidden = state.closed; });
    $$('[data-closed]').forEach(el => { el.hidden = !state.closed; });
  }
  setInterval(() => {
    if (!state.session || state.closed) return;
    state.left = Math.max(0, state.left - 1);
    if (state.left === 0) state.closed = true;
    paintSession();
  }, 1000);

  /* ---------- Режим исправления ---------- */
  function setEditMode(on) {
    state.editing = on;
    $('#checkView').hidden = on;
    $('#checkEdit').hidden = !on;
    renderGroups();
  }
  $('#startEdit').addEventListener('click', () => {
    setEditMode(true);
    const first = $('#groups input');
    if (first) first.focus();
  });
  $('#saveEdit').addEventListener('click', () => {
    $$('#groups input[data-key]').forEach(i => { state.data[i.dataset.key] = i.value.trim() || ORIGINAL[i.dataset.key]; });
    setEditMode(false);
  });
  $('#cancelEdit').addEventListener('click', () => setEditMode(false));

  /* ---------- Аккордеоны и переключатели ---------- */
  function setCollapse(el, open) {
    el.classList.toggle('is-open', open);
    if (open) el.removeAttribute('inert'); else el.setAttribute('inert', '');
  }
  function setAcc(acc, open) {
    const head = $('.acc__head', acc);
    head.setAttribute('aria-expanded', String(open));
    setCollapse($('.collapse', acc), open);
    const count = $('.acc__count', acc);
    const n = $$('.acc__panel > a', acc).length;
    count.textContent = open ? 'скрыть документы' : `${n} ${plural(n, 'документ', 'документа', 'документов')} – показать`;
  }
  $$('.acc').forEach(acc => {
    $('.acc__head', acc).addEventListener('click', () => {
      setAcc(acc, $('.acc__head', acc).getAttribute('aria-expanded') !== 'true');
    });
  });

  $('.switch').addEventListener('click', e => {
    const sw = e.currentTarget;
    sw.setAttribute('aria-checked', String(sw.getAttribute('aria-checked') !== 'true'));
  });

  $('#agree').addEventListener('change', paintGates);

  $('#perksToggle').addEventListener('click', e => {
    const btn = e.currentTarget;
    const open = btn.getAttribute('aria-expanded') !== 'true';
    btn.setAttribute('aria-expanded', String(open));
    setCollapse($('#perks'), open);
    $('[data-perks-label]').textContent = open ? 'скрыть' : 'показать';
  });

  $('#toggleAll').addEventListener('click', () => { state.showAll = !state.showAll; renderDone(); });

  /* ---------- Общие обработчики ---------- */
  document.addEventListener('click', e => {
    const goBtn = e.target.closest('[data-go]');
    if (goBtn) { go(goBtn.dataset.go); return; }
    if (e.target.closest('[data-close-sheet]')) { closeSheet(); return; }
    if (e.target.closest('[data-end]')) endSession();
  });
  $('#loginOk').addEventListener('click', () => { startSession(); setEditMode(false); go('check'); });

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && !sheetLayer.hidden) closeSheet();
  });

  window.addEventListener('resize', () => {
    const el = $(`[data-screen="${state.screen}"] [data-gate]`);
    if (el) checkFit(el);
  });

  /* ---------- Главная с предложениями ---------- */
  const OFFERS = [
    { n: 'Банк-партнёр А', l: 'А', c: 'linear-gradient(180deg,#FF6B5A,#E8382B)', sum: 'до 1 млн ₽', rate: 'от 19,9%', pay: '~26 400 ₽', tags: ['Без залога', 'Досрочно без штрафов'], badge: 'Высокий шанс', k: ['cash'] },
    { n: 'Банк-партнёр Б', l: 'Б', c: 'linear-gradient(180deg,#FFD84D,#F2B705)', sum: 'до 800 тыс. ₽', rate: 'от 21,5%', pay: '~21 900 ₽', tags: ['Без справки о доходах'], badge: '', k: ['cash', 'nocert'] },
    { n: 'Банк-партнёр В', l: 'В', c: 'linear-gradient(180deg,#5AA9FF,#1F6FE5)', sum: 'до 1,5 млн ₽', rate: 'от 18,4%', pay: '~38 200 ₽', tags: ['Рефинансирование', 'Онлайн'], badge: '', k: ['refi'] }
  ];
  function renderOffers(filter) {
    const list = OFFERS.filter(o => filter === 'all' || o.k.includes(filter));
    $('#offers').innerHTML = list.map((o, i) => `
      <article class="offer" style="animation-delay:${i * 80}ms">
        <div class="offer__head"><span class="offer__logo" style="background:${o.c}">${o.l}</span><div><b>${o.n}</b><small>Кредит наличными</small></div>${o.badge ? `<span class="offer__badge">${o.badge}</span>` : ''}</div>
        <div class="offer__grid"><div><small>Сумма</small><b>${o.sum}</b></div><div><small>Ставка</small><b>${o.rate}</b></div><div><small>Платёж/мес</small><b>${o.pay}</b></div></div>
        <div class="offer__tags">${o.tags.map(t => `<span>${t}</span>`).join('')}</div>
        <div class="offer__actions"><button class="btn btn--secondary" type="button">Подробнее</button><button class="btn btn--primary" type="button">Оформить</button></div>
      </article>`).join('');
    nbspify($('#offers'));
  }
  const FILTERS = ['all', 'cash', 'nocert', 'refi'];
  $$('.fchip').forEach((chip, i) => {
    chip.addEventListener('click', () => {
      $$('.fchip').forEach(c => { c.classList.remove('is-active'); c.setAttribute('aria-selected', 'false'); });
      chip.classList.add('is-active'); chip.setAttribute('aria-selected', 'true');
      renderOffers(FILTERS[i]);
    });
  });
  renderOffers('all');
  document.addEventListener('click', e => {
    if (e.target.closest('[data-restart]')) reset();
    if (e.target.closest('[data-noop]')) e.preventDefault();
  });

  /* ---------- Типографика: короткие слова не висят в конце строки ---------- */
  function nbspify(root) {
    const re = /(^|[\s(«])(в|во|к|ко|с|со|и|а|о|об|у|я|на|по|за|от|до|из|не|ни|без|для|при|под|над|про|или|но|же|что|как|это|все|ещё)\s+/gi;
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode: n => (n.parentElement && n.parentElement.closest('script,style,input,textarea')) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT
    });
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach(n => {
      const v = n.nodeValue.replace(re, '$1$2\u00A0').replace(re, '$1$2\u00A0');
      if (v !== n.nodeValue) n.nodeValue = v;
    });
  }
  nbspify($('#app'));

  /* ---------- Старт ---------- */
  paintSession();
  go('form');
})();
