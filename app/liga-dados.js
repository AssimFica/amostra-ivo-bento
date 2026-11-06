// Liga Premium: os dados partilhados pela app do sócio (liga.html) e pelo ecrã da entrada (porta.html).
// Na amostra, os outros sócios são fictícios e as entradas do sócio ficam neste telemóvel.
// Na versão final, tudo vive num servidor do estúdio e o código da porta é assinado por ele.

export const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
export const META_MES = 12;            // treinos para o «Mês completo»
export const NIVEIS = [
  { nome: 'Iniciado', min: 0 }, { nome: 'Bronze', min: 25 }, { nome: 'Prata', min: 60 },
  { nome: 'Ouro', min: 120 }, { nome: 'Black', min: 200 },
];
export const PREMIOS = [
  { quem: '1.º lugar do mês', o_que: 'Um mês de treino oferecido' },
  { quem: '2.º e 3.º lugar', o_que: 'Uma sessão de treino pessoal com o Ivo' },
  { quem: 'Todos com 12 treinos ou mais', o_que: '«Mês completo» e entrada no sorteio da t-shirt do estúdio' },
];

const SOCIOS = [
  ['Sandra M.', .92], ['Rui T.', .86], ['Joana P.', .8], ['Diogo R.', .74], ['Catarina R.', .7],
  ['André T.', .64], ['Érica C.', .6], ['Fernando N.', .55], ['Lúcia M.', .5], ['César P.', .46],
  ['Susana R.', .4], ['João P.', .36], ['Patrícia O.', .3], ['Hugo L.', .25],
];

// ---------- o código da porta: muda a cada 30 segundos ----------
const SEGREDO = 'ivo-bento-premium-amostra';
export const JANELA = 30000;
function hash(txt) { let h = 2166136261; for (const c of txt) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; }
export function codigo(janela = Math.floor(Date.now() / JANELA)) { return String(hash(SEGREDO + ':' + janela) % 10000).padStart(4, '0'); }
export function codigoValido(c) { const j = Math.floor(Date.now() / JANELA); return c === codigo(j) || c === codigo(j - 1); }

// ---------- o sócio deste telemóvel ----------
const CHAVE = 'ivo-liga-v1';
export const hojeISO = (d = new Date()) => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
export function carrega() {
  let s = null;
  try { s = JSON.parse(localStorage.getItem(CHAVE)); } catch (e) { s = null; }
  if (!s || !Array.isArray(s.entradas)) {
    // começa com dois treinos já feitos este mês, para a amostra ter vida
    const hoje = new Date(), ent = [];
    for (const atras of [4, 2]) { const d = new Date(hoje); d.setDate(hoje.getDate() - atras); if (d.getMonth() === hoje.getMonth()) ent.push(hojeISO(d)); }
    s = { nome: '', entradas: ent, anoAntes: 47 };
  }
  return s;
}
export function guarda(s) { try { localStorage.setItem(CHAVE, JSON.stringify(s)); } catch (e) { /* sem armazenamento: a amostra continua */ } }
export function registaEntrada(s) {
  const h = hojeISO();
  if (s.entradas.includes(h)) return false;
  s.entradas.push(h); guarda(s); return true;
}

// ---------- a tabela ----------
export function diasDoMes(ano, mes) { return new Date(ano, mes + 1, 0).getDate(); }
export function tabela(s, ano, mes, ateDia) {
  const lista = SOCIOS.map(([nome, taxa], i) => ({ nome, n: Math.max(0, Math.round(ateDia * taxa * .55 + ((i * 7 + mes) % 3) * (ateDia > 3 ? .5 : 0))) }));
  const prefixo = ano + '-' + String(mes + 1).padStart(2, '0');
  const eu = { nome: s.nome || 'Você', n: s.entradas.filter(e => e.startsWith(prefixo)).length, eu: true };
  lista.push(eu);
  lista.sort((a, b) => b.n - a.n || (a.eu ? -1 : b.eu ? 1 : a.nome.localeCompare(b.nome)));
  lista.forEach((x, i) => { x.lugar = i + 1; });
  return lista;
}
export function nivel(total) {
  let atual = NIVEIS[0], prox = null;
  for (let i = 0; i < NIVEIS.length; i++) if (total >= NIVEIS[i].min) { atual = NIVEIS[i]; prox = NIVEIS[i + 1] || null; }
  return { atual, prox };
}
export const ordinal = n => n + '.º';
