import { useMemo } from "react";
import type { Account, AccountFilterValue, ContentItem, InsightRecord, Platform } from "../types/models";

type PerformanceTabProps = {
  accounts: Account[];
  contents: ContentItem[];
  insights: InsightRecord[];
  accountFilter: AccountFilterValue;
};

const platforms: Platform[] = ["instagram", "threads", "brunch", "blog", "other"];

const platformLabels: Record<Platform, string> = {
  instagram: "Instagram",
  threads: "Threads",
  brunch: "Brunch",
  blog: "Blog",
  other: "Other",
};

const statusLabels: Record<ContentItem["status"], string> = {
  idea: "기획",
  planned: "계획됨",
  in_progress: "제작 중",
  review: "검토",
  scheduled: "예약 예정",
  published: "게시 완료",
  on_hold: "보류",
  archived: "보관",
};

function applyAccountFilter<T extends { accountId: string }>(
  items: T[],
  accounts: Account[],
  accountFilter: AccountFilterValue,
) {
  const accountMap = new Map(accounts.map((account) => [account.id, account]));

  return items.filter((item) => {
    const account = accountMap.get(item.accountId);

    if (!account) {
      return false;
    }

    if (accountFilter.type === "all") {
      return true;
    }

    if (accountFilter.type === "platform") {
      return account.platform === accountFilter.platform;
    }

    return item.accountId === accountFilter.accountId;
  });
}

function filterAccounts(accounts: Account[], accountFilter: AccountFilterValue) {
  if (accountFilter.type === "all") {
    return accounts;
  }

  if (accountFilter.type === "platform") {
    return accounts.filter((account) => account.platform === accountFilter.platform);
  }

  return accounts.filter((account) => account.id === accountFilter.accountId);
}

function sumMetric(insights: InsightRecord[], key: keyof InsightRecord) {
  return insights.reduce((total, insight) => {
    const value = insight[key];
    return typeof value === "number" ? total + value : total;
  }, 0);
}

function formatRate(numerator: number | undefined, denominator: number | undefined) {
  if (!denominator || denominator <= 0 || numerator === undefined) {
    return "-";
  }

  const rate = numerator / denominator;

  if (!Number.isFinite(rate)) {
    return "-";
  }

  return `${(rate * 100).toFixed(1)}%`;
}

function getEngagementRate(insight?: InsightRecord) {
  if (!insight) {
    return "-";
  }

  const engagementValues = [
    insight.likes,
    insight.comments,
    insight.saves,
    insight.shares,
    insight.replies,
    insight.reposts,
    insight.quotes,
  ];

  if (!engagementValues.some((value) => typeof value === "number")) {
    return "-";
  }

  const numerator =
    (insight.likes ?? 0) +
    (insight.comments ?? 0) +
    (insight.saves ?? 0) +
    (insight.shares ?? 0) +
    (insight.replies ?? 0) +
    (insight.reposts ?? 0) +
    (insight.quotes ?? 0);
  const denominator = insight.reach ?? insight.views;

  return formatRate(numerator, denominator);
}

function getLatestInsight(insights: InsightRecord[]) {
  return [...insights].sort((first, second) => {
    return new Date(second.measuredAt).getTime() - new Date(first.measuredAt).getTime();
  })[0];
}

export function PerformanceTab({ accounts, contents, insights, accountFilter }: PerformanceTabProps) {
  const scopedAccounts = useMemo(() => filterAccounts(accounts, accountFilter), [accountFilter, accounts]);
  const scopedContents = useMemo(
    () => applyAccountFilter(contents, accounts, accountFilter),
    [accountFilter, accounts, contents],
  );
  const scopedInsights = useMemo(
    () => applyAccountFilter(insights, accounts, accountFilter),
    [accountFilter, accounts, insights],
  );
  const scopedAccountIds = new Set(scopedAccounts.map((account) => account.id));
  const contentMap = new Map(scopedContents.map((content) => [content.id, content]));
  const accountMap = new Map(accounts.map((account) => [account.id, account]));
  const publishedContents = scopedContents.filter((content) => content.status === "published");
  const apiInsightCount = scopedInsights.filter((insight) => insight.source === "api").length;
  const manualInsightCount = scopedInsights.filter((insight) => insight.source === "manual").length;

  return (
    <section className="tab-panel" aria-label="성과 탭">
      <div className="settings-header">
        <div>
          <h2>성과</h2>
          <p>계정 필터 기준으로 콘텐츠와 성과 기록의 현재 상태를 확인합니다.</p>
        </div>
        <span className="badge">{scopedInsights.length}개 성과 기록</span>
      </div>

      <div className="section-grid">
        <article className="panel-card panel-card--wide">
          <h3>전체 요약</h3>
          <div className="metric-grid">
            <MetricCard label="등록 계정" value={scopedAccounts.length} />
            <MetricCard label="활성 계정" value={scopedAccounts.filter((account) => account.isActive).length} />
            <MetricCard label="등록 콘텐츠" value={scopedContents.length} />
            <MetricCard label="업로드 완료" value={publishedContents.length} />
            <MetricCard label="성과 기록" value={scopedInsights.length} />
            <MetricCard label="API 성과" value={apiInsightCount} />
            <MetricCard label="수기 성과" value={manualInsightCount} />
          </div>
          {scopedInsights.length === 0 && (
            <p className="empty-copy">아직 연결된 성과 기록이 없습니다. API 연결 단계 이후 이 영역에 성과가 표시됩니다.</p>
          )}
        </article>

        <article className="panel-card panel-card--wide">
          <h3>플랫폼별 요약</h3>
          <div className="summary-table">
            <div className="summary-row summary-row--head">
              <span>플랫폼</span>
              <span>계정</span>
              <span>콘텐츠</span>
              <span>업로드 완료</span>
              <span>성과 기록</span>
            </div>
            {platforms.map((platform) => {
              const platformAccounts = scopedAccounts.filter((account) => account.platform === platform);
              const platformContents = scopedContents.filter((content) => content.platform === platform);
              const platformInsights = scopedInsights.filter((insight) => insight.platform === platform);

              return (
                <div className="summary-row" key={platform}>
                  <span>{platformLabels[platform]}</span>
                  <span>{platformAccounts.length}</span>
                  <span>{platformContents.length}</span>
                  <span>{platformContents.filter((content) => content.status === "published").length}</span>
                  <span>{platformInsights.length}</span>
                </div>
              );
            })}
          </div>
        </article>

        <article className="panel-card panel-card--wide">
          <h3>계정별 요약</h3>
          {scopedAccounts.length === 0 ? (
            <p>선택된 필터에 해당하는 계정이 없습니다.</p>
          ) : (
            <div className="summary-table">
              <div className="summary-row summary-row--head">
                <span>계정</span>
                <span>플랫폼</span>
                <span>상태</span>
                <span>콘텐츠</span>
                <span>업로드 완료</span>
                <span>성과 기록</span>
                <span>마지막 동기화</span>
              </div>
              {scopedAccounts.map((account) => {
                const accountContents = scopedContents.filter((content) => content.accountId === account.id);
                const accountInsights = scopedInsights.filter((insight) => insight.accountId === account.id);

                return (
                  <div className="summary-row" key={account.id}>
                    <span>{account.displayName}</span>
                    <span>{platformLabels[account.platform]}</span>
                    <span>{account.isActive ? "활성" : "비활성"}</span>
                    <span>{accountContents.length}</span>
                    <span>{accountContents.filter((content) => content.status === "published").length}</span>
                    <span>{accountInsights.length}</span>
                    <span>{account.lastSyncedAt ?? "없음"}</span>
                  </div>
                );
              })}
            </div>
          )}
        </article>

        <article className="panel-card panel-card--wide">
          <h3>콘텐츠별 성과</h3>
          {scopedContents.length === 0 ? (
            <p>선택된 필터에 해당하는 콘텐츠가 없습니다.</p>
          ) : (
            <div className="content-performance-list">
              {scopedContents.map((content) => {
                const contentInsights = scopedInsights.filter(
                  (insight) => insight.contentId === content.id && insight.accountId === content.accountId,
                );
                const latestInsight = getLatestInsight(contentInsights);
                const account = accountMap.get(content.accountId);

                return (
                  <div className="performance-row" key={content.id}>
                    <div>
                      <strong>{content.title}</strong>
                      <p>
                        {account?.displayName ?? "계정 없음"} · {platformLabels[content.platform]} ·{" "}
                        {statusLabels[content.status]}
                      </p>
                    </div>
                    <div className="performance-metrics">
                      <span>예정일 {content.plannedDate ?? "-"}</span>
                      <span>업로드일 {content.publishedDate ?? "-"}</span>
                      <span>{contentInsights.length > 0 ? "성과 기록 있음" : "성과 기록 없음"}</span>
                      <span>출처 {latestInsight?.source ?? "없음"}</span>
                      <span>저장률 {formatRate(latestInsight?.saves, latestInsight?.reach)}</span>
                      <span>공유율 {formatRate(latestInsight?.shares, latestInsight?.reach)}</span>
                      <span>반응률 {getEngagementRate(latestInsight)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          {scopedInsights.some((insight) => !contentMap.has(insight.contentId) && scopedAccountIds.has(insight.accountId)) && (
            <p className="empty-copy">일부 성과 기록은 연결된 콘텐츠가 없어 콘텐츠별 목록에서 제외되었습니다.</p>
          )}
        </article>
      </div>
    </section>
  );
}

function MetricCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="metric-card">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}
