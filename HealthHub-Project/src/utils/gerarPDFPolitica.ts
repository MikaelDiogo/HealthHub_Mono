import jsPDF from 'jspdf';

export function gerarPDFPolitica() {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  const W = 210;
  const MARGIN = 20;
  const CW = W - MARGIN * 2; // 170
  let y = 0;

  // ── helpers ────────────────────────────────────────────────────────

  function checkPage(needed = 10) {
    if (y + needed > 275) {
      doc.addPage();
      y = 20;
    }
  }

  function header() {
    // teal header
    doc.setFillColor(14, 165, 133); // teal-6
    doc.rect(0, 0, W, 38, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.setTextColor(255, 255, 255);
    doc.text('HealthHub', MARGIN, 15);

    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.text('Politica de Privacidade e Termos de Uso', MARGIN, 23);

    doc.setFontSize(8);
    doc.text('LGPD - Lei n. 13.709/2018 | Versao 1.0 | ' + new Date().toLocaleDateString('pt-BR'), MARGIN, 31);

    y = 48;
  }

  function pageFooter() {
    const pageCount = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.3);
      doc.line(MARGIN, 285, W - MARGIN, 285);
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184);
      doc.setFont('helvetica', 'normal');
      doc.text('HealthHub - Plataforma Hospitalar | Confidencial', MARGIN, 290);
      doc.text(`Pagina ${i} de ${pageCount}`, W - MARGIN, 290, { align: 'right' });
    }
  }

  function sectionTitle(title: string) {
    checkPage(16);
    doc.setFillColor(240, 253, 250); // teal-0
    doc.setDrawColor(153, 246, 228); // teal-2
    doc.setLineWidth(0.3);
    doc.roundedRect(MARGIN, y, CW, 9, 2, 2, 'FD');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(15, 118, 110); // teal-8
    doc.text(title, MARGIN + 4, y + 6.2);
    y += 13;
  }

  function paragraph(text: string, indent = 0) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(51, 65, 85); // slate-7
    const lines = doc.splitTextToSize(text, CW - indent);
    for (const line of lines) {
      checkPage(6);
      doc.text(line, MARGIN + indent, y);
      y += 5.5;
    }
    y += 2;
  }

  function bullet(text: string) {
    checkPage(6);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(51, 65, 85);
    doc.setFillColor(14, 165, 133);
    doc.circle(MARGIN + 3, y - 1.2, 1, 'F');
    const lines = doc.splitTextToSize(text, CW - 10);
    doc.text(lines, MARGIN + 8, y);
    y += lines.length * 5.5 + 1;
  }

  function subBox(label: string, value: string, r: number, g: number, b: number) {
    checkPage(16);
    doc.setFillColor(r, g, b);
    doc.setDrawColor(r - 30, g - 30, b - 30);
    doc.setLineWidth(0.2);
    doc.roundedRect(MARGIN, y, CW, 12, 2, 2, 'FD');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(30, 30, 30);
    doc.text(label, MARGIN + 4, y + 5);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(51, 65, 85);
    const lines = doc.splitTextToSize(value, CW - 8);
    doc.text(lines, MARGIN + 4, y + 9.5);
    y += 14 + lines.length * 4;
  }

  function divider() {
    checkPage(8);
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.3);
    doc.line(MARGIN, y, W - MARGIN, y);
    y += 6;
  }

  // ── Geração ────────────────────────────────────────────────────────

  header();

  // 1
  sectionTitle('1. Apresentacao e Finalidade');
  paragraph(
    'O HealthHub e uma plataforma hospitalar web desenvolvida para o gerenciamento de pacientes, ' +
    'monitoramento de sinais vitais e suporte clinico assistido por inteligencia artificial. ' +
    'O sistema e destinado exclusivamente a profissionais de saude habilitados — medicos, ' +
    'enfermeiros e recepcionistas — vinculados a instituicoes de saude.'
  );
  paragraph(
    'Ao acessar e utilizar o HealthHub, voce concorda com estes Termos de Uso e com o tratamento ' +
    'dos dados conforme descrito nesta Politica de Privacidade, em conformidade com a Lei Geral de ' +
    'Protecao de Dados Pessoais (LGPD) — Lei n. 13.709, de 14 de agosto de 2018.'
  );

  divider();

  // 2
  sectionTitle('2. Dados Pessoais Coletados e Tratados');
  paragraph('O HealthHub trata as seguintes categorias de dados:');
  subBox('Dados de identificacao do paciente', 'Nome completo, CPF, RG, data de nascimento, sexo, endereco e telefone.', 240, 249, 255);
  subBox('Dados de saude (sensiveis)', 'Sinais vitais (frequencia cardiaca, pressao arterial, temperatura, SpO2), alergias, medicamentos em uso e anamnese clinica.', 254, 242, 242);
  subBox('Dados de acesso dos profissionais', 'Nome, e-mail, papel (role) e registros de autenticacao (tokens JWT com validade de 24 horas).', 240, 253, 244);
  subBox('Dados gerados pela IA', 'Historico de conversas clinicas com o assistente de IA e transcricoes de audio enviadas para analise.', 250, 245, 255);
  paragraph('ATENCAO: Os dados de saude sao classificados como dados pessoais sensiveis pela LGPD (art. 5, II), sujeitando seu tratamento a bases legais especificas e salvaguardas reforcadas.');

  divider();

  // 3
  sectionTitle('3. Base Legal para o Tratamento de Dados');
  paragraph('O tratamento de dados realizado pelo HealthHub fundamenta-se nas seguintes bases legais previstas na LGPD:');
  bullet('Art. 7, VIII e Art. 11, II, "f" — Tutela da saude: tratamento realizado por profissionais de saude para protecao da vida ou da incolumidade fisica do titular.');
  bullet('Art. 7, II e Art. 11, I — Consentimento do titular: o profissional de saude, ao utilizar este sistema, manifesta consentimento expresso para o tratamento de dados conforme esta politica.');
  bullet('Art. 7, IX — Legitimo interesse do controlador: para fins de melhoria da plataforma, seguranca da informacao e prevencao de fraudes.');

  divider();

  // 4
  sectionTitle('4. Finalidade do Tratamento');
  paragraph('Os dados coletados sao utilizados exclusivamente para as seguintes finalidades:');
  const finalidades = [
    'Cadastro, consulta, atualizacao e exclusao de prontuarios de pacientes',
    'Monitoramento e registro historico de sinais vitais',
    'Gerenciamento da fila e esteira de cuidado hospitalar',
    'Apoio clinico via assistente de inteligencia artificial (Groq/Ollama)',
    'Transcricao de notas clinicas em audio',
    'Geracao de documentos medicos em PDF (prontuarios, atestados, guias de alta)',
    'Controle de acesso e seguranca do sistema',
  ];
  finalidades.forEach(bullet);
  paragraph('O tratamento de dados NAO sera utilizado para fins comerciais, publicitarios ou de perfilagem nao relacionados a atividade clinica.');

  divider();

  // 5
  sectionTitle('5. Seguranca da Informacao');
  paragraph('O HealthHub adota as seguintes medidas tecnicas e organizacionais de seguranca:');
  const medidas = [
    'Autenticacao via JWT (HS256) com expiracao automatica em 24 horas',
    'Controle de acesso baseado em papeis (RBAC): medico, enfermeiro, recepcionista',
    'Hashing de senhas com bcrypt (rounds=12)',
    'Validacao de todos os dados de entrada via Zod',
    'Headers HTTP de seguranca via Helmet (CSP, HSTS, X-Frame-Options)',
    'Limitacao de tentativas de login (10 tentativas por IP a cada 15 minutos)',
    'Trafego protegido por HTTPS em ambiente de producao',
    'Dados armazenados em banco PostgreSQL com conexao SSL',
    'Credenciais e chaves de API isoladas em variaveis de ambiente',
  ];
  medidas.forEach(bullet);

  divider();

  // 6
  sectionTitle('6. Uso da Inteligencia Artificial e Dados Clinicos');
  paragraph('O assistente clinico de IA do HealthHub pode ser operado em dois modos:');
  subBox('Modo Local (Ollama — Qwen2.5:7b)', 'Os dados do paciente NAO saem do servidor local. Recomendado para ambientes com dados reais de pacientes.', 240, 253, 244);
  subBox('Modo Nuvem (Groq API — Llama 3.3-70b)', 'Os dados sao transmitidos a plataforma Groq (operador externo), demandando anonimizacao previa e instrumentos contratuais adequados.', 255, 247, 237);
  paragraph('Em qualquer cenario, a responsabilidade pela decisao clinica permanece integralmente do profissional de saude. O assistente de IA e uma ferramenta de apoio e nunca substitui o julgamento clinico.');

  divider();

  // 7
  sectionTitle('7. Direitos do Titular dos Dados (LGPD, Art. 18)');
  paragraph('Conforme a LGPD, voce tem os seguintes direitos em relacao aos seus dados pessoais:');
  const direitos = [
    'Confirmacao e acesso — Confirmar a existencia de tratamento e acessar os dados tratados.',
    'Correcao — Solicitar a correcao de dados incompletos, inexatos ou desatualizados.',
    'Anonimizacao, bloqueio ou eliminacao — Para dados desnecessarios, excessivos ou tratados em desconformidade.',
    'Portabilidade — Receber os dados em formato estruturado e interoperavel.',
    'Eliminacao — Solicitar a eliminacao de dados tratados com base no consentimento.',
    'Revogacao do consentimento — Revogar o consentimento a qualquer momento.',
    'Oposicao — Opor-se ao tratamento realizado em desconformidade com a lei.',
  ];
  direitos.forEach(bullet);

  divider();

  // 8
  sectionTitle('8. Retencao e Descarte de Dados');
  paragraph(
    'Os dados clinicos dos pacientes sao retidos pelo periodo necessario ao cumprimento das finalidades ' +
    'descritas e conforme exigido pela legislacao sanitaria aplicavel. Em ambiente academico (prototipo), ' +
    'recomenda-se a utilizacao exclusiva de dados ficticios ou anonimizados. O descarte deve garantir ' +
    'que informacoes nao mais necessarias sejam eliminadas de forma segura, impedindo sua recuperacao.'
  );

  divider();

  // 9
  sectionTitle('9. Responsabilidades do Usuario');
  paragraph('Ao utilizar o HealthHub, o profissional de saude compromete-se a:');
  [
    'Utilizar o sistema exclusivamente para finalidades clinicas legitimas',
    'Nao compartilhar credenciais de acesso com terceiros nao autorizados',
    'Garantir o sigilo das informacoes de pacientes acessadas no sistema',
    'Comunicar imediatamente qualquer suspeita de uso indevido ou violacao de dados',
    'Observar o Codigo de Etica da respectiva categoria profissional',
  ].forEach(bullet);

  divider();

  // 10
  sectionTitle('10. Contato e Encarregado (DPO)');
  paragraph('Para exercer seus direitos como titular de dados ou esclarecer duvidas sobre esta Politica:');
  subBox('HealthHub — Projeto Academico TCC',
    'Autor: Mikael Diogo Ferreira\nInstituicao: Faculdade Princesa do Oeste (FPO)\nCurso: Tecnologia em Analise e Desenvolvimento de Sistemas',
    240, 253, 250);

  // Assinatura
  checkPage(30);
  y += 6;
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.3);
  doc.roundedRect(MARGIN, y, CW, 20, 3, 3, 'FD');
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(8.5);
  doc.setTextColor(100, 116, 139);
  doc.text(
    'Este documento foi gerado automaticamente pelo HealthHub em ' + new Date().toLocaleString('pt-BR') + '.',
    MARGIN + 4, y + 7
  );
  doc.text(
    'A aceitacao destes termos e registrada com data e hora no sistema.',
    MARGIN + 4, y + 13
  );

  pageFooter();

  doc.save('HealthHub_Politica_de_Privacidade_LGPD.pdf');
}
