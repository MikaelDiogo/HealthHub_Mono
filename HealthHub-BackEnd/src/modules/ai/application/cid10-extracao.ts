// Extração conservadora de códigos CID-10 do texto da IA e montagem do bloco de conferência (rodada 5).
// Funções puras: a consulta à tabela oficial entra como parâmetro (ver cid10.service.ts). Nada daqui vai para a Groq.

export type SituacaoCid = 'subcategoria' | 'categoria' | 'nao_consta';
export interface ResultadoCid { codigo: string; situacao: SituacaoCid; descricao: string | null }

export const CABECALHO_CONFERENCIA = 'Conferência na CID-10 (DATASUS, versão 2008):';
export const LINHA_SEM_CODIGO = `${CABECALHO_CONFERENCIA} nenhum código identificado na resposta.`;

const PALAVRA_CID = /\bCID\b/i;
// Intervalos como T36-T50 ou I10–I15 (sem espaços ao redor do traço) não são códigos: são apagados antes da busca.
const INTERVALO = /[A-Z]\d{2}(?:\.\d)?[-–—][A-Z]\d{2}(?:\.\d)?/g;
// Uma letra maiúscula, dois dígitos e, opcionalmente, ponto e um dígito. Não pode estar colado a letra/dígito (ex.: CID10, COVID19)
// nem ser seguido de mais dígitos (ex.: I21.90, E119).
const CODIGO = /(?<![A-Za-z0-9])([A-Z]\d{2}(?:\.\d)?)(?![A-Za-z0-9]|\.\d)/g;
// "vitamina B12" não é CID: a palavra imediatamente antes descarta o candidato.
const ANTES_DE_VITAMINA = /\b(?:vitaminas?|vit\.?)\s*$/i;

export const normalizarCodigo = (c: string): string => c.replace(/[\s.]/g, '').toUpperCase();

const linhasDe = (texto: string): string[] => texto.split(/\r?\n/);

/** A resposta menciona a palavra CID (qualquer caixa, como palavra inteira) em alguma linha? */
export function mencionaCid(texto: string): boolean {
  return linhasDe(texto).some((l) => PALAVRA_CID.test(l));
}

/** Códigos candidatos (sem ponto, em ordem de aparição, sem repetir) das linhas que contêm a palavra CID. */
export function extrairCodigos(texto: string): string[] {
  const achados: string[] = [];
  for (const linha of linhasDe(texto)) {
    if (!PALAVRA_CID.test(linha)) continue;
    const limpa = linha.replace(INTERVALO, (m) => ' '.repeat(m.length));
    for (const m of limpa.matchAll(CODIGO)) {
      if (ANTES_DE_VITAMINA.test(limpa.slice(0, m.index))) continue;
      const cod = normalizarCodigo(m[1]);
      if (!achados.includes(cod)) achados.push(cod);
    }
  }
  return achados;
}

export function linhaDoResultado(r: ResultadoCid): string {
  if (r.situacao === 'subcategoria') return `- ${r.codigo} – ${r.descricao}: consta na tabela.`;
  if (r.situacao === 'categoria') return `- ${r.codigo} – ${r.descricao}: consta como categoria (sem o quarto caractere).`;
  return `- ${r.codigo} – não consta na tabela CID-10 do DATASUS (versão 2008).`;
}

/** Bloco de conferência ou null (a resposta não menciona CID). Só consulta a tabela local. */
export function blocoDeConferencia(resposta: string, conferir: (codigo: string) => ResultadoCid): string | null {
  if (!mencionaCid(resposta)) return null;
  const codigos = extrairCodigos(resposta);
  if (codigos.length === 0) return LINHA_SEM_CODIGO;
  return [CABECALHO_CONFERENCIA, ...codigos.map((c) => linhaDoResultado(conferir(c)))].join('\n');
}

/** Acrescenta o bloco ao FINAL da resposta, separado por uma linha em branco; o texto original fica intacto (prefixo). */
export function anexarConferencia(resposta: string, conferir: (codigo: string) => ResultadoCid): string {
  const bloco = blocoDeConferencia(resposta, conferir);
  if (bloco === null) return resposta;
  const separador = resposta.endsWith('\n\n') ? '' : resposta.endsWith('\n') ? '\n' : '\n\n';
  return resposta + separador + bloco;
}

/** Tira o bloco de uma resposta antiga (histórico do chat) para que a descrição oficial NÃO volte à Groq. */
export function removerConferencia(texto: string): string {
  const i = texto.indexOf(CABECALHO_CONFERENCIA);
  if (i < 0) return texto;
  return texto.slice(0, i).replace(/\s+$/, '');
}
