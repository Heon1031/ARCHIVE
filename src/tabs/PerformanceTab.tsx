import { useMemo } from "react";
import { getManagedKeywords, normalizeContentType } from "../lib/taxonomy";
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

function getReactionScore(insight: InsightRecord) {
  return (
    (insight.likes ?? 0) +
    (insight.comments ?? 0) * 2 +
    (insight.saves ?? 0) * 3 +
    (insight.shares ?? 0) * 3 +
    (insight.replies ?? 0) * 2 +
    (insight.reposts ?? 0) * 3 +
    (insight.quotes ?? 0) * 3
  );
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

function getAverage(values: number[]) {
  if (values.length === 0) {
    return undefined;
  }

  return values.reduce((total, value) => total + value, 0) / values.length;
}

function formatAverage(value?: number) {
  return typeof value === "number" && Number.isFinite(value) ? value.toFixed(1) : "-";
}

function getGroupedPerformance(
  contents: ContentItem[],
  insights: InsightRecord[],
  groupBy: (content: ContentItem) => string[],
) {
  const contentMap = new Map(contents.map((content) => [content.id, content]));
  const groups = new Map<string, number[]>();

  insights.forEach((insight) => {
    const content = contentMap.get(insight.contentId);

    if (!content) {
      return;
    }

    const score = getReactionScore(insight);
    groupBy(content).forEach((groupName) => {
      const currentScores = groups.get(groupName) ?? [];
      groups.set(groupName, [...currentScores, score]);
    });
  });

  return Array.from(groups.entries())
    .map(([name, scores]) => ({
      name,
      count: scores.length,
      averageScore: getAverage(scores),
    }))
    .sort((first, second) => (second.averageScore ?? 0) - (first.averageScore ?? 0))
    .slice(0, 8);
}

function getContentDate(content: ContentItem) {
  return content.publishedDate ?? content.plannedDate ?? "";
}

function getMonthlyTrend(contents: ContentItem[]) {
  const counts = contents.reduce<Record<string, number>>((accumulator, content) => {
    const contentDate = getContentDate(content);
    const monthKey = contentDate ? contentDate.slice(0, 7) : "";

    if (monthKey) {
      accumulator[monthKey] = (accumulator[monthKey] ?? 0) + 1;
    }

    return accumulator;
  }, {});

  return Object.entries(counts)
    .sort(([firstMonth], [secondMonth]) => firstMonth.localeCompare(secondMonth))
    .slice(-6)
    .map(([monthKey, count]) => ({ monthKey, count }));
}

function getTopContentRows(contents: ContentItem[], insights: InsightRecord[], accounts: Account[]) {
  const accountMap = new Map(accounts.map((account) => [account.id, account]));

  return contents
    .map((content) => {
      const score = insights
        .filter((insight) => insight.contentId === content.id && insight.accountId === content.accountId)
        .reduce((highestScore, insight) => Math.max(highestScore, getReactionScore(insight)), 0);

      return { content, account: accountMap.get(content.accountId), score };
    })
    .filter((row) => row.score > 0)
    .sort((first, second) => second.score - first.score)
    .slice(0, 5);
}

function getRateValue(numerator: number | undefined, denominator: number | undefined) {
  if (!denominator || denominator <= 0 || numerator === undefined) {
    return undefined;
  }

  const rate = numerator / denominator;
  return Number.isFinite(rate) ? rate : undefined;
}

function formatPercent(value?: number) {
  return typeof value === "number" && Number.isFinite(value) ? `${(value * 100).toFixed(1)}%` : "-";
}

function getInsightRows(contents: ContentItem[], insights: InsightRecord[], accounts: Account[]) {
  const accountMap = new Map(accounts.map((account) => [account.id, account]));

  return contents
    .map((content) => {
      const latestInsight = getLatestInsight(
        insights.filter((insight) => insight.contentId === content.id && insight.accountId === content.accountId),
      );
      const denominator = latestInsight?.reach ?? latestInsight?.views;
      const score = latestInsight ? getReactionScore(latestInsight) : 0;
      const engagementRate = getRateValue(score, denominator);
      const saveRate = getRateValue(latestInsight?.saves, denominator);
      const contentDate = getContentDate(content);
      const daysAgo = contentDate
        ? (Date.now() - new Date(contentDate).getTime()) / (1000 * 60 * 60 * 24)
        : 0;

      return {
        content,
        account: accountMap.get(content.accountId),
        latestInsight,
        score,
        engagementRate,
        saveRate,
        daysAgo,
      };
    })
    .filter((row) => row.latestInsight);
}

function getBestGroupName(rows: Array<{ name: string; averageScore?: number }>) {
  return rows[0]?.name ?? "-";
}

function getManagementSuggestions(
  bestTopic: string,
  bestFormat: string,
  bestKeyword: string,
  reviveTitle?: string,
) {
  return [
    bestTopic !== "-" && bestFormat !== "-"
      ? `${bestTopic} 주제를 ${bestFormat} 형식으로 다시 풀어보세요.`
      : "성과가 쌓이면 반응 좋은 주제와 형식을 조합해 제안합니다.",
    bestKeyword !== "-"
      ? `${bestKeyword} 키워드를 중심으로 짧고 선명한 후속 콘텐츠를 만들어보세요.`
      : "키워드가 쌓이면 반복해서 다룰 소재를 더 잘 고를 수 있습니다.",
    reviveTitle
      ? `"${reviveTitle}"를 현재 상황에 맞게 다시 다듬어보세요.`
      : "오래된 반응 좋은 콘텐츠가 생기면 리마인드 후보로 보여드립니다.",
  ];
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
  const syncedInsights = scopedInsights.filter((insight) => insight.apiSyncStatus === "success");
  const averageReach = getAverage(syncedInsights.flatMap((insight) => (typeof insight.reach === "number" ? [insight.reach] : [])));
  const averageLikes = getAverage(syncedInsights.flatMap((insight) => (typeof insight.likes === "number" ? [insight.likes] : [])));
  const averageComments = getAverage(syncedInsights.flatMap((insight) => (typeof insight.comments === "number" ? [insight.comments] : [])));
  const averageSaves = getAverage(syncedInsights.flatMap((insight) => (typeof insight.saves === "number" ? [insight.saves] : [])));
  const formatPerformance = getGroupedPerformance(scopedContents, syncedInsights, (content) => [
    normalizeContentType(content),
  ]);
  const topicPerformance = getGroupedPerformance(scopedContents, syncedInsights, (content) => [
    content.topic ?? "기타",
  ]);
  const keywordPerformance = getGroupedPerformance(scopedContents, syncedInsights, getContentKeywords);
  const monthlyTrend = getMonthlyTrend(scopedContents);
  const topContentRows = getTopContentRows(scopedContents, syncedInsights, accounts);
  const insightRows = getInsightRows(scopedContents, syncedInsights, accounts);
  const averageEngagementRate = getAverage(
    insightRows.flatMap((row) => (typeof row.engagementRate === "number" ? [row.engagementRate] : [])),
  );
  const averageSaveRate = getAverage(
    insightRows.flatMap((row) => (typeof row.saveRate === "number" ? [row.saveRate] : [])),
  );
  const reviveCandidates = insightRows
    .filter((row) => row.daysAgo >= 30 && row.score > 0)
    .sort((first, second) => second.score - first.score)
    .slice(0, 3);
  const improveCandidates = insightRows
    .filter((row) => row.latestInsight && (row.engagementRate ?? 0) < 0.03)
    .sort((first, second) => (first.engagementRate ?? 0) - (second.engagementRate ?? 0))
    .slice(0, 3);
  const bestTopic = getBestGroupName(topicPerformance);
  const bestFormat = getBestGroupName(formatPerformance);
  const bestKeyword = getBestGroupName(keywordPerformance);
  const managementSuggestions = getManagementSuggestions(
    bestTopic,
    bestFormat,
    bestKeyword,
    reviveCandidates[0]?.content.title,
  );

  return (
    <section className="tab-panel performance-panel" aria-label="성과 탭">
      <div className="settings-header">
        <div>
          <h2>성과</h2>
          <p>계정 필터 기준으로 콘텐츠와 성과 기록의 현재 상태를 확인합니다.</p>
          <p className="api-result-message">
            API 성과는 계정 등록/설정 탭에서 게시물 인사이트를 조회한 뒤 저장하면 이곳에 반영됩니다.
          </p>
        </div>
        <div className="header-actions">
          <span className="badge">{scopedInsights.length}개 성과 기록</span>
        </div>
      </div>

      <div className="section-grid">
        <article className="panel-card panel-card--wide performance-detail-card">
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

        <article className="panel-card panel-card--wide performance-visual-card">
          <h3>성과 집계 요약</h3>
          <div className="metric-grid">
            <MetricTextCard label="총 게시물" value={scopedContents.length} />
            <MetricTextCard label="집계 완료" value={syncedInsights.length} />
            <MetricTextCard label="평균 도달" value={formatAverage(averageReach)} />
            <MetricTextCard label="평균 좋아요" value={formatAverage(averageLikes)} />
            <MetricTextCard label="평균 댓글" value={formatAverage(averageComments)} />
            <MetricTextCard label="평균 저장" value={formatAverage(averageSaves)} />
          </div>
          <div className="visual-insight-grid">
            <div className="visual-chart-card">
              <h4>월별 업로드 추세</h4>
              {monthlyTrend.length === 0 ? (
                <p>표시할 게시 흐름이 없습니다.</p>
              ) : (
                <div className="mini-bar-chart">
                  {monthlyTrend.map((row) => {
                    const maxCount = Math.max(...monthlyTrend.map((trendRow) => trendRow.count), 1);
                    const barHeight = `${Math.max(12, (row.count / maxCount) * 100)}%`;

                    return (
                      <div className="mini-bar" key={row.monthKey}>
                        <span style={{ height: barHeight }} />
                        <small>{row.monthKey.slice(5)}</small>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
            <div className="visual-chart-card">
              <h4>반응 좋은 콘텐츠 Top 5</h4>
              {topContentRows.length === 0 ? (
                <p>아직 반응 점수가 있는 콘텐츠가 없습니다.</p>
              ) : (
                topContentRows.map((row) => (
                  <div className="top-content-row" key={row.content.id}>
                    <strong>{row.content.title}</strong>
                    <span>{row.account?.displayName ?? "계정 없음"} · {row.score}</span>
                  </div>
                ))
              )}
            </div>
          </div>
          <div className="performance-group-grid">
            <PerformanceGroup title="형식별 평균 반응" rows={formatPerformance} />
            <PerformanceGroup title="주제별 평균 반응" rows={topicPerformance} />
            <PerformanceGroup title="키워드별 평균 반응" rows={keywordPerformance} />
          </div>
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

        <article className="panel-card panel-card--wide performance-raw-record-card">
          <details className="api-detail-panel">
            <summary>상세 성과 기록</summary>
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
          </details>
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

function MetricTextCard({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="metric-card">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function PerformanceGroup({
  title,
  rows,
}: {
  title: string;
  rows: Array<{ name: string; count: number; averageScore?: number }>;
}) {
  return (
    <div className="performance-group">
      <h4>{title}</h4>
      {rows.length === 0 ? (
        <p>집계된 성과가 없습니다.</p>
      ) : (
        rows.map((row) => (
          <div className="performance-group-row" key={row.name}>
            <span>{row.name}</span>
            <strong>{formatAverage(row.averageScore)}</strong>
            <small>{row.count}개</small>
          </div>
        ))
      )}
    </div>
  );
}

function ManagementPanel({
  title,
  emptyText,
  rows,
}: {
  title: string;
  emptyText: string;
  rows: Array<{ title: string; description: string; meta: string }>;
}) {
  return (
    <div className="management-panel">
      <h4>{title}</h4>
      {rows.length === 0 ? (
        <p>{emptyText}</p>
      ) : (
        rows.map((row) => (
          <div className="management-row" key={`${title}-${row.title}`}>
            <strong>{row.title}</strong>
            <span>{row.description}</span>
            <small>{row.meta}</small>
          </div>
        ))
      )}
    </div>
  );
}
