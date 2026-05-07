import type { Account, InsightRecord, Platform } from "../types/models";

const notImplementedMessage = "실제 API 연결은 8단계에서 구현됩니다.";
const instagramConnectionFields = "id,username,account_type,media_count";
const threadsConnectionFields = "id,username,name";
const instagramMediaFields = "id,caption,media_type,permalink,timestamp";
const threadsMediaFields = "id,text,permalink,timestamp,media_type";
const instagramInsightMetrics = "reach,views,likes,comments,saves,shares";
const threadsInsightMetrics = "views,likes,replies,reposts,quotes,shares";

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
  externalMediaId: string;
  caption?: string;
  text?: string;
  mediaType?: string;
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

type RawExternalMediaItem = {
  id?: string;
  caption?: string;
  text?: string;
  media_type?: string;
  permalink?: string;
  timestamp?: string;
};

type MetaMediaListPayload = MetaApiErrorPayload & {
  data?: RawExternalMediaItem[];
};

type RawInsightMetric = {
  name?: string;
  values?: Array<{ value?: unknown }>;
  value?: unknown;
};

type MetaInsightPayload = MetaApiErrorPayload & {
  data?: RawInsightMetric[];
};

type InsightContext = {
  account: Account;
  mediaId: string;
  measuredAt: string;
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
    network_error: "네트워크 오류로 API 요청을 완료하지 못했습니다.",
    rate_limited: "API 호출 제한에 도달했습니다. 잠시 후 다시 시도해야 합니다.",
    unknown_error: "API 요청 중 알 수 없는 오류가 발생했습니다.",
  };

  return messages[status];
}

function getActionableErrorMessage(status: ApiErrorStatus) {
  const messages: Record<ApiErrorStatus, string> = {
    not_implemented: notImplementedMessage,
    missing_token: "계정 설정 탭에서 Access Token을 입력하세요.",
    unsupported_platform: "이 플랫폼은 API를 지원하지 않습니다. 필요한 경우 수기 입력으로 성과를 기록하세요.",
    expired_token: "Access Token이 만료되었습니다. 토큰을 다시 발급받아 교체하세요.",
    permission_denied: "API 권한이 부족합니다. Meta 앱 권한과 계정 연결 상태를 확인하세요.",
    invalid_account: "계정 ID를 확인할 수 없습니다. 계정 설정의 외부 계정 ID를 확인하세요.",
    invalid_media: "게시물 ID를 확인할 수 없습니다. 최근 게시물 목록을 다시 불러오세요.",
    network_error: "네트워크 오류가 발생했습니다. 연결 상태를 확인한 뒤 다시 시도하세요.",
    rate_limited: "API 호출 제한에 도달했습니다. 잠시 후 다시 시도하세요.",
    unknown_error: "API 요청 중 알 수 없는 오류가 발생했습니다. 입력값과 Meta API 상태를 확인하세요.",
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
    message: getActionableErrorMessage(status),
    checkedAt,
    platform: account.platform,
    externalAccountId: account.externalAccountId,
  };
}

function validateAccountForApi(account: Account, checkedAt: string): ApiErrorResult | null {
  if (account.platform !== "instagram" && account.platform !== "threads") {
    return createErrorResult("unsupported_platform", account, checkedAt);
  }

  if (!account.accessToken) {
    return createErrorResult("missing_token", account, checkedAt);
  }

  if (!account.externalAccountId) {
    return createErrorResult("invalid_account", account, checkedAt);
  }

  return null;
}

function validateMediaId(account: Account, mediaId: string, checkedAt: string): ApiErrorResult | null {
  if (!mediaId.trim()) {
    return createErrorResult("invalid_media", account, checkedAt);
  }

  return null;
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

function createRecentMediaUrl(account: Account) {
  const fields = account.platform === "instagram" ? instagramMediaFields : threadsMediaFields;
  const baseUrl =
    account.platform === "instagram"
      ? `https://graph.instagram.com/${account.externalAccountId}/media`
      : `https://graph.threads.net/v1.0/${account.externalAccountId}/threads`;
  const url = new URL(baseUrl);

  // Meta API endpoint와 fields는 실제 구현/운영 전 최신 공식 문서 확인이 필요합니다.
  url.searchParams.set("fields", fields);
  url.searchParams.set("limit", "10");
  url.searchParams.set("access_token", account.accessToken ?? "");

  return url;
}

function createInsightUrl(account: Account, mediaId: string) {
  const metrics = account.platform === "instagram" ? instagramInsightMetrics : threadsInsightMetrics;
  const baseUrl =
    account.platform === "instagram"
      ? `https://graph.instagram.com/${mediaId}/insights`
      : `https://graph.threads.net/v1.0/${mediaId}/insights`;
  const url = new URL(baseUrl);

  // Meta API metric 이름과 지원 범위는 실제 운영 전 최신 공식 문서 확인이 필요합니다.
  url.searchParams.set("metric", metrics);
  url.searchParams.set("access_token", account.accessToken ?? "");

  return url;
}

function mapMetaError(
  response: Response,
  payload: MetaApiErrorPayload,
  invalidResource: "account" | "media" = "account",
): ApiErrorStatus {
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
    return invalidResource === "media" ? "invalid_media" : "invalid_account";
  }

  if (response.status === 429 || errorCode === 4 || errorCode === 17 || errorCode === 613) {
    return "rate_limited";
  }

  return "unknown_error";
}

function normalizeExternalMediaItem(
  rawItem: RawExternalMediaItem,
  account: Account,
): ExternalMediaItem | null {
  if (!rawItem.id) {
    return null;
  }

  return {
    id: rawItem.id,
    accountId: account.id,
    platform: account.platform,
    externalMediaId: rawItem.id,
    caption: rawItem.caption,
    text: rawItem.text,
    mediaType: rawItem.media_type,
    permalink: rawItem.permalink,
    publishedAt: rawItem.timestamp,
  };
}

function readMetricValue(rawValue: unknown) {
  if (typeof rawValue !== "number" || !Number.isFinite(rawValue)) {
    return undefined;
  }

  return rawValue;
}

function getMetricValue(metrics: RawInsightMetric[], metricName: string) {
  const metric = metrics.find((item) => item.name === metricName);
  const rawValue = metric?.values?.[0]?.value ?? metric?.value;

  return readMetricValue(rawValue);
}

function createNormalizedInsight(
  raw: unknown,
  context: InsightContext,
  metricMap: Partial<Record<keyof NormalizedInsight, string>>,
): NormalizedInsight {
  const payload = raw as MetaInsightPayload;
  const metrics = payload.data ?? [];

  return {
    accountId: context.account.id,
    contentId: context.mediaId,
    platform: context.account.platform,
    source: "api",
    measuredAt: context.measuredAt,
    reach: metricMap.reach ? getMetricValue(metrics, metricMap.reach) : undefined,
    views: metricMap.views ? getMetricValue(metrics, metricMap.views) : undefined,
    likes: metricMap.likes ? getMetricValue(metrics, metricMap.likes) : undefined,
    comments: metricMap.comments ? getMetricValue(metrics, metricMap.comments) : undefined,
    saves: metricMap.saves ? getMetricValue(metrics, metricMap.saves) : undefined,
    shares: metricMap.shares ? getMetricValue(metrics, metricMap.shares) : undefined,
    replies: metricMap.replies ? getMetricValue(metrics, metricMap.replies) : undefined,
    reposts: metricMap.reposts ? getMetricValue(metrics, metricMap.reposts) : undefined,
    quotes: metricMap.quotes ? getMetricValue(metrics, metricMap.quotes) : undefined,
    apiSyncStatus: "success",
    lastSyncedAt: context.measuredAt,
  };
}

export async function checkConnection(account: Account): Promise<ApiConnectionResult> {
  const checkedAt = new Date().toISOString();
  const validationError = validateAccountForApi(account, checkedAt);

  if (validationError) {
    return validationError;
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

export async function fetchRecentMedia(account: Account): Promise<ApiListResult<ExternalMediaItem>> {
  const checkedAt = new Date().toISOString();
  const validationError = validateAccountForApi(account, checkedAt);

  if (validationError) {
    return validationError;
  }

  try {
    const response = await fetch(createRecentMediaUrl(account));
    const payload = (await response.json().catch(() => ({}))) as MetaMediaListPayload;

    if (!response.ok) {
      return createErrorResult(mapMetaError(response, payload), account, checkedAt);
    }

    return (payload.data ?? [])
      .map((rawItem) => normalizeExternalMediaItem(rawItem, account))
      .filter((item): item is ExternalMediaItem => item !== null);
  } catch {
    return createErrorResult("network_error", account, checkedAt);
  }
}

export async function fetchMediaInsights(
  account: Account,
  mediaId: string,
): Promise<ApiItemResult<NormalizedInsight>> {
  const measuredAt = new Date().toISOString();
  const validationError =
    validateAccountForApi(account, measuredAt) ?? validateMediaId(account, mediaId, measuredAt);

  if (validationError) {
    return validationError;
  }

  try {
    const response = await fetch(createInsightUrl(account, mediaId));
    const payload = (await response.json().catch(() => ({}))) as MetaInsightPayload;

    if (!response.ok) {
      return createErrorResult(mapMetaError(response, payload, "media"), account, measuredAt);
    }

    const context = { account, mediaId, measuredAt };
    return account.platform === "instagram"
      ? normalizeInstagramInsight(payload, context)
      : normalizeThreadsInsight(payload, context);
  } catch {
    return createErrorResult("network_error", account, measuredAt);
  }
}

export function normalizeInstagramInsight(raw: unknown, context: InsightContext): NormalizedInsight {
  return createNormalizedInsight(raw, context, {
    reach: "reach",
    views: "views",
    likes: "likes",
    comments: "comments",
    saves: "saves",
    shares: "shares",
  });
}

export function normalizeThreadsInsight(raw: unknown, context: InsightContext): NormalizedInsight {
  return createNormalizedInsight(raw, context, {
    views: "views",
    likes: "likes",
    replies: "replies",
    reposts: "reposts",
    quotes: "quotes",
    shares: "shares",
  });
}
