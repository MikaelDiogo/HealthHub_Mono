// Aceite dos termos de uso (RF22): guardado no navegador, por versão dos termos.
export const VERSAO_TERMOS = '1.0';
export const STORAGE_KEY = `healthhub_termos_aceitos_v${VERSAO_TERMOS}`;
const DATA_KEY = 'healthhub_termos_data_aceite';

export function useTermosAceitos() {
  return localStorage.getItem(STORAGE_KEY) === 'true';
}

export function marcarTermosAceitos() {
  localStorage.setItem(STORAGE_KEY, 'true');
  localStorage.setItem(DATA_KEY, new Date().toISOString());
}

export function revogarTermosAceitos() {
  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem(DATA_KEY);
}
