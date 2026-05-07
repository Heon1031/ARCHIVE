import { useMemo, useState, type FormEvent } from "react";
import { checkConnection } from "../services/metaApi";
import type { Account, AccountConnectionStatus, Platform } from "../types/models";

type AccountSettingsTabProps = {
  accounts: Account[];
  onAccountsChange: (accounts: Account[]) => void;
};

type AccountFormState = {
  platform: Platform;
  accountName: string;
  username: string;
  displayName: string;
  externalAccountId: string;
  profileUrl: string;
  accessToken: string;
  tokenExpiresAt: string;
  connectionStatus: AccountConnectionStatus;
  isApiSupported: boolean;
  isActive: boolean;
};

const emptyForm: AccountFormState = {
  platform: "instagram",
  accountName: "",
  username: "",
  displayName: "",
  externalAccountId: "",
  profileUrl: "",
  accessToken: "",
  tokenExpiresAt: "",
  connectionStatus: "needs_check",
  isApiSupported: true,
  isActive: true,
};

const platformLabels: Record<Platform, string> = {
  instagram: "Instagram",
  threads: "Threads",
  brunch: "Brunch",
  blog: "Blog",
  other: "Other",
};

const connectionStatusLabels: Record<AccountConnectionStatus, string> = {
  connected: "연결됨",
  needs_check: "확인 필요",
  failed: "실패",
  expired: "토큰 만료",
  unsupported: "API 미지원",
};

function createId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `account-${Date.now()}`;
}

function toOptionalValue(value: string) {
  const trimmedValue = value.trim();
  return trimmedValue.length > 0 ? trimmedValue : undefined;
}

function maskToken(token?: string) {
  if (!token) {
    return "미입력";
  }

  if (token.length <= 8) {
    return "입력됨";
  }

  return `${token.slice(0, 4)}...${token.slice(-4)}`;
}

function getDefaultApiSupport(platform: Platform) {
  return platform === "instagram" || platform === "threads";
}

export function AccountSettingsTab({ accounts, onAccountsChange }: AccountSettingsTabProps) {
  const [form, setForm] = useState<AccountFormState>(emptyForm);
  const [editingAccountId, setEditingAccountId] = useState<string | null>(null);
  const [apiCheckMessageByAccountId, setApiCheckMessageByAccountId] = useState<Record<string, string>>({});

  const activeCount = useMemo(
    () => accounts.filter((account) => account.isActive).length,
    [accounts],
  );

  function updateForm<Key extends keyof AccountFormState>(key: Key, value: AccountFormState[Key]) {
    setForm((currentForm) => ({ ...currentForm, [key]: value }));
  }

  function handlePlatformChange(platform: Platform) {
    setForm((currentForm) => ({
      ...currentForm,
      platform,
      isApiSupported: getDefaultApiSupport(platform),
      connectionStatus: getDefaultApiSupport(platform) ? "needs_check" : "unsupported",
    }));
  }

  function resetForm() {
    setForm(emptyForm);
    setEditingAccountId(null);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const now = new Date().toISOString();
    const accountPayload = {
      platform: form.platform,
      accountName: form.accountName.trim(),
      displayName: form.displayName.trim() || form.accountName.trim(),
      username: toOptionalValue(form.username),
      externalAccountId: toOptionalValue(form.externalAccountId),
      profileUrl: toOptionalValue(form.profileUrl),
      accessToken: toOptionalValue(form.accessToken),
      tokenExpiresAt: toOptionalValue(form.tokenExpiresAt),
      connectionStatus: form.connectionStatus,
      isApiSupported: form.isApiSupported,
      isActive: form.isActive,
    };

    if (!accountPayload.accountName) {
      return;
    }

    if (editingAccountId) {
      onAccountsChange(
        accounts.map((account) =>
          account.id === editingAccountId
            ? { ...account, ...accountPayload, updatedAt: now }
            : account,
        ),
      );
      resetForm();
      return;
    }

    onAccountsChange([
      ...accounts,
      {
        id: createId(),
        ...accountPayload,
        createdAt: now,
        updatedAt: now,
      },
    ]);
    resetForm();
  }

  function handleEdit(account: Account) {
    setEditingAccountId(account.id);
    setForm({
      platform: account.platform,
      accountName: account.accountName,
      username: account.username ?? "",
      displayName: account.displayName,
      externalAccountId: account.externalAccountId ?? "",
      profileUrl: account.profileUrl ?? "",
      accessToken: account.accessToken ?? "",
      tokenExpiresAt: account.tokenExpiresAt ?? "",
      connectionStatus: account.connectionStatus,
      isApiSupported: account.isApiSupported,
      isActive: account.isActive,
    });
  }

  function handleToggleActive(accountId: string) {
    const now = new Date().toISOString();
    onAccountsChange(
      accounts.map((account) =>
        account.id === accountId
          ? { ...account, isActive: !account.isActive, updatedAt: now }
          : account,
      ),
    );
  }

  async function handleCheckConnection(account: Account) {
    const result = await checkConnection(account);
    setApiCheckMessageByAccountId((currentMessages) => ({
      ...currentMessages,
      [account.id]: result.message,
    }));
  }

  return (
    <section className="tab-panel" aria-label="계정 등록 및 설정 탭">
      <div className="settings-header">
        <div>
          <h2>계정 등록/설정</h2>
          <p>Instagram / Threads 계정과 보조 채널을 등록하고 연결 상태를 관리합니다.</p>
        </div>
        <span className="badge">{activeCount}개 활성 계정</span>
      </div>

      <div className="section-grid">
        <article className="panel-card panel-card--wide">
          <div className="card-heading">
            <div>
              <h3>{editingAccountId ? "계정 수정" : "계정 추가"}</h3>
              <p>토큰은 MVP에서 localStorage에 저장되며 실제 배포용 보안 구조가 아닙니다.</p>
            </div>
            {editingAccountId && (
              <button className="secondary-button" type="button" onClick={resetForm}>
                새 계정 입력
              </button>
            )}
          </div>

          <form className="account-form" onSubmit={handleSubmit}>
            <fieldset>
              <legend>기본 정보</legend>
              <div className="form-grid">
                <label className="form-field">
                  <span>플랫폼</span>
                  <select
                    value={form.platform}
                    onChange={(event) => handlePlatformChange(event.target.value as Platform)}
                  >
                    {Object.entries(platformLabels).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="form-field">
                  <span>계정명</span>
                  <input
                    required
                    value={form.accountName}
                    onChange={(event) => updateForm("accountName", event.target.value)}
                    placeholder="예: 작업용 인스타"
                  />
                </label>
                <label className="form-field">
                  <span>표시 이름</span>
                  <input
                    value={form.displayName}
                    onChange={(event) => updateForm("displayName", event.target.value)}
                    placeholder="비워두면 계정명을 사용"
                  />
                </label>
                <label className="form-field">
                  <span>사용자명</span>
                  <input
                    value={form.username}
                    onChange={(event) => updateForm("username", event.target.value)}
                    placeholder="@username"
                  />
                </label>
                <label className="form-field">
                  <span>외부 계정 ID</span>
                  <input
                    value={form.externalAccountId}
                    onChange={(event) => updateForm("externalAccountId", event.target.value)}
                    placeholder="API 계정 ID"
                  />
                </label>
                <label className="form-field">
                  <span>프로필 URL</span>
                  <input
                    type="url"
                    value={form.profileUrl}
                    onChange={(event) => updateForm("profileUrl", event.target.value)}
                    placeholder="https://"
                  />
                </label>
              </div>
            </fieldset>

            <fieldset>
              <legend>API 정보</legend>
              <div className="form-grid">
                <label className="form-field">
                  <span>Access Token</span>
                  <input
                    type="password"
                    value={form.accessToken}
                    onChange={(event) => updateForm("accessToken", event.target.value)}
                    placeholder="계정 설정 탭에서만 입력"
                  />
                </label>
                <label className="form-field">
                  <span>토큰 만료일</span>
                  <input
                    type="date"
                    value={form.tokenExpiresAt}
                    onChange={(event) => updateForm("tokenExpiresAt", event.target.value)}
                  />
                </label>
                <label className="form-field">
                  <span>연결 상태</span>
                  <select
                    value={form.connectionStatus}
                    onChange={(event) =>
                      updateForm("connectionStatus", event.target.value as AccountConnectionStatus)
                    }
                  >
                    {Object.entries(connectionStatusLabels).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="checkbox-field">
                  <input
                    type="checkbox"
                    checked={form.isApiSupported}
                    onChange={(event) => updateForm("isApiSupported", event.target.checked)}
                  />
                  <span>API 지원 계정</span>
                </label>
                <label className="checkbox-field">
                  <input
                    type="checkbox"
                    checked={form.isActive}
                    onChange={(event) => updateForm("isActive", event.target.checked)}
                  />
                  <span>활성 계정</span>
                </label>
              </div>
            </fieldset>

            <div className="form-actions">
              <button className="primary-button" type="submit">
                {editingAccountId ? "계정 수정" : "계정 추가"}
              </button>
              <button className="secondary-button" type="button" onClick={resetForm}>
                취소
              </button>
              <button className="muted-action" type="button" disabled>
                API 연결 확인은 다음 단계
              </button>
            </div>
          </form>
        </article>

        <article className="panel-card panel-card--wide">
          <h3>계정 목록</h3>
          {accounts.length === 0 ? (
            <p>등록된 계정이 없습니다. Instagram 또는 Threads 계정을 먼저 추가하세요.</p>
          ) : (
            <div className="account-list">
              {accounts.map((account) => (
                <div className="account-card" key={account.id}>
                  <div className="account-card__main">
                    <div>
                      <div className="account-card__title">
                        <strong>{account.displayName}</strong>
                        <span className="badge">{platformLabels[account.platform]}</span>
                        <span className={`badge ${account.isActive ? "badge--success" : ""}`}>
                          {account.isActive ? "활성" : "비활성"}
                        </span>
                        <span className="badge">
                          {connectionStatusLabels[account.connectionStatus]}
                        </span>
                      </div>
                      <p>
                        {account.username || "사용자명 없음"} · 외부 ID{" "}
                        {account.externalAccountId || "미입력"}
                      </p>
                    </div>
                    <div className="account-card__meta">
                      <span>토큰: {maskToken(account.accessToken)}</span>
                      <span>API: {account.isApiSupported ? "지원" : "미지원"}</span>
                      <span>연결 상태: {connectionStatusLabels[account.connectionStatus]}</span>
                      <span>마지막 동기화: {account.lastSyncedAt ?? "없음"}</span>
                      <span>토큰 만료일: {account.tokenExpiresAt ?? "없음"}</span>
                    </div>
                  </div>
                  {apiCheckMessageByAccountId[account.id] && (
                    <p className="api-result-message">{apiCheckMessageByAccountId[account.id]}</p>
                  )}
                  <div className="account-card__actions">
                    <button
                      className="primary-button"
                      type="button"
                      onClick={() => void handleCheckConnection(account)}
                    >
                      API 연결 확인
                    </button>
                    <button className="secondary-button" type="button" onClick={() => handleEdit(account)}>
                      수정
                    </button>
                    <button
                      className="danger-button"
                      type="button"
                      onClick={() => handleToggleActive(account.id)}
                    >
                      {account.isActive ? "비활성화" : "활성화"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </article>

        <article className="panel-card">
          <h3>보안 안내</h3>
          <p>
            MVP에서는 Access Token을 localStorage에 저장합니다. 실제 배포 전에는 서버 저장과
            권한 분리 구조가 필요합니다.
          </p>
        </article>
        <article className="panel-card">
          <h3>필터 안내</h3>
          <p>
            활성 계정은 상단 필터에 반영됩니다. Brunch, Blog, Other는 개별 계정 필터로만
            사용합니다.
          </p>
        </article>
      </div>
    </section>
  );
}
