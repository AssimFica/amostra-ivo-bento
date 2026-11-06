/* Ivo Bento Premium Studio — o movimento do website (GSAP + ScrollTrigger + SplitText + Lenis). */
(() => {
  const q = s => document.querySelector(s), qa = s => [...document.querySelectorAll(s)];
  const reduz = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const intro = q('#intro');
  const tiraIntro = () => { if (intro) intro.remove(); };

  // ---------- o horário e as contagens funcionam mesmo sem animações ----------
  const HORARIO = [
    [1, '18:00', 'CrossTraining'], [1, '19:00', 'CrossTraining'], [1, '19:50', 'CrossTraining'],
    [2, '12:45', 'CrossTraining'], [2, '19:00', 'CrossTraining'], [2, '20:00', 'Pilates Clínico'],
    [3, '19:00', 'CrossTraining'], [3, '19:15', 'Running Club'], [3, '19:50', 'CrossTraining'],
    [4, '12:45', 'CrossTraining'], [4, '19:00', 'CrossTraining'], [4, '19:50', 'CrossTraining'],
    [5, '07:00', 'CrossTraining'], [5, '19:00', 'CrossTraining'], [5, '20:00', 'Pilates Clínico'],
    [6, '09:00', 'CrossTraining'], [6, '10:00', 'CrossKids'], [6, '11:00', 'Pilates Clínico'],
  ];
  const TAG = { 'CrossTraining': 'Grupo · ao teu ritmo', 'Pilates Clínico': 'Postura e core', 'CrossKids': 'Para crianças', 'Running Club': 'Ao ar livre' };
  const DIAS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
  const p2 = n => String(n).padStart(2, '0');
  // o LED: cada dígito numa célula fixa, por cima do «8» apagado
  const celulas = txt => [...txt].map(c => '<span class="' + (c === ':' ? 's' : 'd') + '">' + c + '</span>').join('');
  const led = (el, txt) => {
    if (!el) return; if (el.dataset.v === txt) return; el.dataset.v = txt;
    el.innerHTML = celulas(txt);
    const f = el.parentElement && el.parentElement.querySelector('.led-fundo');
    if (f) { const g = txt.replace(/[0-9A-Za-z]/g, '8'); if (f.dataset.v !== g) { f.dataset.v = g; f.innerHTML = celulas(g); } }
  };
  document.querySelectorAll('.led-num').forEach(e => led(e, e.textContent.trim()));
  const minutos = h => { const [a, b] = h.split(':').map(Number); return a * 60 + b; };

  const agora = () => new Date();
  let diaSel = agora().getDay() || 1;

  function proxima() {
    const n = agora(), base = new Date(n); base.setSeconds(0, 0);
    for (let d = 0; d < 8; d++) {
      const dia = new Date(n); dia.setDate(n.getDate() + d);
      const lista = HORARIO.filter(a => a[0] === dia.getDay()).sort((x, y) => minutos(x[1]) - minutos(y[1]));
      for (const a of lista) {
        const [h, m] = a[1].split(':').map(Number);
        const t = new Date(dia); t.setHours(h, m, 0, 0);
        if (t > n) return { quando: t, aula: a };
      }
    }
    return null;
  }

  function desenhaDias() {
    const caixa = q('#dias'); if (!caixa) return;
    caixa.textContent = '';
    const hoje = agora().getDay();
    for (let d = 1; d <= 6; d++) {
      const b = document.createElement('button');
      b.type = 'button'; b.setAttribute('role', 'tab'); b.setAttribute('aria-selected', String(d === diaSel));
      b.textContent = DIAS[d];
      if (d === hoje) { const s = document.createElement('span'); s.className = 'hoje'; s.textContent = '· hoje'; b.append(s); }
      b.addEventListener('click', () => { diaSel = d; desenhaDias(); desenhaAulas(true); });
      caixa.append(b);
    }
  }
  function desenhaAulas(animar) {
    const ol = q('#aulas'); if (!ol) return;
    ol.textContent = '';
    const n = agora(), hoje = n.getDay(), minAgora = n.getHours() * 60 + n.getMinutes();
    const prox = proxima();
    for (const a of HORARIO.filter(x => x[0] === diaSel)) {
      const li = document.createElement('li');
      const ledEl = document.createElement('div'); ledEl.className = 'led';
      const f = document.createElement('span'); f.className = 'led-fundo'; f.textContent = '88:88';
      const v = document.createElement('span'); v.className = 'led-num';
      ledEl.append(f, v); led(v, a[1]);
      const b = document.createElement('b'); b.textContent = a[2];
      const t = document.createElement('span'); t.className = 'tag'; t.textContent = TAG[a[2]] || '';
      if (diaSel === hoje && minutos(a[1]) + 50 <= minAgora) { li.classList.add('ja'); t.textContent = 'Já foi'; }
      if (prox && prox.aula === a) { li.classList.add('agora'); t.textContent = 'A próxima'; }
      li.append(ledEl, b, t); ol.append(li);
    }
    if (animar && window.gsap && !reduz) gsap.from('#aulas li', { y: 24, opacity: 0, duration: .5, stagger: .06, ease: 'power3.out' });
  }
  function relogios() {
    const p = proxima();
    if (p && q('#prox-t')) {
      const s = Math.max(0, Math.floor((p.quando - agora()) / 1000));
      led(q('#prox-t'), p2(Math.floor(s / 3600)) + ':' + p2(Math.floor(s / 60) % 60) + ':' + p2(s % 60));
      const d = p.quando.getDay() === agora().getDay() ? 'hoje' : DIAS[p.quando.getDay()].toLowerCase();
      q('#prox-nome').textContent = p.aula[2] + ', ' + d + ' às ' + p.aula[1];
    }
    // Chestnut Burn: 14 de novembro de 2026, 14:30
    const alvo = new Date(2026, 10, 14, 14, 30, 0);
    const r = Math.max(0, Math.floor((alvo - agora()) / 1000));
    if (q('#c-d')) {
      led(q('#c-d'), p2(Math.floor(r / 86400))); led(q('#c-h'), p2(Math.floor(r / 3600) % 24));
      led(q('#c-m'), p2(Math.floor(r / 60) % 60)); led(q('#c-s'), p2(r % 60));
    }
  }
  desenhaDias(); desenhaAulas(false); relogios(); setInterval(relogios, 1000);

  // ---------- o menu do telemóvel ----------
  const mb = q('#menu-btn'), nav = q('#nav');
  mb && mb.addEventListener('click', () => { const ab = mb.getAttribute('aria-expanded') !== 'true'; mb.setAttribute('aria-expanded', String(ab)); nav.classList.toggle('aberta', ab); });

  if (!window.gsap || !window.ScrollTrigger) { tiraIntro(); return; }
  gsap.registerPlugin(ScrollTrigger); if (window.SplitText) gsap.registerPlugin(SplitText);

  // ---------- scroll suave ----------
  let lenis = null;
  if (!reduz && window.Lenis) {
    lenis = new Lenis({ lerp: .085, smoothWheel: true, wheelMultiplier: 1 });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add(t => lenis.raf(t * 1000)); gsap.ticker.lagSmoothing(0);
  }
  qa('a[href^="#"]').forEach(a => a.addEventListener('click', e => {
    const alvo = q(a.getAttribute('href')); if (!alvo) return;
    e.preventDefault(); mb && mb.setAttribute('aria-expanded', 'false'); nav && nav.classList.remove('aberta');
    if (lenis) lenis.scrollTo(alvo, { duration: 1.6 }); else alvo.scrollIntoView();
  }));

  // a barra ganha fundo depois da abertura
  ScrollTrigger.create({ trigger: '.mani', start: 'top 80px', onEnter: () => q('#barra').classList.add('cheia'), onLeaveBack: () => q('#barra').classList.remove('cheia') });

  if (reduz) { tiraIntro(); return; }
  const animacoes = () => {

  const parte = (el, tipo) => {
    if (!window.SplitText) return null;
    const alvo = typeof el === 'string' ? q(el) : el; if (!alvo) return null;
    const s = SplitText.create(alvo, { type: tipo === 'chars' ? 'lines,chars' : tipo, mask: 'lines' });
    (s.masks || []).forEach(m => { m.style.padding = '.16em .04em .14em'; m.style.margin = '-.16em -.04em -.14em'; });
    return s;
  };

  // ---------- a entrada: 3, 2, 1 no relógio do estúdio ----------
  const ht1 = parte('#ht1', 'chars'), ht2 = parte('#ht2', 'chars');
  if (ht1 && ht2) gsap.set([ht1.chars, ht2.chars], { yPercent: 110, opacity: 0 });
  gsap.set('#heroi-foto', { opacity: 0 });
  const entra = gsap.timeline({ delay: .15 });
  if (intro) {
    entra.to('#intro-n', { duration: .01, onStart: () => { led(q('#intro-n'), '03'); } })
      .to({}, { duration: .32, onComplete: () => { led(q('#intro-n'), '02'); } })
      .to({}, { duration: .32, onComplete: () => { led(q('#intro-n'), '01'); } })
      .to({}, { duration: .32 })
      .to('#intro', { clipPath: 'inset(0 0 100% 0)', duration: .7, ease: 'expo.inOut', onStart: () => intro.classList.add('fora') })
      .call(tiraIntro);
  }
  entra.to('#heroi-foto', { opacity: 1, duration: .6, ease: 'power2.out' }, intro ? '-=.35' : 0)
    .fromTo('#heroi-foto', { '--m': (Math.min(innerWidth, innerHeight) * .05) + 'px' }, { '--m': (Math.min(innerWidth, innerHeight) * .44) + 'px', duration: 1.1, ease: 'expo.out' }, '<');
  if (ht1 && ht2) entra.to([...ht1.chars, ...ht2.chars], { yPercent: 0, opacity: 1, duration: .9, stagger: .025, ease: 'expo.out' }, '<.1');

  // ---------- 1. o ✕ abre-se até ser o ecrã inteiro ----------
  const foto = q('#heroi-foto'), m = { v: 0 };
  const poeMascara = () => {
    const base = Math.min(innerWidth, innerHeight) * .44, fim = Math.max(innerWidth, innerHeight) * 9;
    foto.style.setProperty('--m', (base + (fim - base) * Math.pow(m.v, 2.4)) + 'px');
    foto.classList.toggle('sem-mascara', m.v > .985);
  };
  const h = gsap.timeline({ scrollTrigger: { trigger: '.heroi', start: 'top top', end: '+=170%', scrub: .7, pin: true, anticipatePin: 1 } });
  h.to(m, { v: 1, duration: 1, ease: 'none', onUpdate: poeMascara }, 0)
    .to('#heroi-foto img', { scale: 1, duration: 1, ease: 'power2.out' }, 0)
    .to('#ht1', { xPercent: -18, yPercent: -60, opacity: 0, duration: .55, ease: 'power2.in' }, .04)
    .to('#ht2', { xPercent: 18, yPercent: 60, opacity: 0, duration: .55, ease: 'power2.in' }, .04)
    .to('#desce', { opacity: 0, duration: .15 }, 0)
    .to('#heroi-escurece', { opacity: 1, duration: .35 }, .62)
    .from('#heroi-fim > *', { y: 50, opacity: 0, duration: .3, stagger: .07, ease: 'power3.out' }, .72);

  // ---------- 2. as fotos juntam-se e uma abre até ao ecrã inteiro ----------
  const palavras = qa('.mp');
  gsap.set(palavras.slice(1), { yPercent: 60, opacity: 0 });
  gsap.set('#mc-centro', { x: 0, y: 0, xPercent: -50, yPercent: -50 });
  const mt = gsap.timeline({ scrollTrigger: { trigger: '.mani', start: 'top top', end: '+=260%', scrub: .8, pin: true, anticipatePin: 1 } });
  const cantos = [['.mc-1', -1, -1], ['.mc-2', 1, -1], ['.mc-3', -1, 1], ['.mc-4', 1, 1]];
  for (const [s, dx, dy] of cantos) mt.fromTo(s, { xPercent: dx * 40, yPercent: dy * 40, rotate: dx * dy * 6, scale: .9 }, { xPercent: dx * -18, yPercent: dy * -14, rotate: 0, scale: 1, duration: .5, ease: 'power2.out' }, 0);
  mt.fromTo('#mc-centro', { scale: .7, rotate: -3 }, { scale: 1, rotate: 0, duration: .45, ease: 'power2.out' }, 0)
    .to(palavras[0], { yPercent: -60, opacity: 0, duration: .14 }, .26)
    .to(palavras[1], { yPercent: 0, opacity: 1, duration: .14 }, .3)
    .to(palavras[1], { yPercent: -60, opacity: 0, duration: .14 }, .52)
    .to(palavras[2], { yPercent: 0, opacity: 1, duration: .14 }, .56);
  for (const [s, dx, dy] of cantos) mt.to(s, { xPercent: dx * 160, yPercent: dy * 120, opacity: 0, duration: .4, ease: 'power2.in' }, .62);
  mt.to('#mc-centro', { width: '100vw', height: '100vh', borderRadius: 0, duration: .5, ease: 'power2.inOut' }, .6)
    .to('#mc-centro img', { scale: 1.08, duration: .5 }, .6);

  // ---------- 3. a frase acende-se palavra a palavra ----------
  if (window.SplitText) {
    const lt = SplitText.create('#leitura', { type: 'words', wordsClass: 'pal' });
    gsap.to(lt.words, { opacity: 1, stagger: .08, ease: 'none', scrollTrigger: { trigger: '.leitura', start: 'top 75%', end: 'bottom 55%', scrub: true } });
  }

  // a faixa anda com o scroll
  gsap.fromTo('#faixa', { xPercent: 0 }, { xPercent: -50, ease: 'none', scrollTrigger: { trigger: '.faixa', start: 'top bottom', end: 'bottom top', scrub: .4 } });

  // ---------- 4. modalidades: o scroll vertical anda para o lado ----------
  const trilho = q('#trilho');
  const dist = () => trilho.scrollWidth - innerWidth;
  const hz = gsap.to(trilho, { x: () => -dist(), ease: 'none', scrollTrigger: {
    trigger: '.mods', start: 'top top', end: () => '+=' + dist(), scrub: .9, pin: true, anticipatePin: 1, invalidateOnRefresh: true,
    onUpdate: s => { q('#mods-prog').style.transform = 'scaleX(' + s.progress.toFixed(4) + ')'; },
  } });
  qa('.mod').forEach(mod => {
    const f = mod.querySelector('.mod-foto'); if (!f) return;
    gsap.fromTo(f.querySelector('img'), { xPercent: -7 }, { xPercent: 7, ease: 'none', scrollTrigger: { trigger: mod, containerAnimation: hz, start: 'left right', end: 'right left', scrub: true } });
    gsap.fromTo(f, { clipPath: 'inset(8% 0% 8% 100% round 12px)' }, { clipPath: 'inset(0% 0% 0% 0% round 12px)', ease: 'power2.out', scrollTrigger: { trigger: mod, containerAnimation: hz, start: 'left 95%', end: 'left 40%', scrub: true } });
    const h3 = mod.querySelector('h3'), sp = h3 && parte(h3, 'lines');
    gsap.from(sp ? sp.lines : h3, { yPercent: 100, ease: 'power3.out', stagger: .1, scrollTrigger: { trigger: mod, containerAnimation: hz, start: 'left 70%', end: 'left 35%', scrub: true } });
    gsap.from(mod.querySelectorAll('.mod-txt p, .horas li'), { y: 30, opacity: 0, stagger: .05, scrollTrigger: { trigger: mod, containerAnimation: hz, start: 'left 60%', end: 'left 30%', scrub: true } });
  });

  // ---------- 5. a voz ----------
  gsap.fromTo('.voz-foto', { yPercent: -8 }, { yPercent: 8, ease: 'none', scrollTrigger: { trigger: '.voz', start: 'top bottom', end: 'bottom top', scrub: true } });
  const vq = parte('#voz-q', 'lines');
  gsap.from(vq ? vq.lines : '#voz-q', { yPercent: 100, stagger: .08, duration: 1, ease: 'expo.out', scrollTrigger: { trigger: '.voz', start: 'top 45%' } });
  gsap.from('.voz-nota, .voz-quem', { y: 30, opacity: 0, duration: .8, stagger: .1, ease: 'power3.out', scrollTrigger: { trigger: '.voz', start: 'top 45%' } });

  // ---------- 6. a comunidade num cilindro que roda com o scroll ----------
  const cil = q('#cil'), fotos = qa('#cil img'), n = fotos.length, ang = 360 / n;
  const arruma = () => { const r = Math.round((cil.offsetWidth / 2) / Math.tan(Math.PI / n) * 1.12); fotos.forEach((im, i) => { im.style.transform = 'rotateY(' + (i * ang) + 'deg) translateZ(' + r + 'px)'; }); };
  arruma(); addEventListener('resize', arruma);
  gsap.set(cil, { rotateX: -9 });
  const ct = gsap.timeline({ scrollTrigger: { trigger: '.comu', start: 'top top', end: '+=230%', scrub: 1, pin: true, anticipatePin: 1 } });
  ct.fromTo(cil, { rotateY: 40, scale: .55 }, { rotateY: -320, scale: 1, ease: 'none', duration: 1 }, 0)
    .from('.comu-t h2', { scale: .86, opacity: 0, duration: .25, ease: 'power2.out' }, 0)
    .to('.comu-t h2', { scale: 1.06, duration: .75, ease: 'none' }, .25);

  // eventos
  gsap.fromTo('.ep-foto img', { yPercent: -12 }, { yPercent: 0, ease: 'none', scrollTrigger: { trigger: '.evento-prox', start: 'top bottom', end: 'bottom top', scrub: true } });
  const eh = parte('.ep-txt h3', 'lines');
  gsap.from(eh ? eh.lines : '.ep-txt h3', { yPercent: 100, duration: 1, stagger: .08, ease: 'expo.out', scrollTrigger: { trigger: '.evento-prox', start: 'top 70%' } });
  gsap.from('.ep-conta .led', { y: 40, opacity: 0, duration: .7, stagger: .08, ease: 'power3.out', scrollTrigger: { trigger: '.ep-conta', start: 'top 85%' } });
  gsap.from('.ev-lista li', { y: 40, opacity: 0, duration: .7, stagger: .08, ease: 'power3.out', scrollTrigger: { trigger: '.ev-lista', start: 'top 85%' } });

  // ---------- 7. o Ivo ----------
  gsap.fromTo('.ivo-f1 img', { yPercent: -10 }, { yPercent: 0, ease: 'none', scrollTrigger: { trigger: '.ivo', start: 'top bottom', end: 'bottom top', scrub: true } });
  gsap.fromTo('.ivo-f2', { y: 120 }, { y: -40, ease: 'none', scrollTrigger: { trigger: '.ivo', start: 'top bottom', end: 'bottom top', scrub: true } });
  gsap.from('.ivo-f1', { clipPath: 'inset(100% 0 0 0 round 12px)', duration: 1.4, ease: 'expo.inOut', scrollTrigger: { trigger: '.ivo', start: 'top 70%' } });
  const nome = parte('.ivo-nome', 'chars');
  if (nome) gsap.from(nome.chars, { yPercent: 105, duration: 1.1, stagger: .045, ease: 'expo.out', scrollTrigger: { trigger: '.ivo-nome', start: 'top 80%' } });
  gsap.from('.ivo-cv li', { x: -30, opacity: 0, duration: .7, stagger: .09, ease: 'power3.out', scrollTrigger: { trigger: '.ivo-cv', start: 'top 85%' } });
  gsap.from('.ivo-q', { y: 30, opacity: 0, duration: .8, ease: 'power3.out', scrollTrigger: { trigger: '.ivo-q', start: 'top 90%' } });

  // ---------- 8. o horário ----------
  const hh = parte('.hor-cab h2', 'chars');
  if (hh) gsap.from(hh.chars, { yPercent: 105, duration: 1, stagger: .03, ease: 'expo.out', scrollTrigger: { trigger: '.horario', start: 'top 70%' } });
  gsap.from('#aulas li', { y: 30, opacity: 0, duration: .6, stagger: .07, ease: 'power3.out', scrollTrigger: { trigger: '#aulas', start: 'top 85%' } });

  // ---------- 9. a planta do novo estúdio desenha-se ----------
  const tracos = qa('#planta path, #planta circle');
  tracos.forEach(p => { const L = p.getTotalLength ? p.getTotalLength() : 1000; p.style.strokeDasharray = L; p.style.strokeDashoffset = L; });
  const nt = gsap.timeline({ scrollTrigger: { trigger: '.novo', start: 'top 65%', end: 'center 40%', scrub: 1 } });
  nt.to(tracos, { strokeDashoffset: 0, duration: 1, stagger: .05, ease: 'none' }, 0)
    .fromTo('.novo-obra img', { filter: 'grayscale(.2) brightness(1)' }, { filter: 'grayscale(1) brightness(.28)', duration: .9, ease: 'none' }, 0)
    .to('.planta-cotas', { opacity: 1, duration: .2 }, .9);
  const nh = parte('.novo-txt h2', 'lines');
  gsap.from(nh ? nh.lines : '.novo-txt h2', { yPercent: 100, duration: 1, stagger: .1, ease: 'expo.out', scrollTrigger: { trigger: '.novo-txt', start: 'top 75%' } });
  gsap.from('.novo-pre, .novo-txt > p, .novo-txt .botao', { y: 30, opacity: 0, duration: .7, stagger: .08, ease: 'power3.out', scrollTrigger: { trigger: '.novo-txt', start: 'top 75%' } });

  // ---------- 10. começa hoje ----------
  gsap.fromTo('.fim-foto img', { scale: 1.18 }, { scale: 1, ease: 'none', scrollTrigger: { trigger: '.fim', start: 'top bottom', end: 'bottom bottom', scrub: true } });
  const fh = parte('.fim-in h2', 'chars');
  if (fh) gsap.from(fh.chars, { yPercent: 105, duration: 1.1, stagger: .04, ease: 'expo.out', scrollTrigger: { trigger: '.fim-in', start: 'top 80%' } });
  gsap.from('.caminho', { y: 60, opacity: 0, duration: .8, stagger: .1, ease: 'power3.out', scrollTrigger: { trigger: '.caminhos', start: 'top 90%' } });

  addEventListener('load', () => ScrollTrigger.refresh());
  };
  (document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve()).then(animacoes);
})();
