import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('axios', () => ({ default: { post: vi.fn() } }));
import axios from 'axios';
import { ClinicalChatService, contextoSemIdentificacao } from './clinical-chat.service';
import { GroqChatProvider } from '../infrastructure/groq-chat.provider';

const post = axios.post as unknown as ReturnType<typeof vi.fn>;
const IDENT = { nome: 'NOME-FICTICIO-DO-PACIENTE', cpf: '99999999901', rg: '12.345.678-9', telefone: '11900000000', endereco: 'Rua Fictícia, 1' };
const CLINICO = { alergias: 'Dipirona (fictício)', medicamentos: 'Nenhum', anamnese: 'Dor lombar (fictício)', sinaisVitais: { temperatura: 36.5, saturacao_oxigenio: 98, pressao_arterial: '120/80', frequencia_cardiaca: 76 } };

describe('contexto enviado à IA — sem identificação do paciente', () => {
  it('descarta nome, CPF, RG, telefone e endereço e mantém só os campos clínicos', () => {
    const out = contextoSemIdentificacao({ ...CLINICO, ...IDENT } as any);
    expect(Object.keys(out).sort()).toEqual(['alergias', 'anamnese', 'medicamentos', 'sinaisVitais']);
    expect(JSON.stringify(out)).not.toMatch(/NOME-FICTICIO|99999999901|12\.345|11900000000|Rua Fictícia/);
  });

  it('contexto nulo ou indefinido vira contexto vazio', () => {
    expect(contextoSemIdentificacao(null)).toEqual({ alergias: undefined, medicamentos: undefined, anamnese: undefined, sinaisVitais: undefined });
    expect(contextoSemIdentificacao(undefined).sinaisVitais).toBeUndefined();
  });
});

describe('o nome do paciente NÃO chega ao provedor (axios simulado, corpo inspecionado)', () => {
  beforeEach(() => { vi.clearAllMocks(); process.env.GROQ_API_KEY = 'CHAVE-SIMULADA-NAO-REAL'; });
  afterEach(() => { delete process.env.GROQ_API_KEY; });

  it('mesmo que o cliente envie nome/CPF/RG/telefone/endereço, o corpo enviado à Groq não os contém', async () => {
    post.mockResolvedValue({ data: { choices: [{ message: { content: 'resposta simulada' } }] } });
    const svc = new ClinicalChatService(new GroqChatProvider());
    await svc.execute('Pergunta fictícia', { ...CLINICO, ...IDENT } as any, [{ role: 'user', content: 'mensagem anterior fictícia' }]);
    const corpo = JSON.stringify(post.mock.calls[0][1]);
    expect(corpo).not.toMatch(/NOME-FICTICIO|99999999901|12\.345\.678|11900000000|Rua Fictícia/);
    expect(corpo).not.toMatch(/\*\*Nome:\*\*/);
    expect(corpo).toContain('Dipirona (fictício)');
    expect(corpo).toContain('Dor lombar (fictício)');
    expect(corpo).toContain('SpO2 98%');
  });
});
