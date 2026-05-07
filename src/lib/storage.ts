import type { Account, ContentItem, InsightRecord, UiState } from "../types/models";

export const storageKeys = {
  accounts: "content-dashboard.accounts",
  contents: "content-dashboard.contents",
  insights: "content-dashboard.insights",
  uiState: "content-dashboard.uiState",
} as const;

function canUseLocalStorage() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

export function loadJson<T>(key: string, fallback: T): T {
  if (!canUseLocalStorage()) {
    return fallback;
  }

  const rawValue = window.localStorage.getItem(key);

  if (!rawValue) {
    return fallback;
  }

  try {
    return JSON.parse(rawValue) as T;
  } catch {
    return fallback;
  }
}

export function saveJson<T>(key: string, value: T) {
  if (!canUseLocalStorage()) {
    return;
  }

  window.localStorage.setItem(key, JSON.stringify(value));
}

export const storage = {
  loadAccounts: () => loadJson<Account[]>(storageKeys.accounts, []),
  saveAccounts: (accounts: Account[]) => saveJson(storageKeys.accounts, accounts),
  loadContents: () => loadJson<ContentItem[]>(storageKeys.contents, []),
  saveContents: (contents: ContentItem[]) => saveJson(storageKeys.contents, contents),
  loadInsights: () => loadJson<InsightRecord[]>(storageKeys.insights, []),
  saveInsights: (insights: InsightRecord[]) => saveJson(storageKeys.insights, insights),
  loadUiState: (fallback: UiState) => loadJson<UiState>(storageKeys.uiState, fallback),
  saveUiState: (uiState: UiState) => saveJson(storageKeys.uiState, uiState),
};
