export type Platform = "instagram" | "threads" | "brunch" | "blog" | "other";

export type AppTab = "main" | "performance" | "accountSettings";

export type DataSource = "api" | "manual";

export type AccountConnectionStatus =
  | "connected"
  | "needs_check"
  | "failed"
  | "expired"
  | "unsupported";

export type ContentStatus =
  | "idea"
  | "planned"
  | "in_progress"
  | "review"
  | "scheduled"
  | "published"
  | "archived";

export type ApiSyncStatus = "idle" | "syncing" | "success" | "failed" | "expired" | "manual";

export type Account = {
  id: string;
  platform: Platform;
  displayName: string;
  username?: string;
  externalAccountId?: string;
  profileUrl?: string;
  accessToken?: string;
  tokenExpiresAt?: string;
  connectionStatus: AccountConnectionStatus;
  lastSyncedAt?: string;
  isApiSupported: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type ContentItem = {
  id: string;
  accountId: string;
  platform: Platform;
  title: string;
  format?: "post" | "reel" | "thread" | "carousel" | "story" | "article" | "other";
  topic?: string;
  status: ContentStatus;
  scheduledAt?: string;
  publishedAt?: string;
  externalPostId?: string;
  postUrl?: string;
  planningMemo?: string;
  visualMemo?: string;
  reminderMemo?: string;
  retrospectiveMemo?: string;
  source: DataSource;
  createdAt: string;
  updatedAt: string;
};

export type InsightRecord = {
  id: string;
  contentId: string;
  accountId: string;
  platform: Platform;
  source: DataSource;
  measuredAt: string;
  reach?: number;
  views?: number;
  likes?: number;
  comments?: number;
  saves?: number;
  shares?: number;
  replies?: number;
  reposts?: number;
  quotes?: number;
  apiSyncStatus: ApiSyncStatus;
  lastSyncedAt?: string;
  syncErrorMessage?: string;
  createdAt: string;
  updatedAt: string;
};

export type AccountFilterValue =
  | { type: "all" }
  | { type: "platform"; platform: Extract<Platform, "instagram" | "threads"> }
  | { type: "account"; accountId: string };

export type UiState = {
  selectedTab: AppTab;
  accountFilter: AccountFilterValue;
  selectedDate?: string;
};
