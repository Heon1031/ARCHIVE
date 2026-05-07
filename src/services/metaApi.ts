import type { Account, InsightRecord, Platform } from "../types/models";

const notImplementedMessage = "실제 API 연결은 8단계에서 구현됩니다.";

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

function getStubResult(): ApiErrorResult {
  return {
    ok: false,
    status: "not_implemented",
    message: notImplementedMessage,
  };
}

export async function checkConnection(_account: Account): Promise<ApiConnectionResult> {
  return getStubResult();
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
