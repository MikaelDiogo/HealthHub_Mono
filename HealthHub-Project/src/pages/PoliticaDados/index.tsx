import {
  Stack, Text, Box, Group, ThemeIcon, Button, Badge,
  Alert, Divider, SimpleGrid, Card, ScrollArea,
} from '@mantine/core';
import {
  IconShieldLock, IconDownload, IconDatabase, IconLock,
  IconEye, IconUserShield, IconCheck, IconAlertTriangle, IconCalendar,
} from '@tabler/icons-react';
import { gerarPDFPolitica } from '../../utils/gerarPDFPolitica';
import { PageShell } from '../../components/PageShell';

const dataAceite = localStorage.getItem('healthhub_termos_data_aceite');

export function PoliticaDados() {
  return (
    <PageShell title="Política de Privacidade e LGPD" description="Tratamento de dados conforme a Lei nº 13.709/2018">
    <ScrollArea style={{ flex: 1 }} offsetScrollbars>
    <Stack gap="lg" pb="xl">

      {/* Badges de versão e aceite */}
      <Group gap="xs">
        <Badge color="teal" variant="light" size="sm">Versão 1.0</Badge>
        {dataAceite && (
          <Badge color="teal" variant="outline" size="sm" leftSection={<IconCalendar size={10} />}>
            Aceito em {new Date(dataAceite).toLocaleDateString('pt-BR')}
          </Badge>
        )}
        <Button
          variant="light"
          color="teal"
          leftSection={<IconDownload size={15} />}
          radius="md"
          size="xs"
          ml="auto"
          onClick={gerarPDFPolitica}
        >
          Baixar PDF
        </Button>
      </Group>

      {/* Cards de resumo */}
      <SimpleGrid cols={{ base: 1, sm: 2, md: 4 }} spacing="sm">
        {[
          { icon: <IconDatabase size={20} />, color: 'blue', label: 'Dados Coletados', desc: 'Identidade, saúde e acesso' },
          { icon: <IconLock size={20} />, color: 'violet', label: 'Base Legal', desc: 'LGPD Arts. 7º, 11 e 18' },
          { icon: <IconShieldLock size={20} />, color: 'teal', label: 'Segurança', desc: 'JWT, bcrypt, RBAC, Helmet' },
          { icon: <IconUserShield size={20} />, color: 'grape', label: 'Seus Direitos', desc: 'Acesso, correção, exclusão' },
        ].map((item) => (
          <Card key={item.label} withBorder radius="md" p="md">
            <Group gap="sm">
              <ThemeIcon color={item.color} variant="light" size="lg" radius="md">
                {item.icon}
              </ThemeIcon>
              <Stack gap={2}>
                <Text size="sm" fw={700} c="slate.8">{item.label}</Text>
                <Text size="xs" c="slate.5">{item.desc}</Text>
              </Stack>
            </Group>
          </Card>
        ))}
      </SimpleGrid>

      {/* Seções */}
      <PolicySection icon={<IconShieldLock size={16} />} color="teal" title="1. Apresentação e Finalidade">
        <Text size="sm" c="slate.7" lh={1.8}>
          O <strong>HealthHub</strong> é uma plataforma hospitalar web desenvolvida para o gerenciamento de pacientes,
          monitoramento de sinais vitais e suporte clínico assistido por inteligência artificial. Destinado exclusivamente
          a profissionais de saúde habilitados vinculados a instituições de saúde.
        </Text>
        <Text size="sm" c="slate.7" lh={1.8} mt="xs">
          Ao utilizar o HealthHub, você concorda com estes Termos de Uso e com o tratamento dos dados conforme a{' '}
          <strong>Lei Geral de Proteção de Dados Pessoais (LGPD) — Lei nº 13.709/2018</strong>.
        </Text>
      </PolicySection>

      <PolicySection icon={<IconDatabase size={16} />} color="blue" title="2. Dados Pessoais Coletados">
        <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
          {[
            { label: 'Identificação do paciente', items: ['Nome completo, CPF, RG', 'Data de nascimento, sexo', 'Endereço e telefone'] },
            { label: 'Dados de saúde (sensíveis)', items: ['Sinais vitais (FC, PA, Temp, SpO2)', 'Alergias e medicamentos', 'Anamnese clínica'] },
            { label: 'Acesso dos profissionais', items: ['Nome e e-mail', 'Papel (role)', 'Registros JWT (24h)'] },
            { label: 'Dados da IA', items: ['Histórico de conversas clínicas', 'Transcrições de áudio', 'Contexto clínico enviado'] },
          ].map((cat) => (
            <Box key={cat.label} p="sm" style={{ background: 'var(--mantine-color-slate-0)', border: '1px solid var(--mantine-color-slate-2)', borderRadius: 8 }}>
              <Text size="xs" fw={700} c="blue.7" tt="uppercase" lts={0.5} mb={6}>{cat.label}</Text>
              {cat.items.map((i) => (
                <Group key={i} gap={6} mb={2}>
                  <IconCheck size={12} color="var(--mantine-color-teal-6)" />
                  <Text size="xs" c="slate.7">{i}</Text>
                </Group>
              ))}
            </Box>
          ))}
        </SimpleGrid>
        <Alert mt="sm" color="red" variant="light" icon={<IconAlertTriangle size={14} />} radius="md" p="sm">
          <Text size="xs" fw={600}>
            Dados de saúde são <strong>dados sensíveis</strong> (LGPD, art. 5º, II) e recebem proteção especial.
          </Text>
        </Alert>
      </PolicySection>

      <PolicySection icon={<IconLock size={16} />} color="violet" title="3. Base Legal e Finalidade">
        <Stack gap="xs">
          {[
            { art: 'Art. 7º, VIII + Art. 11, II, "f"', desc: 'Tutela da saúde — proteção da vida ou incolumidade física do titular.' },
            { art: 'Art. 7º, II + Art. 11, I', desc: 'Consentimento expresso do profissional de saúde ao aceitar esta política.' },
            { art: 'Art. 7º, IX', desc: 'Legítimo interesse — segurança da informação e prevenção de fraudes.' },
          ].map((b) => (
            <Box key={b.art} p="sm" style={{ background: 'var(--mantine-color-violet-0)', border: '1px solid var(--mantine-color-violet-2)', borderRadius: 8 }}>
              <Text size="xs" fw={800} c="violet.7" tt="uppercase">{b.art}</Text>
              <Text size="sm" c="slate.7" mt={2}>{b.desc}</Text>
            </Box>
          ))}
        </Stack>
        <Text size="sm" c="slate.7" lh={1.8} mt="sm">
          Os dados são utilizados exclusivamente para: cadastro e gestão de prontuários, monitoramento de sinais vitais,
          gestão da fila de atendimento, apoio via IA, transcrição de notas e geração de documentos médicos. Nunca para fins comerciais.
        </Text>
      </PolicySection>

      <PolicySection icon={<IconShieldLock size={16} />} color="teal" title="4. Medidas de Segurança Implementadas">
        <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="xs">
          {[
            'JWT HS256 com expiração de 24 horas',
            'RBAC: médico, enfermeiro, recepcionista',
            'Bcrypt rounds=12 (sem senhas em texto plano)',
            'Validação Zod em todos os endpoints',
            'Helmet (CSP, HSTS, X-Frame-Options)',
            'Rate limiting: 10 tentativas/15 min/IP',
            'HTTPS obrigatório em produção',
            'PostgreSQL com conexão SSL',
            'Variáveis de ambiente para segredos',
            'Logs de auditoria de acesso',
          ].map((item) => (
            <Group key={item} gap={6} align="flex-start">
              <IconCheck size={14} color="var(--mantine-color-teal-6)" style={{ marginTop: 2, flexShrink: 0 }} />
              <Text size="sm" c="slate.7">{item}</Text>
            </Group>
          ))}
        </SimpleGrid>
      </PolicySection>

      <PolicySection icon={<IconEye size={16} />} color="indigo" title="5. IA e Privacidade dos Dados Clínicos">
        <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
          <Box p="sm" style={{ background: 'var(--mantine-color-green-0)', border: '1px solid var(--mantine-color-green-3)', borderRadius: 8 }}>
            <Text size="sm" fw={700} c="green.8" mb={4}>Modo Local (Ollama)</Text>
            <Text size="xs" c="slate.7">Dados <strong>não saem do servidor</strong>. Recomendado para dados reais de pacientes.</Text>
          </Box>
          <Box p="sm" style={{ background: 'var(--mantine-color-orange-0)', border: '1px solid var(--mantine-color-orange-3)', borderRadius: 8 }}>
            <Text size="sm" fw={700} c="orange.8" mb={4}>Modo Nuvem (Groq API)</Text>
            <Text size="xs" c="slate.7">Dados transmitidos a servidor externo. Exige <strong>anonimização prévia</strong> para dados reais.</Text>
          </Box>
        </SimpleGrid>
        <Alert mt="sm" color="yellow" variant="light" icon={<IconAlertTriangle size={14} />} radius="md" p="sm">
          <Text size="xs" fw={600}>
            A <strong>responsabilidade clínica é sempre do profissional de saúde</strong>. A IA é ferramenta de apoio, nunca substituta do julgamento médico.
          </Text>
        </Alert>
      </PolicySection>

      <PolicySection icon={<IconUserShield size={16} />} color="grape" title="6. Seus Direitos como Titular (LGPD, Art. 18)">
        <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="xs">
          {[
            ['Confirmação e acesso', 'Confirmar e acessar os dados tratados'],
            ['Correção', 'Corrigir dados incompletos ou inexatos'],
            ['Eliminação', 'Solicitar eliminação de dados desnecessários'],
            ['Portabilidade', 'Receber dados em formato interoperável'],
            ['Revogação', 'Revogar consentimento a qualquer momento'],
            ['Oposição', 'Opor-se ao tratamento irregular'],
          ].map(([right, desc]) => (
            <Group key={right} gap={6} align="flex-start">
              <IconCheck size={14} color="var(--mantine-color-grape-6)" style={{ marginTop: 2, flexShrink: 0 }} />
              <Text size="sm" c="slate.7"><strong>{right}:</strong> {desc}</Text>
            </Group>
          ))}
        </SimpleGrid>
      </PolicySection>

      <PolicySection icon={<IconUserShield size={16} />} color="teal" title="7. Contato">
        <Box p="md" style={{ background: 'var(--mantine-color-teal-0)', border: '1px solid var(--mantine-color-teal-3)', borderRadius: 10 }}>
          <Text size="sm" fw={700} c="teal.8">HealthHub — Projeto Acadêmico TCC</Text>
          <Text size="sm" c="slate.7">Autor: Mikael Diogo Ferreira</Text>
          <Text size="sm" c="slate.7">Instituição: Faculdade Princesa do Oeste (FPO)</Text>
          <Text size="sm" c="slate.7">Curso: Tecnologia em Análise e Desenvolvimento de Sistemas</Text>
        </Box>
      </PolicySection>

      <Divider />

      <Group justify="space-between" align="center">
        <Text size="xs" c="slate.4">
          HealthHub v1.0 — Última atualização: junho/2026
        </Text>
        <Button
          variant="light"
          color="teal"
          leftSection={<IconDownload size={15} />}
          size="sm"
          radius="md"
          onClick={gerarPDFPolitica}
        >
          Baixar Política em PDF
        </Button>
      </Group>

    </Stack>
    </ScrollArea>
    </PageShell>
  );
}

function PolicySection({
  icon, color, title, children,
}: {
  icon: React.ReactNode;
  color: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <Box
      p="lg"
      style={{
        background: '#fff',
        border: '1px solid var(--mantine-color-slate-2)',
        borderRadius: 12,
      }}
    >
      <Group gap="xs" mb="md">
        <ThemeIcon color={color} variant="light" size="md" radius="sm">{icon}</ThemeIcon>
        <Text fw={700} size="sm" c="slate.9">{title}</Text>
      </Group>
      {children}
    </Box>
  );
}
