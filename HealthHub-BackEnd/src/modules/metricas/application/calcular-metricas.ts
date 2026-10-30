// Cálculo das métricas operacionais do pronto-atendimento a partir dos dados
// brutos. Função pura (sem banco) para ser testável e auditável: cada número
// do painel vem daqui, e os totais são sempre derivados das linhas.

export interface VisitaInput {
  paciente_id: string;
  chegada: Date;
  alta?: Date | null;
  desfecho: string;
  classificacao_risco?: string | null;
}

export interface FilaInput {
  paciente_id: string;
  nome: string;
  status: string;
  gravidade?: string | null;
  created_at: Date;
}

export interface SinaisInput {
  saturacao_oxigenio?: number | null;
  frequencia_cardiaca?: number | null;
  temperatura?: number | null;
}

export const ETAPAS = [
  'Aguardando Triagem',
  'Em Triagem (Enfermeiro)',
  'Aguardando Atendimento',
  'Em Consulta (Médico)',
  'Em Observação',
] as const;

export const RISCOS = ['Vermelho', 'Laranja', 'Amarelo', 'Verde', 'Azul'] as const;

const MIN = 60_000;
const DIA = 24 * 60 * MIN;
const FUSO = 'America/Sao_Paulo';
/** Espera acima disto entra na lista "atenção agora". */
export const ESPERA_ALERTA_MIN = 30;

const fmtDia = new Intl.DateTimeFormat('en-CA', { timeZone: FUSO, year: 'numeric', month: '2-digit', day: '2-digit' });
/** Chave do dia civil em Brasília (YYYY-MM-DD), independente do fuso do servidor. */
export function diaBrasilia(d: Date): string {
  return fmtDia.format(d);
}

function mediana(nums: number[]): number | null {
  if (!nums.length) return null;
  const s = [...nums].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : Math.round((s[m - 1] + s[m]) / 2);
}

function media(nums: number[]): number | null {
  return nums.length ? Math.round(nums.reduce((a, b) => a + b, 0) / nums.length) : null;
}

/** Mesmos limiares de "crítico" do frontend (utils/vitalStatus.ts). */
export function motivoCritico(s: SinaisInput | undefined): string | null {
  if (!s) return null;
  const spo2 = Number(s.saturacao_oxigenio ?? 0);
  const fc = Number(s.frequencia_cardiaca ?? 0);
  const temp = Number(s.temperatura ?? 0);
  const motivos: string[] = [];
  if (spo2 > 0 && spo2 < 92) motivos.push(`SpO₂ ${spo2}%`);
  if (fc > 0 && (fc > 100 || fc < 60)) motivos.push(`FC ${fc} bpm`);
  if (temp > 38.5) motivos.push(`Temperatura ${temp} °C`);
  return motivos.length ? motivos.join(' · ') : null;
}

export function calcularMetricas(input: {
  visitas: VisitaInput[];
  fila: FilaInput[];
  ultimosSinais: Record<string, SinaisInput>;
  agora: Date;
}) {
  const { visitas, fila, ultimosSinais, agora } = input;
  const hoje = diaBrasilia(agora);
  const inicio30 = agora.getTime() - 30 * DIA;

  // ── Esteira agora ──
  const porEtapa = Object.fromEntries(ETAPAS.map((e) => [e, 0])) as Record<(typeof ETAPAS)[number], number>;
  const porRisco: Record<string, number> = { ...Object.fromEntries(RISCOS.map((r) => [r, 0])), 'Sem classificação': 0 };
  for (const f of fila) {
    if (f.status in porEtapa) porEtapa[f.status as (typeof ETAPAS)[number]]++;
    const r = f.gravidade && RISCOS.includes(f.gravidade as (typeof RISCOS)[number]) ? f.gravidade : 'Sem classificação';
    porRisco[r]++;
  }

  const aguardando = fila
    .filter((f) => f.status === 'Aguardando Triagem' || f.status === 'Aguardando Atendimento')
    .map((f) => ({ ...f, esperaMin: Math.max(0, Math.round((agora.getTime() - new Date(f.created_at).getTime()) / MIN)) }))
    .sort((a, b) => b.esperaMin - a.esperaMin);

  // ── Hoje ──
  const chegadasHoje = visitas.filter((v) => diaBrasilia(new Date(v.chegada)) === hoje).length;
  const altasHoje = visitas.filter((v) => v.alta && diaBrasilia(new Date(v.alta)) === hoje).length;

  // ── Últimos 30 dias ──
  const v30 = visitas.filter((v) => new Date(v.chegada).getTime() >= inicio30);
  const encerradas30 = v30.filter((v) => v.alta);
  const permanencias = encerradas30.map((v) => Math.round((new Date(v.alta!).getTime() - new Date(v.chegada).getTime()) / MIN));

  // Readmissão em 30 dias: chegada no período cuja visita anterior do mesmo
  // paciente terminou até 30 dias antes dela.
  const porPaciente = new Map<string, VisitaInput[]>();
  for (const v of visitas) {
    const lista = porPaciente.get(v.paciente_id) ?? [];
    lista.push(v);
    porPaciente.set(v.paciente_id, lista);
  }
  let readmissoes = 0;
  for (const v of v30) {
    const chegada = new Date(v.chegada).getTime();
    const anteriores = (porPaciente.get(v.paciente_id) ?? []).filter(
      (o) => o !== v && o.alta && new Date(o.alta).getTime() <= chegada && chegada - new Date(o.alta).getTime() <= 30 * DIA,
    );
    if (anteriores.length) readmissoes++;
  }

  const desfechos: Record<string, number> = {};
  for (const v of encerradas30) desfechos[v.desfecho] = (desfechos[v.desfecho] ?? 0) + 1;
  const risco30: Record<string, number> = Object.fromEntries(RISCOS.map((r) => [r, 0]));
  for (const v of v30) if (v.classificacao_risco && v.classificacao_risco in risco30) risco30[v.classificacao_risco]++;

  // ── Série de 30 dias (chegadas e altas por dia civil de Brasília) ──
  const serie30d: { dia: string; rotulo: string; chegadas: number; altas: number }[] = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date(agora.getTime() - i * DIA);
    const chave = diaBrasilia(d);
    const [, mes, dia] = chave.split('-');
    serie30d.push({
      dia: chave,
      rotulo: `${dia}/${mes}`,
      chegadas: visitas.filter((v) => diaBrasilia(new Date(v.chegada)) === chave).length,
      altas: visitas.filter((v) => v.alta && diaBrasilia(new Date(v.alta)) === chave).length,
    });
  }

  // ── Atenção agora: sinais críticos primeiro, depois espera longa ──
  const atencao: { paciente_id: string; nome: string; motivo: string; nivel: 'critico' | 'espera'; esperaMin?: number }[] = [];
  for (const f of fila) {
    const motivo = motivoCritico(ultimosSinais[f.paciente_id]);
    if (motivo) atencao.push({ paciente_id: f.paciente_id, nome: f.nome, motivo, nivel: 'critico' });
  }
  for (const a of aguardando) {
    if (a.esperaMin >= ESPERA_ALERTA_MIN && !atencao.some((x) => x.paciente_id === a.paciente_id)) {
      atencao.push({ paciente_id: a.paciente_id, nome: a.nome, motivo: `${a.status}`, nivel: 'espera', esperaMin: a.esperaMin });
    }
  }

  return {
    geradoEm: agora.toISOString(),
    esteira: {
      total: fila.length,
      porEtapa,
      porRisco,
      maiorEspera: aguardando[0]
        ? { minutos: aguardando[0].esperaMin, nome: aguardando[0].nome, paciente_id: aguardando[0].paciente_id }
        : null,
      esperaMediaMin: media(aguardando.map((a) => a.esperaMin)),
    },
    hoje: { chegadas: chegadasHoje, altas: altasHoje },
    periodo30d: {
      chegadas: v30.length,
      encerradas: encerradas30.length,
      permanenciaMediaMin: media(permanencias),
      permanenciaMedianaMin: mediana(permanencias),
      readmissoes,
      taxaReadmissao: v30.length ? readmissoes / v30.length : 0,
      desfechos,
      risco: risco30,
    },
    serie30d,
    atencao: atencao.slice(0, 6),
  };
}

export type Metricas = ReturnType<typeof calcularMetricas>;
