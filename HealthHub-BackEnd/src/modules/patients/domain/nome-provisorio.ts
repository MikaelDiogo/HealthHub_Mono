// Nome gravado quando o paciente chega sem identificação (ex.: inconsciente). Usa os 4 primeiros caracteres do id do
// paciente, gerado antes da gravação. Esses 4 caracteres não precisam ser únicos: o nome não tem restrição de
// unicidade, a identificação de verdade é o id e o paciente fica marcado como "nome provisório".
export function gerarNomeProvisorio(pacienteId: string): string {
  return `Paciente não identificado (#${pacienteId.slice(0, 4)})`;
}
