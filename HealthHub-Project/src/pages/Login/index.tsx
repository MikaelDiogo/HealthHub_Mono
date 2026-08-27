import axios from 'axios';
import api from '../../services/api';
import { useNavigate } from 'react-router-dom';
import { useForm } from '@mantine/form';
import { Avatar, Title, Text, Box, Stack, Paper, Center } from '@mantine/core';
import imgHealthHub from '../../assets/healthhubPHOTO 1.png';
import { ButtonEnter } from '../../components/Buttons';
import { InputPass, InputField } from '../../components/InputField';
import { useAuth, type UserRole } from '../../context/AuthContext';
import { useCare } from '../../context/CareContext';

export default function Login() {
  const navigate = useNavigate();
  const { setAuth } = useAuth();
  const { recarregar } = useCare();

  const form = useForm({
    initialValues: { email: '', password: '' },
    validate: {
      email: (value) => (value.length < 5 ? 'Email muito curto' : null),
      password: (value) => (value.length < 1 ? 'Senha obrigatória' : null),
    },
  });

  const handleEntrar = async (values: typeof form.values) => {
    try {
      const response = await api.post('/login', {
        email: values.email,
        password: values.password,
      });
      const { token, role, nome } = response.data;
      setAuth(token, role as UserRole, nome);
      await recarregar();

      if (role === 'recepcionista') {
        navigate('/main/alertas');
      } else {
        navigate('/main');
      }
    } catch (error: unknown) {
      let mensagem = 'Erro ao conectar com o servidor';
      if (axios.isAxiosError(error)) {
        mensagem = error.response?.data?.message || mensagem;
      }
      form.setErrors({ password: mensagem });
    }
  };

  return (
    <Center h="100dvh" bg="slate.1">
      <form onSubmit={form.onSubmit(handleEntrar)}>
        <Paper w={420} p="xl" radius="md" withBorder shadow="md">
          <Stack align="center" gap="md">
            <Avatar size={100} src={imgHealthHub} alt="HealthHub" radius="md" />
            <Title order={2} ta="center" style={{ fontFamily: "'Inter', sans-serif", fontWeight: 700 }}>
              Bem-vindo ao HealthHub
            </Title>
            <Text size="sm" c="slate.5">
              Faça login para continuar
            </Text>

            <Stack w="100%" gap="sm">
              <Box>
                <Text size="sm" fw={600} mb={4}>
                  Email
                </Text>
                <InputField placeholder="Digite seu email" {...form.getInputProps('email')} />
              </Box>
              <Box>
                <Text size="sm" fw={600} mb={4}>
                  Senha
                </Text>
                <InputPass {...form.getInputProps('password')} />
              </Box>
            </Stack>

            <ButtonEnter type="submit" />
          </Stack>
        </Paper>
      </form>
    </Center>
  );
}
