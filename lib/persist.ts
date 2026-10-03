import type { WalletState } from "@/lib/wallet-types";

const STORAGE_KEY = "payflow-wallet-state-v1";
const VERSION = 1;

interface PersistedEnvelope {
  version: number;
  savedAt: string;
  state: WalletState;
}

function canUseStorage() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function looksLikeState(value: unknown): value is WalletState {
  if (!value || typeof value !== "object") return false;
  const candidate = value as WalletState;
  return (
    typeof candidate.seq === "number" &&
    Array.isArray(candidate.accounts) &&
    Array.isArray(candidate.transactions) &&
    typeof candidate.balances === "object" &&
    candidate.balances !== null &&
    typeof candidate.wallets === "object" &&
    candidate.wallets !== null
  );
}

export function loadWalletState(): WalletState | null {
  if (!canUseStorage()) return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PersistedEnvelope;
    if (parsed.version !== VERSION || !looksLikeState(parsed.state)) {
      window.localStorage.removeItem(STORAGE_KEY);
      return null;
    }
    return parsed.state;
  } catch {
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
    return null;
  }
}

export function saveWalletState(state: WalletState) {
  if (!canUseStorage()) return;
  try {
    const envelope: PersistedEnvelope = {
      version: VERSION,
      savedAt: new Date().toISOString(),
      state,
    };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(envelope));
  } catch {
    /* quota or private mode — demo still works in memory */
  }
}

export function clearWalletState() {
  if (!canUseStorage()) return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}
