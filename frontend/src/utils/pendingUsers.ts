import type { Usuario } from '@/types/usuario';

const STORAGE_KEY = 'pending-created-users';
const TTL_MS = 60 * 1000; // 60 segundos

interface PendingEntry {
  user: Usuario;
  ts: number;
}

type PendingState = Record<number, PendingEntry>;

const readState = (): PendingState => {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as PendingState;
  } catch {
    return {};
  }
};

const writeState = (state: PendingState) => {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Ignorar errores de almacenamiento
  }
};

const pruneExpired = (state: PendingState): PendingState => {
  const now = Date.now();
  let mutated = false;
  Object.entries(state).forEach(([key, entry]) => {
    if (now - entry.ts > TTL_MS) {
      delete state[Number(key)];
      mutated = true;
    }
  });
  if (mutated) {
    writeState(state);
  }
  return state;
};

export const addPendingUser = (user: Usuario) => {
  const state = pruneExpired(readState());
  state[user.id_usuario] = { user, ts: Date.now() };
  writeState(state);
};

export const removePendingUser = (idUsuario: number) => {
  const state = pruneExpired(readState());
  if (state[idUsuario]) {
    delete state[idUsuario];
    writeState(state);
  }
};

export const getPendingUsers = (): Usuario[] => {
  const state = pruneExpired(readState());
  return Object.values(state).map((entry) => entry.user);
};
