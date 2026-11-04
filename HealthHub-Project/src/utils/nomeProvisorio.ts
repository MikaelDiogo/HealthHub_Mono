// Cadastro mínimo: só o nome é obrigatório. Quando o nome não é conhecido o servidor grava
// "Paciente não identificado (#xxxx)" e marca o paciente como "nome provisório" até alguém corrigir o nome.

/** Texto mostrado (e travado) no campo Nome enquanto "Nome desconhecido" está marcado. O servidor troca xxxx pelos 4 primeiros caracteres do id. */
export const NOME_PROVISORIO_PREVIEW = 'Paciente não identificado (#xxxx)';

/** O sexo é gravado como M ou F (os registros e as métricas existentes dependem disso). */
export const SEXO_OPCOES = [
  { value: 'M', label: 'Masculino' },
  { value: 'F', label: 'Feminino' },
];

/** Opções do seletor de sexo: Masculino/Feminino e, só se o cadastro já tiver outro valor (ex.: "Outro"), esse valor também. */
export function opcoesSexo(atual?: string | null): { value: string; label: string }[] {
  const v = atual?.trim();
  if (!v || SEXO_OPCOES.some((o) => o.value === v)) return SEXO_OPCOES;
  return [...SEXO_OPCOES, { value: v, label: v }];
}

/** Texto do sexo para exibição: M/F viram o nome por extenso, valores antigos aparecem como estão, ausente vira "—". */
export function rotuloSexo(sexo?: string | null): string {
  const v = sexo?.trim();
  if (!v) return '—';
  return SEXO_OPCOES.find((o) => o.value === v)?.label ?? v;
}

/** Idade para exibição; ausente (null, undefined ou vazia) vira "—". O valor 0 (recém-nascido) é uma idade válida. */
export function rotuloIdade(idade?: number | string | null): string {
  if (idade === null || idade === undefined || idade === '') return '—';
  return `${idade} anos`;
}

/** Verdadeiro quando o paciente (ou a entrada da esteira) está com nome provisório. */
export function ehNomeProvisorio(p?: { nome_provisorio?: boolean | null } | null): boolean {
  return p?.nome_provisorio === true;
}

/** Nome para exibição: nunca quebra a tela com registro antigo sem nome ("Sem identificação (#xxxx)", com o início do id). */
export function nomeExibicao(p?: { id?: string; nome_completo?: string | null; nome?: string | null } | null): string {
  const nome = (p?.nome_completo ?? p?.nome)?.trim();
  if (nome) return nome;
  const id = p?.id?.slice(0, 4);
  return id ? `Sem identificação (#${id})` : 'Sem identificação';
}
