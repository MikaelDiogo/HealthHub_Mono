import 'reflect-metadata';
import 'dotenv/config';
import { AppDataSource } from './data-source';
import { Paciente } from '../modules/patients/domain/paciente.entity';
import { Visita, Desfecho, GravidadeRisco } from '../modules/visitas/domain/visita.entity';
import { SinaisVitais } from '../modules/sinais-vitais/domain/sinais-vitais.entity';

// ─── Helpers de data ───────────────────────────────────────────────────────────
const AGORA = new Date();

function horasAtras(horas: number): Date {
  return new Date(AGORA.getTime() - horas * 60 * 60 * 1000);
}

function diasAtras(dias: number): Date {
  return horasAtras(dias * 24);
}

function horaHHMM(date: Date): number {
  return Number(`${date.getHours()}${date.getMinutes().toString().padStart(2, '0')}`);
}

// ─── Tipos auxiliares de definição ─────────────────────────────────────────────
interface VisitaSeed {
  chegada: Date;
  alta: Date | null;
  desfecho: Desfecho;
  gravidade: GravidadeRisco;
  motivo: string;
  observacoes?: string;
  sinais: { offsetHoras: number; temperatura: number; fc: number; spo2: number; pa: string }[];
}

interface PacienteSeed {
  nome_completo: string;
  cpf: string;
  rg: string;
  idade: number;
  sexo: 'M' | 'F';
  telefone: string;
  endereco: string;
  alergias: string;
  medicamentos_em_uso: string;
  anamnese: string;
  visitas: VisitaSeed[];
}

// ─── Os 10 pacientes de demonstração ───────────────────────────────────────────
const PACIENTES: PacienteSeed[] = [
  // 1) Crônico com poucas idas — hipertenso, 2 visitas espaçadas
  {
    nome_completo: 'Antônio Carlos Ribeiro',
    cpf: '30144785201',
    rg: '18.442.117-3',
    idade: 68,
    sexo: 'M',
    telefone: '11987654321',
    endereco: 'Rua das Palmeiras, 245 — Vila Mariana, São Paulo/SP',
    alergias: 'Dipirona (reação cutânea)',
    medicamentos_em_uso: 'Losartana 50mg (1x ao dia), Anlodipino 5mg (1x ao dia)',
    anamnese: 'Hipertenso há 12 anos, em acompanhamento irregular. Histórico de pico hipertensivo em consulta anterior.',
    visitas: [
      {
        chegada: diasAtras(96),
        alta: diasAtras(96 - 1 / 6),
        desfecho: 'Alta',
        gravidade: 'Amarelo',
        motivo: 'Cefaleia intensa e pico de pressão arterial (190/110 mmHg) aferido em casa.',
        observacoes: 'Medicado com captopril sublingual, pressão estabilizada antes da alta.',
        sinais: [{ offsetHoras: 0, temperatura: 36.6, fc: 92, spo2: 97, pa: '190/110' },
                 { offsetHoras: 1.5, temperatura: 36.5, fc: 78, spo2: 98, pa: '140/90' }],
      },
      {
        chegada: diasAtras(22),
        alta: diasAtras(22 - 1 / 4),
        desfecho: 'Alta',
        gravidade: 'Verde',
        motivo: 'Revisão de rotina após ajuste de medicação anti-hipertensiva.',
        sinais: [{ offsetHoras: 0, temperatura: 36.4, fc: 74, spo2: 98, pa: '135/85' }],
      },
    ],
  },

  // 2) Asmática, poucas idas, crises leves
  {
    nome_completo: 'Maria Eduarda Santos',
    cpf: '41236985307',
    rg: '27.891.044-9',
    idade: 34,
    sexo: 'F',
    telefone: '11976543210',
    endereco: 'Av. Brigadeiro Faria Lima, 1120, apto 62 — Pinheiros, São Paulo/SP',
    alergias: 'Ácaro, pelos de animais (rinite alérgica)',
    medicamentos_em_uso: 'Budesonida + Formoterol (bombinha, uso contínuo)',
    anamnese: 'Asmática desde a infância, crises associadas a mudanças de clima e exposição a poeira.',
    visitas: [
      {
        chegada: diasAtras(58),
        alta: diasAtras(58 - 1 / 3),
        desfecho: 'Alta',
        gravidade: 'Laranja',
        motivo: 'Crise de falta de ar com sibilância, SpO2 91% na chegada.',
        observacoes: 'Nebulização com salbutamol, resposta satisfatória.',
        sinais: [{ offsetHoras: 0, temperatura: 36.8, fc: 108, spo2: 91, pa: '118/76' },
                 { offsetHoras: 1, temperatura: 36.7, fc: 88, spo2: 97, pa: '115/74' }],
      },
      {
        chegada: diasAtras(10),
        alta: diasAtras(10 - 1 / 6),
        desfecho: 'Alta',
        gravidade: 'Amarelo',
        motivo: 'Tosse seca persistente e leve desconforto respiratório.',
        sinais: [{ offsetHoras: 0, temperatura: 36.9, fc: 94, spo2: 95, pa: '120/80' }],
      },
    ],
  },

  // 3) "Só saiu depois de examinar" — visita única, curta, sem internar
  {
    nome_completo: 'José Carlos Pereira',
    cpf: '55219874633',
    rg: '14.556.902-0',
    idade: 52,
    sexo: 'M',
    telefone: '11965432109',
    endereco: 'Rua Conselheiro Nébias, 880 — Santos/SP',
    alergias: 'Nenhuma conhecida',
    medicamentos_em_uso: 'Nenhum de uso contínuo',
    anamnese: 'Sem comorbidades relevantes. Procurou atendimento por precaução após esforço físico intenso.',
    visitas: [
      {
        chegada: diasAtras(7),
        alta: diasAtras(7 - 2 / 24),
        desfecho: 'Alta',
        gravidade: 'Verde',
        motivo: 'Dor torácica atípica após atividade física, sem irradiação. Buscou avaliação por precaução.',
        observacoes: 'ECG e enzimas cardíacas normais. Descartado quadro cardíaco agudo — dor de origem muscular. Não houve necessidade de internação, paciente liberado após exames.',
        sinais: [{ offsetHoras: 0, temperatura: 36.5, fc: 82, spo2: 98, pa: '128/82' },
                 { offsetHoras: 1.5, temperatura: 36.4, fc: 76, spo2: 99, pa: '122/80' }],
      },
    ],
  },

  // 4) "Ficou bastante tempo" — internação longa por pneumonia
  {
    nome_completo: 'Francisca Oliveira Lima',
    cpf: '63398745120',
    rg: '09.221.336-5',
    idade: 79,
    sexo: 'F',
    telefone: '11954321098',
    endereco: 'Rua Dr. Oswaldo Cruz, 410 — Bela Vista, São Paulo/SP',
    alergias: 'Penicilina (anafilaxia prévia)',
    medicamentos_em_uso: 'Metformina 850mg, Sinvastatina 20mg, AAS 100mg',
    anamnese: 'Diabética tipo 2 e dislipidêmica. Histórico de internações prévias por quadros respiratórios. Mobilidade reduzida.',
    visitas: [
      {
        chegada: diasAtras(41),
        alta: diasAtras(41 - 6), // 6 dias internada
        desfecho: 'Internacao',
        gravidade: 'Laranja',
        motivo: 'Febre alta, tosse produtiva e dispneia progressiva há 3 dias. Suspeita de pneumonia.',
        observacoes: 'Internada para antibioticoterapia endovenosa e suporte de oxigênio. Evolução lenta devido à idade e comorbidades. Alta hospitalar após 6 dias com melhora clínica e radiológica.',
        sinais: [
          { offsetHoras: 0, temperatura: 38.9, fc: 112, spo2: 89, pa: '100/65' },
          { offsetHoras: 24, temperatura: 38.2, fc: 104, spo2: 92, pa: '105/68' },
          { offsetHoras: 72, temperatura: 37.1, fc: 90, spo2: 95, pa: '118/75' },
          { offsetHoras: 140, temperatura: 36.6, fc: 80, spo2: 97, pa: '122/78' },
        ],
      },
    ],
  },

  // 5) Trauma — transferência para outra unidade
  {
    nome_completo: 'Pedro Henrique Souza',
    cpf: '77654312890',
    rg: '33.009.215-7',
    idade: 45,
    sexo: 'M',
    telefone: '11943210987',
    endereco: 'Rua Vergueiro, 2200 — Vila Mariana, São Paulo/SP',
    alergias: 'Nenhuma conhecida',
    medicamentos_em_uso: 'Nenhum de uso contínuo',
    anamnese: 'Vítima de acidente de moto. Sem comorbidades prévias conhecidas.',
    visitas: [
      {
        chegada: diasAtras(15),
        alta: diasAtras(15 - 4 / 24),
        desfecho: 'Transferencia',
        gravidade: 'Vermelho',
        motivo: 'Politraumatismo após acidente de motocicleta — fratura exposta de fêmur direito.',
        observacoes: 'Estabilizado e transferido para unidade com suporte de ortopedia e centro cirúrgico disponível.',
        sinais: [{ offsetHoras: 0, temperatura: 36.2, fc: 118, spo2: 94, pa: '100/60' },
                 { offsetHoras: 2, temperatura: 36.4, fc: 105, spo2: 96, pa: '110/70' }],
      },
    ],
  },

  // 6) Criança — poucas idas, quadros leves
  {
    nome_completo: 'Luiza Fernandes Costa',
    cpf: '81122334459',
    rg: '45.667.890-1',
    idade: 8,
    sexo: 'F',
    telefone: '11932109876',
    endereco: 'Rua Tutóia, 560 — Paraíso, São Paulo/SP',
    alergias: 'Nenhuma conhecida',
    medicamentos_em_uso: 'Nenhum de uso contínuo',
    anamnese: 'Criança hígida, sem comorbidades. Acompanhada pela mãe, Sra. Camila Fernandes (responsável legal).',
    visitas: [
      {
        chegada: diasAtras(85),
        alta: diasAtras(85 - 2 / 24),
        desfecho: 'Alta',
        gravidade: 'Amarelo',
        motivo: 'Dor de ouvido e febre há 1 dia. Suspeita de otite média aguda.',
        sinais: [{ offsetHoras: 0, temperatura: 38.4, fc: 110, spo2: 98, pa: '-' }],
      },
      {
        chegada: diasAtras(30),
        alta: diasAtras(30 - 3 / 24),
        desfecho: 'Alta',
        gravidade: 'Verde',
        motivo: 'Febre e mal-estar associados a quadro viral (resfriado comum).',
        sinais: [{ offsetHoras: 0, temperatura: 37.8, fc: 98, spo2: 99, pa: '-' }],
      },
    ],
  },

  // 7) Diabético crônico — várias idas (4), quadros recorrentes
  {
    nome_completo: 'Carlos Eduardo Martins',
    cpf: '92287766541',
    rg: '21.334.556-8',
    idade: 61,
    sexo: 'M',
    telefone: '11921098765',
    endereco: 'Rua Domingos de Morais, 1780 — Vila Clementino, São Paulo/SP',
    alergias: 'Sulfas',
    medicamentos_em_uso: 'Insulina NPH, Metformina 850mg, Gabapentina 300mg (neuropatia)',
    anamnese: 'Diabético tipo 2 de longa data, com neuropatia periférica e histórico de úlceras em pé diabético.',
    visitas: [
      {
        chegada: diasAtras(150),
        alta: diasAtras(150 - 1 / 3),
        desfecho: 'Alta',
        gravidade: 'Laranja',
        motivo: 'Hipoglicemia (glicemia capilar 42 mg/dL) com sudorese e confusão mental leve.',
        observacoes: 'Revertido com glicose endovenosa. Orientado sobre ajuste de dose de insulina.',
        sinais: [{ offsetHoras: 0, temperatura: 36.1, fc: 102, spo2: 97, pa: '110/70' }],
      },
      {
        chegada: diasAtras(100),
        alta: diasAtras(100 - 2),
        desfecho: 'Internacao',
        gravidade: 'Laranja',
        motivo: 'Lesão em pé diabético (hálux direito) com sinais de infecção local.',
        observacoes: 'Internado por 2 dias para antibioticoterapia e curativo especializado.',
        sinais: [{ offsetHoras: 0, temperatura: 37.6, fc: 90, spo2: 96, pa: '128/82' },
                 { offsetHoras: 36, temperatura: 36.8, fc: 80, spo2: 97, pa: '122/78' }],
      },
      {
        chegada: diasAtras(48),
        alta: diasAtras(48 - 1 / 4),
        desfecho: 'Alta',
        gravidade: 'Verde',
        motivo: 'Revisão do curativo do pé diabético e ajuste de medicação para neuropatia.',
        sinais: [{ offsetHoras: 0, temperatura: 36.5, fc: 76, spo2: 98, pa: '125/80' }],
      },
      {
        chegada: diasAtras(6),
        alta: diasAtras(6 - 1 / 3),
        desfecho: 'Alta',
        gravidade: 'Amarelo',
        motivo: 'Ardência e dor ao urinar, suspeita de infecção do trato urinário.',
        observacoes: 'Iniciado antibiótico oral, orientado retorno se piora.',
        sinais: [{ offsetHoras: 0, temperatura: 37.9, fc: 88, spo2: 98, pa: '130/84' }],
      },
    ],
  },

  // 8) Gestante — saída voluntária em uma das visitas
  {
    nome_completo: 'Beatriz Almeida Rocha',
    cpf: '14478823366',
    rg: '38.221.904-2',
    idade: 29,
    sexo: 'F',
    telefone: '11910987654',
    endereco: 'Rua Capote Valente, 320, apto 11 — Pinheiros, São Paulo/SP',
    alergias: 'Nenhuma conhecida',
    medicamentos_em_uso: 'Ácido fólico, sulfato ferroso (pré-natal)',
    anamnese: 'Gestante, 28 semanas (3ª gestação). Pré-natal regular na UBS de referência.',
    visitas: [
      {
        chegada: diasAtras(33),
        alta: diasAtras(33 - 1 / 2),
        desfecho: 'SaidaVoluntaria' as Desfecho, // corrigido abaixo para o valor real do enum
        gravidade: 'Amarelo',
        motivo: 'Dor abdominal leve e contrações esporádicas. Procurou avaliação obstétrica.',
        observacoes: 'Optou por sair antes da conclusão da avaliação para buscar sua maternidade de referência.',
        sinais: [{ offsetHoras: 0, temperatura: 36.7, fc: 88, spo2: 98, pa: '112/72' }],
      },
      {
        chegada: diasAtras(5),
        alta: diasAtras(5 - 1 / 4),
        desfecho: 'Alta',
        gravidade: 'Verde',
        motivo: 'Checkup obstétrico de rotina solicitado por enjoo e tontura leve.',
        sinais: [{ offsetHoras: 0, temperatura: 36.5, fc: 82, spo2: 99, pa: '110/70' }],
      },
    ],
  },

  // 9) Adolescente — trauma esportivo, visita única
  {
    nome_completo: 'João Vitor Nascimento',
    cpf: '25566778892',
    rg: '52.118.447-6',
    idade: 15,
    sexo: 'M',
    telefone: '11998877665',
    endereco: 'Rua Loefgren, 1150 — Vila Clementino, São Paulo/SP',
    alergias: 'Nenhuma conhecida',
    medicamentos_em_uso: 'Nenhum de uso contínuo',
    anamnese: 'Adolescente hígido, pratica futebol amador. Acompanhado pelo pai, Sr. Vitor Nascimento.',
    visitas: [
      {
        chegada: diasAtras(19),
        alta: diasAtras(19 - 3 / 24),
        desfecho: 'Alta',
        gravidade: 'Amarelo',
        motivo: 'Queda durante partida de futebol com dor e deformidade em antebraço direito.',
        observacoes: 'Raio-X confirmou fratura em terço distal do rádio. Imobilizado com tala gessada e encaminhado para acompanhamento ortopédico ambulatorial.',
        sinais: [{ offsetHoras: 0, temperatura: 36.6, fc: 96, spo2: 98, pa: '118/76' }],
      },
    ],
  },

  // 10) Idosa polimórbida — AVC leve com internação + consultas de rotina
  {
    nome_completo: 'Rosa Maria Dias',
    cpf: '36699214487',
    rg: '06.774.312-9',
    idade: 83,
    sexo: 'F',
    telefone: '11987612345',
    endereco: 'Rua Pelotas, 95 — Vila Mariana, São Paulo/SP',
    alergias: 'Codeína (náusea intensa)',
    medicamentos_em_uso: 'Varfarina, Atenolol 25mg, Omeprazol 20mg',
    anamnese: 'Fibrilação atrial crônica, hipertensa. Histórico de AVC isquêmico leve há 2 anos. Reside com filha cuidadora.',
    visitas: [
      {
        chegada: diasAtras(120),
        alta: diasAtras(120 - 1 / 6),
        desfecho: 'Alta',
        gravidade: 'Verde',
        motivo: 'Consulta de rotina para ajuste de anticoagulante (INR de controle).',
        sinais: [{ offsetHoras: 0, temperatura: 36.3, fc: 70, spo2: 97, pa: '130/80' }],
      },
      {
        chegada: diasAtras(64),
        alta: diasAtras(64 - 4), // 4 dias internada
        desfecho: 'Internacao',
        gravidade: 'Vermelho',
        motivo: 'Fraqueza súbita em hemicorpo esquerdo e fala arrastada — suspeita de novo AVC.',
        observacoes: 'Internada para investigação neurológica e estabilização. Tomografia sem sinais de sangramento agudo. Alta após estabilização clínica e início de fisioterapia motora.',
        sinais: [
          { offsetHoras: 0, temperatura: 36.8, fc: 96, spo2: 94, pa: '168/98' },
          { offsetHoras: 24, temperatura: 36.6, fc: 84, spo2: 96, pa: '142/88' },
          { offsetHoras: 90, temperatura: 36.4, fc: 76, spo2: 97, pa: '128/80' },
        ],
      },
      {
        chegada: diasAtras(9),
        alta: diasAtras(9 - 1 / 4),
        desfecho: 'Alta',
        gravidade: 'Verde',
        motivo: 'Retorno para reavaliação pós-AVC e ajuste de fisioterapia.',
        sinais: [{ offsetHoras: 0, temperatura: 36.2, fc: 72, spo2: 98, pa: '126/78' }],
      },
    ],
  },
];

// Corrige o valor usado acima (enum real não tem acento/espaço)
for (const p of PACIENTES) {
  for (const v of p.visitas) {
    if ((v.desfecho as string) === 'SaidaVoluntaria') v.desfecho = 'Saida Voluntaria';
  }
}

async function seed() {
  await AppDataSource.initialize();
  const pacienteRepo = AppDataSource.getRepository(Paciente);
  const visitaRepo = AppDataSource.getRepository(Visita);
  const sinaisRepo = AppDataSource.getRepository(SinaisVitais);

  for (const p of PACIENTES) {
    const existente = await pacienteRepo.findOneBy({ cpf: p.cpf });
    if (existente) {
      console.log(`Já existe: ${p.nome_completo} (${p.cpf})`);
      continue;
    }

    const paciente = await pacienteRepo.save(
      pacienteRepo.create({
        nome_completo: p.nome_completo,
        cpf: p.cpf,
        rg: p.rg,
        idade: p.idade,
        sexo: p.sexo,
        telefone: p.telefone,
        endereco: p.endereco,
        alergias: p.alergias,
        medicamentos_em_uso: p.medicamentos_em_uso,
        anamnese: p.anamnese,
        ativo: false, // já recebeu alta em todas as passagens — resgatável pela esteira
      }),
    );

    for (const v of p.visitas) {
      await visitaRepo.save(
        visitaRepo.create({
          paciente_id: paciente.id,
          chegada: v.chegada,
          alta: v.alta ?? undefined,
          desfecho: v.desfecho,
          classificacao_risco: v.gravidade,
          motivo_visita: v.motivo,
          observacoes: v.observacoes,
        }),
      );

      for (const s of v.sinais) {
        const momento = new Date(v.chegada.getTime() + s.offsetHoras * 60 * 60 * 1000);
        await sinaisRepo.save(
          sinaisRepo.create({
            patient_id: paciente.id,
            hora: horaHHMM(momento),
            temperatura: s.temperatura,
            frequencia_cardiaca: s.fc,
            saturacao_oxigenio: s.spo2,
            pressao_arterial: s.pa,
            created_at: momento,
          }),
        );
      }
    }

    console.log(`Criado: ${p.nome_completo} (${p.visitas.length} visita${p.visitas.length > 1 ? 's' : ''})`);
  }

  await AppDataSource.destroy();
  console.log('Seed de pacientes de demonstração concluído.');
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
