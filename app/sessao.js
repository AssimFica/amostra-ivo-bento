// A sessão do cliente na amostra: fica só neste telemóvel.
// Na versão final, a conta vive no servidor do estúdio e o código chega por SMS.
const CHAVE = 'ivo-sessao-v1', CLIENTES = 'ivo-clientes-v1', PENDENTE = 'ivo-entrada-pendente';
const le = (k, s = localStorage) => { try { return JSON.parse(s.getItem(k)); } catch (e) { return null; } };
const poe = (k, v, s = localStorage) => { try { s.setItem(k, JSON.stringify(v)); } catch (e) { /* sem armazenamento */ } };

export const sessao = () => le(CHAVE);
export const cliente = tel => (le(CLIENTES) || {})[tel] || null;
export function guardaCliente(c) { const t = le(CLIENTES) || {}; t[c.tel] = c; poe(CLIENTES, t); }
export function entra(c) { poe(CHAVE, { ...c, entrou: Date.now() }); }
export function sai() { try { localStorage.removeItem(CHAVE); } catch (e) { /* nada */ } }
export const iniciais = n => (n || '?').split(/\s+/).filter(Boolean).slice(0, 2).map(p => p[0].toUpperCase()).join('');

// uma entrada lida no QR antes de iniciar sessão fica guardada 10 minutos
export function guardaPendente(valida) { poe(PENDENTE, { valida, t: Date.now() }, sessionStorage); }
export function tiraPendente() { const p = le(PENDENTE, sessionStorage); try { sessionStorage.removeItem(PENDENTE); } catch (e) { /* nada */ } return p && Date.now() - p.t < 600000 ? p : null; }
