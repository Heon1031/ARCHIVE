import type { Account, InsightRecord, Platform } from "../types/models";

const notImplementedMessage = "실제 API 연결은 8단계에서 구현됩니다.";

export type ApiErrorResult = {
  ok: false;
  status: "not_implemented" | "missing_token" | "unsupported_platform";
  message: string;
};

export type ApiConnectionResult =
  | ApiErrorResult
  | {
      ok: true;
      status: "connected";
      message: string;
      checkedAt: string;
    };

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

export async function fetchRecentMedia(_account: Account): Promise<ExternalMediaItem[] | ApiErrorResult> {
  return getStubResult();
}

export async function fetchMediaInsights(
  _account: Account,
  _mediaId: string,
): Promise<NormalizedInsight | ApiErrorResult> {
  return getStubResult();
}

export function normalizeInstagramInsight(_raw: unknown): NormalizedInsight | ApiErrorResult {
  return getStubResult();
}

export function normalizeThreadsInsight(_raw: unknown): NormalizedInsight | ApiErrorResult {
  return getStubResult();
}
