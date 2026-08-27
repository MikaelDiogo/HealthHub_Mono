import { TextInput, type TextInputProps } from '@mantine/core';

export function FilterField(props: TextInputProps) {
  return (
    <TextInput
      size="md"
      radius="md"
      placeholder="Pesquisar pacientes por nome..."
      {...props}
    />
  );
}
