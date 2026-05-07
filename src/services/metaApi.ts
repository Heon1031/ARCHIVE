import type { Account, InsightRecord, Platform } from "../types/models";

const notImplementedMessage = "실제 API 연결은 8단계에서 구현됩니다.";
const instagramConnectionFields = "id,username,account_type,media_count";
const threadsConnectionFields = "id,username,name";

export type ApiErrorStatus =
  | "not_implemented"
  | "missing_token"
  | "unsupported_platform"
  | "expired_token"
  | "permission_denied"
  | "invalid_account"
  | "invalid_media"
  | "network_error"
  | "rate_limited"
  | "unknown_error";

export type ApiErrorResult = {
  ok: false;
  status: ApiErrorStatus;
  message: string;
  checkedAt?: string;
  platform?: Platform;
  externalAccountId?: string;
};

export type ApiConnectionResult =
  | ApiErrorResult
  | {
      ok: true;
      status: "connected";
      message: string;
      checkedAt: string;
      platform: Platform;
      externalAccountId?: string;
    };

export type ApiListResult<T> = T[] | ApiErrorResult;

export type ApiItemResult<T> = T | ApiErrorResult;

export type ExternalMediaItem = {
  id: string;
  accountId: string;
  platform: Platform;
  permalink?: string;
  publishedAt?: string;
};

export type NormalizedInsight = Pick<
  InsightRecord,
  | "accountId"
  | "contentId"
  | "platform"
  | "source"
  | "measuredAt"
  | "reach"
  | "views"
  | "likes"
  | "comments"
  | "saves"
  | "shares"
  | "replies"
  | "reposts"
  | "quotes"
  | "apiSyncStatus"
  | "lastSyncedAt"
  | "syncErrorMessage"
>;

type MetaApiErrorPayload = {
  error?: {
    message?: string;
    type?: string;
    code?: number;
    error_subcode?: number;
  };
};

function getStubResult(): ApiErrorResult {
  return {
    ok: false,
    status: "not_implemented",
    message: notImplementedMessage,
  };
}

function getErrorMessage(status: ApiErrorStatus) {
  const messages: Record<ApiErrorStatus, string> = {
    not_implemented: notImplementedMessage,
    missing_token: "Access Token이 필요합니다.",
    unsupported_platform: "이 플랫폼은 API 연결 확인을 지원하지 않습니다.",
    expired_token: "Access Token이 만료되었거나 OAuth 인증이 필요합니다.",
    permission_denied: "API 권한이 부족합니다. 공식 문서에서 필요한 권한을 확인해야 합니다.",
    invalid_account: "계정 ID를 확인할 수 없습니다.",
    invalid_media: "미디어 ID를 확인할 수 없습니다.",
    network_error: "네트워크 오류로 API 연결을 확인하지 못했습니다.",
    rate_limited: "API 호출 제한에 도달했습니다. 잠시 후 다시 시도해야 합니다.",
    unknown_error: "API 연결 확인 중 알 수 없는 오류가 발생했습니다.",
  };

  return messages[status];
}

function createErrorResult(
  status: ApiErrorStatus,
  account: Account,
  checkedAt: string,
): ApiErrorResult {
  return {
    ok: false,
    status,
    message: getErrorMessage(status),
    checkedAt,
    platform: account.platform,
    externalAccountId: account.externalAccountId,
  };
}

function createConnectionUrl(account: Account) {
  const fields =
    account.platform === "instagram" ? instagramConnectionFields : threadsConnectionFields;
  const baseUrl =
    account.platform === "instagram"
      ? `https://graph.instagram.com/${account.externalAccountId}`
      : `https://graph.threads.net/v1.0/${account.externalAccountId}`;
  const url = new URL(baseUrl);

  url.searchParams.set("fields", fields);
  url.searchParams.set("access_token", account.accessToken ?? "");

  return url;
}

function mapMetaError(response: Response, payload: MetaApiErrorPayload): ApiErrorStatus {
  const errorCode = payload.error?.code;
  const errorType = payload.error?.type?.toLowerCase() ?? "";
  const errorMessage = payload.error?.message?.toLowerCase() ?? "";

  if (response.status === 401 || errorCode === 190 || errorMessage.includes("token")) {
    return "expired_token";
  }

  if (response.status === 403 || errorCode === 10 || errorCode === 200 || errorType.includes("permission")) {
    return "permission_denied";
  }

  if (response.status === 404 || errorCode === 100) {
    return "invalid_account";
  }

  if (response.status === 429 || errorCode === 4 || errorCode === 17 || errorCode === 613) {
    return "rate_limited";
  }

  return "unknown_error";
}

export async function checkConnection(account: Account): Promise<ApiConnectionResult> {
  const checkedAt = new Date().toISOString();

  if (account.platform !== "instagram" && account.platform !== "threads") {
    return createErrorResult("unsupported_platform", account, checkedAt);
  }

  if (!account.accessToken) {
    return createErrorResult("missing_token", account, checkedAt);
  }

  if (!account.externalAccountId) {
    return createErrorResult("invalid_account", account, checkedAt);
  }

  try {
    const response = await fetch(createConnectionUrl(account));
    const payload = (await response.json().catch(() => ({}))) as MetaApiErrorPayload;

    if (!response.ok) {
      return createErrorResult(mapMetaError(response, payload), account, checkedAt);
    }

    return {
      ok: true,
      status: "connected",
      message: "API 연결 확인에 성공했습니다. endpoint와 fields는 구현 단계에서 공식 문서 확인이 필요합니다.",
      checkedAt,
      platform: account.platform,
      externalAccountId: account.externalAccountId,
    };
  } catch {
    return createErrorResult("network_error", account, checkedAt);
  }
}

export async function fetchRecentMedia(_account: Account): Promise<ApiListResult<ExternalMediaItem>> {
  return getStubResult();
}

export async function fetchMediaInsights(
  _account: Account,
  _mediaId: string,
): Promise<ApiItemResult<NormalizedInsight>> {
  return getStubResult();
}

export function normalizeInstagramInsight(_raw: unknown): NormalizedInsight | ApiErrorResult {
  return getStubResult();
}

export function normalizeThreadsInsight(_raw: unknown): NormalizedInsight | ApiErrorResult {
  return getStubResult();
}
