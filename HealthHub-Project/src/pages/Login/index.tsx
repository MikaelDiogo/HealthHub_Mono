import axios from 'axios';
import api from '../../services/api';
import { useNavigate, Link } from 'react-router-dom';
import { useForm } from '@mantine/form';
import { TextInput, PasswordInput, Button, Text, Box, Stack, Alert } from '@mantine/core';
import { IconAlertCircle, IconLogin2 } from '@tabler/icons-react';
import { useAuth, type UserRole } from '../../context/AuthContext';
import { useCare } from '../../context/CareContext';
import { useMobile } from '../../hooks/useMobile';
import './styles.css';

// ── Logo HealthHub (cruz com gradiente) ───────────────────────────────────────
function HHLogo({ size = 56 }: { size?: number }) {
  const r = Math.round(size * 0.27);
  const bar = Math.round(size * 0.43);
  const thick = Math.round(size * 0.13);
  return (
    <div
      style={{
        position: 'relative',
        width: size,
        height: size,
        borderRadius: Math.round(size * 0.26),
        background: 'linear-gradient(155deg, oklch(0.62 0.13 200), oklch(0.52 0.14 240))',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: `0 ${Math.round(size * 0.22)}px ${Math.round(size * 0.5)}px -${Math.round(size * 0.18)}px oklch(0.52 0.14 240 / 0.55)`,
        flexShrink: 0,
      }}
    >
      <div style={{ position: 'absolute', width: bar, height: thick, borderRadius: thick / 2, background: '#fff' }} />
      <div style={{ position: 'absolute', width: thick, height: bar, borderRadius: thick / 2, background: '#fff' }} />
      {/* Pontos pulsantes nos cantos */}
      {[
        { top: r, left: r, delay: '0s' },
        { top: r, right: r, delay: '0.4s' },
        { bottom: r, left: r, delay: '0.8s' },
        { bottom: r, right: r, delay: '1.2s' },
      ].map((pos, i) => (
        <span
          key={i}
          className="hub-pulse-dot"
          style={{ ...pos, animationDelay: pos.delay }}
        />
      ))}
    </div>
  );
}

// ── Painel esquerdo ────────────────────────────────────────────────────────────
const QUEUE_PREVIEW = [
  { name: 'Ana R., 42a', color: 'oklch(0.55 0.21 25)', label: 'Emergência', time: '00:02' },
  { name: 'Marcos L., 67a', color: 'oklch(0.82 0.15 90)', label: 'Urgente', time: '00:34' },
  { name: 'Júlia P., 28a', color: 'oklch(0.68 0.14 150)', label: 'Pouco urgente', time: '01:12' },
];

function LeftPanel() {
  return (
    <div className="login-panel-left">
      {/* Branding */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 'auto' }}>
        <HHLogo size={44} />
        <div>
          <div style={{ fontSize: 22, fontWeight: 400, letterSpacing: '-0.02em', color: '#fff', lineHeight: 1 }}>
            Health<span style={{ fontWeight: 800, color: 'oklch(0.72 0.13 210)' }}>Hub</span>
          </div>
          <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, letterSpacing: '0.22em', textTransform: 'uppercase', color: 'oklch(0.62 0.03 230)', marginTop: 3 }}>
            triagem inteligente
          </div>
        </div>
      </div>

      {/* Headline central */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 16, paddingBlock: 48 }}>
        <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'oklch(0.62 0.03 230)' }}>
          Sistema hospitalar
        </div>
        <div style={{ fontSize: 38, fontWeight: 800, letterSpacing: '-0.03em', lineHeight: 1.05, color: '#fff' }}>
          Triagem rápida.<br />
          <span style={{ color: 'oklch(0.72 0.13 210)', fontWeight: 400 }}>Cuidado</span> preciso.
        </div>
        <div style={{ fontSize: 14, color: 'oklch(0.70 0.02 230)', lineHeight: 1.7, maxWidth: 300 }}>
          Gerencie a esteira de atendimento, monitore sinais vitais e tome decisões clínicas em tempo real.
        </div>
      </div>

      {/* Prévia da fila */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
          <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10.5, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'oklch(0.62 0.03 230)' }}>
            Fila de triagem
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span className="login-status-dot" />
            <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: 'oklch(0.70 0.02 230)' }}>Online</span>
          </div>
        </div>
        {QUEUE_PREVIEW.map((p) => (
          <div key={p.name} className="login-queue-item">
            <div style={{ width: 6, height: 32, borderRadius: 3, background: p.color, flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#fff', lineHeight: 1.2 }}>{p.name}</div>
              <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: 'oklch(0.65 0.03 230)', marginTop: 1 }}>{p.label}</div>
            </div>
            <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 12, color: 'oklch(0.65 0.03 230)' }}>{p.time}</div>
          </div>
        ))}
      </div>

      {/* Rodapé */}
      <div style={{ marginTop: 32, paddingTop: 20, borderTop: '1px solid oklch(0.32 0.02 240)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: 'oklch(0.50 0.02 230)' }}>v1 · 2026</span>
        <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: 'oklch(0.50 0.02 230)' }}>TCC · Mikael Diogo</span>
      </div>
    </div>
  );
}

// ── Formulário de login ────────────────────────────────────────────────────────
export default function Login() {
  const navigate = useNavigate();
  const { setAuth } = useAuth();
  const { recarregar } = useCare();
  const isMobile = useMobile();

  const form = useForm({
    initialValues: { email: '', password: '' },
    validate: {
      email: (v) => (v.length < 5 ? 'Email muito curto' : null),
      password: (v) => (v.length < 1 ? 'Senha obrigatória' : null),
    },
  });

  const handleEntrar = async (values: typeof form.values) => {
    try {
      const res = await api.post('/login', { email: values.email, password: values.password });
      const { token, role, nome } = res.data;
      setAuth(token, role as UserRole, nome);
      await recarregar();

      if (isMobile && (role === 'enfermeiro' || role === 'recepcionista')) {
        navigate('/mobile');
      } else if (role === 'recepcionista') {
        navigate('/main/alertas');
      } else {
        navigate('/main');
      }
    } catch (error: unknown) {
      let msg = 'Erro ao conectar com o servidor';
      if (axios.isAxiosError(error)) msg = error.response?.data?.message || msg;
      form.setErrors({ password: msg });
    }
  };

  return (
    <div className="login-root">
      <LeftPanel />

      <div className="login-panel-right">
        <div className="login-card" style={{ width: '100%', maxWidth: 420 }}>
          {/* Logo mobile (só aparece quando painel esquerdo é escondido) */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 40, justifyContent: 'center' }}
            className="login-mobile-brand"
          >
            <HHLogo size={40} />
            <div>
              <div style={{ fontSize: 20, fontWeight: 400, letterSpacing: '-0.02em', color: 'oklch(0.24 0.02 240)' }}>
                Health<span style={{ fontWeight: 800, color: 'oklch(0.52 0.14 235)' }}>Hub</span>
              </div>
              <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 9, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'oklch(0.62 0.03 230)' }}>
                triagem inteligente
              </div>
            </div>
          </div>

          {/* Cabeçalho */}
          <div style={{ marginBottom: 36 }}>
            <div style={{ fontSize: 30, fontWeight: 800, letterSpacing: '-0.025em', color: 'oklch(0.24 0.02 240)', lineHeight: 1.1, marginBottom: 8 }}>
              Bem-vindo de volta
            </div>
            <div style={{ fontSize: 14, color: 'oklch(0.55 0.03 230)', lineHeight: 1.5 }}>
              Acesse com suas credenciais hospitalares para continuar.
            </div>
          </div>

          {/* Formulário */}
          <form onSubmit={form.onSubmit(handleEntrar)}>
            <Stack gap="md">
              {form.errors.password && !form.errors.email && (
                <Alert
                  icon={<IconAlertCircle size={16} />}
                  color="red"
                  variant="light"
                  radius="md"
                  styles={{ message: { fontSize: 13 } }}
                >
                  {form.errors.password}
                </Alert>
              )}

              <Box>
                <Text
                  size="xs"
                  fw={700}
                  mb={6}
                  style={{ fontFamily: "'IBM Plex Mono', monospace", letterSpacing: '0.08em', textTransform: 'uppercase', color: 'oklch(0.55 0.03 230)' }}
                >
                  E-mail
                </Text>
                <TextInput
                  placeholder="seu@hospital.com.br"
                  size="md"
                  radius="md"
                  autoComplete="email"
                  styles={{
                    input: {
                      border: '1.5px solid oklch(0.88 0.01 220)',
                      background: '#fff',
                      fontSize: 14,
                      '&:focus': { borderColor: 'oklch(0.52 0.14 235)' },
                    },
                  }}
                  error={form.errors.email}
                  {...form.getInputProps('email')}
                />
              </Box>

              <Box>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <Text
                    size="xs"
                    fw={700}
                    style={{ fontFamily: "'IBM Plex Mono', monospace", letterSpacing: '0.08em', textTransform: 'uppercase', color: 'oklch(0.55 0.03 230)' }}
                  >
                    Senha
                  </Text>
                </div>
                <PasswordInput
                  placeholder="••••••••"
                  size="md"
                  radius="md"
                  autoComplete="current-password"
                  styles={{
                    input: {
                      border: '1.5px solid oklch(0.88 0.01 220)',
                      background: '#fff',
                      fontSize: 14,
                    },
                  }}
                  error={form.errors.password && !form.errors.email ? '' : form.errors.password}
                  {...form.getInputProps('password')}
                />
              </Box>

              <Button
                type="submit"
                fullWidth
                size="md"
                radius="md"
                mt={4}
                loading={form.submitting}
                rightSection={<IconLogin2 size={18} />}
                styles={{
                  root: {
                    background: 'oklch(0.52 0.14 235)',
                    fontWeight: 700,
                    fontSize: 15,
                    letterSpacing: '-0.01em',
                    height: 48,
                    '&:hover': { background: 'oklch(0.44 0.14 235)' },
                    '&:active': { background: 'oklch(0.40 0.14 235)' },
                  },
                }}
              >
                Entrar no sistema
              </Button>
            </Stack>
          </form>

          {/* Rodapé do card */}
          <div style={{ marginTop: 32, paddingTop: 24, borderTop: '1px solid oklch(0.90 0.01 220)', display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'center' }}>
            <Text size="xs" c="dimmed" ta="center" style={{ lineHeight: 1.6 }}>
              Ao acessar, você concorda com a{' '}
              <Link
                to="/main/politica"
                style={{ color: 'oklch(0.52 0.14 235)', fontWeight: 600, textDecoration: 'none' }}
              >
                Política de Privacidade
              </Link>
              {' '}e os Termos de Uso do HealthHub.
            </Text>
            <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, color: 'oklch(0.68 0.02 230)', letterSpacing: '0.1em' }}>
              HEALTHHUB · v1 · 2026
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
