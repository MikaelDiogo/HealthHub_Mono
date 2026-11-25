// Trava dos textos legais: o sistema guarda IDADE (não existe campo de data de nascimento). Se a expressão "data de nascimento" voltar ao
// termo de uso, à página da política ou ao gerador do PDF da política, este teste falha. Lê os arquivos-fonte, não renderiza telas.
import { describe, it, expect } from 'vitest';
const ARQUIVOS = [
  'src/components/TermosUsoModal/index.tsx',
  'src/pages/PoliticaDados/index.tsx',
  'src/utils/gerarPDFPolitica.ts',
];
// O Vite entrega o texto-fonte de cada arquivo (sem executar nada); a chave é o caminho a partir da raiz do frontend.
const FONTES = import.meta.glob(['/src/components/TermosUsoModal/index.tsx', '/src/pages/PoliticaDados/index.tsx', '/src/utils/gerarPDFPolitica.ts'], { query: '?raw', import: 'default', eager: true }) as Record<string, string>;
const lerTexto = (rel: string) => { const t = FONTES['/' + rel]; if (typeof t !== 'string') throw new Error('arquivo não encontrado: ' + rel); return t; };
export const citaDataDeNascimento = (t: string) => /data\s+de\s+nascimento|nascimento/i.test(t);

describe('textos legais não citam "data de nascimento"', () => {
  for (const rel of ARQUIVOS) {
    it(`${rel}: sem "nascimento"`, () => { expect(citaDataDeNascimento(lerTexto(rel))).toBe(false); });
  }
  it('o termo e o gerador do PDF dizem que o dado guardado é a idade', () => {
    expect(lerTexto(ARQUIVOS[0])).toMatch(/idade/);
    expect(lerTexto(ARQUIVOS[2])).toMatch(/idade/);
  });
  it('a própria verificação funciona: acusa o texto que cita data de nascimento', () => {
    expect(citaDataDeNascimento('CPF, RG, data de nascimento, sexo')).toBe(true);
    expect(citaDataDeNascimento('Data  de\nNascimento')).toBe(true);
    expect(citaDataDeNascimento('CPF, RG, idade, sexo')).toBe(false);
  });
});

// ── Rodada 6: os textos dizem só o que o código faz (auditoria de 25/11/2026). Esperados escritos à mão a partir do pedido 8. ──
// O PDF (gerarPDFPolitica.ts) usa texto SEM acentos; por isso as expressões abaixo aceitam as duas grafias.
const normalizar = (t: string) => t.replace(/\s+/g, ' ');
const ehPdf = (rel: string) => rel.endsWith('gerarPDFPolitica.ts');
describe('rodada 6: promessas que o código não cumpre não podem voltar', () => {
  it.each(ARQUIVOS)('%s: não cita Zod nem "Logs de auditoria"', (rel) => {
    const t = normalizar(lerTexto(rel));
    expect(/\bZod\b/i.test(t)).toBe(false);
    expect(/Logs de auditoria/i.test(t)).toBe(false);
  });
  it.each(ARQUIVOS)('%s: não cita "registros de autenticação", "exclusão de prontuários", "e-mail do responsável" nem Encarregado (DPO)', (rel) => {
    const t = normalizar(lerTexto(rel));
    expect(/registros\s+de\s+autentica[cç][aã]o/i.test(t)).toBe(false);
    expect(/exclus[aã]o\s+de\s+prontu[aá]rios/i.test(t)).toBe(false);
    expect(/e-mail\s+do\s+respons[aá]vel/i.test(t)).toBe(false);
    expect(/Encarregado/i.test(t)).toBe(false);
  });
  it('o aceite não é "registrado no sistema" nem "com data e hora" (só no navegador)', () => {
    const t = normalizar(lerTexto(ARQUIVOS[2]));
    expect(/registrada\s+com\s+data\s+e\s+hora\s+no\s+sistema/i.test(t)).toBe(false);
    expect(t).toContain('registrada no navegador do usuario');
  });
});

describe('rodada 6: o que os três textos passam a dizer (iguais nos três, o PDF sem acentos)', () => {
  it.each(ARQUIVOS)('%s: validação, JWT, limite do histórico e registro de eventos', (rel) => {
    const t = normalizar(lerTexto(rel));
    const pdf = ehPdf(rel);
    expect(t).toContain('class-validator');
    expect(t).toContain(pdf ? 'nao armazenados no servidor' : 'não armazenados no servidor');
    expect(t).toContain('limite aplicado pela tela');
    expect(t).toContain(pdf ? 'Registro de eventos da esteira (autor, perfil e horario)' : 'Registro de eventos da esteira (autor, perfil e horário)');
  });
  it.each(ARQUIVOS)('%s: HTTPS, SSL e limite de login ficam como previsão/ressalva (produção)', (rel) => {
    const t = normalizar(lerTexto(rel));
    const pdf = ehPdf(rel);
    expect(t).toContain(pdf ? 'HTTPS previsto para o ambiente de producao (depende da hospedagem)' : 'HTTPS previsto para o ambiente de produção (depende da hospedagem)');
    expect(t).toContain(pdf ? 'Conexao SSL com o banco prevista para o ambiente de producao (nao verificada nesta versao)' : 'Conexão SSL com o banco prevista para o ambiente de produção (não verificada nesta versão)');
    expect(t).toContain(pdf ? '10 tentativas por IP a cada 15 minutos em producao' : '10 tentativas por IP a cada 15 minutos em produção');
  });
  it.each(ARQUIVOS)('%s: direitos do titular atendidos pelo contato do responsável, sem funcionalidade automática', (rel) => {
    const t = normalizar(lerTexto(rel));
    const pdf = ehPdf(rel);
    expect(t).toContain(pdf ? 'as solicitacoes sao atendidas pelo contato do responsavel, sem funcionalidade automatica no sistema' : 'as solicitações são atendidas pelo contato do responsável, sem funcionalidade automática no sistema');
  });
  it('a política mostra a data de atualização novembro de 2026', () => {
    expect(lerTexto(ARQUIVOS[1])).toContain('Última atualização: novembro de 2026');
    expect(lerTexto(ARQUIVOS[1])).not.toContain('junho/2026');
  });
  it('termos e PDF trazem o título "Contato do responsável"', () => {
    expect(normalizar(lerTexto(ARQUIVOS[0]))).toContain('10. Contato do responsável');
    expect(normalizar(lerTexto(ARQUIVOS[2]))).toContain('10. Contato do responsavel');
  });
  it('nada sobre a IA mudou além do limite de 4 mensagens: o nome, CPF, RG, telefone e endereço seguem "não enviados"', () => {
    expect(normalizar(lerTexto(ARQUIVOS[0]))).toContain('O nome, o CPF, o RG, o telefone e o endereço não são enviados');
    expect(normalizar(lerTexto(ARQUIVOS[1]))).toContain('O nome, o CPF, o RG, o telefone e o endereço não são enviados');
    expect(normalizar(lerTexto(ARQUIVOS[2]))).toContain('O nome, o CPF, o RG, o telefone e o endereco nao sao enviados');
  });
});
