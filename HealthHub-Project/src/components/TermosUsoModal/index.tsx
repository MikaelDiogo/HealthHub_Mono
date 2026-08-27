import { useEffect, useRef, useState } from 'react';
import {
  Modal,
  Text,
  Button,
  Group,
  Stack,
  Box,
  ScrollArea,
  Divider,
  ThemeIcon,
  Alert,
  Badge,
} from '@mantine/core';
import {
  IconShieldLock,
  IconDownload,
  IconCheck,
  IconX,
  IconAlertTriangle,
  IconLock,
  IconEye,
  IconDatabase,
  IconUserShield,
} from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { gerarPDFPolitica } from '../../utils/gerarPDFPolitica';

const VERSAO_TERMOS = '1.0';
const STORAGE_KEY = `healthhub_termos_aceitos_v${VERSAO_TERMOS}`;

export function useTermosAceitos() {
  return localStorage.getItem(STORAGE_KEY) === 'true';
}

export function marcarTermosAceitos() {
  localStorage.setItem(STORAGE_KEY, 'true');
  localStorage.setItem('healthhub_termos_data_aceite', new Date().toISOString());
}

export function revogarTermosAceitos() {
  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem('healthhub_termos_data_aceite');
}

interface TermosUsoModalProps {
  opened: boolean;
  onAceitar: () => void;
  onRecusar: () => void;
}

export function TermosUsoModal({ opened, onAceitar, onRecusar }: TermosUsoModalProps) {
  const [leuTudo, setLeuTudo] = useState(false);
  const [recusando, setRecusando] = useState(false);
  const viewportRef = useRef<HTMLDivElement>(null);

  // Reset ao abrir
  useEffect(() => {
    if (opened) {
      setLeuTudo(false);
      setRecusando(false);
      setTimeout(() => {
        viewportRef.current?.scrollTo({ top: 0 });
      }, 50);
    }
  }, [opened]);

  function handleScroll() {
    const el = viewportRef.current;
    if (!el) return;
    const chegouAoFim = el.scrollTop + el.clientHeight >= el.scrollHeight - 16;
    if (chegouAoFim) setLeuTudo(true);
  }

  function handleAceitar() {
    marcarTermosAceitos();
    onAceitar();
  }

  function handleRecusar() {
    setRecusando(true);
  }

  function handleConfirmarRecusa() {
    revogarTermosAceitos();
    onRecusar();
  }

  return (
    <Modal
      opened={opened}
      onClose={() => {}}
      withCloseButton={false}
      closeOnClickOutside={false}
      closeOnEscape={false}
      size="xl"
      radius="lg"
      padding={0}
      overlayProps={{ backgroundOpacity: 0.7, blur: 4 }}
      styles={{
        content: { display: 'flex', flexDirection: 'column', height: '90dvh', maxHeight: '90dvh', overflow: 'hidden' },
        body: { padding: 0, display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, overflow: 'hidden' },
      }}
    >
      {/* Cabeçalho */}
      <Box
        px="xl"
        pt="xl"
        pb="md"
        style={{
          background: 'linear-gradient(135deg, var(--mantine-color-teal-7) 0%, var(--mantine-color-teal-9) 100%)',
          borderRadius: 'var(--mantine-radius-lg) var(--mantine-radius-lg) 0 0',
          flexShrink: 0,
        }}
      >
        <Group gap="md">
          <ThemeIcon size={52} radius="xl" color="white" variant="filled"
            style={{ background: 'rgba(255,255,255,0.15)', color: '#fff' }}>
            <IconShieldLock size={28} />
          </ThemeIcon>
          <Stack gap={2}>
            <Text fw={900} size="xl" c="white" lh={1.1}>
              Termos de Uso e Política de Privacidade
            </Text>
            <Group gap="xs">
              <Badge color="white" variant="outline" size="sm" style={{ color: 'rgba(255,255,255,0.85)', borderColor: 'rgba(255,255,255,0.4)' }}>
                LGPD — Lei nº 13.709/2018
              </Badge>
              <Badge color="white" variant="outline" size="sm" style={{ color: 'rgba(255,255,255,0.85)', borderColor: 'rgba(255,255,255,0.4)' }}>
                Versão {VERSAO_TERMOS}
              </Badge>
            </Group>
          </Stack>
        </Group>

        <Alert
          mt="md"
          color="yellow"
          variant="filled"
          icon={<IconAlertTriangle size={16} />}
          styles={{ root: { background: 'rgba(255,193,7,0.2)', border: '1px solid rgba(255,193,7,0.4)' }, message: { color: '#fff', fontSize: 13 } }}
          p="sm"
          radius="md"
        >
          Leia atentamente todo o documento. O botão de aceite estará disponível somente após você rolar até o final.
        </Alert>
      </Box>

      {/* Conteúdo com scroll */}
      <ScrollArea
        flex={1}
        style={{ minHeight: 0 }}
        viewportRef={viewportRef}
        onScrollPositionChange={handleScroll}
        scrollbarSize={6}
      >
        <Stack gap="lg" px="xl" py="lg">

          {/* 1. Introdução */}
          <Section icon={<IconShieldLock size={18} />} color="teal" title="1. Apresentação e Finalidade">
            <Text size="sm" c="slate.7" lh={1.8}>
              O <strong>HealthHub</strong> é uma plataforma hospitalar web desenvolvida para o gerenciamento de pacientes,
              monitoramento de sinais vitais e suporte clínico assistido por inteligência artificial. O sistema é destinado
              exclusivamente a profissionais de saúde habilitados — médicos, enfermeiros e recepcionistas — vinculados a
              instituições de saúde.
            </Text>
            <Text size="sm" c="slate.7" lh={1.8} mt="xs">
              Ao acessar e utilizar o HealthHub, você concorda com estes Termos de Uso e com o tratamento dos dados
              conforme descrito nesta Política de Privacidade, em conformidade com a{' '}
              <strong>Lei Geral de Proteção de Dados Pessoais (LGPD) — Lei nº 13.709, de 14 de agosto de 2018</strong>.
            </Text>
          </Section>

          {/* 2. Dados coletados */}
          <Section icon={<IconDatabase size={18} />} color="blue" title="2. Dados Pessoais Coletados e Tratados">
            <Text size="sm" c="slate.7" lh={1.8}>
              O HealthHub trata as seguintes categorias de dados:
            </Text>
            <Stack gap={6} mt="sm">
              <DataItem label="Dados de identificação do paciente" value="Nome completo, CPF, RG, data de nascimento, sexo, endereço e telefone." />
              <DataItem label="Dados de saúde (sensíveis)" value="Sinais vitais (frequência cardíaca, pressão arterial, temperatura, saturação de oxigênio), alergias, medicamentos em uso e anamnese clínica." />
              <DataItem label="Dados de acesso dos profissionais" value="Nome, e-mail, papel (role) e registros de autenticação (tokens JWT com validade de 24 horas)." />
              <DataItem label="Dados gerados pela IA" value="Histórico de conversas clínicas com o assistente de IA e transcrições de áudio enviadas para análise." />
            </Stack>
            <Alert mt="md" color="red" variant="light" icon={<IconAlertTriangle size={15} />} p="sm" radius="md">
              <Text size="xs" fw={600}>
                Os dados de saúde são classificados como <strong>dados pessoais sensíveis</strong> pela LGPD (art. 5º, II),
                sujeitando seu tratamento a bases legais específicas e salvaguardas reforçadas.
              </Text>
            </Alert>
          </Section>

          {/* 3. Base legal */}
          <Section icon={<IconLock size={18} />} color="violet" title="3. Base Legal para o Tratamento de Dados">
            <Text size="sm" c="slate.7" lh={1.8}>
              O tratamento de dados realizado pelo HealthHub fundamenta-se nas seguintes bases legais previstas na LGPD:
            </Text>
            <Stack gap={8} mt="sm">
              <LegalBasis
                art="Art. 7º, VIII e Art. 11, II, 'f'"
                descricao="Tutela da saúde — tratamento realizado por profissionais de saúde, serviços de saúde ou autoridade sanitária para proteção da vida ou da incolumidade física do titular."
              />
              <LegalBasis
                art="Art. 7º, II e Art. 11, I"
                descricao="Consentimento do titular — o profissional de saúde, ao utilizar este sistema, manifesta seu consentimento expresso para o tratamento de dados conforme esta política."
              />
              <LegalBasis
                art="Art. 7º, IX"
                descricao="Legítimo interesse do controlador — para fins de melhoria da plataforma, segurança da informação e prevenção de fraudes."
              />
            </Stack>
          </Section>

          {/* 4. Finalidade */}
          <Section icon={<IconEye size={18} />} color="orange" title="4. Finalidade do Tratamento">
            <Text size="sm" c="slate.7" lh={1.8}>
              Os dados coletados são utilizados exclusivamente para as seguintes finalidades:
            </Text>
            <Stack gap={4} mt="sm">
              {[
                'Cadastro, consulta, atualização e exclusão de prontuários de pacientes',
                'Monitoramento e registro histórico de sinais vitais',
                'Gerenciamento da fila e esteira de cuidado hospitalar',
                'Apoio clínico via assistente de inteligência artificial (Groq/Ollama)',
                'Transcrição de notas clínicas em áudio',
                'Geração de documentos médicos em PDF (prontuários, atestados, guias de alta)',
                'Controle de acesso e segurança do sistema',
              ].map((item, i) => (
                <Group key={i} gap="xs" align="flex-start">
                  <IconCheck size={14} color="var(--mantine-color-teal-6)" style={{ marginTop: 3, flexShrink: 0 }} />
                  <Text size="sm" c="slate.7">{item}</Text>
                </Group>
              ))}
            </Stack>
            <Text size="sm" c="slate.7" lh={1.8} mt="md">
              O tratamento de dados <strong>não será utilizado para fins comerciais, publicitários ou de perfilagem</strong> não relacionados à atividade clínica.
            </Text>
          </Section>

          {/* 5. Segurança */}
          <Section icon={<IconShieldLock size={18} />} color="teal" title="5. Segurança da Informação">
            <Text size="sm" c="slate.7" lh={1.8}>
              O HealthHub adota as seguintes medidas técnicas e organizacionais de segurança:
            </Text>
            <Stack gap={4} mt="sm">
              {[
                'Autenticação via JWT (HS256) com expiração automática em 24 horas',
                'Controle de acesso baseado em papéis (RBAC): médico, enfermeiro, recepcionista',
                'Hashing de senhas com bcrypt (rounds=12) — senhas nunca armazenadas em texto plano',
                'Validação de todos os dados de entrada via Zod (schemas rigorosos)',
                'Headers HTTP de segurança via Helmet (CSP, HSTS, X-Frame-Options)',
                'Limitação de tentativas de login (10 tentativas por IP a cada 15 minutos)',
                'Tráfego protegido por HTTPS em ambiente de produção',
                'Dados armazenados em banco PostgreSQL com conexão SSL',
                'Credenciais e chaves de API isoladas em variáveis de ambiente',
                'Logs de auditoria para tentativas de acesso não autorizadas',
              ].map((item, i) => (
                <Group key={i} gap="xs" align="flex-start">
                  <IconCheck size={14} color="var(--mantine-color-teal-6)" style={{ marginTop: 3, flexShrink: 0 }} />
                  <Text size="sm" c="slate.7">{item}</Text>
                </Group>
              ))}
            </Stack>
          </Section>

          {/* 6. IA e dados */}
          <Section icon={<IconUserShield size={18} />} color="indigo" title="6. Uso da Inteligência Artificial e Dados Clínicos">
            <Text size="sm" c="slate.7" lh={1.8}>
              O assistente clínico de IA do HealthHub pode ser operado em dois modos:
            </Text>
            <Stack gap="xs" mt="sm">
              <Box p="sm" style={{ background: 'var(--mantine-color-green-0)', border: '1px solid var(--mantine-color-green-3)', borderRadius: 8 }}>
                <Text size="sm" fw={700} c="green.8">Modo Local (Ollama — Qwen2.5:7b)</Text>
                <Text size="sm" c="slate.7" mt={4}>
                  Os dados do paciente <strong>não saem do servidor local</strong>. Recomendado para ambientes com dados reais.
                </Text>
              </Box>
              <Box p="sm" style={{ background: 'var(--mantine-color-orange-0)', border: '1px solid var(--mantine-color-orange-3)', borderRadius: 8 }}>
                <Text size="sm" fw={700} c="orange.8">Modo Nuvem (Groq API — Llama 3.3-70b)</Text>
                <Text size="sm" c="slate.7" mt={4}>
                  Os dados são transmitidos à plataforma Groq (operador externo), demandando <strong>anonimização prévia</strong> e instrumentos contratuais adequados antes do uso com dados reais de pacientes.
                </Text>
              </Box>
            </Stack>
            <Alert mt="md" color="yellow" variant="light" icon={<IconAlertTriangle size={15} />} p="sm" radius="md">
              <Text size="xs" fw={600}>
                Em qualquer cenário, a <strong>responsabilidade pela decisão clínica permanece integralmente do profissional de saúde</strong>.
                O assistente de IA é uma ferramenta de apoio e nunca substitui o julgamento clínico.
              </Text>
            </Alert>
          </Section>

          {/* 7. Direitos do titular */}
          <Section icon={<IconUserShield size={18} />} color="grape" title="7. Direitos do Titular dos Dados (LGPD, Art. 18)">
            <Text size="sm" c="slate.7" lh={1.8}>
              Conforme a LGPD, você tem os seguintes direitos em relação aos seus dados pessoais:
            </Text>
            <Stack gap={4} mt="sm">
              {[
                ['Confirmação e acesso', 'Confirmar a existência de tratamento e acessar os dados tratados.'],
                ['Correção', 'Solicitar a correção de dados incompletos, inexatos ou desatualizados.'],
                ['Anonimização, bloqueio ou eliminação', 'Para dados desnecessários, excessivos ou tratados em desconformidade.'],
                ['Portabilidade', 'Receber os dados em formato estruturado e interoperável.'],
                ['Eliminação', 'Solicitar a eliminação de dados tratados com base no consentimento.'],
                ['Revogação do consentimento', 'Revogar o consentimento a qualquer momento, sem prejuízo da licitude do tratamento anterior.'],
                ['Oposição', 'Opor-se ao tratamento realizado em desconformidade com a lei.'],
              ].map(([right, desc], i) => (
                <Group key={i} gap="xs" align="flex-start">
                  <IconCheck size={14} color="var(--mantine-color-grape-6)" style={{ marginTop: 3, flexShrink: 0 }} />
                  <Text size="sm" c="slate.7"><strong>{right}:</strong> {desc}</Text>
                </Group>
              ))}
            </Stack>
          </Section>

          {/* 8. Retenção */}
          <Section icon={<IconDatabase size={18} />} color="cyan" title="8. Retenção e Descarte de Dados">
            <Text size="sm" c="slate.7" lh={1.8}>
              Os dados clínicos dos pacientes são retidos pelo período necessário ao cumprimento das finalidades descritas
              e conforme exigido pela legislação sanitária aplicável. Em ambiente acadêmico (protótipo), recomenda-se
              a utilização exclusiva de dados fictícios ou anonimizados.
            </Text>
            <Text size="sm" c="slate.7" lh={1.8} mt="xs">
              O descarte dos dados deve observar o princípio da minimização, garantindo que informações não mais necessárias
              sejam eliminadas de forma segura, impedindo sua recuperação.
            </Text>
          </Section>

          {/* 9. Uso correto */}
          <Section icon={<IconLock size={18} />} color="red" title="9. Responsabilidades do Usuário">
            <Text size="sm" c="slate.7" lh={1.8}>
              Ao utilizar o HealthHub, o profissional de saúde compromete-se a:
            </Text>
            <Stack gap={4} mt="sm">
              {[
                'Utilizar o sistema exclusivamente para finalidades clínicas legítimas',
                'Não compartilhar credenciais de acesso com terceiros não autorizados',
                'Garantir o sigilo das informações de pacientes acessadas no sistema',
                'Informar pacientes sobre o uso de sistemas digitais no seu atendimento quando aplicável',
                'Comunicar imediatamente qualquer suspeita de uso indevido ou violação de dados',
                'Observar o Código de Ética da respectiva categoria profissional',
              ].map((item, i) => (
                <Group key={i} gap="xs" align="flex-start">
                  <IconCheck size={14} color="var(--mantine-color-red-6)" style={{ marginTop: 3, flexShrink: 0 }} />
                  <Text size="sm" c="slate.7">{item}</Text>
                </Group>
              ))}
            </Stack>
          </Section>

          {/* 10. Contato */}
          <Section icon={<IconUserShield size={18} />} color="teal" title="10. Contato e Encarregado (DPO)">
            <Text size="sm" c="slate.7" lh={1.8}>
              Para exercer seus direitos como titular de dados ou para dúvidas relacionadas a esta Política de Privacidade,
              entre em contato através dos canais institucionais da Faculdade Princesa do Oeste (FPO) ou pelo e-mail do
              responsável pelo projeto:
            </Text>
            <Box mt="sm" p="sm" style={{ background: 'var(--mantine-color-teal-0)', border: '1px solid var(--mantine-color-teal-3)', borderRadius: 8 }}>
              <Text size="sm" fw={700} c="teal.8">HealthHub — Projeto Acadêmico TCC</Text>
              <Text size="sm" c="slate.7">Autor: Mikael Diogo Ferreira</Text>
              <Text size="sm" c="slate.7">Instituição: Faculdade Princesa do Oeste (FPO)</Text>
              <Text size="sm" c="slate.7">Curso: Tecnologia em Análise e Desenvolvimento de Sistemas</Text>
            </Box>
          </Section>

          <Divider my="xs" />

          {/* Indicador de leitura + PDF */}
          <Box
            p="md"
            style={{
              background: leuTudo
                ? 'var(--mantine-color-teal-0)'
                : 'var(--mantine-color-slate-0)',
              border: `1px solid ${leuTudo ? 'var(--mantine-color-teal-3)' : 'var(--mantine-color-slate-2)'}`,
              borderRadius: 12,
              transition: 'all 0.3s',
            }}
          >
            <Stack gap="sm">
              <Group gap="sm">
                <ThemeIcon color={leuTudo ? 'teal' : 'slate'} variant="light" size="md" radius="xl">
                  {leuTudo ? <IconCheck size={16} /> : <IconEye size={16} />}
                </ThemeIcon>
                <Text size="sm" fw={700} c={leuTudo ? 'teal.8' : 'slate.6'}>
                  {leuTudo
                    ? 'Você leu todos os termos. Agora pode aceitar ou recusar.'
                    : 'Role até o final para liberar o botão de aceite.'}
                </Text>
              </Group>

              <Button
                variant="light"
                color="teal"
                leftSection={<IconDownload size={16} />}
                size="sm"
                onClick={gerarPDFPolitica}
                radius="md"
              >
                Baixar Política Completa em PDF
              </Button>
            </Stack>
          </Box>

        </Stack>
      </ScrollArea>

      {/* Rodapé com botões */}
      <Box
        px="xl"
        py="md"
        style={{
          borderTop: '1px solid var(--mantine-color-slate-2)',
          background: 'var(--mantine-color-slate-0)',
          flexShrink: 0,
          borderRadius: '0 0 var(--mantine-radius-lg) var(--mantine-radius-lg)',
        }}
      >
        {recusando ? (
          <Stack gap="xs">
            <Alert color="red" variant="light" icon={<IconAlertTriangle size={16} />} radius="md">
              <Text size="sm" fw={600}>
                Ao recusar, você não poderá acessar o HealthHub. Sua sessão será encerrada.
              </Text>
            </Alert>
            <Group justify="flex-end" gap="sm">
              <Button variant="default" size="sm" onClick={() => setRecusando(false)} radius="md">
                Voltar
              </Button>
              <Button color="red" size="sm" leftSection={<IconX size={15} />} onClick={handleConfirmarRecusa} radius="md">
                Confirmar Recusa e Sair
              </Button>
            </Group>
          </Stack>
        ) : (
          <Group justify="space-between" align="center">
            <Text size="xs" c="slate.5" style={{ maxWidth: 380 }}>
              Ao aceitar, você concorda com o tratamento dos dados conforme a LGPD (Lei nº 13.709/2018).
            </Text>
            <Group gap="sm">
              <Button
                variant="default"
                size="sm"
                leftSection={<IconX size={15} />}
                onClick={handleRecusar}
                radius="md"
                color="red"
              >
                Recusar
              </Button>
              <Button
                color="teal"
                size="sm"
                leftSection={<IconCheck size={15} />}
                onClick={handleAceitar}
                disabled={!leuTudo}
                radius="md"
                style={{ transition: 'opacity 0.2s' }}
              >
                Aceitar e Continuar
              </Button>
            </Group>
          </Group>
        )}
      </Box>
    </Modal>
  );
}

// ── Helpers de layout ──────────────────────────────────────────────────

function Section({
  icon, color, title, children,
}: {
  icon: React.ReactNode;
  color: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <Box>
      <Group gap="xs" mb="sm">
        <ThemeIcon color={color} variant="light" size="md" radius="sm">
          {icon}
        </ThemeIcon>
        <Text fw={700} size="sm" c="slate.9">{title}</Text>
      </Group>
      {children}
    </Box>
  );
}

function DataItem({ label, value }: { label: string; value: string }) {
  return (
    <Box
      p="sm"
      style={{
        background: 'var(--mantine-color-slate-0)',
        border: '1px solid var(--mantine-color-slate-2)',
        borderRadius: 8,
      }}
    >
      <Text size="xs" fw={700} c="slate.6" tt="uppercase" lts={0.5}>{label}</Text>
      <Text size="sm" c="slate.7" mt={2}>{value}</Text>
    </Box>
  );
}

function LegalBasis({ art, descricao }: { art: string; descricao: string }) {
  return (
    <Box
      p="sm"
      style={{
        background: 'var(--mantine-color-violet-0)',
        border: '1px solid var(--mantine-color-violet-2)',
        borderRadius: 8,
      }}
    >
      <Text size="xs" fw={800} c="violet.7" tt="uppercase" lts={0.5}>{art}</Text>
      <Text size="sm" c="slate.7" mt={2}>{descricao}</Text>
    </Box>
  );
}
