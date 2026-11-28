/* Forja · app de fitness gamificado (treino, dieta e hábitos em 12 semanas)
   Tudo roda no aparelho: o progresso fica salvo no localStorage deste navegador. */
(() => {
'use strict';

/* ============================== utilidades ============================== */
const $ = (s, r = document) => r.querySelector(s);
const pad = n => String(n).padStart(2, '0');
const NOW = () => new Date();
const dkey = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const pd = k => { const [y, m, d] = k.split('-').map(Number); return new Date(y, m - 1, d); };
const addDays = (k, n) => { const d = pd(k); d.setDate(d.getDate() + n); return dkey(d); };
const diff = (a, b) => Math.round((pd(a) - pd(b)) / 864e5);
const dow = k => (pd(k).getDay() + 6) % 7;              // 0 = segunda ... 6 = domingo
const wkey = k => addDays(k, -dow(k));                   // segunda-feira da semana de k
const today = () => dkey(NOW());
const fmt = (n, d = 0) => Number(n).toLocaleString('pt-BR', { minimumFractionDigits: d, maximumFractionDigits: d });
const num = v => { const n = parseFloat(String(v).replace(',', '.')); return isFinite(n) ? n : NaN; };
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const clone = o => JSON.parse(JSON.stringify(o));
const r5 = v => Math.round(v * 2) / 2;
const DIAS = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo'];
const DIAS3 = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];
const DIAS1 = ['S', 'T', 'Q', 'Q', 'S', 'S', 'D'];
const RM = () => { try { return matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; } };
const vibrar = p => { try { navigator.vibrate && navigator.vibrate(p); } catch (e) {} };

/* ============================== regras do jogo ============================== */
const KEY = 'forja.v1';
const PROT_META = 115, PROT_PISO = 100, COPOS = 10, FIBRA_META = 25, KCAL_MIN = 1900, KCAL_MAX = 2100;

const REFEICOES = [
  { h: '06:55', nome: 'Pré-treino leve', desc: 'Banana + pão integral com geleia', kcal: 155, prot: 4, mis: 'Pré-treino leve' },
  { h: '09:10', nome: 'Café pós-treino', desc: 'Iogurte proteico + pão com ovo + fruta', kcal: 415, prot: 31, mis: 'Café pós-treino na mesa' },
  { h: '12:30', nome: 'Almoço', desc: '100 g de proteína + arroz + feijão + salada', kcal: 615, prot: 42, mis: 'Almoço' },
  { h: '16:30', nome: 'Lanche', desc: 'Whey com água + maçã + castanhas', kcal: 290, prot: 28, mis: 'Lanche: whey + maçã + castanhas · creatina' },
  { h: '20:00', nome: 'Jantar', desc: 'Peixe ou frango + batata-doce + legumes', kcal: 375, prot: 30, mis: 'Jantar · fim até 20:30' },
  { h: '—', nome: 'Extra opcional', desc: 'Banana + pasta de amendoim, se tiver fome', kcal: 150, prot: 4, extra: true }
];

const FICHA_A = [
  { n: 'Leg press 45°', c: 60, r: '10–12', u: 'kg', t: 'Pés na largura dos ombros; não trave os joelhos.' },
  { n: 'Supino em máquina', c: 25, r: '10–12', u: 'kg', t: 'Desça controlando, sem bater o peso.' },
  { n: 'Puxada frontal', c: 35, r: '10–12', u: 'kg', t: 'Puxe até o queixo, ombros longe das orelhas.' },
  { n: 'Mesa flexora', c: 25, r: '12', u: 'kg', t: 'Suba e desça devagar, sem tirar o quadril do banco.' },
  { n: 'Elevação lateral', c: 5, r: '12–15', u: 'kg', t: 'Carga leve, sem balançar o corpo.' },
  { n: 'Prancha', c: 30, r: '1', u: 's', t: 'Quadril alinhado; pare ao perder a postura.' }
];

const FASES = [
  { id: 1, nome: 'Adaptação', cor: '#C6F135', trilha: '#3A3F4B', ini: 1, fim: 4, passos: [6000, 6500, 7000, 7500],
    reg: '2 séries · parar com 2 de reserva', det: '2 séries · parar com 2 de reserva · técnica nas máquinas · exames',
    boss: { id: 'S4', nome: 'Mestre da Técnica', desc: '12 treinos feitos', xp: 200, meta: 12 } },
  { id: 2, nome: 'Construção', cor: '#8DB5FF', trilha: '#2C3D5E', ini: 5, fim: 8, passos: [8000, 8000, 8000, 8000],
    reg: '3 séries · carga sobe ao bater 12 repetições', det: '3 séries · carga sobe ao bater 12 repetições',
    boss: { id: 'S8', nome: 'Força Crescente', desc: 'carga maior em 4 exercícios', xp: 300, meta: 4 } },
  { id: 3, nome: 'Intensificação', cor: '#C4B0FF', trilha: '#4A2E5E', ini: 9, fim: 11, passos: [8000, 9000, 10000],
    reg: '4 séries nos 2 primeiros exercícios', det: '4 séries nos 2 primeiros exercícios',
    boss: { id: 'S11', nome: 'Volume Máximo', desc: '9 treinos completos na fase', xp: 300, meta: 9 } },
  { id: 4, nome: 'Semana leve', cor: '#FFD480', trilha: '#5E4A1E', ini: 12, fim: 12, passos: [8000],
    reg: '2 séries · semana leve', det: '2 séries · semana leve',
    boss: { id: 'S12', nome: 'Avaliação', desc: 'medir, fotografar, consultar', xp: 500, meta: 3 } }
];
const setsDe = (f, i) => f.id === 2 ? 3 : f.id === 3 ? (i < 2 ? 4 : 3) : 2;

const nivelAcum = n => 75 * (n - 1) * n + 50 * (n - 1);   // XP total para chegar ao nível n (passar do nível N custa 150×N+50)
const nivelDe = xp => { let n = 1; while (xp >= nivelAcum(n + 1)) n++; return { n, ini: nivelAcum(n), prox: nivelAcum(n + 1) }; };
const TITULOS = [[30, 'Lenda da Forja'], [20, 'Titã'], [15, 'Aço'], [10, 'Forjado'], [5, 'Aprendiz'], [1, 'Recruta']];
const titulo = n => TITULOS.find(([m]) => n >= m)[1];

/* ============================== estado ============================== */
const blankLog = () => ({ m: [false, false, false, false, false, false], agua: 0, passos: 0, fibra: 0, cre: false, whey: false, bolsa: false, cama: false, cook: false, enjoo: false, w: null });
const BLANK = blankLog();
const novoEstado = () => ({
  v: 1, onboard: false, nome: 'Guilherme', inicio: dkey(NOW()), base: 98.0, dias: [0, 2, 4], aplic: null,
  fichas: { A: clone(FICHA_A), B: clone(FICHA_A) },
  logs: {}, checkins: {}, melhor: {}, hist: {}, recs: [], boss: {}, consulta: false,
  seq: { n: 0, best: 0, esc: 0, ate: null, prot: [] }, semEsc: {}, conq: {}
});
let S;
function carregar() {
  try { const raw = localStorage.getItem(KEY); if (raw) { S = Object.assign(novoEstado(), JSON.parse(raw)); return; } } catch (e) {}
  S = novoEstado();
}
function salvar() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {} }

const lg = k => S.logs[k] || BLANK;
const L = (k, criar = true) => { if (!S.logs[k] && criar) S.logs[k] = blankLog(); return S.logs[k]; };

/* ----- cálculos puros ----- */
const semana = k => Math.max(1, Math.min(12, Math.floor(diff(k, S.inicio) / 7) + 1));
const faseDe = k => { const w = semana(k); return FASES.find(f => w >= f.ini && w <= f.fim); };
const passosMeta = k => { const f = faseDe(k); return f.passos[Math.min(semana(k) - f.ini, f.passos.length - 1)]; };
const treinoDia = k => S.dias.includes(dow(k));
const macro = l => { let p = 0, c = 0; REFEICOES.forEach((r, i) => { if (l.m[i]) { p += r.prot; c += r.kcal; } }); return { p, c }; };
const protMeta = l => l.enjoo ? PROT_PISO : PROT_META;
const gProt = l => macro(l).p >= protMeta(l);
const gAgua = l => l.agua >= COPOS;
const gPassos = (l, k) => l.passos >= passosMeta(k);
const gFibra = l => l.fibra >= FIBRA_META;
const fez = l => !!(l.w && l.w.fim);                       // registrou o treino (inclusive parcial)
const treinou = l => !!(l.w && l.w.fim && l.w.completo);   // treino completo
const treinos = () => Object.values(S.logs).filter(treinou).length;
const treinosSemana = k => { const w = wkey(k); let n = 0; for (let i = 0; i < 7; i++) if (treinou(lg(addDays(w, i)))) n++; return n; };

function xpComida(l, k) {
  let x = 0;
  l.m.forEach(v => { if (v) x += 15; });
  if (gProt(l)) x += 25; if (gAgua(l)) x += 20; if (gPassos(l, k)) x += 20; if (gFibra(l)) x += 10;
  if (l.cre) x += 5; if (l.whey) x += 5;
  return x;
}
function xpDia(k) {
  const l = S.logs[k]; if (!l) return 0;
  let x = xpComida(l, k);
  if (l.bolsa) x += 5; if (l.cama) x += 15; if (l.cook) x += 40;
  if (treinou(l)) x += 60;
  if (l.w && l.w.xpRec) x += l.w.xpRec;
  return x;
}
function xpCheckinsDe(cks) {
  let x = 0; const sw = new Set(), sc = new Set(), sf = new Set();
  Object.keys(cks).sort().forEach(k => {
    const c = cks[k], w = wkey(k), m = k.slice(0, 7);
    if (!sw.has(w)) { sw.add(w); x += 30; }
    if (c.cin && !sc.has(w)) { sc.add(w); x += 20; }
    if (c.foto && !sf.has(m)) { sf.add(m); x += 30; }
  });
  return x;
}
const xpBoss = () => Object.values(S.boss).reduce((a, b) => a + b, 0);
const xpTotal = () => Object.keys(S.logs).reduce((a, k) => a + xpDia(k), 0) + xpCheckinsDe(S.checkins) + xpBoss();

/* ----- missões do dia (a grade da semana vira missões) ----- */
function missoes(k) {
  const l = lg(k), out = [], d = dow(k);
  if (d === 0) out.push({ id: 'ci', h: '—', t: 'Check-in de segunda · pesagem ao acordar', xp: 30, cor: '#C6F135', done: checkinSemana(k) });
  REFEICOES.forEach((r, i) => {
    if (r.extra) return;
    out.push({ id: 'm' + i, h: r.h, t: r.mis, xp: i === 3 ? 25 : 15, cor: '#2FD18B', done: l.m[i] });
    if (i === 0) {
      if (treinoDia(k)) { const w = l.w; out.push({ id: 'tr', h: '07:30', t: `Treino ${w ? w.l : proxLetra()} · 45 min`, xp: 60, cor: '#4D8DFF', done: fez(l) }); }
      else out.push({ id: 'auto', tipo: 'auto', h: '07:30', t: 'Dia de descanso · proteína e água fecham o dia', xp: 0, cor: '#4D8DFF', done: gProt(l) && gAgua(l) });
    }
  });
  out.push({ id: 'bolsa', h: '21:30', t: 'Deixar a bolsa da academia pronta', xp: 5, cor: '#FFC53D', done: l.bolsa });
  out.push({ id: 'cama', h: '22:30', t: 'Cama', xp: 15, cor: '#A78BFA', done: l.cama });
  if (d === 6) out.push({ id: 'cook', h: '—', t: 'Domingo de cozinhar a semana', xp: 40, cor: '#FFC53D', done: l.cook });
  return out;
}
const proxLetra = () => treinos() % 2 ? 'B' : 'A';
function checkinSemana(k) { const w = wkey(k); for (let i = 0; i < 7; i++) if (S.checkins[addDays(w, i)]) return true; return false; }

/* ----- ofensiva e escudos ----- */
function conta(k) {
  const l = S.logs[k]; if (!l) return false;
  if (fez(l)) return true;
  if (missoes(k).filter(m => m.done && m.tipo !== 'auto').length >= 3) return true;
  return !treinoDia(k) && gProt(l) && gAgua(l);
}
function settle() {
  const q = S.seq; if (!S.onboard || !q.ate) return;
  const ontem = addDays(today(), -1);
  let d = addDays(q.ate, 1);
  while (d <= ontem) {
    if (conta(d)) { q.n++; q.best = Math.max(q.best, q.n); }
    else if (q.n > 0 && q.esc > 0) { q.esc--; q.prot = (q.prot || []).concat(d); }
    else q.n = 0;
    q.ate = d; d = addDays(d, 1);
  }
}
const seqAtual = () => S.seq.n + (conta(today()) ? 1 : 0);

/* ----- conquistas ----- */
function runMax(pred) { let best = 0, run = 0, d = S.inicio; const fim = today(); while (d <= fim) { const l = S.logs[d]; if (l && pred(l, d)) { run++; best = Math.max(best, run); } else run = 0; d = addDays(d, 1); } return best; }
const semanasCheckin = () => new Set(Object.keys(S.checkins).map(wkey)).size;
const CONQ = [
  { id: 'primeiro', nome: 'Primeiro treino', ico: 'dumb', ok: () => treinos() >= 1 },
  { id: 'forca', nome: 'Força crescente', ico: 'trend', ok: () => S.recs.length >= 1 },
  { id: 'fogo3', nome: 'Fogo aceso · 3 dias', ico: 'flame', ok: () => Math.max(S.seq.best, seqAtual()) >= 3 },
  { id: 'perfeita', nome: 'Semana perfeita · 3/3', ico: 'cal', ok: () => Object.keys(S.semEsc).length >= 1 },
  { id: 'hidratado', nome: 'Hidratado · 7 dias', ico: 'drop', ok: () => runMax(gAgua) >= 7 },
  { id: 'proteina', nome: 'Proteína 7/7', ico: 'food', ok: () => runMax(gProt) >= 7 },
  { id: 'chef', nome: 'Chef da Forja · 4 domingos', ico: 'bag', ok: () => Object.values(S.logs).filter(l => l.cook).length >= 4 },
  { id: 'sono', nome: 'Sono de atleta · 7 noites', ico: 'moon', ok: () => runMax(l => l.cama) >= 7 },
  { id: 'pesagem', nome: 'Pesagem em dia · 4 semanas', ico: 'scale', ok: () => semanasCheckin() >= 4 },
  { id: 'fogo14', nome: 'Fogo de 14 dias', ico: 'flame', ok: () => Math.max(S.seq.best, seqAtual()) >= 14 },
  { id: 'treinos12', nome: '12 treinos na conta', ico: 'dumb', ok: () => treinos() >= 12 },
  { id: 'temporada', nome: 'Temporada completa', ico: 'trophy', ok: () => !!S.boss.S12 }
];

/* ----- chefões ----- */
const faseRange = f => [addDays(S.inicio, (f.ini - 1) * 7), addDays(S.inicio, f.fim * 7 - 1)];
function bossProg(f) {
  const [a, b] = faseRange(f); let n = 0;
  if (f.id === 1 || f.id === 3) { for (let d = a; d <= b; d = addDays(d, 1)) if (treinou(lg(d))) n++; }
  else if (f.id === 2) n = new Set(S.recs.filter(r => r.d >= a && r.d <= b).map(r => r.n)).size;
  else { const cs = Object.keys(S.checkins).filter(d => d >= a && d <= b).map(d => S.checkins[d]); n = (cs.some(c => c.cin) ? 1 : 0) + (cs.some(c => c.foto) ? 1 : 0) + (S.consulta ? 1 : 0); }
  n = Math.min(n, f.boss.meta);
  return { n, meta: f.boss.meta, ok: n >= f.boss.meta };
}
function checkBosses() {
  const nov = [];
  FASES.forEach(f => { if (!S.boss[f.boss.id] && bossProg(f).ok) { S.boss[f.boss.id] = f.boss.xp; nov.push(f); } });
  return nov;
}

/* ============================== interface: peças ============================== */
const IC = {
  home: '<path d="M4 11l8-7 8 7v9H4z"/>',
  dumb: '<path d="M6 7v10M18 7v10M3 10v4M21 10v4M6 12h12"/>',
  food: '<circle cx="12" cy="13" r="7"/><path d="M12 3v3M9 4l1 2M15 4l-1 2"/>',
  journey: '<path d="M4 20l5-14 4 8 3-4 4 10z"/>',
  trophy: '<path d="M8 4h8v5a4 4 0 0 1-8 0z"/><path d="M8 6H5a3 3 0 0 0 3 4M16 6h3a3 3 0 0 1-3 4M12 13v4M8 21h8"/>',
  flame: '<path d="M12 3c1 3 5 5 5 10a5 5 0 0 1-10 0c0-2 1-3 2-4 0 2 1 3 2 3 0-3-1-5 1-9z"/>',
  check: '<path d="M5 12l5 5 9-10"/>',
  back: '<path d="M15 5l-7 7 7 7"/>',
  close: '<path d="M6 6l12 12M18 6L6 18"/>',
  clock: '<circle cx="12" cy="13" r="8"/><path d="M12 9v4l2 2M9 2h6"/>',
  trend: '<path d="M4 17l6-6 4 4 6-8"/><path d="M14 7h6v6"/>',
  shield: '<path d="M12 3l7 3v6c0 4-3 7-7 9-4-2-7-5-7-9V6z"/>',
  drop: '<path d="M12 3s6 7 6 11a6 6 0 0 1-12 0c0-4 6-11 6-11z"/>',
  steps: '<path d="M7 20c-2 0-3-2-2-4l2-5c1-2 3-2 4 0l1 3M15 4c2 0 3 2 2 4l-2 5"/>',
  moon: '<path d="M20 14A8 8 0 1 1 10 4a6 6 0 0 0 10 10z"/>',
  bag: '<path d="M5 11h14l-1 9H6zM8 11V8a4 4 0 0 1 8 0v3"/>',
  scale: '<rect x="4" y="6" width="16" height="14" rx="3"/><path d="M9 6a3 3 0 0 1 6 0M12 11v4"/>',
  camera: '<path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/>',
  cal: '<rect x="4" y="5" width="16" height="15" rx="2"/><path d="M4 10h16M9 3v4M15 3v4M10 15l2 2 3-4"/>',
  gear: '<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8v.01"/>'
};
const ico = (n, s) => `<svg class="i" viewBox="0 0 24 24" ${s ? `style="width:${s}px;height:${s}px"` : ''} aria-hidden="true">${IC[n]}</svg>`;
function ring(p, cor, aria) {
  const c = 138.2, arco = p > 0 ? `<circle cx="27" cy="27" r="22" fill="none" stroke="${cor}" stroke-width="6" stroke-linecap="round" stroke-dasharray="${(Math.min(1, p) * c).toFixed(1)} ${c}" transform="rotate(-90 27 27)"/>` : '';
  return `<svg width="54" height="54" viewBox="0 0 54 54" role="img" aria-label="${esc(aria)}"><circle cx="27" cy="27" r="22" fill="none" stroke="#262A34" stroke-width="6"/>${arco}</svg>`;
}
function nav(r) {
  const it = [['hoje', 'Hoje', 'home'], ['treino', 'Treino', 'dumb'], ['comida', 'Comida', 'food'], ['jornada', 'Jornada', 'journey'], ['trofeus', 'Troféus', 'trophy']];
  return `<nav class="nav" aria-label="Navegação">${it.map(([id, t, ic]) => `<a href="#/${id}" class="${r === id ? 'on' : ''}" ${r === id ? 'aria-current="page"' : ''}>${ico(ic)}${t}</a>`).join('')}</nav>`;
}
const fmtKg = v => `${fmt(v, Number.isInteger(v) ? 0 : 1)} kg`;
const sinal = (v, un) => (v > 0 ? '+' : v < 0 ? '−' : '') + fmt(Math.abs(v), 1) + ' ' + un;

/* ============================== telas ============================== */
function vHoje() {
  const k = today(), l = lg(k), xp = xpTotal(), nv = nivelDe(xp), sem = semana(k), fase = faseDe(k);
  const agora = NOW(), hh = agora.getHours(), hm = `${pad(hh)}:${pad(agora.getMinutes())}`;
  const saud = hh < 12 ? 'BOM DIA' : hh < 18 ? 'BOA TARDE' : 'BOA NOITE';
  const q = seqAtual(), m = macro(l), pm = protMeta(l), meta = passosMeta(k);
  const ms = missoes(k), feitas = ms.filter(x => x.done).length;
  const prox = ms.find(x => !x.done && x.tipo !== 'auto' && (x.h === '—' || x.h >= hm)) || ms.find(x => !x.done && x.tipo !== 'auto');
  const antes = diff(S.inicio, k), pos = diff(k, S.inicio) >= 84;
  const wk = lg(k).w, letra = wk ? wk.l : proxLetra();
  const linha = treinoDia(k) ? `Treino ${letra} · ${fase.reg}` : 'Dia de descanso · proteína e água fecham o dia';
  return `<div class="scr">
    <header class="row" style="gap:12px">
      <a href="#/ajustes" class="avatar" aria-label="Ajustes">${esc((S.nome || 'G').trim().charAt(0).toUpperCase() || 'G')}<b>${nv.n}</b></a>
      <div class="sp"><div class="sm" style="font-weight:700">${DIAS[dow(k)]} · ${hm}</div><div class="bc" style="font-size:22px;line-height:1.1;letter-spacing:.3px">${saud}, ${esc((S.nome || '').toUpperCase())}</div></div>
      ${S.seq.esc > 0 ? `<span class="pill shield" aria-label="${S.seq.esc} escudo(s)">${ico('shield', 16)}${S.seq.esc}</span>` : ''}
      <span class="pill fire" aria-label="Ofensiva de ${q} dias">${ico('flame', 16)}${q} ${q === 1 ? 'DIA' : 'DIAS'}</span>
    </header>
    ${antes > 0 ? `<div class="card sm">Sua Semana 1 começa em ${antes} ${antes === 1 ? 'dia' : 'dias'}. Dá para ir treinando o hábito desde já.</div>` : ''}
    ${pos ? `<div class="card" style="border-color:var(--lime)"><div class="h2" style="color:var(--lime)">TEMPORADA CONCLUÍDA</div><div class="sm" style="margin-top:4px">Fechou as 12 semanas. Abra a próxima em <a href="#/ajustes" class="link">Ajustes</a>.</div></div>` : ''}
    ${S.aplic === dow(k) ? `<div class="card row" style="gap:12px"><span style="width:40px;height:40px;border-radius:12px;background:#251B3D;color:#C4B0FF;display:flex;align-items:center;justify-content:center;flex-shrink:0">${ico('cal')}</span><div class="sp"><div class="lab">DIA DA APLICAÇÃO</div><div class="xs">Depois, anote o enjoo no check-in. Dose e mudanças: só com o médico.</div></div></div>` : ''}
    <section class="card" style="border-radius:20px;display:flex;flex-direction:column;gap:10px">
      <div class="row" style="justify-content:space-between;align-items:baseline"><span class="eyebrow" style="color:var(--lime);font-size:13px">NÍVEL ${nv.n} · ${titulo(nv.n).toUpperCase()}</span><span class="sm" style="font-weight:700">${fmt(xp - nv.ini)} / ${fmt(nv.prox - nv.ini)} XP</span></div>
      <div class="bar" role="progressbar" aria-valuemin="0" aria-valuemax="${nv.prox - nv.ini}" aria-valuenow="${xp - nv.ini}"><i style="width:${Math.max(2, (xp - nv.ini) / (nv.prox - nv.ini) * 100)}%"></i></div>
      <div style="padding-top:2px"><div class="bc" style="font-size:20px;line-height:1">SEMANA ${sem} DE 12 · ${fase.nome.toUpperCase()}</div><div class="sm" style="margin-top:4px">${esc(linha)}</div></div>
      <div class="trail" aria-hidden="true">${[...Array(12)].map((_, i) => { const w = i + 1, f = FASES.find(x => w >= x.ini && w <= x.fim); return `<i style="background:${w <= sem ? '#C6F135' : f.trilha}"></i>`; }).join('')}</div>
    </section>
    <section class="rings">
      <a class="ringc" href="#/comida">${ring(m.p / pm, '#2FD18B', `Proteína ${m.p} de ${pm} gramas`)}<div class="v">${m.p}<small>/${pm} g</small></div><div class="t">Proteína</div></a>
      <a class="ringc" href="#/comida">${ring(l.agua / COPOS, '#38D6F5', `Água ${fmt(l.agua * .25, 2)} de 2,5 litros`)}<div class="v">${fmt(l.agua * .25, l.agua % 2 ? 2 : 1)}<small>/2,5 L</small></div><div class="t">Água</div></a>
      <a class="ringc" href="#/comida">${ring(l.passos / meta, '#FF8A3D', `Passos ${l.passos} de ${meta}`)}<div class="v">${fmt(l.passos / 1000, 1)}<small>/${fmt(meta / 1000, meta % 1000 ? 1 : 0)} mil</small></div><div class="t">Passos</div></a>
      <a class="ringc" href="#/comida">${ring(l.fibra / FIBRA_META, '#FFC53D', `Fibra ${l.fibra} de 25 gramas`)}<div class="v">${l.fibra}<small>/25 g</small></div><div class="t">Fibra</div></a>
    </section>
    <section style="display:flex;flex-direction:column;gap:6px">
      <div class="row" style="justify-content:space-between;align-items:baseline"><h2 class="h2">MISSÕES DO DIA</h2><span class="sm" style="font-weight:700">${feitas} de ${ms.length} · +${xpDia(k)} XP hoje</span></div>
      <div class="card tight" style="border-radius:18px">
        ${ms.map(x => `<button class="mis ${x.done ? 'done' : ''} ${prox && prox.id === x.id ? 'next' : ''} ${x.tipo === 'auto' ? 'auto' : ''}" style="--c:${x.cor}" data-act="mis" data-id="${x.id}" aria-pressed="${x.done}">
          <span class="mh">${x.h}</span><span class="ck">${x.done ? ico('check') : ''}</span><span class="mt">${esc(x.t)}</span>${x.xp ? `<span class="mx">+${x.xp}</span>` : ''}</button>`).join('')}
      </div>
    </section>
  </div>${nav('hoje')}`;
}

/* ----- treino ----- */
const ui = { cur: 0, ci: null, fl: 'A', fila: [], celebrar: false, px: 0, py: 0, dia: null };
const rest = { fim: 0, t: null };
const novoW = () => ({ l: proxLetra(), s: {}, c: {}, ini: null, fim: null });
const wAtual = () => lg(today()).w || novoW();
function wEnsure() { const l = L(today()); if (!l.w) l.w = novoW(); return l.w; }
const exCarga = (w, i) => { const ex = S.fichas[w.l][i]; return w.c[i] != null ? w.c[i] : ex.c; };
function cargaTxt(w, i, leve) {
  const ex = S.fichas[w.l][i], v = exCarga(w, i);
  if (ex.u === 's') return `${fmt(v)} s`;
  return fmtKg(leve ? Math.max(.5, Math.round(v * .85 / (v < 10 ? .5 : 2.5)) * (v < 10 ? .5 : 2.5)) : v);
}
const passoCarga = ex => ex.u === 's' ? 5 : (ex.c < 10 ? .5 : 2.5);
function resumoTreino(w, f) {
  const fic = S.fichas[w.l]; let feitas = 0, total = 0;
  fic.forEach((ex, i) => { const n = setsDe(f, i); total += n; feitas += (w.s[i] || []).slice(0, n).filter(Boolean).length; });
  return { feitas, total };
}
function restBox() {
  const s = Math.max(0, Math.ceil((rest.fim - Date.now()) / 1000));
  return rest.fim && s > 0
    ? `<span class="rest" aria-label="Descanso">${ico('clock', 14)}<span id="rest">${Math.floor(s / 60)}:${pad(s % 60)}</span></span><button data-act="pular" class="link" style="padding:8px 4px">PULAR</button>`
    : `<span class="xs" style="display:inline-flex;align-items:center;gap:4px">${ico('clock', 14)}descanso 90–120 s</span>`;
}
function vTreino() {
  const k = today(), l = lg(k), w = wAtual(), f = faseDe(k), fic = S.fichas[w.l], leve = l.enjoo;
  const { feitas, total } = resumoTreino(w, f);
  const cur = Math.min(ui.cur, fic.length - 1), ex = fic[cur], n = setsDe(f, cur), arr = w.s[cur] || [];
  const todas = feitas === total, comecou = feitas > 0;
  return `<div style="flex:1;display:flex;flex-direction:column">
  <header class="thead">
    <div class="row"><a href="#/hoje" class="back" aria-label="Voltar para Hoje">${ico('back')}</a>
      <div class="sp"><div class="bc" style="font-size:24px;line-height:1;letter-spacing:.3px">TREINO ${w.l} · FULL BODY</div><div class="sub">Semana ${semana(k)} · ${esc(f.reg)}</div></div>
      <div style="text-align:right"><div class="bc" style="font-size:24px;line-height:1">${feitas}/${total}</div><div class="xs" style="color:#D6E2FF">séries</div></div></div>
    <div class="tbars" style="grid-template-columns:repeat(${fic.length},minmax(0,1fr))" aria-hidden="true">${fic.map((_, i) => { const nn = setsDe(f, i), c = (w.s[i] || []).slice(0, nn).filter(Boolean).length; return `<i class="${c === nn ? 'f' : c ? 'p' : ''}"></i>`; }).join('')}</div>
    <button class="sw" data-act="leve" aria-pressed="${leve}"><span class="tg"><i></i></span><span class="sp"><b>Modo leve · dia de enjoo</b><span>Carga 15% menor, XP cheio. Sua ficha manda reduzir 10–20%.</span></span></button>
  </header>
  <div class="scr" style="padding-top:14px">
    <section class="excard">
      <div class="row" style="justify-content:space-between"><span class="eyebrow" style="color:var(--blueL)">EXERCÍCIO ${cur + 1} DE ${fic.length}</span><span id="restbox" class="row" style="gap:6px">${restBox()}</span></div>
      <h1 class="bc" style="font-size:28px;line-height:1">${esc(ex.n)}</h1>
      <div class="sm">${esc(ex.t)}</div>
      <div class="stepper" aria-label="Carga do exercício">
        <button data-act="carga" data-d="-1" aria-label="Diminuir carga" ${leve ? 'disabled' : ''}>−</button>
        <input inputmode="decimal" data-in="carga" value="${leve ? esc(cargaTxt(w, cur, true).replace(/ (kg|s)$/, '')) : esc(fmt(exCarga(w, cur), Number.isInteger(exCarga(w, cur)) ? 0 : 1))}" aria-label="Carga em ${ex.u}" ${leve ? 'disabled' : ''}>
        <button data-act="carga" data-d="1" aria-label="Aumentar carga" ${leve ? 'disabled' : ''}>+</button>
      </div>
      <div style="display:flex;flex-direction:column;gap:8px">
        ${[...Array(n)].map((_, j) => `<button class="setb ${arr[j] ? 'on' : ''}" data-act="set" data-j="${j}" aria-pressed="${!!arr[j]}"><span class="sn">SÉRIE ${j + 1}</span><span class="sl">${esc(cargaTxt(w, cur, leve))} <small>× ${esc(ex.r)}</small></span><span class="bx">${ico('check')}</span></button>`).join('')}
      </div>
      <div class="hint">${ico('trend')}<span class="sp">Bateu 12 reps nas ${n} séries com 2 de sobra? Próxima sessão: +2 a 5% de carga.</span></div>
    </section>
    <section style="display:flex;flex-direction:column;gap:6px">
      <div class="row" style="justify-content:space-between"><h2 class="lab2">FICHA DE HOJE</h2>
        <span class="row" style="gap:10px"><span class="seg" role="group" aria-label="Ficha">${['A', 'B'].map(c => `<button data-act="letra" data-v="${c}" class="${w.l === c ? 'on' : ''}" aria-pressed="${w.l === c}" ${comecou ? 'disabled' : ''}>${c}</button>`).join('')}</span><a href="#/ficha" class="link">EDITAR</a></span></div>
      <div class="card tight" style="border-radius:16px">
        ${fic.map((e, i) => { const nn = setsDe(f, i), c = (w.s[i] || []).slice(0, nn).filter(Boolean).length, full = c === nn;
          return `<button class="exl" data-act="cur" data-i="${i}"><span class="nb ${full ? 'ok' : i === cur ? 'cur' : ''}">${i + 1}</span><span class="nm">${esc(e.n)}</span><span class="st">${full ? 'FEITO' : c ? `${c}/${nn}` : esc(cargaTxt(w, i, leve))}</span></button>`; }).join('')}
      </div>
    </section>
    <button class="btn ${todas ? '' : 'off'}" data-act="fin">${todas ? 'FINALIZAR TREINO · +60 XP' : `AINDA NÃO DÁ (${feitas} DE ${total})`}</button>
    ${!todas && comecou ? `<button class="link" data-act="finp" style="padding:6px">Encerrar assim mesmo (sem o XP de treino completo)</button>` : ''}
  </div></div>`;
}

function vRecorde() {
  const k = today(), l = lg(k), w = l.w, f = faseDe(k), { feitas, total } = resumoTreino(w, f);
  const recs = (w.recs || []).slice().sort((a, b) => (b.para - b.de) - (a.para - a.de)), top = recs[0];
  const q = seqAtual();
  const prox = REFEICOES.map((r, i) => ({ r, i })).filter(x => !x.r.extra && !l.m[x.i]);
  const hm = `${pad(NOW().getHours())}:${pad(NOW().getMinutes())}`;
  const pm = prox.find(x => x.r.h >= hm) || prox[0];
  const sug = (w.sug || {});
  const sugs = S.fichas[w.l].map((ex, i) => ({ ex, i })).filter(({ ex, i }) => {
    const n = setsDe(f, i); return !w.leve && ex.u !== 's' && (w.s[i] || []).slice(0, n).filter(Boolean).length === n && !(w.recs || []).some(r => r.i === i);
  });
  let bars = '';
  if (top) {
    const h = (S.hist[top.n] || []).slice(-6), mx = Math.max(...h, top.para);
    bars = [...Array(6)].map((_, i) => i < h.length ? `<i class="${i === h.length - 1 ? 'n' : ''}" style="height:${Math.max(24, h[i] / mx * 100)}%"></i>` : '<i class="d"></i>').join('');
  }
  return `<div class="scr win" style="gap:16px;padding-bottom:22px">
    <div class="glow" aria-hidden="true"></div>
    <div class="row" style="width:100%;justify-content:space-between"><a href="#/hoje" class="back" aria-label="Fechar">${ico('close')}</a><span class="pill fire">${ico('flame', 16)}OFENSIVA ${q} ${q === 1 ? 'DIA' : 'DIAS'}</span></div>
    <div style="text-align:center"><div class="eyebrow" style="letter-spacing:1px;color:var(--mut);font-size:14px">TREINO ${w.l}</div>
      <h1 style="margin-top:4px;font:italic 800 ${w.completo ? 62 : 44}px/.9 'Barlow Condensed',sans-serif;color:var(--lime)">${w.completo ? 'FORJADO!' : 'TREINO REGISTRADO'}</h1>
      <div style="margin-top:12px;display:inline-flex;gap:6px;flex-wrap:wrap;justify-content:center">
        ${w.completo ? `<span class="bc" style="background:var(--lime);color:var(--bg);border-radius:999px;padding:5px 14px;font-size:18px">+60 XP</span>` : `<span class="bc" style="background:var(--line2);color:var(--mut);border-radius:999px;padding:5px 14px;font-size:18px">${feitas} de ${total} séries</span>`}
        ${w.xpRec ? `<span class="bc" style="background:var(--line2);color:var(--lime);border-radius:999px;padding:5px 14px;font-size:18px">+${w.xpRec} RECORDE</span>` : ''}</div></div>
    ${top ? `<section class="rec"><div class="row" style="gap:8px"><span style="width:34px;height:34px;border-radius:10px;background:var(--lime);color:var(--bg);display:flex;align-items:center;justify-content:center">${ico('trend', 20)}</span><span class="eyebrow" style="color:var(--lime);letter-spacing:.8px;font-size:13px">NOVO RECORDE DE CARGA</span></div>
      <div class="bc" style="font-size:26px;line-height:1">${esc(top.n.toUpperCase())}</div>
      <div style="display:flex;align-items:baseline;gap:10px"><span class="bc" style="font-size:58px;line-height:.9">${fmt(top.para, Number.isInteger(top.para) ? 0 : 1)} KG</span><span class="bc" style="font-size:22px;color:var(--green)">+${fmt(top.para - top.de, Number.isInteger(top.para - top.de) ? 0 : 1)} KG</span></div>
      <div class="recbars" aria-hidden="true">${bars}</div>
      <div class="sm">Força subindo é o melhor sinal de que o músculo está sendo preservado.${recs.length > 1 ? ` Mais ${recs.length - 1} ${recs.length > 2 ? 'recordes' : 'recorde'} hoje.` : ''}</div></section>` : ''}
    <section class="stat3"><div><b>${w.dur || 1}<small> MIN</small></b><span>duração</span></div><div><b>${feitas}</b><span>séries</span></div><div><b>${treinosSemana(k)}<small>/${S.dias.length}</small></b><span>treinos da semana</span></div></section>
    ${sugs.length ? `<section class="card" style="width:100%"><div class="lab2" style="margin-bottom:6px">PRÓXIMA SESSÃO · SUBIR CARGA?</div>
      ${sugs.map(({ ex, i }) => { const nova = Math.max(exCarga(w, i) + .5, r5(exCarga(w, i) * 1.04)), ja = sug[i];
        return `<div class="row" style="padding:6px 0;border-bottom:1px solid #22262F"><span class="sp" style="font-size:13px;font-weight:600">${esc(ex.n)}</span><button class="link" data-act="sub" data-i="${i}" data-v="${nova}" ${ja ? 'disabled' : ''} style="padding:8px 4px">${ja ? `OK · ${fmtKg(ja)}` : `${fmtKg(exCarga(w, i))} → ${fmtKg(nova)}`}</button></div>`; }).join('')}
      <div class="xs" style="margin-top:6px">Só suba se bateu todas as repetições com 2 de sobra (+2 a 5%).</div></section>` : ''}
    ${pm ? `<section class="row" style="width:100%;background:#10241A;border:1px solid #1F4A33;border-radius:16px;padding:12px 14px;gap:12px"><span style="width:40px;height:40px;border-radius:12px;background:var(--green);color:var(--bg);display:flex;align-items:center;justify-content:center;flex-shrink:0">${ico('food')}</span>
      <div class="sp"><div class="bc" style="font-size:16px;letter-spacing:.3px">PRÓXIMA: ${esc(pm.r.nome.toUpperCase())} · ${pm.r.h}</div><div style="font-size:12px;font-weight:600;color:#9FE3C1">${esc(pm.r.desc)} · ${pm.r.prot} g de proteína</div></div></section>` : ''}
    <a href="#/hoje" class="btn" style="margin-top:auto">CONTINUAR</a>
  </div>`;
}

/* ----- comida ----- */
function vComida() {
  const k = today(), l = lg(k), m = macro(l), pm = protMeta(l), planFeitas = l.m.slice(0, 5).filter(Boolean).length, meta = passosMeta(k);
  const pPct = Math.min(100, m.p / 148 * 100), kPct = Math.min(100, m.c / 2300 * 100);
  const protMsg = m.p >= pm ? 'Meta de proteína batida! +25 XP' : l.enjoo ? `Faltam ${pm - m.p} g para o piso de 100 g (dia de enjoo)` : `Faltam ${pm - m.p} g para a meta (piso de 100 g em dia de pouco apetite)`;
  const kMsg = m.c < KCAL_MIN ? (planFeitas >= 5 ? 'Abaixo da faixa: se sentir fome, inclua o extra opcional.' : 'Dentro do esperado para o horário.') : m.c <= KCAL_MAX ? 'Dentro da faixa.' : 'Acima da faixa hoje; amanhã segue o plano.';
  return `<div class="scr">
    <header class="head"><div><h1 class="h1">COMBUSTÍVEL</h1><div class="sm" style="margin-top:3px">${treinoDia(k) ? 'Dia de treino · proteína primeiro, devagar' : 'Dia de descanso · proteína e água fecham o dia'}</div></div><span class="bc" style="font-size:18px;color:var(--lime)">+${xpComida(l, k)} XP</span></header>
    <section class="card" style="display:flex;flex-direction:column;gap:12px">
      <div style="display:flex;flex-direction:column;gap:6px">
        <div class="row" style="justify-content:space-between;align-items:baseline"><span class="lab">PROTEÍNA</span><span class="bc" style="font-size:22px;line-height:1">${m.p} <small style="font-size:13px;color:var(--mut)">/ 115–135 g</small></span></div>
        <div class="zone" role="progressbar" aria-valuenow="${m.p}" aria-valuemin="0" aria-valuemax="148" aria-label="Proteína"><s style="left:${115 / 148 * 100}%;width:${20 / 148 * 100}%;background:#1F4A33"></s><i style="width:${pPct}%;background:var(--green)"></i></div>
        <div style="font-size:12px;font-weight:600;color:#9FE3C1">${protMsg}</div></div>
      <div style="display:flex;flex-direction:column;gap:6px">
        <div class="row" style="justify-content:space-between;align-items:baseline"><span class="lab">ENERGIA</span><span class="bc" style="font-size:22px;line-height:1">${fmt(m.c)} <small style="font-size:13px;color:var(--mut)">/ 1.900–2.100 kcal</small></span></div>
        <div class="zone" role="progressbar" aria-valuenow="${m.c}" aria-valuemin="0" aria-valuemax="2300" aria-label="Energia"><s style="left:${KCAL_MIN / 23}%;width:${(KCAL_MAX - KCAL_MIN) / 23}%;background:#3A3A1E"></s><i style="width:${kPct}%;background:var(--yellow)"></i></div>
        <div class="sm">${kMsg}</div></div>
    </section>
    <section class="card" style="padding:12px 14px;display:flex;flex-direction:column;gap:8px">
      <div class="row" style="justify-content:space-between;align-items:baseline"><span class="lab">ÁGUA · TOQUE NOS COPOS</span><span class="bc" style="font-size:18px;color:var(--cyan)">${fmt(l.agua * .25, 2).replace(/0$/, '')} / 2,5 L</span></div>
      <div class="cups">${[...Array(COPOS)].map((_, i) => `<button class="${i < l.agua ? 'on' : ''}" data-act="copo" data-i="${i}" aria-label="Copo ${i + 1} de 250 ml" aria-pressed="${i < l.agua}"></button>`).join('')}</div>
    </section>
    <section style="display:flex;flex-direction:column;gap:6px">
      <h2 class="lab2">REFEIÇÕES DE HOJE</h2>
      <div class="card tight">${REFEICOES.map((r, i) => `<button class="meal ${l.m[i] ? 'on' : ''} ${r.extra ? 'opt' : ''}" data-act="refeicao" data-i="${i}" aria-pressed="${l.m[i]}"><span class="mh">${r.h}</span><span class="ck">${ico('check')}</span><span class="sp"><b>${esc(r.nome)}</b><small>${esc(r.desc)}</small></span><span class="pg">${r.prot} g</span></button>`).join('')}</div>
    </section>
    <section class="chips2">
      <button class="chip ${l.cre ? 'on' : ''}" data-act="supl" data-k="cre" aria-pressed="${l.cre}"><b>CREATINA 3–5 G</b><small>Todo dia, com o lanche</small></button>
      <button class="chip ${l.whey ? 'on' : ''}" data-act="supl" data-k="whey" aria-pressed="${l.whey}"><b>WHEY 1 SCOOP</b><small>16:30 · seg a sáb</small></button>
    </section>
    <section class="card" style="display:flex;flex-direction:column;gap:12px">
      <div class="cnt"><div class="row" style="justify-content:space-between;align-items:baseline"><span class="lab" style="color:var(--orange)">PASSOS</span><span class="xs">meta ${fmt(meta)} · +20 XP</span></div>
        <div class="stepper"><button data-act="cnt" data-k="passos" data-d="-500" aria-label="Menos 500 passos">−</button><input inputmode="numeric" data-in="cnt" data-k="passos" value="${l.passos}" aria-label="Passos de hoje"><button data-act="cnt" data-k="passos" data-d="500" aria-label="Mais 500 passos">+</button></div></div>
      <div class="cnt"><div class="row" style="justify-content:space-between;align-items:baseline"><span class="lab" style="color:var(--yellow)">FIBRA (g)</span><span class="xs">meta ${FIBRA_META} g · +10 XP</span></div>
        <div class="stepper"><button data-act="cnt" data-k="fibra" data-d="-5" aria-label="Menos 5 gramas">−</button><input inputmode="numeric" data-in="cnt" data-k="fibra" value="${l.fibra}" aria-label="Fibra de hoje em gramas"><button data-act="cnt" data-k="fibra" data-d="5" aria-label="Mais 5 gramas">+</button></div></div>
    </section>
    <button class="chip ${l.enjoo ? 'on' : ''}" data-act="enjoo" aria-pressed="${l.enjoo}" style="width:100%"><b>DIA DE ENJOO</b><small>Piso de proteína de 100 g vale XP cheio e o treino vira modo leve.</small></button>
  </div>${nav('comida')}`;
}

/* ----- jornada ----- */
function vJornada() {
  const k = today(), sem = semana(k), fa = faseDe(k), cks = Object.keys(S.checkins).sort(), ult = cks.length ? S.checkins[cks[cks.length - 1]] : null;
  const ultCin = cks.map(d => S.checkins[d]).filter(c => c.cin).pop();
  const peso = ult ? ult.peso : S.base;
  const bossLinha = (f, cheio) => { const b = bossProg(f), feito = !!S.boss[f.boss.id];
    return `<div class="${cheio ? 'boss' + (feito ? ' ok' : '') : ''}" ${cheio ? '' : 'style="font-size:12px;font-weight:700"'}>
      ${cheio ? `<span class="ic">${ico(feito ? 'check' : 'shield')}</span>` : ''}
      <span class="sp" style="font-size:12px;font-weight:700">Chefão S${f.fim}: <span style="color:${feito ? 'var(--lime)' : '#FFA866'}">${f.boss.nome}</span> · ${f.boss.desc}${cheio ? `<span class="minibar"><i style="width:${b.n / b.meta * 100}%"></i></span>` : ` · ${b.n}/${b.meta}`}</span>
      ${cheio ? `<span class="bc" style="font-size:14px;color:var(--lime);text-align:right;line-height:1.1">${feito ? 'FEITO' : `${b.n}/${b.meta}<br>+${f.boss.xp}`}</span>` : ''}</div>`; };
  return `<div class="scr">
    <header><h1 class="h1">JORNADA · 12 SEMANAS</h1><div class="sm" style="margin-top:3px">4 fases, 4 chefões. Cada semana completa acende um degrau.</div></header>
    <section class="chips2">
      <a href="#/checkin" class="card" style="padding:12px"><div class="eyebrow" style="font-size:11px;color:var(--mut)">PESO · ${ult ? 'ATUAL' : 'LINHA DE BASE'}</div><div class="bc" style="font-size:30px;line-height:1.05;margin-top:4px">${fmt(peso, 1)} <span style="font-size:15px;color:var(--mut)">KG</span></div><div class="xs" style="color:var(--lime);margin-top:2px">Pesagem: segunda ao acordar</div></a>
      <a href="#/checkin" class="card" style="padding:12px"><div class="eyebrow" style="font-size:11px;color:var(--mut)">CINTURA</div><div class="bc" style="font-size:30px;line-height:1.05;margin-top:4px;${ultCin ? '' : 'color:var(--mut2)'}">${ultCin ? fmt(ultCin.cin, 1) : '—'} <span style="font-size:15px">CM</span></div><div class="xs" style="color:var(--lime);margin-top:2px">Medir a cada 2 semanas</div></a>
    </section>
    ${FASES.map(f => {
      const atual = f.id === fa.id, ws = []; for (let w = f.ini; w <= f.fim; w++) ws.push(w);
      if (!atual) return `<section class="fase"><div class="row" style="justify-content:space-between"><span class="bc" style="font-size:17px;color:${f.cor}">FASE ${f.id} · ${f.nome.toUpperCase()}</span><span class="xs">${f.ini === f.fim ? 'S' + f.ini : `S${f.ini}–S${f.fim}`} · ${f.id === 3 ? '8–10 mil' : fmt(f.passos[0]) + ' passos'}</span></div><div class="sm">${f.reg}</div>${bossLinha(f, false)}</section>`;
      return `<section class="fase cur"><div class="row" style="justify-content:space-between"><span class="bc" style="font-size:18px;letter-spacing:.3px;color:var(--lime)">FASE ${f.id} · ${f.nome.toUpperCase()}</span><span style="font-size:11px;font-weight:800;color:var(--bg);background:var(--lime);border-radius:999px;padding:3px 8px">VOCÊ ESTÁ AQUI</span></div>
        <div class="wk" style="grid-template-columns:repeat(${ws.length},minmax(0,1fr))">${ws.map((w, i) => `<div class="${w === sem ? 'now' : w < sem ? 'ok' : ''}"><b>S${w}</b><span>${w < sem ? '✓' : fmt(f.passos[i]) + (w === sem ? ' passos' : '')}</span></div>`).join('')}</div>
        <div style="font-size:12px;font-weight:600;color:#D9F57A">${f.det}</div>
        ${bossLinha(f, true)}
        ${f.id === 4 ? `<button class="chip ${S.consulta ? 'on' : ''}" data-act="consulta" aria-pressed="${S.consulta}" style="width:100%"><b>CONSULTA FEITA</b><small>Marque depois de conversar com seu médico sobre a próxima temporada.</small></button>` : ''}
      </section>`; }).join('')}
    <a href="#/regras" class="btn ghost">COMO A FORJA FUNCIONA</a>
  </div>${nav('jornada')}`;
}

/* ----- check-in ----- */
function ciInicial() {
  const k = today(), ja = S.checkins[k], ks = Object.keys(S.checkins).sort(), ult = ks.length ? S.checkins[ks[ks.length - 1]] : null;
  return ja ? { peso: ja.peso, enjoo: ja.enjoo, cin: ja.cin, foto: !!ja.foto } : { peso: ult ? ult.peso : S.base, enjoo: 3, cin: null, foto: false };
}
function vCheckin() {
  const k = today(), c = ui.ci || (ui.ci = ciInicial());
  const ant = Object.keys(S.checkins).filter(d => d < k).sort().pop(), base = ant ? S.checkins[ant].peso : S.base;
  const dSem = Math.round((c.peso - base) * 10) / 10, dTot = Math.round((c.peso - S.base) * 10) / 10;
  const prev = { ...S.checkins, [k]: { peso: c.peso, enjoo: c.enjoo, cin: c.cin, foto: c.foto } };
  const ganho = xpCheckinsDe(prev) - xpCheckinsDe(S.checkins);
  const fazer = ganho > 0 || !S.checkins[k];
  const xp = Math.max(ganho, 0);
  const msg = c.enjoo >= 6 ? 'Enjoo alto: nos próximos treinos o app sugere o modo leve e porções menores, mais vezes ao dia.' : c.enjoo >= 3 ? 'Enjoo leve a moderado. Modo leve fica à mão nos dias seguintes à aplicação.' : 'Sem enjoo relevante. Segue o plano normal.';
  return `<div class="scr">
    <header class="row"><a href="#/jornada" class="back" aria-label="Voltar para a Jornada">${ico('back')}</a><div class="sp"><h1 class="bc" style="font-size:26px;line-height:1">CHECK-IN DE SEGUNDA</h1><div class="sm" style="margin-top:2px">Semana ${semana(k)} · 2 minutos · registrar vale XP, não o número</div></div></header>
    <section class="card" style="border-radius:20px;display:flex;flex-direction:column;gap:10px">
      <div class="row" style="justify-content:space-between"><span class="lab">1 · PESO</span><span class="xs">ao acordar, depois do banheiro</span></div>
      <div class="row">
        <button data-act="peso" data-d="-0.1" aria-label="Diminuir 100 g" style="width:52px;height:52px;border-radius:16px;background:var(--line2);font:800 28px 'Barlow Condensed',sans-serif">−</button>
        <div class="sp" style="text-align:center;display:flex;align-items:baseline;justify-content:center;gap:4px"><input class="bigin" inputmode="decimal" data-in="peso" value="${fmt(c.peso, 1)}" aria-label="Peso em quilos" style="max-width:150px"><span class="bc mut" style="font-size:18px">KG</span></div>
        <button data-act="peso" data-d="0.1" aria-label="Aumentar 100 g" style="width:52px;height:52px;border-radius:16px;background:var(--line2);font:800 28px 'Barlow Condensed',sans-serif">+</button></div>
      <div class="row" style="justify-content:center;gap:6px;flex-wrap:wrap"><span class="tag">${sinal(dSem, 'kg')} na semana</span><span class="tag">${sinal(dTot, 'kg')} desde ${fmt(S.base, 1)}</span></div>
      ${dSem < -1 ? `<div class="alert" role="alert">Ritmo acima de 1 kg na semana. Seu plano marca isso como alerta: confira proteína e calorias e fale com seu médico.</div>` : ''}
    </section>
    <section class="card" style="border-radius:20px;display:flex;flex-direction:column;gap:10px">
      <div class="row" style="justify-content:space-between"><span class="lab">2 · ENJOO NA SEMANA</span><span class="xs">0 = nada · 10 = muito</span></div>
      <div class="ns">${[...Array(11)].map((_, v) => `<button data-act="enj" data-v="${v}" class="${v === c.enjoo ? 'on' : ''}" aria-pressed="${v === c.enjoo}">${v}</button>`).join('')}</div>
      <div class="sm">${msg}</div>
    </section>
    <section class="chips2" style="gap:8px">
      <div class="tile"><span class="lab" style="font-size:14px">3 · CINTURA</span><span class="row" style="gap:6px"><input inputmode="decimal" data-in="cin" value="${c.cin ? fmt(c.cin, 1) : ''}" placeholder="—" aria-label="Cintura em centímetros"><span class="bc mut" style="font-size:16px">CM</span></span><span class="xs">Na altura do umbigo, sem apertar · +20 XP</span></div>
      <button class="tile ${c.foto ? 'on' : ''}" data-act="foto" aria-pressed="${c.foto}"><span class="lab" style="font-size:14px">4 · FOTO DO MÊS</span><span class="row" style="gap:6px;color:var(--purple)">${ico('camera')}<span class="bc" style="font-size:18px">${c.foto ? 'FEITO!' : 'FRENTE + LADO'}</span></span><span class="xs">1ª segunda do mês, mesma luz e roupa · +30 XP</span></button>
    </section>
    <section class="card row" style="gap:12px;padding:12px 14px"><span style="width:40px;height:40px;border-radius:12px;background:#251B3D;color:#C4B0FF;display:flex;align-items:center;justify-content:center;flex-shrink:0">${ico('cal')}</span>
      <div class="sp"><label class="bc" style="font-size:15px;letter-spacing:.3px" for="aplic">DIA DA APLICAÇÃO</label>
        <select id="aplic" class="inp" data-in="aplic" style="height:36px;margin:4px 0"><option value="">Não lembrar</option>${DIAS.map((d, i) => `<option value="${i}" ${S.aplic === i ? 'selected' : ''}>${d}</option>`).join('')}</select>
        <div class="xs">O app só lembra e anota em que dias o enjoo é maior. Dose e mudanças: só com o médico.</div></div></section>
    <div class="legal">Vômito que não para ou dor forte na barriga: procure atendimento médico.</div>
    <button class="btn" data-act="salvarci" style="margin-top:auto">${S.checkins[k] ? 'ATUALIZAR' : 'REGISTRAR'}${xp ? ` · +${xp} XP` : ''}</button>
  </div>`;
}

/* ----- troféus ----- */
function vTrofeus() {
  const k = today(), w0 = wkey(k), dias = [...Array(7)].map((_, i) => addDays(w0, i));
  const LIN = [
    { t: `Treino (${S.dias.map(d => DIAS3[d].toLowerCase()).join('/')})`, c: '#4D8DFF', f: l => fez(l), plan: d => treinoDia(d) },
    { t: 'Água 2,5–3 L', c: '#38D6F5', f: gAgua },
    { t: 'Meta de passos', c: '#FF8A3D', f: (l, d) => gPassos(l, d) },
    { t: 'Proteína ≥ 115 g', c: '#2FD18B', f: gProt },
    { t: 'Fibra ≥ 25 g', c: '#FFC53D', f: gFibra },
    { t: 'Whey + creatina', c: '#2FD18B', f: l => l.whey && l.cre },
    { t: 'Cama 22:30', c: '#A78BFA', f: l => l.cama }
  ];
  const conq = CONQ.map(c => ({ ...c, on: !!S.conq[c.id] || c.ok() }));
  const esc_ = S.seq.esc;
  return `<div class="scr">
    <header><h1 class="h1">HÁBITOS DA SEMANA</h1><div class="sm" style="margin-top:3px">Semana ${semana(k)} · ${DIAS[dow(k)].toLowerCase()} · marcam sozinhos quando você registra</div></header>
    <section class="card" style="padding:10px 10px 8px"><table class="habits"><tr><th></th>${dias.map((d, i) => `<th class="${d === k ? 'hj' : ''}">${DIAS1[i]}</th>`).join('')}<th></th></tr>
      ${LIN.map(r => { let n = 0, planN = 0;
        const cels = dias.map(d => { const l = lg(d), ok = !!S.logs[d] && !!r.f(l, d), plan = r.plan ? r.plan(d) : true; if (ok) n++; if (r.plan && plan) planN++;
          if (d > k && !r.plan) return '<td></td>';                       // dias futuros de hábitos diários ficam em branco
          let cl = 'hb';
          if (ok) cl += ' f';                                              // feito: preenchido com a cor do hábito
          else if (r.plan && !plan) cl += '';                              // dia sem treino planejado: quadrado apagado
          else if (d >= k) cl += ' d';                                     // hoje ou futuro planejado: tracejado
          else cl += ' p';                                                 // passou e não foi feito
          return `<td><span class="${cl}" style="--c:${r.c}"></span></td>`; }).join('');
        return `<tr><td>${r.t}</td>${cels}<td>${n}/${r.plan ? planN : 7}</td></tr>`; }).join('')}
    </table></section>
    <div class="row" style="justify-content:space-between;align-items:baseline"><h2 class="bc" style="font-size:22px">CONQUISTAS</h2><span class="sm" style="font-weight:700">${conq.filter(c => c.on).length} de ${conq.length}</span></div>
    <section class="conq">${conq.map(c => `<div class="${c.on ? 'on' : ''}"><span class="b">${ico(c.ico)}</span><span>${c.nome}</span></div>`).join('')}</section>
    <section class="card row" style="gap:12px;padding:12px 14px"><span style="width:44px;height:44px;border-radius:14px;background:#1C3A2A;color:var(--green);display:flex;align-items:center;justify-content:center;flex-shrink:0">${ico('shield')}</span>
      <div class="sp"><div class="bc" style="font-size:16px;letter-spacing:.3px">${esc_ ? `${esc_} ${esc_ === 1 ? 'ESCUDO GUARDADO' : 'ESCUDOS GUARDADOS'}` : 'NENHUM ESCUDO'}</div><div class="xs">Protege a ofensiva num dia de enjoo forte ou imprevisto. Ganhe outro com a semana perfeita.</div></div></section>
    <a href="#/regras" class="btn ghost">COMO A FORJA FUNCIONA</a>
  </div>${nav('trofeus')}`;
}

/* ----- regras ----- */
function vRegras() {
  const li = a => a.map(t => `<li>${t}</li>`).join('');
  return `<div class="scr" style="gap:16px">
    <header class="row"><a href="#/trofeus" class="back" aria-label="Voltar">${ico('back')}</a><h1 class="bc" style="font-size:30px;line-height:1;font-style:italic;color:var(--lime)">COMO A FORJA FUNCIONA</h1></header>
    <p class="sm" style="font-size:14px;line-height:1.5">Seu plano de 12 semanas vira uma temporada. Cada horário da rotina é uma missão, cada fase tem um chefão e cada hábito cumprido vale XP. O jogo premia o que você faz, nunca o número da balança.</p>
    <section class="card"><h2 class="bc" style="font-size:24px;margin-bottom:8px">TABELA DE XP</h2><table class="xpt">
      <tr><td>Treino completo (modo leve conta igual)</td><td>+60</td></tr><tr><td>Novo recorde de carga (por exercício)</td><td>+20</td></tr>
      <tr><td>Refeição do plano registrada</td><td>+15</td></tr><tr><td>Meta de proteína (≥ 115 g, ou 100 g em dia de enjoo)</td><td>+25</td></tr>
      <tr><td>Água 2,5 L</td><td>+20</td></tr><tr><td>Meta de passos do dia</td><td>+20</td></tr><tr><td>Fibra ≥ 25 g</td><td>+10</td></tr>
      <tr><td>Creatina · whey</td><td>+5 cada</td></tr><tr><td>Bolsa pronta 21:30 · cama 22:30</td><td>+5 · +15</td></tr>
      <tr><td>Pesagem de segunda · cintura · foto do mês</td><td>+30 · +20 · +30</td></tr><tr><td>Domingo de cozinhar a semana</td><td>+40</td></tr><tr><td>Chefão de fase derrotado</td><td>+200 a +500</td></tr></table></section>
    <section class="card"><h2 class="bc" style="font-size:24px;margin-bottom:6px">NÍVEIS E TÍTULOS</h2>
      <p style="font-size:14px;line-height:1.55;margin:0">Para passar do nível N: <b>150 × N + 50 XP</b>. Um dia completo rende cerca de 250 XP, então você sobe de nível a cada 2 ou 3 dias no começo.</p>
      <p class="sm" style="font-size:14px;line-height:1.55;margin-top:8px">Títulos: Recruta (1) · Aprendiz (5) · Forjado (10) · Aço (15) · Titã (20) · Lenda da Forja (30).</p></section>
    <section class="card"><h2 class="bc" style="font-size:24px;margin-bottom:6px">OFENSIVA E ESCUDOS</h2><ul style="margin:0;padding-left:18px;font-size:14px;line-height:1.55">${li(['Treino ou 3 missões no dia mantêm o fogo aceso. Dia de descanso do plano conta se você bater proteína e água.', 'Escudo: ganho na semana perfeita (3 de 3 treinos), até 2 guardados. Protege um dia perdido automaticamente.', 'Perder a ofensiva zera só a contagem; o recorde fica.'])}</ul></section>
    <section class="card"><h2 class="bc" style="font-size:24px;margin-bottom:8px">CHEFÕES DA TEMPORADA</h2><table class="xpt">
      ${FASES.map(f => `<tr><td><b>S${f.fim} · ${f.boss.nome}</b><br><span class="mut">${f.boss.desc}</span></td><td>+${f.boss.xp}</td></tr>`).join('')}</table></section>
    <section class="saudavel"><h2 class="bc" style="font-size:30px;font-style:italic;color:var(--yellow);line-height:1">JOGO SAUDÁVEL</h2>
      <div>Regras fixas para o jogo nunca empurrar na direção errada.</div>
      <ul>${li(['<b>XP vem dos hábitos, não da balança.</b> Pesar vale XP por registrar, qualquer que seja o número.', '<b>Comer menos não dá bônus.</b> Calorias têm faixa (1.900–2.100); abaixo dela o app sugere o extra opcional.', '<b>Perda acima de 1 kg na semana</b> aparece como alerta (regra da planilha), nunca como comemoração.', '<b>Dia de enjoo:</b> modo leve (−10–20% de carga) e piso de proteína de 100 g valem XP cheio.', '<b>Pizza da semana faz parte do plano</b>: marcar a refeição livre conta como missão cumprida.', '<b>Medicação:</b> o app só lembra o dia e anota o enjoo. Dose e mudanças ficam com o médico.'])}</ul></section>
    <a href="#/hoje" class="btn">VOLTAR AO JOGO</a>
  </div>`;
}

/* ----- ajustes / início / ficha ----- */
function vAjustes() {
  return `<div class="scr" style="gap:16px">
    <header class="row"><a href="#/hoje" class="back" aria-label="Voltar para Hoje">${ico('back')}</a><h1 class="h1">AJUSTES</h1></header>
    <section class="card" style="display:flex;flex-direction:column;gap:12px">
      <div><label class="lbl" for="a-nome">Seu nome</label><input id="a-nome" class="inp" data-in="nome" value="${esc(S.nome)}" maxlength="24"></div>
      <div><label class="lbl" for="a-ini">Início da temporada (semana 1)</label><input id="a-ini" type="date" class="inp" data-in="inicio" value="${S.inicio}"></div>
      <div><label class="lbl" for="a-base">Peso de partida (kg)</label><input id="a-base" class="inp" inputmode="decimal" data-in="base" value="${fmt(S.base, 1)}"></div>
      <div><span class="lbl">Dias de treino</span><div class="row" style="gap:6px;flex-wrap:wrap">${DIAS3.map((d, i) => `<button class="chip ${S.dias.includes(i) ? 'on' : ''}" data-act="dia" data-i="${i}" aria-pressed="${S.dias.includes(i)}" style="min-height:44px;min-width:52px;align-items:center;padding:6px 10px"><b>${d}</b></button>`).join('')}</div></div>
    </section>
    <section class="card" style="display:flex;flex-direction:column;gap:10px"><div class="lab">SEUS DADOS</div><div class="sm">O progresso fica salvo neste aparelho. Exporte um backup de vez em quando para não perder nada se trocar de celular ou limpar o navegador.</div>
      <button class="btn ghost" data-act="exportar">EXPORTAR BACKUP</button>
      <label class="btn ghost" style="cursor:pointer">IMPORTAR BACKUP<input type="file" accept="application/json,.json" data-in="import" style="display:none"></label></section>
    <section class="card" style="display:flex;flex-direction:column;gap:10px"><div class="lab">TEMPORADA</div>
      <button class="btn ghost" data-act="novatemp">COMEÇAR NOVA TEMPORADA HOJE</button>
      <button class="btn red" data-act="zerar">APAGAR TUDO E RECOMEÇAR</button></section>
    <a href="#/regras" class="btn ghost">COMO A FORJA FUNCIONA</a>
  </div>`;
}
function vInicio() {
  return `<div class="scr" style="gap:16px;justify-content:center">
    <div style="text-align:center"><div class="avatar" style="margin:0 auto 14px;width:76px;height:76px;border-radius:22px">${ico('flame', 40)}</div>
      <h1 style="font:italic 800 56px/.95 'Barlow Condensed',sans-serif;color:var(--lime)">BEM-VINDO<br>À FORJA</h1>
      <p class="sm" style="font-size:14px;margin-top:10px;line-height:1.5">12 semanas, 4 fases, 4 chefões. Treino, comida e hábitos viram missões. O jogo premia o que você faz, nunca o número da balança.</p></div>
    <section class="card" style="display:flex;flex-direction:column;gap:12px">
      <div><label class="lbl" for="i-nome">Seu nome</label><input id="i-nome" class="inp" value="${esc(S.nome)}" maxlength="24"></div>
      <div><label class="lbl" for="i-ini">Começo da Semana 1</label><input id="i-ini" type="date" class="inp" value="${S.inicio}"></div>
      <div><label class="lbl" for="i-base">Peso de partida (kg)</label><input id="i-base" class="inp" inputmode="decimal" value="${fmt(S.base, 1)}"></div></section>
    <button class="btn" data-act="comecar">COMEÇAR A FORJAR</button>
  </div>`;
}
function vFicha() {
  const f = ui.fl, fic = S.fichas[f], bloq = !!(lg(today()).w && lg(today()).w.ini && !lg(today()).w.fim);
  return `<div class="scr" style="gap:14px">
    <header class="row"><a href="#/treino" class="back" aria-label="Voltar para o treino">${ico('back')}</a><div class="sp"><h1 class="h1">EDITAR FICHA</h1><div class="sm" style="margin-top:3px">Nome, carga, repetições e dica de cada exercício.</div></div>
      <span class="seg">${['A', 'B'].map(c => `<button data-act="ftab" data-v="${c}" class="${f === c ? 'on' : ''}" aria-pressed="${f === c}">${c}</button>`).join('')}</span></header>
    ${bloq ? `<div class="alert">Termine o treino de hoje para editar a ficha.</div>` : ''}
    ${fic.map((e, i) => `<section class="card" style="display:flex;flex-direction:column;gap:8px">
      <div class="row"><span style="width:24px;height:24px;border-radius:8px;background:var(--line);display:flex;align-items:center;justify-content:center;font:800 13px 'Barlow Condensed',sans-serif;color:var(--mut);flex-shrink:0">${i + 1}</span><input class="inp sp" data-in="fx" data-i="${i}" data-f="n" value="${esc(e.n)}" aria-label="Nome do exercício ${i + 1}" ${bloq ? 'disabled' : ''}>
        <button data-act="fdel" data-i="${i}" aria-label="Remover exercício" class="back" ${bloq || fic.length <= 1 ? 'disabled' : ''}>${ico('close')}</button></div>
      <div class="row" style="gap:8px"><div class="sp"><label class="lbl">Carga</label><input class="inp" inputmode="decimal" data-in="fx" data-i="${i}" data-f="c" value="${fmt(e.c, Number.isInteger(e.c) ? 0 : 1)}" ${bloq ? 'disabled' : ''}></div>
        <div style="width:84px"><label class="lbl">Unidade</label><select class="inp" data-in="fx" data-i="${i}" data-f="u" ${bloq ? 'disabled' : ''}><option value="kg" ${e.u === 'kg' ? 'selected' : ''}>kg</option><option value="s" ${e.u === 's' ? 'selected' : ''}>seg</option></select></div>
        <div style="width:84px"><label class="lbl">Reps</label><input class="inp" data-in="fx" data-i="${i}" data-f="r" value="${esc(e.r)}" ${bloq ? 'disabled' : ''}></div></div>
      <div><label class="lbl">Dica</label><input class="inp" data-in="fx" data-i="${i}" data-f="t" value="${esc(e.t)}" ${bloq ? 'disabled' : ''}></div></section>`).join('')}
    <button class="btn ghost" data-act="fadd" ${bloq || fic.length >= 10 ? 'disabled' : ''}>+ ADICIONAR EXERCÍCIO</button>
    ${f === 'B' ? `<button class="btn ghost" data-act="fcopy" ${bloq ? 'disabled' : ''}>COPIAR A FICHA A PARA A B</button>` : ''}
    <div class="legal">A ficha B começa igual à A. Troque os exercícios pelos da sua planilha.</div>
  </div>`;
}

/* ============================== efeitos: confete, +XP, avisos ============================== */
function confete(n = 38) {
  if (RM()) return;
  const fx = $('#fx'), cores = ['#C6F135', '#4D8DFF', '#FF8A3D', '#2FD18B', '#A78BFA', '#FFC53D'];
  for (let i = 0; i < n; i++) {
    const s = document.createElement('span'); s.className = 'cf'; s.style.left = Math.random() * 100 + '%'; s.style.background = cores[i % cores.length];
    s.style.setProperty('--dx', (Math.random() * 160 - 80) + 'px'); s.style.setProperty('--r', (Math.random() * 720 - 360) + 'deg'); s.style.animationDelay = (Math.random() * .3) + 's';
    fx.appendChild(s); setTimeout(() => s.remove(), 2300);
  }
}
function popXp(n) {
  const el = document.createElement('div'); el.className = 'xpop'; el.textContent = `+${n} XP`;
  el.style.left = (ui.px || innerWidth / 2) + 'px'; el.style.top = ((ui.py || innerHeight * .6) - 30) + 'px';
  document.body.appendChild(el); setTimeout(() => el.remove(), 700);
}
let toastT;
function toast(msg) { const t = $('#toast'); t.textContent = msg; t.classList.add('on'); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('on'), 2600); }
function overlay(o) { ui.fila.push(o); if (!$('.ov')) proxOverlay(); }
function proxOverlay() {
  const o = ui.fila.shift(); if (!o) return;
  const d = document.createElement('div'); d.className = 'ov'; d.setAttribute('role', 'dialog'); d.setAttribute('aria-modal', 'true');
  d.innerHTML = `<div class="ovc"><div class="eyebrow" style="letter-spacing:1px;color:var(--mut);font-size:14px">${esc(o.topo)}</div><h2>${esc(o.titulo)}</h2><div class="sm" style="font-size:14px">${esc(o.sub)}</div>${o.xp ? `<div><span class="bc" style="background:var(--lime);color:var(--bg);border-radius:999px;padding:5px 14px;font-size:18px">+${o.xp} XP</span></div>` : ''}<button class="btn" data-ov>CONTINUAR</button></div>`;
  document.body.appendChild(d); confete(46); vibrar([30, 40, 30]);
  d.querySelector('[data-ov]').addEventListener('click', () => { d.remove(); proxOverlay(); });
  d.querySelector('[data-ov]').focus();
}

/* ============================== ações ============================== */
function commit(fn) {
  const antes = xpTotal(), nvA = nivelDe(antes).n;
  fn();
  const bosses = checkBosses();
  const novas = CONQ.filter(c => !S.conq[c.id] && c.ok());
  novas.forEach(c => { S.conq[c.id] = today(); });
  const depois = xpTotal(), nvD = nivelDe(depois).n;
  salvar();
  if (depois > antes) popXp(depois - antes);
  bosses.forEach(f => overlay({ topo: 'CHEFÃO DERROTADO', titulo: f.boss.nome.toUpperCase() + '!', sub: f.boss.desc, xp: f.boss.xp }));
  if (nvD > nvA) overlay({ topo: 'SUBIU DE NÍVEL', titulo: `NÍVEL ${nvD}!`, sub: `Você agora é ${titulo(nvD)}.` });
  if (novas.length) toast('Conquista: ' + novas.map(c => c.nome).join(' · '));
  render();
}
const go = r => { location.hash = '#/' + r; };

function restIniciar() {
  rest.fim = Date.now() + 90000; clearInterval(rest.t); rest.t = setInterval(restTick, 250);
  const b = $('#restbox'); if (b) b.innerHTML = restBox();
}
function restTick() {
  const s = Math.max(0, Math.ceil((rest.fim - Date.now()) / 1000)), el = $('#rest');
  if (el) el.textContent = `${Math.floor(s / 60)}:${pad(s % 60)}`;
  if (s <= 0) { clearInterval(rest.t); const acabou = rest.fim > 0; rest.fim = 0; const b = $('#restbox'); if (b) { b.innerHTML = restBox(); if (acabou) toast('Descanso acabou. Próxima série!'); } if (acabou) vibrar([200, 100, 200]); }
}

const AC = {
  mis(el) {
    const id = el.dataset.id, k = today();
    if (id === 'tr') return go('treino');
    if (id === 'ci') return go('checkin');
    if (id === 'auto') return toast('Esse fecha sozinho: bata proteína e água.');
    commit(() => {
      const l = L(k);
      if (id[0] === 'm' && id.length === 2) {
        const i = +id[1]; l.m[i] = !l.m[i];
        if (i === 3) { l.whey = l.m[3]; l.cre = l.m[3]; }
      } else if (id === 'bolsa' || id === 'cama' || id === 'cook') l[id] = !l[id];
    });
  },
  leve() { commit(() => { const l = L(today()); l.enjoo = !l.enjoo; }); },
  enjoo() { AC.leve(); },
  letra(el) { const l = lg(today()); if (l.w && Object.values(l.w.s).some(a => a.some(Boolean))) return; commit(() => { wEnsure().l = el.dataset.v; ui.cur = 0; }); },
  cur(el) { ui.cur = +el.dataset.i; render(); },
  set(el) {
    const j = +el.dataset.j, k = today(), f = faseDe(k);
    let ligou = false;
    commit(() => {
      const w = wEnsure(), i = Math.min(ui.cur, S.fichas[w.l].length - 1), n = setsDe(f, i);
      const arr = w.s[i] || (w.s[i] = []); for (let a = 0; a < n; a++) arr[a] = !!arr[a];
      arr[j] = !arr[j]; ligou = arr[j]; if (ligou && !w.ini) w.ini = Date.now();
      if (ligou) { const { feitas, total } = resumoTreino(w, f); if (feitas < total) { ui.restPedir = true; } }
    });
    if (ligou) { vibrar(15); if (ui.restPedir) { ui.restPedir = false; restIniciar(); } }
  },
  carga(el) { const w = wAtual(), i = Math.min(ui.cur, S.fichas[w.l].length - 1), ex = S.fichas[w.l][i], p = passoCarga(ex); commit(() => { const ww = wEnsure(); ww.c[i] = Math.max(p, r5(exCarga(ww, i) + (+el.dataset.d) * p)); }); },
  pular() { clearInterval(rest.t); rest.fim = 0; const b = $('#restbox'); if (b) b.innerHTML = restBox(); },
  fin() { finalizar(false); },
  finp() { finalizar(true); },
  sub(el) { const i = +el.dataset.i, v = +el.dataset.v; commit(() => { const w = wEnsure(); S.fichas[w.l][i].c = v; (w.sug || (w.sug = {}))[i] = v; }); },
  copo(el) { const i = +el.dataset.i; commit(() => { const l = L(today()); l.agua = (i + 1 === l.agua) ? i : i + 1; }); },
  refeicao(el) { const i = +el.dataset.i; commit(() => { const l = L(today()); l.m[i] = !l.m[i]; if (i === 3 && !l.m[3]) { l.whey = false; l.cre = false; } }); },
  supl(el) { const kk = el.dataset.k; commit(() => { const l = L(today()); l[kk] = !l[kk]; }); },
  cnt(el) { const kk = el.dataset.k, d = +el.dataset.d; commit(() => { const l = L(today()); l[kk] = Math.max(0, l[kk] + d); }); },
  peso(el) { const c = ui.ci || (ui.ci = ciInicial()); c.peso = Math.max(30, Math.round((c.peso + (+el.dataset.d)) * 10) / 10); render(); },
  enj(el) { (ui.ci || (ui.ci = ciInicial())).enjoo = +el.dataset.v; render(); },
  foto() { const c = ui.ci || (ui.ci = ciInicial()); c.foto = !c.foto; render(); },
  salvarci() {
    const k = today(), c = ui.ci || ciInicial();
    commit(() => { S.checkins[k] = { peso: c.peso, enjoo: c.enjoo, cin: c.cin || null, foto: !!c.foto }; });
    ui.ci = null; toast('Check-in registrado. Bom trabalho!'); go('jornada');
  },
  consulta() { commit(() => { S.consulta = !S.consulta; }); },
  ftab(el) { ui.fl = el.dataset.v; render(); },
  fadd() { commit(() => { S.fichas[ui.fl].push({ n: 'Novo exercício', c: 10, r: '10–12', u: 'kg', t: '' }); }); },
  fdel(el) { commit(() => { S.fichas[ui.fl].splice(+el.dataset.i, 1); }); ui.cur = 0; },
  fcopy() { if (confirm('Substituir a ficha B pela ficha A?')) commit(() => { S.fichas.B = clone(S.fichas.A); }); },
  dia(el) { const i = +el.dataset.i; commit(() => { const s = new Set(S.dias); s.has(i) ? s.delete(i) : s.add(i); S.dias = [...s].sort(); }); },
  exportar() {
    const blob = new Blob([JSON.stringify(S, null, 2)], { type: 'application/json' }), a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = `forja-backup-${today()}.json`; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 1500);
    toast('Backup baixado.');
  },
  novatemp() {
    if (!confirm('Começar uma nova temporada hoje? Seu histórico é mantido; chefões e semanas recomeçam.')) return;
    commit(() => { S.inicio = today(); S.boss = {}; S.consulta = false; S.seq.ate = addDays(S.inicio, -1); S.seq.n = 0; });
    toast('Nova temporada começou!'); go('hoje');
  },
  zerar() {
    if (!confirm('Apagar TODO o progresso deste aparelho? Isso não pode ser desfeito.')) return;
    try { localStorage.removeItem(KEY); } catch (e) {}
    S = novoEstado(); ui.ci = null; ui.cur = 0; go('hoje'); render();
  },
  comecar() {
    const nome = $('#i-nome').value.trim() || 'Atleta', ini = $('#i-ini').value || today(), base = num($('#i-base').value);
    commit(() => { S.nome = nome; S.inicio = ini; if (isFinite(base) && base > 30 && base < 400) S.base = Math.round(base * 10) / 10; S.onboard = true; S.seq.ate = addDays(ini, -1); });
    go('hoje');
  }
};

function finalizar(parcial) {
  const k = today(), f = faseDe(k), w0 = wAtual(), { feitas, total } = resumoTreino(w0, f);
  if (!parcial && feitas < total) return toast(`Faltam ${total - feitas} séries. Marque todas ou encerre assim mesmo.`);
  if (feitas === 0) return toast('Marque ao menos uma série.');
  const msgs = [];
  commit(() => {
    const l = L(k), w = wEnsure(), fic = S.fichas[w.l], recs = [];
    fic.forEach((ex, i) => {
      const n = setsDe(f, i), c = (w.s[i] || []).slice(0, n).filter(Boolean).length;
      if (c === n && !l.enjoo) {
        const carga = exCarga(w, i); (S.hist[ex.n] || (S.hist[ex.n] = [])).push(carga);
        const prev = S.melhor[ex.n];
        if (prev === undefined) S.melhor[ex.n] = carga;
        else if (carga > prev) { S.melhor[ex.n] = carga; recs.push({ n: ex.n, de: prev, para: carga, i }); S.recs.push({ d: k, n: ex.n, de: prev, para: carga }); }
        ex.c = carga;
      }
    });
    w.fim = Date.now(); w.completo = feitas === total; w.leve = l.enjoo; w.recs = recs; w.xpRec = recs.length * 20;
    w.dur = Math.max(1, Math.round((w.fim - (w.ini || w.fim)) / 60000)); w.tot = total;
    if (w.completo && treinosSemana(k) >= S.dias.length && !S.semEsc[wkey(k)]) { S.semEsc[wkey(k)] = true; S.seq.esc = Math.min(2, S.seq.esc + 1); msgs.push('Semana perfeita! +1 escudo guardado.'); }
  });
  clearInterval(rest.t); rest.fim = 0; ui.celebrar = true; msgs.forEach(toast); go('recorde'); render();
}

const IN = {
  carga(el) { const v = num(el.value); if (!isFinite(v) || v <= 0 || v > 500) return render(); const w = wAtual(), i = Math.min(ui.cur, S.fichas[w.l].length - 1); commit(() => { wEnsure().c[i] = r5(v); }); },
  cnt(el) { const v = Math.round(num(el.value)), kk = el.dataset.k; if (!isFinite(v) || v < 0 || v > 99999) return render(); commit(() => { L(today())[kk] = v; }); },
  peso(el) { const v = num(el.value); const c = ui.ci || (ui.ci = ciInicial()); if (isFinite(v) && v >= 30 && v <= 400) c.peso = Math.round(v * 10) / 10; render(); },
  cin(el) { const v = num(el.value); const c = ui.ci || (ui.ci = ciInicial()); c.cin = isFinite(v) && v >= 30 && v <= 300 ? Math.round(v * 10) / 10 : null; render(); },
  aplic(el) { commit(() => { S.aplic = el.value === '' ? null : +el.value; }); },
  nome(el) { commit(() => { S.nome = el.value.trim() || 'Atleta'; }); },
  inicio(el) { if (!el.value) return render(); commit(() => { S.inicio = el.value; S.seq.ate = addDays(S.inicio, -1); S.seq.n = 0; }); },
  base(el) { const v = num(el.value); commit(() => { if (isFinite(v) && v > 30 && v < 400) S.base = Math.round(v * 10) / 10; }); },
  fx(el) {
    const i = +el.dataset.i, f = el.dataset.f; let v = el.value;
    if (f === 'c') { v = num(v); if (!isFinite(v) || v <= 0 || v > 500) return render(); v = r5(v); }
    else if (f === 'n') { v = v.trim() || 'Exercício'; }
    commit(() => { S.fichas[ui.fl][i][f] = v; });
  },
  import(el) {
    const arq = el.files && el.files[0]; if (!arq) return;
    const fr = new FileReader();
    fr.onload = () => {
      try {
        const o = JSON.parse(fr.result);
        if (!o || o.v !== 1 || !o.logs || !o.fichas) throw new Error('formato');
        if (!confirm('Importar este backup? Ele substitui o progresso atual deste aparelho.')) return;
        S = Object.assign(novoEstado(), o); salvar(); toast('Backup importado.'); go('hoje'); render();
      } catch (e) { toast('Esse arquivo não parece um backup da Forja.'); }
    };
    fr.readAsText(arq);
  }
};

/* ============================== roteamento e boot ============================== */
const ROTAS = { hoje: vHoje, treino: vTreino, recorde: vRecorde, comida: vComida, jornada: vJornada, checkin: vCheckin, trofeus: vTrofeus, regras: vRegras, ajustes: vAjustes, ficha: vFicha, inicio: vInicio };
const TITULO = { hoje: 'Hoje', treino: 'Treino', recorde: 'Treino concluído', comida: 'Combustível', jornada: 'Jornada', checkin: 'Check-in', trofeus: 'Hábitos e conquistas', regras: 'Como funciona', ajustes: 'Ajustes', ficha: 'Editar ficha', inicio: 'Bem-vindo' };
let rAnt = null;
function rota() {
  let r = (location.hash.match(/^#\/(\w+)/) || [])[1] || 'hoje';
  if (!S.onboard) return 'inicio';
  if (!ROTAS[r] || r === 'inicio') r = 'hoje';
  const w = lg(today()).w;
  if (r === 'treino' && w && w.fim) r = 'recorde';
  if (r === 'recorde' && !(w && w.fim)) r = 'treino';
  return r;
}
let desenhando = false, refazer = false;
function render() {
  if (ui.semRender) { ui.semRender = false; return; }
  if (desenhando) { refazer = true; return; }
  desenhando = true;
  try { desenhar(); } finally { desenhando = false; }
  if (refazer) { refazer = false; render(); }
}
function desenhar() {
  const r = rota(), y = window.scrollY;
  $('#app').innerHTML = ROTAS[r]();
  window.scrollTo(0, r === rAnt ? y : 0);
  if (r !== 'checkin' && r !== rAnt) ui.ci = null;
  rAnt = r; document.title = 'Forja · ' + TITULO[r];
  if (r === 'recorde' && ui.celebrar) { ui.celebrar = false; confete(50); }
  if (r === 'treino' && rest.fim > Date.now()) { clearInterval(rest.t); rest.t = setInterval(restTick, 250); }
}
function virouODia() {
  if (today() === ui.dia) return false;
  ui.dia = today(); settle(); salvar(); return true;
}

function boot() {
  carregar(); ui.dia = today(); settle(); salvar();
  document.addEventListener('pointerdown', e => { ui.px = e.clientX; ui.py = e.clientY; ui.toqueEl = e.target; ui.toqueT = Date.now(); }, true);
  $('#app').addEventListener('click', e => { const el = e.target.closest('[data-act]'); if (!el || el.disabled) return; const a = el.dataset.act; if (AC[a]) { vibrar(12); AC[a](el, e); } });
  $('#app').addEventListener('change', e => {
    const el = e.target.closest('[data-in]'); if (!el || !IN[el.dataset.in]) return;
    const t = ui.toqueEl, recente = Date.now() - (ui.toqueT || 0) < 800;
    ui.semRender = !!(recente && t && t.closest && t.closest('[data-act],a[href]') && !el.contains(t));
    IN[el.dataset.in](el, e);
    ui.semRender = false;
  });
  addEventListener('hashchange', render);
  setInterval(() => { if (virouODia()) render(); else if (rota() === 'hoje' && !/INPUT|SELECT/.test((document.activeElement || {}).tagName || '')) render(); }, 30000);
  document.addEventListener('visibilitychange', () => { if (!document.hidden && virouODia()) render(); });
  render();
  try { if (navigator.storage && navigator.storage.persist) navigator.storage.persist(); } catch (e) {}
  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) navigator.serviceWorker.register('./sw.js', { scope: './' }).catch(() => {});
  window.__forja = { get S() { return S; }, xpTotal, nivelDe, settle, conta, missoes, bossProg, render, FASES };   // para testes
}
boot();
})();
