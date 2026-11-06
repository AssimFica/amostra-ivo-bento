import { MESES, META_MES, PREMIOS, carrega, guarda, registaEntrada, codigoValido, tabela, diasDoMes, nivel, ordinal, hojeISO } from './liga-dados.js';

const $ = s => document.querySelector(s);
const s = carrega();
const hoje = new Date();
const ANO = hoje.getFullYear(), MES = hoje.getMonth(), DIA = hoje.getDate();
const antes = new Date(ANO, MES - 1, 1);
const cap = t => t.charAt(0).toUpperCase() + t.slice(1);
const plural = (n, um, varios) => n + ' ' + (n === 1 ? um : varios);

// ---------- abas ----------
$('#a-atual').textContent = cap(MESES[MES]);
$('#a-antes').textContent = cap(MESES[antes.getMonth()]);
document.querySelectorAll('[role=tab]').forEach(t => t.addEventListener('click', () => {
  document.querySelectorAll('[role=tab]').forEach(o => o.setAttribute('aria-selected', String(o === t)));
  document.querySelectorAll('.vista').forEach(v => v.classList.toggle('ativo', v.id === t.getAttribute('aria-controls')));
}));
document.querySelectorAll('[data-fecha]').forEach(b => b.addEventListener('click', () => $('#' + b.dataset.fecha).classList.remove('ativo')));

// ---------- desenhar ----------
function linhaTabela(ol, lista, mostrarEu = true) {
  ol.textContent = '';
  const eu = lista.find(x => x.eu);
  const mostra = lista.filter(x => x.lugar <= 8 || x.eu);
  let anterior = 0;
  for (const x of mostra) {
    if (x.lugar - anterior > 1) { const c = document.createElement('li'); c.className = 'corte'; c.textContent = '·  ·  ·'; ol.append(c); }
    const li = document.createElement('li');
    li.className = (x.lugar <= 3 ? 'top ' : '') + (x.eu && mostrarEu ? 'eu' : '');
    const p = document.createElement('span'); p.className = 'p'; p.textContent = ordinal(x.lugar);
    const n = document.createElement('span'); n.className = 'nome'; n.textContent = x.eu ? (x.nome + ' (você)') : x.nome;
    const t = document.createElement('span'); t.className = 'n'; t.textContent = x.n;
    li.append(p, n, t); ol.append(li); anterior = x.lugar;
  }
  return eu;
}

function premioDe(lugar, n) {
  if (lugar === 1) return PREMIOS[0].o_que.toLowerCase();
  if (lugar <= 3) return PREMIOS[1].o_que.toLowerCase();
  if (n >= META_MES) return 'o «Mês completo» e entrada no sorteio da t-shirt';
  return null;
}

function desenha() {
  const lista = tabela(s, ANO, MES, DIA);
  const eu = linhaTabela($('#tabela'), lista);
  const total = lista.length, falta = diasDoMes(ANO, MES) - DIA;

  $('#h-mes').textContent = cap(MESES[MES]) + ' ' + ANO;
  $('#h-faltam').textContent = falta === 0 ? 'último dia' : 'faltam ' + plural(falta, 'dia', 'dias');
  $('#h-lugar').textContent = ordinal(eu.lugar);
  $('#h-treinos').textContent = plural(eu.n, 'treino', 'treinos');
  $('#h-total').textContent = total;

  const prox = $('#h-prox'); prox.textContent = '';
  if (eu.lugar === 1) prox.textContent = 'Está em 1.º lugar. Mantenha o ritmo até ao fim do mês.';
  else {
    const acima = lista[eu.lugar - 2];
    const dif = Math.max(1, acima.n - eu.n);
    const b = document.createElement('b'); b.textContent = plural(dif, 'treino', 'treinos');
    prox.append('Está a ', b, ' de passar ' + acima.nome + ' e subir para ' + ordinal(eu.lugar - 1) + '.');
  }

  $('#m-txt').textContent = Math.min(eu.n, META_MES) + ' de ' + META_MES;
  $('#m-prog').style.width = Math.min(100, eu.n / META_MES * 100) + '%';

  // calendário
  const cal = $('#cal'); cal.textContent = '';
  for (const d of ['S', 'T', 'Q', 'Q', 'S', 'S', 'D']) { const e = document.createElement('span'); e.className = 'sem'; e.textContent = d; cal.append(e); }
  const primeiro = (new Date(ANO, MES, 1).getDay() + 6) % 7;
  for (let i = 0; i < primeiro; i++) { const e = document.createElement('span'); e.className = 'd vazio'; cal.append(e); }
  const pref = ANO + '-' + String(MES + 1).padStart(2, '0') + '-';
  for (let d = 1; d <= diasDoMes(ANO, MES); d++) {
    const e = document.createElement('span');
    const feito = s.entradas.includes(pref + String(d).padStart(2, '0'));
    e.className = 'd' + (feito ? ' feito' : '') + (d === DIA ? ' hoje' : '') + (d > DIA ? ' futuro' : '');
    e.textContent = d; cal.append(e);
  }

  // prémios e mensagem do fim do mês
  const pl = $('#premios'); pl.textContent = '';
  for (const p of PREMIOS) { const li = document.createElement('li'); const b = document.createElement('b'); b.textContent = p.quem; const sp = document.createElement('span'); sp.textContent = p.o_que; li.append(b, sp); pl.append(li); }
  $('#sms-quando').textContent = diasDoMes(ANO, MES) + ' de ' + MESES[MES] + ', 21:00';
  const ganha = premioDe(eu.lugar, eu.n);
  $('#sms-atual').textContent = cap(MESES[MES]) + ' fechou. Fez ' + plural(eu.n, 'treino', 'treinos') + ' e ficou em ' + ordinal(eu.lugar) + ' lugar entre ' + total + ' sócios.'
    + (ganha ? ' Ganhou ' + ganha + '.' : ' Faltaram ' + plural(META_MES - eu.n, 'treino', 'treinos') + ' para o «Mês completo».')
    + ' ' + cap(MESES[(MES + 1) % 12]) + ' começa amanhã, e a tabela volta a zero.';

  // nível do ano
  const totalAno = s.anoAntes + s.entradas.length;
  const nv = nivel(totalAno);
  $('#n-selo').textContent = nv.atual.nome;
  const nt = $('#n-txt'); nt.textContent = '';
  const b = document.createElement('b'); b.textContent = 'Nível ' + nv.atual.nome + ' · ' + plural(totalAno, 'treino', 'treinos') + ' este ano.';
  nt.append(b, nv.prox ? ' Faltam ' + (nv.prox.min - totalAno) + ' para o nível ' + nv.prox.nome + '.' : ' É o nível mais alto.');

  // botão
  const ja = s.entradas.includes(hojeISO());
  const be = $('#b-entrada'); be.disabled = ja; be.textContent = ja ? 'Entrada de hoje registada' : 'Registar a entrada de hoje';
  return eu;
}

function desenhaAntes() {
  const a = antes.getFullYear(), m = antes.getMonth(), dias = diasDoMes(a, m);
  const falso = { nome: s.nome, entradas: Array.from({ length: 14 }, (_, i) => a + '-' + String(m + 1).padStart(2, '0') + '-' + String(i * 2 + 1).padStart(2, '0')) };
  const lista = tabela(falso, a, m, dias);
  const eu = linhaTabela($('#tabela-antes'), lista);
  $('#p-mes').textContent = cap(MESES[m]) + ' ' + a;
  $('#p-lugar').textContent = ordinal(eu.lugar);
  $('#p-treinos').textContent = plural(eu.n, 'treino', 'treinos');
  $('#p-total').textContent = lista.length;
  const ganha = premioDe(eu.lugar, eu.n);
  $('#p-ganhou').textContent = ganha ? 'Ganhou ' + ganha + '.' : 'Sem prémio este mês.';
  $('#psms-quando').textContent = dias + ' de ' + MESES[m] + ', 21:00';
  $('#psms').textContent = cap(MESES[m]) + ' fechou. Fez ' + plural(eu.n, 'treino', 'treinos') + ' e ficou em ' + ordinal(eu.lugar) + ' lugar entre ' + lista.length + ' sócios.'
    + (ganha ? ' Ganhou ' + ganha + '.' : '') + ' ' + cap(MESES[MES]) + ' já começou: boa sorte!';
}

// ---------- entrada ----------
function festa(antesLugar) {
  const eu = desenha();
  $('#festa-n').textContent = eu.n;
  $('#festa-t').textContent = ordinal(eu.n) + ' treino de ' + MESES[MES];
  $('#festa-subiu').textContent = eu.lugar < antesLugar ? 'Subiu para ' + ordinal(eu.lugar) + ' lugar' : 'Está em ' + ordinal(eu.lugar) + ' lugar';
  $('#festa-txt').textContent = eu.n >= META_MES ? 'Já tem o «Mês completo». Agora é subir na tabela.' : 'Faltam ' + plural(META_MES - eu.n, 'treino', 'treinos') + ' para o «Mês completo».';
  const f = $('#festa'); f.querySelectorAll('.confete').forEach(c => c.remove());
  if (!matchMedia('(prefers-reduced-motion: reduce)').matches) {
    for (let i = 0; i < 36; i++) {
      const c = document.createElement('span'); c.className = 'confete';
      c.style.left = Math.random() * 100 + '%'; c.style.background = i % 3 ? '#7DC242' : '#C9AE3C';
      c.style.animationDelay = (Math.random() * .6) + 's'; c.style.animationDuration = (1.8 + Math.random() * 1.4) + 's';
      f.append(c);
    }
  }
  f.classList.add('ativo');
  try { navigator.vibrate && navigator.vibrate([30, 40, 60]); } catch (e) { /* sem vibração */ }
}
function entra() {
  const antesLugar = tabela(s, ANO, MES, DIA).find(x => x.eu).lugar;
  if (!registaEntrada(s)) return 'Já registou a entrada de hoje. Até amanhã!';
  $('#f-entrada').classList.remove('ativo');
  festa(antesLugar);
  return null;
}
$('#b-festa').addEventListener('click', () => $('#festa').classList.remove('ativo'));
$('#b-entrada').addEventListener('click', () => { $('#codigo').value = ''; $('#erro-codigo').hidden = true; $('#f-entrada').classList.add('ativo'); setTimeout(() => $('#codigo').focus(), 50); });
$('#b-codigo').addEventListener('click', () => {
  const c = $('#codigo').value.replace(/\D/g, '');
  const e = $('#erro-codigo');
  if (c.length !== 4) { e.textContent = 'O código tem 4 números. Está por baixo do QR, no ecrã da entrada.'; e.hidden = false; return; }
  if (!codigoValido(c)) { e.textContent = 'Este código já mudou. Os códigos mudam a cada 30 segundos: escreva o que está agora no ecrã.'; e.hidden = false; return; }
  const msg = entra(); if (msg) { e.textContent = msg; e.hidden = false; }
});
$('#b-simular').addEventListener('click', () => { const msg = entra(); if (msg) { const e = $('#erro-codigo'); e.textContent = msg; e.hidden = false; } });

// ---------- primeira vez: o nome ----------
function arranca() {
  desenha(); desenhaAntes();
  const q = new URLSearchParams(location.search);
  const c = q.get('entrada');
  if (c) {
    history.replaceState(null, '', location.pathname);
    if (codigoValido(c)) { const msg = entra(); if (msg) alertaSuave(msg); }
    else alertaSuave('O código do QR já mudou. Leia-o de novo no ecrã da entrada.');
  }
}
function alertaSuave(txt) { $('#erro-codigo').textContent = txt; $('#erro-codigo').hidden = false; $('#f-entrada').classList.add('ativo'); }
if (!s.nome) {
  $('#f-nome').classList.add('ativo');
  $('#b-nome').addEventListener('click', () => {
    const n = $('#nome').value.trim().slice(0, 20);
    if (!n) { $('#nome').focus(); return; }
    s.nome = n; guarda(s); $('#f-nome').classList.remove('ativo'); arranca();
  });
} else arranca();
desenha(); desenhaAntes();

if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
