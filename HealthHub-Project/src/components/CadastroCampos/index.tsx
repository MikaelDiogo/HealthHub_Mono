import { Badge, Checkbox, Select, Stack, TextInput } from '@mantine/core';
import type { UseFormReturnType } from '@mantine/form';
import { NOME_PROVISORIO_PREVIEW, opcoesSexo } from '../../utils/nomeProvisorio';

// Campos de identificação compartilhados pelos formulários de cadastro e de edição: só o Nome é obrigatório.

/** Selo discreto para quem está com nome provisório (gerado pelo sistema). */
export const SeloNomeProvisorio = () => (
  <Badge size="xs" color="orange" variant="light" style={{ flexShrink: 0 }} title="Nome gerado pelo sistema: corrija quando o paciente for identificado">
    Nome provisório
  </Badge>
);

interface CampoNomeProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  form: UseFormReturnType<any>;
  /** Cadastro novo: oferece "Nome desconhecido". Na edição o nome só é corrigido. */
  permiteDesconhecido?: boolean;
  radius?: string;
  size?: string;
}

export const CampoNome = ({ form, permiteDesconhecido = false, radius, size }: CampoNomeProps) => {
  const desconhecido: boolean = permiteDesconhecido && form.values.nome_desconhecido === true;
  return (
    <Stack gap={6}>
      <TextInput
        label="Nome Completo"
        withAsterisk
        placeholder="Ex: Maria Silva Santos"
        radius={radius}
        size={size}
        maxLength={100}
        disabled={desconhecido}
        {...form.getInputProps('nome_completo')}
        {...(desconhecido ? { value: NOME_PROVISORIO_PREVIEW, error: undefined } : {})}
      />
      {permiteDesconhecido && (
        <Checkbox
          size="xs"
          label="Nome desconhecido"
          description="O sistema cria um nome provisório (o #xxxx é gerado ao salvar). Ele pode ser corrigido depois pela edição do paciente."
          checked={form.values.nome_desconhecido === true}
          onChange={(e) => {
            form.setFieldValue('nome_desconhecido', e.currentTarget.checked);
            form.setFieldValue('nome_completo', '');
            form.clearFieldError('nome_completo');
          }}
        />
      )}
    </Stack>
  );
};

interface CampoSexoProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  form: UseFormReturnType<any>;
  radius?: string;
  size?: string;
}

/** Sexo em lista (Masculino/Feminino), limpável; grava M ou F. Valor antigo ("Outro") continua aparecendo. */
export const CampoSexo = ({ form, radius, size }: CampoSexoProps) => (
  <Select
    label="Sexo"
    placeholder="Selecione"
    radius={radius}
    size={size}
    data={opcoesSexo(form.values.sexo)}
    clearable
    allowDeselect
    {...form.getInputProps('sexo')}
    value={form.values.sexo || null}
    onChange={(v) => form.setFieldValue('sexo', v ?? '')}
  />
);
