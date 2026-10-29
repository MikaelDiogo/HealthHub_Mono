import { describe, expect, it } from 'vitest';
import { mensagemErro } from './erro';

const resp = (status: number, data: unknown) => ({ response: { status, data } });

describe('mensagemErro', () => {
  it('validação do NestJS: junta as mensagens e ignora o nome do status ("Bad Request")', () => {
    const e = resp(400, { statusCode: 400, message: ['Idade é obrigatória (0 a 150)', 'Idade é obrigatória (0 a 150)', 'Sexo deve ser M, F ou Outro'], error: 'Bad Request' });
    expect(mensagemErro(e)).toBe('Idade é obrigatória (0 a 150) · Sexo deve ser M, F ou Outro');
  });

  it('exceção própria do backend ({ error: "texto" }) mostra o texto', () => {
    expect(mensagemErro(resp(400, { error: 'Registre os sinais vitais do paciente antes de classificar o risco.' })))
      .toBe('Registre os sinais vitais do paciente antes de classificar o risco.');
  });

  it('403 sem corpo útil explica que o perfil não tem permissão', () => {
    expect(mensagemErro(resp(403, { message: 'Forbidden', error: 'Forbidden' }))).toBe('Seu perfil não tem permissão para esta ação.');
  });

  it('sem resposta do servidor: usa a mensagem padrão informada', () => {
    expect(mensagemErro(new Error('boom'), 'Falhou.')).toBe('Falhou.');
    expect(mensagemErro({ message: 'Network Error' })).toBe('Sem conexão com o servidor.');
  });
});
