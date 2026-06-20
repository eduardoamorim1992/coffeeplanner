import { useEffect, useSyncExternalStore } from "react";

export const UFS = [
  "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS",
  "MG", "PA", "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC",
  "SP", "SE", "TO",
];

const STORAGE_KEY = "uf";

let currentUf: string =
  typeof localStorage !== "undefined" ? localStorage.getItem(STORAGE_KEY) || "" : "";

const listeners = new Set<() => void>();
function emit() {
  listeners.forEach((l) => l());
}
function subscribe(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}
function getSnapshot() {
  return currentUf;
}

/** Define o estado (UF) manualmente. "" limpa (volta a só nacionais). */
export function setUserUf(uf: string) {
  currentUf = uf;
  try {
    if (uf) localStorage.setItem(STORAGE_KEY, uf);
    else localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
  emit();
}

let detectionStarted = false;
async function detectOnce() {
  if (detectionStarted || currentUf) return;
  detectionStarted = true;
  try {
    const res = await fetch("https://ipapi.co/json/");
    if (!res.ok) return;
    const data = await res.json();
    if (
      data?.country_code === "BR" &&
      typeof data.region_code === "string" &&
      UFS.includes(data.region_code)
    ) {
      setUserUf(data.region_code);
    }
  } catch {
    /* sem detecção — usa só feriados nacionais até o usuário escolher */
  }
}

/** Estado (UF) do usuário, detectado por IP (1x) e ajustável manualmente. */
export function useUserRegion() {
  const uf = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  useEffect(() => {
    detectOnce();
  }, []);

  return { uf, setUf: setUserUf, ufs: UFS };
}
