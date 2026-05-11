import { useMemo, useState, type FormEvent } from "react";
import {
  checkConnection,
  fetchMediaInsights,
  fetchRecentMedia,
  type ExternalMediaItem,
  type NormalizedInsight,
} from "../services/metaApi";
import { getManagedKeywords, inferManagedKeywordsFromText } from "../lib/taxonomy";
import type { Account, AccountConnectionStatus, ContentItem, InsightRecord, Platform } from "../types/models";

type AccountSettingsTabProps = {
  accounts: Account[];
  contents: ContentItem[];
  insights: InsightRecord[];
  onAccountsChange: (accounts: Account[]) => void;
  onContentsChange: (contents: ContentItem[]) => void;
  onInsightsChange: (insights: InsightRecord[]) => void;
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

type ManualMetricForm = {
  reach: string;
  views: string;
  likes: string;
  comments: string;
  saves: string;
  shares: string;
  replies: string;
  reposts: string;
  quotes: string;
};

const emptyManualMetricForm: ManualMetricForm = {
  reach: "",
  views: "",
  likes: "",
  comments: "",
  saves: "",
  shares: "",
  replies: "",
  reposts: "",
  quotes: "",
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

const contentStatusLabels: Record<ContentItem["status"], string> = {
  idea: "기획",
  planned: "계획",
  in_progress: "제작 중",
  review: "검토",
  scheduled: "예약 예정",
  published: "게시 완료",
  on_hold: "보류",
  archived: "보관",
};

const contentFormatLabels: Record<NonNullable<ContentItem["format"]>, string> = {
  post: "이미지/일반",
  reel: "릴스/영상",
  thread: "Threads",
  carousel: "캐러셀",
  story: "스토리",
  article: "긴 글",
  other: "기타",
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

function getMediaPreview(media: ExternalMediaItem) {
  const previewText = media.caption ?? media.text;

  if (!previewText) {
    return "본문 없음";
  }

  return previewText.length > 80 ? `${previewText.slice(0, 80)}...` : previewText;
}

function getContentTitleFromMedia(media: ExternalMediaItem) {
  const sourceText = (media.caption ?? media.text ?? "").trim();

  if (!sourceText) {
    return "제목 없는 게시물";
  }

  return sourceText.length > 36 ? `${sourceText.slice(0, 36)}...` : sourceText;
}

function getPublishedDate(media: ExternalMediaItem) {
  if (!media.publishedAt) {
    return undefined;
  }

  const parsedDate = new Date(media.publishedAt);

  if (Number.isNaN(parsedDate.getTime())) {
    return media.publishedAt.slice(0, 10);
  }

  return parsedDate.toISOString().slice(0, 10);
}

function inferFormatFromMedia(account: Account, media: ExternalMediaItem): NonNullable<ContentItem["format"]> {
  const mediaType = media.mediaType?.toUpperCase();

  if (account.platform === "threads") {
    return "thread";
  }

  if (mediaType === "CAROUSEL_ALBUM") {
    return "carousel";
  }

  if (mediaType === "VIDEO" || mediaType === "REELS") {
    return "reel";
  }

  if (mediaType === "IMAGE") {
    return "post";
  }

  return "other";
}

function inferContentTypeFromMedia(account: Account, media: ExternalMediaItem) {
  const mediaType = media.mediaType?.toUpperCase();

  if (account.platform === "threads") {
    return "Threads";
  }

  if (mediaType === "CAROUSEL_ALBUM") {
    return "캐러셀";
  }

  if (mediaType === "VIDEO" || mediaType === "REELS") {
    return "릴스/영상";
  }

  if (mediaType === "IMAGE") {
    return media.caption ? "이미지+캡션" : "이미지만";
  }

  return "기타";
}

function inferTopicFromText(media: ExternalMediaItem) {
  const sourceText = `${media.caption ?? ""} ${media.text ?? ""}`.toLowerCase();
  const proseTopicRules: Array<{ topic: string; keywords: string[] }> = [
    { topic: "가족", keywords: ["가족", "아이", "엄마", "아빠", "부모"] },
    { topic: "결혼/관계", keywords: ["결혼", "관계", "부부", "사랑"] },
    { topic: "일상", keywords: ["일상", "오늘", "하루", "주말"] },
    { topic: "마음", keywords: ["마음", "불안", "감정", "슬픔"] },
    { topic: "위로/응원", keywords: ["위로", "응원", "괜찮", "힘"] },
    { topic: "성장", keywords: ["성장", "배움", "습관", "도전"] },
    { topic: "창작", keywords: ["창작", "글", "콘텐츠", "작업"] },
    { topic: "회고", keywords: ["회고", "기록", "돌아보", "생각"] },
    { topic: "공지", keywords: ["공지", "안내", "소식", "모집"] },
  ];
  const matchedTopic = proseTopicRules.find((rule) => rule.keywords.some((keyword) => sourceText.includes(keyword)))?.topic;

  if (matchedTopic) {
    return matchedTopic;
  }

  return "기타";

  const topicRules: Array<{ topic: string; keywords: string[] }> = [
    { topic: "가족", keywords: ["가족", "아이", "엄마", "아빠", "부모"] },
    { topic: "결혼/관계", keywords: ["결혼", "관계", "부부", "사랑"] },
    { topic: "일상", keywords: ["일상", "오늘", "하루", "주말"] },
    { topic: "성장", keywords: ["성장", "배움", "습관", "도전"] },
    { topic: "위로", keywords: ["위로", "괜찮", "힘들", "마음"] },
    { topic: "창작", keywords: ["창작", "글", "콘텐츠", "작업"] },
    { topic: "회고", keywords: ["회고", "기록", "돌아보", "느낀"] },
    { topic: "공지", keywords: ["공지", "안내", "소식", "모집"] },
  ];

  return topicRules.find((rule) => rule.keywords.some((keyword) => sourceText.includes(keyword)))?.topic ?? "기타";
}

function extractTopicKeywords(media: ExternalMediaItem) {
  return inferManagedKeywordsFromText(`${media.caption ?? ""} ${media.text ?? ""}`);

  const sourceText = `${media.caption ?? ""} ${media.text ?? ""}`;
  const matches = sourceText.match(/[가-힣A-Za-z0-9#]{2,}/g) ?? [];
  return Array.from(new Set(matches.map((keyword) => keyword.replace(/^#/, "")).filter(Boolean))).slice(0, 8);
}

function getExternalMediaId(media: ExternalMediaItem) {
  const externalMediaId = media.externalMediaId.trim();

  if (externalMediaId) {
    return externalMediaId;
  }

  const fallbackId = media.id.trim();
  return fallbackId || undefined;
}

function openPermalink(permalink?: string) {
  const targetUrl = permalink?.trim();

  if (!targetUrl) {
    return;
  }

  window.open(targetUrl, "_blank", "noopener,noreferrer");
}

function formatInsightValue(value?: number) {
  return typeof value === "number" ? value.toLocaleString() : "-";
}

function hasInsightMetric(insight: NormalizedInsight) {
  return [
    insight.reach,
    insight.views,
    insight.likes,
    insight.comments,
    insight.saves,
    insight.shares,
    insight.replies,
    insight.reposts,
    insight.quotes,
  ].some((value) => typeof value === "number");
}

function getMetricNamesLabel(metricNames?: string[]) {
  if (!metricNames || metricNames.length === 0) {
    return "없음";
  }

  return metricNames.join(", ");
}

function getContentOptionLabel(content: ContentItem) {
  return `${content.title} · ${content.plannedDate ?? content.publishedDate ?? "날짜 없음"}`;
}

function findMatchedContent(contents: ContentItem[], accountId: string, mediaId: string) {
  return contents.find(
    (content) => content.accountId === accountId && content.externalMediaId === mediaId,
  );
}

function getContentDate(content: ContentItem) {
  return content.publishedDate ?? content.plannedDate ?? "";
}

function getContentKeywords(content: ContentItem) {
  return getManagedKeywords(content).slice(0, 5);

  if (content.topicKeywords?.length) {
    return content.topicKeywords?.slice(0, 5) ?? [];
  }

  const sourceText = [content.title, content.topic, content.caption, content.text]
    .filter(Boolean)
    .join(" ");
  const matches = sourceText.match(/[가-힣A-Za-z0-9#]{2,}/g) ?? [];
  return Array.from(new Set(matches.map((keyword) => keyword.replace(/^#/, "")).filter(Boolean))).slice(0, 5);
}

function hasInsightRecord(content: ContentItem, insights: InsightRecord[]) {
  return insights.some(
    (insight) => insight.contentId === content.id && insight.accountId === content.accountId,
  );
}

function upsertContentsFromMedia(
  contents: ContentItem[],
  account: Account,
  mediaItems: ExternalMediaItem[],
) {
  const now = new Date().toISOString();
  let createdCount = 0;
  let updatedCount = 0;
  const nextContents = [...contents];

  mediaItems.forEach((media) => {
    const externalMediaId = getExternalMediaId(media);

    if (!externalMediaId) {
      return;
    }

    const publishedDate = getPublishedDate(media);
    const existingIndex = nextContents.findIndex(
      (content) => content.accountId === account.id && content.externalMediaId === externalMediaId,
    );
    const mediaPayload = {
      accountId: account.id,
      platform: account.platform,
      title: getContentTitleFromMedia(media),
      format: inferFormatFromMedia(account, media),
      contentType: inferContentTypeFromMedia(account, media),
      topic: inferTopicFromText(media),
      caption: media.caption,
      text: media.text,
      topicKeywords: extractTopicKeywords(media),
      status: "published" as const,
      plannedDate: publishedDate,
      publishedDate,
      externalMediaId,
      externalPermalink: media.permalink,
      externalThumbnailUrl: media.thumbnailUrl,
      source: "api" as const,
      updatedAt: now,
    };

    if (existingIndex >= 0) {
      nextContents[existingIndex] = {
        ...nextContents[existingIndex],
        ...mediaPayload,
        createdAt: nextContents[existingIndex].createdAt,
      };
      updatedCount += 1;
      return;
    }

    nextContents.push({
      id: createId(),
      ...mediaPayload,
      createdAt: now,
    });
    createdCount += 1;
  });

  return { nextContents, createdCount, updatedCount };
}

function toInsightRecord(
  insight: NormalizedInsight,
  existingInsight: InsightRecord | undefined,
  contentId: string,
  account: Account,
) {
  const now = new Date().toISOString();
  const baseRecord = {
    contentId,
    accountId: account.id,
    platform: account.platform,
    source: "api" as const,
    measuredAt: insight.measuredAt || now,
    reach: insight.reach,
    views: insight.views,
    likes: insight.likes,
    comments: insight.comments,
    saves: insight.saves,
    shares: insight.shares,
    replies: insight.replies,
    reposts: insight.reposts,
    quotes: insight.quotes,
    apiSyncStatus: "success" as const,
    lastSyncedAt: now,
    syncErrorMessage: undefined,
    updatedAt: now,
  };

  if (existingInsight) {
    return {
      ...existingInsight,
      ...baseRecord,
    };
  }

  return {
    id: createId(),
    ...baseRecord,
    createdAt: now,
  };
}

function toFailedInsightRecord(
  content: ContentItem,
  account: Account,
  existingInsight: InsightRecord | undefined,
  message: string,
) {
  const now = new Date().toISOString();
  const baseRecord = {
    contentId: content.id,
    accountId: account.id,
    platform: account.platform,
    source: "api" as const,
    measuredAt: now,
    apiSyncStatus: "failed" as const,
    syncErrorMessage: message,
    updatedAt: now,
  };

  if (existingInsight) {
    return {
      ...existingInsight,
      ...baseRecord,
    };
  }

  return {
    id: createId(),
    ...baseRecord,
    createdAt: now,
  };
}

function getMediaTypeForInsight(content: ContentItem) {
  if (content.format === "carousel") {
    return "CAROUSEL_ALBUM";
  }

  if (content.format === "reel") {
    return "REELS";
  }

  if (content.format === "post") {
    return "IMAGE";
  }

  return undefined;
}

function parseManualMetric(value: string) {
  if (!value.trim()) {
    return undefined;
  }

  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : undefined;
}

function toManualInsightRecord(
  form: ManualMetricForm,
  existingInsight: InsightRecord | undefined,
  contentId: string,
  account: Account,
) {
  const now = new Date().toISOString();
  const baseRecord = {
    contentId,
    accountId: account.id,
    platform: account.platform,
    source: "manual" as const,
    measuredAt: now,
    reach: parseManualMetric(form.reach),
    views: parseManualMetric(form.views),
    likes: parseManualMetric(form.likes),
    comments: parseManualMetric(form.comments),
    saves: parseManualMetric(form.saves),
    shares: parseManualMetric(form.shares),
    replies: parseManualMetric(form.replies),
    reposts: parseManualMetric(form.reposts),
    quotes: parseManualMetric(form.quotes),
    apiSyncStatus: "manual" as const,
    syncErrorMessage: undefined,
    updatedAt: now,
  };

  if (existingInsight) {
    return {
      ...existingInsight,
      ...baseRecord,
      lastSyncedAt: undefined,
    };
  }

  return {
    id: createId(),
    ...baseRecord,
    lastSyncedAt: undefined,
    createdAt: now,
  };
}

export function AccountSettingsTab({
  accounts,
  contents,
  insights,
  onAccountsChange,
  onContentsChange,
  onInsightsChange,
}: AccountSettingsTabProps) {
  const [form, setForm] = useState<AccountFormState>(emptyForm);
  const [editingAccountId, setEditingAccountId] = useState<string | null>(null);
  const [apiCheckMessageByAccountId, setApiCheckMessageByAccountId] = useState<Record<string, string>>({});
  const [recentMediaByAccountId, setRecentMediaByAccountId] = useState<Record<string, ExternalMediaItem[]>>({});
  const [recentMediaMessageByAccountId, setRecentMediaMessageByAccountId] = useState<Record<string, string>>({});
  const [recentMediaFailureByAccountId, setRecentMediaFailureByAccountId] = useState<Record<string, boolean>>({});
  const [insightSyncMessageByAccountId, setInsightSyncMessageByAccountId] = useState<Record<string, string>>({});
  const [insightsByMediaId, setInsightsByMediaId] = useState<Record<string, NormalizedInsight>>({});
  const [insightMessageByMediaId, setInsightMessageByMediaId] = useState<Record<string, string>>({});
  const [selectedContentByMediaId, setSelectedContentByMediaId] = useState<Record<string, string>>({});
  const [saveInsightMessageByMediaId, setSaveInsightMessageByMediaId] = useState<Record<string, string>>({});
  const [insightFailureByMediaId, setInsightFailureByMediaId] = useState<Record<string, boolean>>({});
  const [manualMetricsByTargetId, setManualMetricsByTargetId] = useState<Record<string, ManualMetricForm>>({});
  const [manualContentByTargetId, setManualContentByTargetId] = useState<Record<string, string>>({});
  const [manualMessageByTargetId, setManualMessageByTargetId] = useState<Record<string, string>>({});

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

  function handleDeleteAccount(account: Account) {
    const shouldDelete = window.confirm(
      `${account.displayName} 계정을 삭제할까요? 연결된 콘텐츠/성과 기록은 남을 수 있습니다.`,
    );

    if (!shouldDelete) {
      return;
    }

    onAccountsChange(accounts.filter((currentAccount) => currentAccount.id !== account.id));

    if (editingAccountId === account.id) {
      resetForm();
    }
  }

  async function handleCheckConnection(account: Account) {
    const result = await checkConnection(account);
    const checkedAt = result.checkedAt ?? new Date().toISOString();
    const nextConnectionStatus = result.ok
      ? "connected"
      : result.status === "unsupported_platform"
        ? "unsupported"
        : result.status === "expired_token"
          ? "expired"
          : "failed";

    onAccountsChange(
      accounts.map((currentAccount) =>
        currentAccount.id === account.id
          ? {
              ...currentAccount,
              connectionStatus: nextConnectionStatus,
              lastSyncedAt: checkedAt,
              updatedAt: checkedAt,
            }
          : currentAccount,
      ),
    );
    setApiCheckMessageByAccountId((currentMessages) => ({
      ...currentMessages,
      [account.id]: result.message,
    }));
  }

  async function handleFetchRecentMedia(account: Account) {
    const result = await fetchRecentMedia(account);

    if (Array.isArray(result)) {
      const { nextContents, createdCount, updatedCount } = upsertContentsFromMedia(
        contents,
        account,
        result,
      );
      const nextSelections = result.reduce<Record<string, string>>((selections, media) => {
        const mediaId = getExternalMediaId(media);
        const matchedContent = mediaId
          ? nextContents.find(
              (content) => content.accountId === account.id && content.externalMediaId === mediaId,
            )
          : undefined;

        if (mediaId && matchedContent) {
          selections[mediaId] = matchedContent.id;
        }

        return selections;
      }, {});

      onContentsChange(nextContents);
      setSelectedContentByMediaId((currentSelections) => ({
        ...currentSelections,
        ...nextSelections,
      }));
      setRecentMediaByAccountId((currentMedia) => ({
        ...currentMedia,
        [account.id]: result,
      }));
      setRecentMediaFailureByAccountId((currentFailures) => ({
        ...currentFailures,
        [account.id]: false,
      }));
      setRecentMediaMessageByAccountId((currentMessages) => ({
        ...currentMessages,
        [account.id]:
          result.length > 0
            ? `최근 게시물을 콘텐츠 캘린더에 반영했습니다. 새 콘텐츠 ${createdCount}개, 업데이트 ${updatedCount}개`
            : "최근 게시물이 없습니다.",
      }));
      return;
    }

    setRecentMediaByAccountId((currentMedia) => ({
      ...currentMedia,
      [account.id]: [],
    }));
    setRecentMediaFailureByAccountId((currentFailures) => ({
      ...currentFailures,
      [account.id]: true,
    }));
    setRecentMediaMessageByAccountId((currentMessages) => ({
      ...currentMessages,
      [account.id]: result.message,
    }));
  }

  async function handleFetchMediaInsights(
    account: Account,
    mediaId: string,
    messageKey = mediaId,
    mediaType?: string,
  ) {
    const externalMediaId = mediaId.trim();
    const targetMessageKey = messageKey.trim() || "unknown";

    if (!externalMediaId) {
      setInsightMessageByMediaId((currentMessages) => ({
        ...currentMessages,
        [targetMessageKey]: "게시물 ID를 확인할 수 없습니다. 최근 게시물 목록을 다시 불러오세요.",
      }));
      setInsightFailureByMediaId((currentFailures) => ({
        ...currentFailures,
        [targetMessageKey]: true,
      }));
      return;
    }

    setInsightMessageByMediaId((currentMessages) => ({
      ...currentMessages,
      [targetMessageKey]: `인사이트를 요청했습니다. 사용한 게시물 ID: ${externalMediaId}`,
    }));

    const result = await fetchMediaInsights(account, externalMediaId, mediaType);

    if ("ok" in result) {
      const isInstagramMetricError =
        result.errorType === "IGApiException" && result.errorCode === 100;
      const detailParts = [
        `요청한 mediaId: ${result.requestedMediaId ?? externalMediaId}`,
        result.requestedMetrics?.length ? `요청 metric: ${result.requestedMetrics.join(", ")}` : undefined,
        result.httpStatus ? `httpStatus: ${result.httpStatus}` : undefined,
        result.errorType ? `errorType: ${result.errorType}` : undefined,
        typeof result.errorCode === "number" ? `errorCode: ${result.errorCode}` : undefined,
        typeof result.errorSubcode === "number" ? `errorSubcode: ${result.errorSubcode}` : undefined,
      ].filter(Boolean);

      setInsightMessageByMediaId((currentMessages) => ({
        ...currentMessages,
        [targetMessageKey]: `API 요청 실패: ${
          isInstagramMetricError
            ? "현재 게시물 형식에서 요청 metric이 지원되지 않거나 권한이 부족할 수 있습니다."
            : result.message
        } ${detailParts.join(" · ")}`,
      }));
      setInsightFailureByMediaId((currentFailures) => ({
        ...currentFailures,
        [targetMessageKey]: true,
      }));
      return;
    }

    setInsightsByMediaId((currentInsights) => ({
      ...currentInsights,
      [externalMediaId]: result,
    }));
    setInsightFailureByMediaId((currentFailures) => ({
      ...currentFailures,
      [targetMessageKey]: false,
    }));
    setInsightMessageByMediaId((currentMessages) => ({
      ...currentMessages,
      [targetMessageKey]: hasInsightMetric(result)
        ? `정상 수치 반환: 인사이트를 불러왔습니다. 사용한 게시물 ID: ${externalMediaId}`
        : `metric 없음: API 응답은 성공했지만 지원되는 인사이트 지표를 찾지 못했습니다. metric 이름 또는 권한을 Meta 공식 문서 기준으로 확인해야 합니다. 사용한 게시물 ID: ${externalMediaId}`,
    }));
  }

  async function handleSyncInsights(account: Account) {
    const accountContents = contents.filter(
      (content) =>
        content.accountId === account.id &&
        content.externalMediaId &&
        !insights.some(
          (insight) =>
            insight.contentId === content.id &&
            insight.accountId === account.id &&
            insight.platform === account.platform &&
            insight.source === "api",
        ),
    );
    const targetContents = accountContents.slice(0, 10);

    if (targetContents.length === 0) {
      setInsightSyncMessageByAccountId((currentMessages) => ({
        ...currentMessages,
        [account.id]: "집계할 새 게시물이 없습니다. 이미 API 성과 기록이 있는 게시물은 건너뜁니다.",
      }));
      return;
    }

    let successCount = 0;
    let failedCount = 0;
    let nextInsights = [...insights];

    setInsightSyncMessageByAccountId((currentMessages) => ({
      ...currentMessages,
      [account.id]: `인사이트 순차 집계를 시작합니다. 대상 ${targetContents.length}개`,
    }));

    for (const content of targetContents) {
      const mediaId = content.externalMediaId?.trim();

      if (!mediaId) {
        failedCount += 1;
        continue;
      }

      const existingInsight = nextInsights.find(
        (insight) =>
          insight.contentId === content.id &&
          insight.accountId === account.id &&
          insight.platform === account.platform &&
          insight.source === "api",
      );
      const result = await fetchMediaInsights(account, mediaId, getMediaTypeForInsight(content));

      if ("ok" in result) {
        const failedInsight = toFailedInsightRecord(content, account, existingInsight, result.message);
        nextInsights = existingInsight
          ? nextInsights.map((insight) => (insight.id === existingInsight.id ? failedInsight : insight))
          : [...nextInsights, failedInsight];
        failedCount += 1;
      } else {
        const syncedInsight = toInsightRecord(result, existingInsight, content.id, account);
        nextInsights = existingInsight
          ? nextInsights.map((insight) => (insight.id === existingInsight.id ? syncedInsight : insight))
          : [...nextInsights, syncedInsight];
        successCount += 1;
      }

      setInsightSyncMessageByAccountId((currentMessages) => ({
        ...currentMessages,
        [account.id]: `인사이트 ${successCount + failedCount}/${targetContents.length}개 집계 완료 · 실패 ${failedCount}개`,
      }));
    }

    onInsightsChange(nextInsights);
  }

  function handleSaveInsight(account: Account, media: ExternalMediaItem) {
    const externalMediaId = getExternalMediaId(media);

    if (!externalMediaId) {
      setSaveInsightMessageByMediaId((currentMessages) => ({
        ...currentMessages,
        [media.id]: "게시물 ID를 확인할 수 없어 저장할 수 없습니다. 최근 게시물 목록을 다시 불러오세요.",
      }));
      return;
    }

    const insight = insightsByMediaId[externalMediaId];
    const matchedContent = findMatchedContent(contents, account.id, externalMediaId);
    const selectedContentId =
      selectedContentByMediaId[externalMediaId] ?? matchedContent?.id ?? "";

    if (!insight || !selectedContentId) {
      setSaveInsightMessageByMediaId((currentMessages) => ({
        ...currentMessages,
        [externalMediaId]: "연결할 콘텐츠를 선택해야 저장할 수 있습니다.",
      }));
      return;
    }

    const existingInsight = insights.find(
      (currentInsight) =>
        currentInsight.contentId === selectedContentId &&
        currentInsight.accountId === account.id &&
        currentInsight.platform === account.platform &&
        currentInsight.source === "api",
    );
    const nextInsight = toInsightRecord(insight, existingInsight, selectedContentId, account);
    const nextInsights = existingInsight
      ? insights.map((currentInsight) =>
          currentInsight.id === existingInsight.id ? nextInsight : currentInsight,
        )
      : [...insights, nextInsight];

    onInsightsChange(nextInsights);
    setSaveInsightMessageByMediaId((currentMessages) => ({
      ...currentMessages,
      [externalMediaId]: "성과 탭에 저장했습니다.",
    }));
  }

  function updateManualMetric(targetId: string, key: keyof ManualMetricForm, value: string) {
    setManualMetricsByTargetId((currentForms) => ({
      ...currentForms,
      [targetId]: {
        ...(currentForms[targetId] ?? emptyManualMetricForm),
        [key]: value,
      },
    }));
  }

  function handleSaveManualInsight(account: Account, targetId: string, defaultContentId = "") {
    const selectedContentId = manualContentByTargetId[targetId] ?? defaultContentId;
    const form = manualMetricsByTargetId[targetId] ?? emptyManualMetricForm;

    if (!selectedContentId) {
      setManualMessageByTargetId((currentMessages) => ({
        ...currentMessages,
        [targetId]: "연결할 콘텐츠를 선택해야 수기 성과를 저장할 수 있습니다.",
      }));
      return;
    }

    const existingInsight = insights.find(
      (currentInsight) =>
        currentInsight.contentId === selectedContentId &&
        currentInsight.accountId === account.id &&
        currentInsight.platform === account.platform &&
        currentInsight.source === "manual",
    );
    const nextInsight = toManualInsightRecord(form, existingInsight, selectedContentId, account);
    const nextInsights = existingInsight
      ? insights.map((currentInsight) =>
          currentInsight.id === existingInsight.id ? nextInsight : currentInsight,
        )
      : [...insights, nextInsight];

    onInsightsChange(nextInsights);
    setManualMessageByTargetId((currentMessages) => ({
      ...currentMessages,
      [targetId]: "수기 성과를 저장했습니다.",
    }));
  }

  function renderManualInsightForm(account: Account, targetId: string, defaultContentId = "") {
    const accountContents = contents.filter((content) => content.accountId === account.id);
    const form = manualMetricsByTargetId[targetId] ?? emptyManualMetricForm;
    const selectedContentId = manualContentByTargetId[targetId] ?? defaultContentId;
    const metricFields: Array<{ key: keyof ManualMetricForm; label: string }> = [
      { key: "reach", label: "도달" },
      { key: "views", label: "조회수" },
      { key: "likes", label: "좋아요" },
      { key: "comments", label: "댓글" },
      { key: "saves", label: "저장" },
      { key: "shares", label: "공유" },
      { key: "replies", label: "답글" },
      { key: "reposts", label: "리포스트" },
      { key: "quotes", label: "인용" },
    ];

    return (
      <div className="placeholder-form">
        <p>API 실패 또는 미지원 플랫폼일 때만 사용하는 보조 입력입니다.</p>
        <label className="form-field">
          <span>수기 성과를 연결할 콘텐츠</span>
          <select
            value={selectedContentId}
            onChange={(event) =>
              setManualContentByTargetId((currentSelections) => ({
                ...currentSelections,
                [targetId]: event.target.value,
              }))
            }
          >
            <option value="">콘텐츠 선택</option>
            {accountContents.map((content) => (
              <option key={content.id} value={content.id}>
                {getContentOptionLabel(content)}
              </option>
            ))}
          </select>
        </label>
        <div className="form-grid">
          {metricFields.map((field) => (
            <label className="form-field" key={field.key}>
              <span>{field.label}</span>
              <input
                min="0"
                type="number"
                value={form[field.key]}
                onChange={(event) => updateManualMetric(targetId, field.key, event.target.value)}
              />
            </label>
          ))}
        </div>
        {manualMessageByTargetId[targetId] && <p>{manualMessageByTargetId[targetId]}</p>}
        <button
          className="secondary-button"
          type="button"
          onClick={() => handleSaveManualInsight(account, targetId, defaultContentId)}
        >
          수기 성과 저장
        </button>
      </div>
    );
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
                  <details className="api-detail-panel">
                    <summary>게시물 동기화와 보조 성과 관리</summary>
                    <div className="account-card__actions">
                      <button
                        className="primary-button"
                        type="button"
                        onClick={() => void handleCheckConnection(account)}
                      >
                        API 연결 확인
                      </button>
                      <button
                        className="secondary-button"
                        type="button"
                        onClick={() => void handleFetchRecentMedia(account)}
                      >
                        게시물 가져오기
                      </button>
                      <button
                        className="secondary-button"
                        type="button"
                        onClick={() => void handleSyncInsights(account)}
                      >
                        인사이트 순차 집계
                      </button>
                    </div>
                    {apiCheckMessageByAccountId[account.id] && (
                      <p className="api-result-message">{apiCheckMessageByAccountId[account.id]}</p>
                    )}
                    {recentMediaMessageByAccountId[account.id] && (
                      <p className="api-result-message">{recentMediaMessageByAccountId[account.id]}</p>
                    )}
                    {insightSyncMessageByAccountId[account.id] && (
                      <p className="api-result-message">{insightSyncMessageByAccountId[account.id]}</p>
                    )}
                    {((account.platform !== "instagram" && account.platform !== "threads") ||
                      recentMediaFailureByAccountId[account.id]) &&
                      renderManualInsightForm(account, `account:${account.id}`)}
                    {recentMediaByAccountId[account.id]?.length > 0 && (
                      <div className="compact-list">
                        {recentMediaByAccountId[account.id].map((media) => {
                          const mediaId = getExternalMediaId(media);
                          const mediaKey = mediaId ?? media.id;
                          const permalink = media.permalink?.trim();
                          const accountContents = contents.filter((content) => content.accountId === account.id);
                          const matchedContent = mediaId ? findMatchedContent(contents, account.id, mediaId) : undefined;
                          const selectedContentId =
                            (mediaId ? selectedContentByMediaId[mediaId] : undefined) ?? matchedContent?.id ?? "";

                          return (
                          <div className="content-row" key={mediaKey}>
                            <div className="content-summary">
                              <div>
                                <strong>{mediaId ?? "게시물 ID 없음"}</strong>
                                <p>
                                  {media.publishedAt ?? "게시일 없음"} · {media.mediaType ?? "유형 없음"}
                                </p>
                                <small>
                                  externalMediaId: {media.externalMediaId || "없음"} · id: {media.id || "없음"}
                                </small>
                                <small>permalink: {permalink ? "있음" : "없음"}</small>
                                <p>{getMediaPreview(media)}</p>
                                {insightMessageByMediaId[mediaKey] && (
                                  <p>{insightMessageByMediaId[mediaKey]}</p>
                                )}
                                {mediaId && insightsByMediaId[mediaId] && (
                                  <small>
                                    요청 mediaId: {insightsByMediaId[mediaId].debug.requestedMediaId} · 응답 성공: 예 ·
                                    httpStatus: {insightsByMediaId[mediaId].debug.httpStatus} · 요청 metric:{" "}
                                    {getMetricNamesLabel(insightsByMediaId[mediaId].debug.requestedMetrics)} · 반환 metric:{" "}
                                    {getMetricNamesLabel(insightsByMediaId[mediaId].debug.metricNames)}
                                  </small>
                                )}
                                {insightFailureByMediaId[mediaKey] &&
                                  renderManualInsightForm(
                                    account,
                                    `media:${mediaKey}`,
                                    selectedContentId,
                                  )}
                                {mediaId && insightsByMediaId[mediaId] && (
                                  <div className="performance-metrics">
                                    <span>도달 {formatInsightValue(insightsByMediaId[mediaId].reach)}</span>
                                    <span>조회수 {formatInsightValue(insightsByMediaId[mediaId].views)}</span>
                                    <span>좋아요 {formatInsightValue(insightsByMediaId[mediaId].likes)}</span>
                                    <span>
                                      댓글/답글{" "}
                                      {formatInsightValue(
                                        insightsByMediaId[mediaId].comments ??
                                          insightsByMediaId[mediaId].replies,
                                      )}
                                    </span>
                                    <span>저장 {formatInsightValue(insightsByMediaId[mediaId].saves)}</span>
                                    <span>공유 {formatInsightValue(insightsByMediaId[mediaId].shares)}</span>
                                    <span>리포스트 {formatInsightValue(insightsByMediaId[mediaId].reposts)}</span>
                                    <span>인용 {formatInsightValue(insightsByMediaId[mediaId].quotes)}</span>
                                  </div>
                                )}
                                {mediaId && insightsByMediaId[mediaId] && (
                                  <div className="placeholder-form">
                                    <label className="form-field">
                                      <span>성과를 연결할 콘텐츠</span>
                                      <select
                                        value={selectedContentId}
                                        onChange={(event) =>
                                          setSelectedContentByMediaId((currentSelections) => ({
                                            ...currentSelections,
                                            [mediaId]: event.target.value,
                                          }))
                                        }
                                      >
                                        <option value="">콘텐츠 선택</option>
                                        {accountContents.map((content) => (
                                          <option key={content.id} value={content.id}>
                                            {matchedContent?.id === content.id ? "매칭됨 · " : ""}
                                            {getContentOptionLabel(content)}
                                          </option>
                                        ))}
                                      </select>
                                    </label>
                                    {saveInsightMessageByMediaId[mediaId] && (
                                      <p>{saveInsightMessageByMediaId[mediaId]}</p>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                            <button
                              className="secondary-button"
                              type="button"
                              onClick={() =>
                                void handleFetchMediaInsights(account, mediaId ?? "", mediaKey, media.mediaType)
                              }
                            >
                              인사이트 확인
                            </button>
                            {permalink ? (
                              <button
                                className="secondary-button"
                                type="button"
                                onClick={() => openPermalink(permalink)}
                              >
                                링크 열기
                              </button>
                            ) : (
                              <button className="secondary-button" type="button" disabled>
                                링크 없음
                              </button>
                            )}
                            {mediaId && insightsByMediaId[mediaId] && (
                              <button
                                className="secondary-button"
                                type="button"
                                onClick={() => handleSaveInsight(account, media)}
                              >
                                성과로 저장
                              </button>
                            )}
                          </div>
                          );
                        })}
                      </div>
                    )}
                  </details>
                  <div className="account-card__actions">
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
                    <button
                      className="danger-button"
                      type="button"
                      onClick={() => handleDeleteAccount(account)}
                    >
                      삭제
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </article>

        <article className="panel-card panel-card--wide">
          <details className="api-detail-panel">
            <summary>콘텐츠 DB 관리</summary>
            <p>동기화된 게시물을 관리자용 표로 확인합니다. 홈 화면에는 요약과 달력만 보여줍니다.</p>
            {contents.length === 0 ? (
              <p>아직 동기화된 게시물 기록이 없습니다.</p>
            ) : (
              <div className="content-db-table">
                <div className="content-db-row content-db-row--head">
                  <span>게시일</span>
                  <span>플랫폼</span>
                  <span>계정</span>
                  <span>제목</span>
                  <span>형식</span>
                  <span>주제</span>
                  <span>키워드</span>
                  <span>상태</span>
                  <span>성과</span>
                  <span>링크</span>
                  <span>관리</span>
                </div>
                {contents.map((content) => {
                  const account = accounts.find((currentAccount) => currentAccount.id === content.accountId);

                  return (
                    <div className="content-db-row" key={content.id}>
                      <span>{getContentDate(content) || "-"}</span>
                      <span>{platformLabels[content.platform]}</span>
                      <span>{account?.displayName ?? "-"}</span>
                      <strong>{content.title}</strong>
                      <span>{contentFormatLabels[content.format ?? "other"]}</span>
                      <span>{content.topic ?? "기타"}</span>
                      <span>{getContentKeywords(content).join(", ") || "키워드 없음"}</span>
                      <span>{contentStatusLabels[content.status]}</span>
                      <span>{hasInsightRecord(content, insights) ? "있음" : "없음"}</span>
                      {content.externalPermalink ? (
                        <a href={content.externalPermalink} target="_blank" rel="noreferrer">
                          열기
                        </a>
                      ) : (
                        <span>-</span>
                      )}
                      <button
                        className="secondary-button"
                        type="button"
                        onClick={() => window.alert("메인 달력에서 날짜를 선택해 콘텐츠를 수정하세요.")}
                      >
                        수정
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </details>
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
