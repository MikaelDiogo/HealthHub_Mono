import { IconLock } from '@tabler/icons-react';
import { TextInput, PasswordInput, type TextInputProps, type PasswordInputProps } from '@mantine/core';

export const InputField = (props: TextInputProps) => (
  <TextInput w="100%" radius="md" {...props} />
);

export const InputPass = (props: PasswordInputProps) => (
  <PasswordInput
    w="100%"
    radius="md"
    leftSection={<IconLock size={18} stroke={1.5} />}
    placeholder="Insira a senha"
    {...props}
  />
);
