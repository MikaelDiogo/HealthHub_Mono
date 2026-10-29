import axios from 'axios';
import api from '../../services/api';
import { useNavigate } from 'react-router-dom';
import { useForm } from '@mantine/form';
import { TextInput, PasswordInput, Button, Text, Stack, Alert, Paper, Title, Group } from '@mantine/core';
import { IconAlertCircle } from '@tabler/icons-react';
import { useAuth, type UserRole } from '../../context/AuthContext';
import { useCare } from '../../context/CareContext';
import { useMobile } from '../../hooks/useMobile';
import { HHMark } from '../../components/ui';
import './styles.css';

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
      <Paper className="login-card" withBorder radius="md" p="xl">
        <Group justify="center" gap="sm" mb={4}>
          <HHMark size={32} />
          <Title order={1} size={24} fw={700} c="var(--hh-ink)">HealthHub</Title>
        </Group>
        <Text size="sm" c="var(--hh-muted)" ta="center" mb="lg">
          Entre com suas credenciais
        </Text>

        <form onSubmit={form.onSubmit(handleEntrar)}>
          <Stack gap="md">
            {form.errors.password && !form.errors.email && (
              <Alert icon={<IconAlertCircle size={16} />} color="red" variant="light" radius="md">
                {form.errors.password}
              </Alert>
            )}

            <TextInput
              label="E-mail"
              placeholder="seu@hospital.com.br"
              autoComplete="email"
              error={form.errors.email}
              {...form.getInputProps('email')}
            />

            <PasswordInput
              label="Senha"
              placeholder="••••••••"
              autoComplete="current-password"
              error={form.errors.password && !form.errors.email ? '' : form.errors.password}
              {...form.getInputProps('password')}
            />

            <Button type="submit" fullWidth mt="sm" loading={form.submitting}>
              Entrar
            </Button>
          </Stack>
        </form>
      </Paper>
    </div>
  );
}
