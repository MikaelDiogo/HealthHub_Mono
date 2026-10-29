// Fonte única dos papéis profissionais. Antes duplicado em SideBar, MobileLayout,
// Chat e o antigo balão do chat, com cores diferentes para o mesmo papel.
export type Role = 'medico' | 'enfermeiro' | 'recepcionista';

export const ROLE_LABEL: Record<Role, string> = {
  medico: 'Médico',
  enfermeiro: 'Enfermeiro',
  recepcionista: 'Recepcionista',
};

// Identidade de pessoa (avatares do chat), não dado clínico: tons distintos e sem violeta.
export const ROLE_COLOR: Record<Role, string> = {
  medico: 'blue',
  enfermeiro: 'green',
  recepcionista: 'orange',
};

export function roleLabel(role: string | null | undefined): string {
  return role && role in ROLE_LABEL ? ROLE_LABEL[role as Role] : '';
}
