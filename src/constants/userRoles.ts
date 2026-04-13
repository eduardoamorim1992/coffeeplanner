/**
 * Papéis em `users.role` — alinhados ao admin (`AdminUsers`), exceto cadastro público sem `admin`.
 */
export const SIGNUP_ROLE_OPTIONS = [
  { value: "assistente", label: "Assistente" },
  { value: "analista", label: "Analista" },
  { value: "coordenador", label: "Coordenador" },
  { value: "supervisor", label: "Supervisor" },
  { value: "gerente", label: "Gerente" },
  { value: "diretor", label: "Diretor" },
] as const;

export type SignupRole = (typeof SIGNUP_ROLE_OPTIONS)[number]["value"];

export function isValidSignupRole(role: string): role is SignupRole {
  return SIGNUP_ROLE_OPTIONS.some((o) => o.value === role);
}
