import { useMemo, useState, type FormEvent } from "react";
import type { Account, AccountFilterValue, ContentItem, ContentStatus, InsightRecord, Platform } from "../types/models";

type MainTabProps = {
  accounts: Account[];
  contents: ContentItem[];
  insights: InsightRecord[];
  accountFilter: AccountFilterValue;
  onContentsChange: (contents: ContentItem[]) => void;
  onOpenAccountSettings: () => void;
};

type ContentFormState = {
  accountId: string;
  title: string;
  format: NonNullable<ContentItem["format"]>;
  topic: string;
  status: ContentStatus;
  plannedDate: string;
  publishedDate: string;
  externalMediaId: string;
  externalPermalink: string;
  externalThumbnailUrl: string;
  draftMemo: string;
  visualMemo: string;
  reminderMemo: string;
  retrospective: string;
};

const emptyForm: ContentFormState = {
  accountId: "",
  title: "",
  format: "post",
  topic: "",
  status: "idea",
  plannedDate: "",
  publishedDate: "",
  externalMediaId: "",
  externalPermalink: "",
  externalThumbnailUrl: "",
  draftMemo: "",
  visualMemo: "",
  reminderMemo: "",
  retrospective: "",
};

const platformLabels: Record<Platform, string> = {
  instagram: "Instagram",
  threads: "Threads",
  brunch: "Brunch",
  blog: "Blog",
  other: "Other",
};

const statusLabels: Record<ContentStatus, string> = {
  idea: "기획",
  planned: "계획됨",
  in_progress: "제작 중",
  review: "검토",
  scheduled: "예약 예정",
  published: "게시 완료",
  on_hold: "보류",
  archived: "보관",
};

const formatLabels: Record<NonNullable<ContentItem["format"]>, string> = {
  post: "이미지/일반 게시물",
  reel: "릴스/영상",
  thread: "Threads",
  carousel: "캐러셀",
  story: "스토리",
  article: "긴 글/에세이",
  other: "기타",
};

const defaultTopics = ["가족", "결혼/관계", "일상", "성장", "위로", "창작", "회고", "공지", "기타"];

function createId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `content-${Date.now()}`;
}

function toOptionalValue(value: string) {
  const trimmedValue = value.trim();
  return trimmedValue.length > 0 ? trimmedValue : undefined;
}

function getMonthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function getDateKey(date: Date) {
  return `${getMonthKey(date)}-${String(date.getDate()).padStart(2, "0")}`;
}

function getMonthDays(monthDate: Date) {
  const firstDay = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
  const lastDay = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0);
  const days: Array<{ dateKey: string; day: number; isBlank: boolean }> = [];

  for (let index = 0; index < firstDay.getDay(); index += 1) {
    days.push({ dateKey: `blank-${index}`, day: 0, isBlank: true });
  }

  for (let day = 1; day <= lastDay.getDate(); day += 1) {
    const date = new Date(monthDate.getFullYear(), monthDate.getMonth(), day);
    days.push({ dateKey: getDateKey(date), day, isBlank: false });
  }

  return days;
}

function formatMonthLabel(date: Date) {
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "long",
  }).format(date);
}

function applyAccountFilter(
  contents: ContentItem[],
  accounts: Account[],
  accountFilter: AccountFilterValue,
) {
  const accountMap = new Map(accounts.map((account) => [account.id, account]));

  return contents.filter((content) => {
    const account = accountMap.get(content.accountId);

    if (!account) {
      return false;
    }

    if (accountFilter.type === "all") {
      return true;
    }

    if (accountFilter.type === "platform") {
      return account.platform === accountFilter.platform;
    }

    return content.accountId === accountFilter.accountId;
  });
}

function getContentDate(content: ContentItem) {
  return content.publishedDate ?? content.plannedDate ?? "";
}

function getContentKeywords(content: ContentItem) {
  if (content.topicKeywords && content.topicKeywords.length > 0) {
    return content.topicKeywords.slice(0, 5);
  }

  const sourceText = [
    content.title,
    content.topic,
    content.caption,
    content.text,
    content.draftMemo,
    content.retrospective,
  ]
    .filter(Boolean)
    .join(" ");
  const matches = sourceText.match(/[가-힣A-Za-z0-9#]{2,}/g) ?? [];
  const stopWords = new Set(["그리고", "그래서", "오늘", "이번", "있는", "없는", "것을", "것도"]);

  return Array.from(
    new Set(
      matches
        .map((keyword) => keyword.replace(/^#/, ""))
        .filter((keyword) => keyword.length >= 2 && !stopWords.has(keyword)),
    ),
  ).slice(0, 5);
}

function getTopValue(values: string[]) {
  if (values.length === 0) {
    return "없음";
  }

  const counts = values.reduce<Record<string, number>>((accumulator, value) => {
    accumulator[value] = (accumulator[value] ?? 0) + 1;
    return accumulator;
  }, {});

  return Object.entries(counts).sort((first, second) => second[1] - first[1])[0]?.[0] ?? "없음";
}

function getRecentKeywords(contents: ContentItem[]) {
  return Array.from(new Set(contents.flatMap(getContentKeywords))).slice(0, 8);
}

function getRecommendations(missingTopic: string, leastUsedFormat: string, keywords: string[]) {
  const recommendations = [
    `${missingTopic} 주제로 짧게 기록할 장면을 하나 골라보세요.`,
    `${leastUsedFormat} 형식으로 최근 이야기를 다시 풀어보세요.`,
    keywords.length > 0
      ? `"${keywords[0]}" 키워드를 다른 각도에서 이어가 보세요.`
      : "최근 한 달을 돌아보는 회고형 글감을 준비해보세요.",
  ];

  return recommendations.slice(0, 3);
}

function hasInsightRecord(content: ContentItem, insights: InsightRecord[]) {
  return insights.some(
    (insight) => insight.contentId === content.id && insight.accountId === content.accountId,
  );
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

function getContentScore(content: ContentItem, insights: InsightRecord[]) {
  const matchedInsights = insights.filter(
    (insight) => insight.contentId === content.id && insight.accountId === content.accountId,
  );

  return matchedInsights.reduce((highestScore, insight) => {
    return Math.max(highestScore, getReactionScore(insight));
  }, 0);
}

function getLatestInsight(content: ContentItem, insights: InsightRecord[]) {
  return insights
    .filter((insight) => insight.contentId === content.id && insight.accountId === content.accountId)
    .sort((first, second) => new Date(second.measuredAt).getTime() - new Date(first.measuredAt).getTime())[0];
}

function getRateLabel(numerator: number | undefined, denominator: number | undefined) {
  if (!denominator || denominator <= 0 || numerator === undefined) {
    return "-";
  }

  const rate = numerator / denominator;
  return Number.isFinite(rate) ? `${(rate * 100).toFixed(1)}%` : "-";
}

function getRestDecision(monthContentCount: number) {
  if (monthContentCount >= 12) {
    return "이번 달 게시 흐름이 충분합니다. 이 날짜는 쉬어도 괜찮습니다.";
  }

  if (monthContentCount <= 4) {
    return "최근 게시 빈도가 낮습니다. 짧은 글 하나로 흐름을 이어가세요.";
  }

  return "무리해서 채우기보다 다음 주제의 밀도를 보고 결정하세요.";
}

export function MainTab({
  accounts,
  contents,
  insights,
  accountFilter,
  onContentsChange,
  onOpenAccountSettings,
}: MainTabProps) {
  const [form, setForm] = useState<ContentFormState>(emptyForm);
  const [editingContentId, setEditingContentId] = useState<string | null>(null);
  const [visibleMonth, setVisibleMonth] = useState(() => new Date());
  const [selectedDate, setSelectedDate] = useState(() => getDateKey(new Date()));
  const [selectedContentId, setSelectedContentId] = useState<string | null>(null);

  const accountMap = useMemo(
    () => new Map(accounts.map((account) => [account.id, account])),
    [accounts],
  );
  const filteredContents = useMemo(
    () => applyAccountFilter(contents, accounts, accountFilter),
    [accountFilter, accounts, contents],
  );
  const visibleMonthKey = getMonthKey(visibleMonth);
  const calendarDays = useMemo(() => getMonthDays(visibleMonth), [visibleMonth]);
  const monthContents = filteredContents.filter((content) =>
    getContentDate(content).startsWith(visibleMonthKey),
  );
  const publishedThisMonthCount = monthContents.filter((content) => content.status === "published").length;
  const topTopic = getTopValue(monthContents.map((content) => content.topic ?? "기타"));
  const topFormat = getTopValue(monthContents.map((content) => formatLabels[content.format ?? "other"]));
  const missingTopic =
    defaultTopics.find((topic) => !monthContents.some((content) => (content.topic ?? "기타") === topic)) ??
    "기타";
  const formatUsage = Object.keys(formatLabels).map((format) => ({
    format: format as NonNullable<ContentItem["format"]>,
    count: monthContents.filter((content) => (content.format ?? "other") === format).length,
  }));
  const leastUsedFormat =
    formatLabels[
      formatUsage.sort((first, second) => first.count - second.count)[0]?.format ?? "other"
    ];
  const recentKeywords = getRecentKeywords(monthContents);
  const recommendations = getRecommendations(missingTopic, leastUsedFormat, recentKeywords);
  const todayKey = getDateKey(new Date());
  const todayItems = filteredContents.filter((content) => content.plannedDate === todayKey);
  const oldHighScoreContent = filteredContents
    .filter((content) => {
      const contentDate = getContentDate(content);
      if (!contentDate) {
        return false;
      }

      const daysAgo = (Date.now() - new Date(contentDate).getTime()) / (1000 * 60 * 60 * 24);
      return daysAgo >= 30 && getContentScore(content, insights) > 0;
    })
    .sort((first, second) => getContentScore(second, insights) - getContentScore(first, insights))[0];
  const reminderItems = oldHighScoreContent ? [oldHighScoreContent] : [];
  const selectedDateItems = filteredContents.filter((content) => getContentDate(content) === selectedDate);
  const selectedContent = selectedContentId
    ? filteredContents.find((content) => content.id === selectedContentId)
    : undefined;
  const selectedContentInsight = selectedContent ? getLatestInsight(selectedContent, insights) : undefined;
  const selectedDateRecommendations = getRecommendations(missingTopic, leastUsedFormat, recentKeywords);
  const restDecision = getRestDecision(monthContents.length);
  const productionCount = filteredContents.filter((content) =>
    ["planned", "in_progress", "review", "scheduled"].includes(content.status),
  ).length;

  function updateForm<Key extends keyof ContentFormState>(key: Key, value: ContentFormState[Key]) {
    setForm((currentForm) => ({ ...currentForm, [key]: value }));
  }

  function resetForm() {
    setForm(emptyForm);
    setEditingContentId(null);
  }

  function prepareFormForDate(dateKey: string) {
    setSelectedDate(dateKey);
    setSelectedContentId(null);
    setEditingContentId(null);
    setForm({
      ...emptyForm,
      accountId: accounts[0]?.id ?? "",
      plannedDate: dateKey,
    });
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const account = accountMap.get(form.accountId);

    if (!account || !form.title.trim()) {
      return;
    }

    const now = new Date().toISOString();
    const contentPayload = {
      accountId: account.id,
      platform: account.platform,
      title: form.title.trim(),
      format: form.format,
      topic: toOptionalValue(form.topic),
      status: form.status,
      plannedDate: toOptionalValue(form.plannedDate),
      publishedDate: toOptionalValue(form.publishedDate),
      externalMediaId: toOptionalValue(form.externalMediaId),
      externalPermalink: toOptionalValue(form.externalPermalink),
      externalThumbnailUrl: toOptionalValue(form.externalThumbnailUrl),
      draftMemo: toOptionalValue(form.draftMemo),
      visualMemo: toOptionalValue(form.visualMemo),
      reminderMemo: toOptionalValue(form.reminderMemo),
      retrospective: toOptionalValue(form.retrospective),
      source: "manual" as const,
    };

    if (editingContentId) {
      onContentsChange(
        contents.map((content) =>
          content.id === editingContentId
            ? { ...content, ...contentPayload, updatedAt: now }
            : content,
        ),
      );
      resetForm();
      return;
    }

    onContentsChange([
      ...contents,
      {
        id: createId(),
        ...contentPayload,
        createdAt: now,
        updatedAt: now,
      },
    ]);
    resetForm();
  }

  function handleEdit(content: ContentItem) {
    setEditingContentId(content.id);
    setSelectedContentId(content.id);
    setSelectedDate(getContentDate(content) || selectedDate);
    setForm({
      accountId: content.accountId,
      title: content.title,
      format: content.format ?? "post",
      topic: content.topic ?? "",
      status: content.status,
      plannedDate: content.plannedDate ?? "",
      publishedDate: content.publishedDate ?? "",
      externalMediaId: content.externalMediaId ?? "",
      externalPermalink: content.externalPermalink ?? "",
      externalThumbnailUrl: content.externalThumbnailUrl ?? "",
      draftMemo: content.draftMemo ?? "",
      visualMemo: content.visualMemo ?? "",
      reminderMemo: content.reminderMemo ?? "",
      retrospective: content.retrospective ?? "",
    });
  }

  function handleHold(contentId: string) {
    const now = new Date().toISOString();
    onContentsChange(
      contents.map((content) =>
        content.id === contentId ? { ...content, status: "on_hold", updatedAt: now } : content,
      ),
    );
  }

  function handleDelete(contentId: string) {
    const shouldDelete = window.confirm("이 콘텐츠를 삭제할까요? 연결된 성과 기록은 남을 수 있습니다.");

    if (!shouldDelete) {
      return;
    }

    onContentsChange(contents.filter((content) => content.id !== contentId));
    setSelectedContentId((currentContentId) => (currentContentId === contentId ? null : currentContentId));

    if (editingContentId === contentId) {
      resetForm();
    }
  }

  function moveMonth(offset: number) {
    setVisibleMonth(
      (currentMonth) => new Date(currentMonth.getFullYear(), currentMonth.getMonth() + offset, 1),
    );
  }

  if (accounts.length === 0) {
    return (
      <section className="tab-panel" aria-label="메인 탭">
        <article className="panel-card panel-card--wide empty-state">
          <h2>계정 등록이 먼저 필요합니다</h2>
          <p>콘텐츠는 반드시 등록된 계정과 연결되어야 합니다. 계정 등록/설정 탭에서 계정을 추가하세요.</p>
          <button className="primary-button" type="button" onClick={onOpenAccountSettings}>
            계정 등록/설정으로 이동
          </button>
        </article>
      </section>
    );
  }

  return (
    <section className="tab-panel main-home-panel" aria-label="메인 탭">
      <div className="settings-header">
        <div>
          <h2>콘텐츠 운영</h2>
          <p>계정 기준으로 콘텐츠를 기획하고 월간 일정과 제작 상태를 확인합니다.</p>
        </div>
        <span className="badge">{filteredContents.length}개 콘텐츠</span>
      </div>

      <div className="section-grid">
        <div className="home-mini-grid">
          <article className="panel-card home-mini-card">
            <span>오늘 할 일</span>
            <strong>{todayItems.length}</strong>
            <p>{todayItems[0]?.title ?? "오늘은 달력만 가볍게 확인하세요."}</p>
          </article>
          <article className="panel-card home-mini-card">
            <span>리마인드</span>
            <strong>{oldHighScoreContent ? "1" : "0"}</strong>
            <p>{oldHighScoreContent?.title ?? "다시 꺼내볼 콘텐츠 없음"}</p>
          </article>
          <article className="panel-card home-mini-card">
            <span>이번 달 게시 수</span>
            <strong>{publishedThisMonthCount}</strong>
            <p>{formatMonthLabel(visibleMonth)} 기준</p>
          </article>
          <article className="panel-card home-mini-card">
            <span>콘텐츠 흐름</span>
            <strong>{productionCount}</strong>
            <p>준비 중인 콘텐츠</p>
          </article>
        </div>

        <article className="panel-card panel-card--wide flow-summary-card">
          <div className="card-heading">
            <div>
              <h3>이번 달 콘텐츠 흐름</h3>
              <p>API로 가져온 게시물과 직접 등록한 콘텐츠를 함께 봅니다.</p>
            </div>
            <span className="badge">{formatMonthLabel(visibleMonth)}</span>
          </div>
          <div className="home-summary-grid">
            <div className="home-summary-item">
              <span>게시 완료</span>
              <strong>{publishedThisMonthCount}</strong>
            </div>
            <div className="home-summary-item">
              <span>많이 쓴 주제</span>
              <strong>{topTopic}</strong>
            </div>
            <div className="home-summary-item">
              <span>많이 쓴 형식</span>
              <strong>{topFormat}</strong>
            </div>
            <div className="home-summary-item">
              <span>부족한 주제</span>
              <strong>{missingTopic}</strong>
            </div>
          </div>
          <div className="keyword-row">
            <span>최근 키워드</span>
            {recentKeywords.length > 0 ? (
              recentKeywords.map((keyword) => <b key={keyword}>{keyword}</b>)
            ) : (
              <b>키워드 없음</b>
            )}
          </div>
          <div className="recommendation-list">
            {recommendations.map((recommendation) => (
              <p key={recommendation}>{recommendation}</p>
            ))}
          </div>
        </article>

        <details className="panel-card panel-card--wide content-editor-card">
          <summary>{editingContentId ? "콘텐츠 수정" : "콘텐츠 직접 추가"}</summary>
          <div className="card-heading">
            <div>
              <h3>{editingContentId ? "콘텐츠 수정" : "콘텐츠 추가"}</h3>
              <p>콘텐츠는 선택한 계정과 연결되며 플랫폼은 계정 기준으로 자동 반영됩니다.</p>
            </div>
            {editingContentId && (
              <button className="secondary-button" type="button" onClick={resetForm}>
                새 콘텐츠 입력
              </button>
            )}
          </div>

          <form className="account-form" onSubmit={handleSubmit}>
            <fieldset>
              <legend>기본 정보</legend>
              <div className="form-grid">
                <label className="form-field">
                  <span>계정</span>
                  <select
                    required
                    value={form.accountId}
                    onChange={(event) => updateForm("accountId", event.target.value)}
                  >
                    <option value="">계정 선택</option>
                    {accounts.map((account) => (
                      <option key={account.id} value={account.id}>
                        {account.displayName} · {platformLabels[account.platform]}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="form-field">
                  <span>콘텐츠명</span>
                  <input
                    required
                    value={form.title}
                    onChange={(event) => updateForm("title", event.target.value)}
                    placeholder="예: 5월 첫째 주 릴스 기획"
                  />
                </label>
                <label className="form-field">
                  <span>형식</span>
                  <select
                    value={form.format}
                    onChange={(event) =>
                      updateForm("format", event.target.value as ContentFormState["format"])
                    }
                  >
                    {Object.entries(formatLabels).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="form-field">
                  <span>주제</span>
                  <input
                    value={form.topic}
                    onChange={(event) => updateForm("topic", event.target.value)}
                    placeholder="콘텐츠 주제"
                  />
                </label>
                <label className="form-field">
                  <span>상태</span>
                  <select
                    value={form.status}
                    onChange={(event) => updateForm("status", event.target.value as ContentStatus)}
                  >
                    {Object.entries(statusLabels).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="form-field">
                  <span>예정일</span>
                  <input
                    type="date"
                    value={form.plannedDate}
                    onChange={(event) => updateForm("plannedDate", event.target.value)}
                  />
                </label>
                <label className="form-field">
                  <span>게시일</span>
                  <input
                    type="date"
                    value={form.publishedDate}
                    onChange={(event) => updateForm("publishedDate", event.target.value)}
                  />
                </label>
                <label className="form-field">
                  <span>외부 미디어 ID</span>
                  <input
                    value={form.externalMediaId}
                    onChange={(event) => updateForm("externalMediaId", event.target.value)}
                    placeholder="게시물 또는 미디어 ID"
                  />
                </label>
                <label className="form-field">
                  <span>게시물 링크</span>
                  <input
                    type="url"
                    value={form.externalPermalink}
                    onChange={(event) => updateForm("externalPermalink", event.target.value)}
                    placeholder="https://"
                  />
                </label>
              </div>
            </fieldset>

            <fieldset>
              <legend>메모</legend>
              <div className="form-grid">
                <label className="form-field">
                  <span>기획 메모</span>
                  <textarea
                    value={form.draftMemo}
                    onChange={(event) => updateForm("draftMemo", event.target.value)}
                    placeholder="초안, 메시지, 훅"
                  />
                </label>
                <label className="form-field">
                  <span>시각 자료 메모</span>
                  <textarea
                    value={form.visualMemo}
                    onChange={(event) => updateForm("visualMemo", event.target.value)}
                    placeholder="촬영, 이미지, 편집 참고"
                  />
                </label>
                <label className="form-field">
                  <span>리마인드</span>
                  <textarea
                    value={form.reminderMemo}
                    onChange={(event) => updateForm("reminderMemo", event.target.value)}
                    placeholder="확인할 작업"
                  />
                </label>
                <label className="form-field">
                  <span>회고</span>
                  <textarea
                    value={form.retrospective}
                    onChange={(event) => updateForm("retrospective", event.target.value)}
                    placeholder="게시 후 메모"
                  />
                </label>
              </div>
            </fieldset>

            <div className="form-actions">
              <button className="primary-button" type="submit">
                {editingContentId ? "콘텐츠 수정" : "콘텐츠 추가"}
              </button>
              <button className="secondary-button" type="button" onClick={resetForm}>
                취소
              </button>
            </div>
          </form>
        </details>

        <article className="panel-card">
          <h3>오늘 할 일</h3>
          {todayItems.length === 0 ? (
            <p>오늘 예정된 콘텐츠가 없습니다.</p>
          ) : (
            <div className="compact-list">
              {todayItems.map((content) => (
                <ContentSummary key={content.id} content={content} account={accountMap.get(content.accountId)} />
              ))}
            </div>
          )}
        </article>

        <article className="panel-card">
          <h3>리마인드</h3>
          {reminderItems.length === 0 ? (
            <p>표시할 리마인드가 없습니다.</p>
          ) : (
            <div className="compact-list">
              {reminderItems.slice(0, 5).map((content) => (
                <ContentSummary key={content.id} content={content} account={accountMap.get(content.accountId)} />
              ))}
            </div>
          )}
        </article>

        <article className="panel-card panel-card--wide calendar-home-card">
          <div className="card-heading">
            <h3>월간 콘텐츠 캘린더</h3>
            <div className="month-controls">
              <button className="secondary-button" type="button" onClick={() => moveMonth(-1)}>
                이전 달
              </button>
              <strong>{formatMonthLabel(visibleMonth)}</strong>
              <button className="secondary-button" type="button" onClick={() => moveMonth(1)}>
                다음 달
              </button>
            </div>
          </div>
          <div className="calendar-grid" aria-label={`${formatMonthLabel(visibleMonth)} 콘텐츠 캘린더`}>
            {["일", "월", "화", "수", "목", "금", "토"].map((dayName) => (
              <div className="calendar-weekday" key={dayName}>
                {dayName}
              </div>
            ))}
            {calendarDays.map((day) => {
              const dayContents = filteredContents.filter(
                (content) => content.plannedDate === day.dateKey,
              );

              return (
                <div
                  className={`calendar-cell ${day.isBlank ? "calendar-cell--blank" : ""}`}
                  key={day.dateKey}
                  onClick={() => {
                    if (!day.isBlank) {
                      prepareFormForDate(day.dateKey);
                    }
                  }}
                  role={day.isBlank ? undefined : "button"}
                  tabIndex={day.isBlank ? undefined : 0}
                >
                  {!day.isBlank && <span className="calendar-day">{day.day}</span>}
                  {dayContents.map((content) => (
                    <button
                      className="calendar-content-card"
                      key={content.id}
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        setSelectedDate(getContentDate(content) || day.dateKey);
                        setSelectedContentId(content.id);
                      }}
                    >
                      <span>{platformLabels[content.platform]}</span>
                      <strong>{content.title}</strong>
                      <small>
                        {accountMap.get(content.accountId)?.displayName ?? "계정 없음"} ·{" "}
                        {statusLabels[content.status]} · {formatLabels[content.format ?? "other"]} ·{" "}
                        {content.topic ?? "기타"}
                      </small>
                      <span className="calendar-hover-preview">
                        <b>{content.title}</b>
                        <em>{content.caption ?? content.text ?? content.draftMemo ?? "본문 미리보기 없음"}</em>
                        <em>
                          {platformLabels[content.platform]} · {formatLabels[content.format ?? "other"]} ·{" "}
                          {content.topic ?? "기타"}
                        </em>
                        <em>{getContentKeywords(content).join(", ") || "키워드 없음"}</em>
                        <em>{hasInsightRecord(content, insights) ? "인사이트 있음" : "인사이트 없음"}</em>
                      </span>
                    </button>
                  ))}
                </div>
              );
            })}
          </div>
          {filteredContents.every((content) => !content.plannedDate?.startsWith(visibleMonthKey)) && (
            <p className="calendar-empty">이번 달에 예정된 콘텐츠가 없습니다.</p>
          )}
        </article>

        <article className="panel-card panel-card--wide date-management-card">
          <div className="card-heading">
            <div>
              <h3>{selectedDate} 콘텐츠 관리</h3>
              <p>날짜를 누르면 이곳에서 추가, 수정, 삭제를 바로 처리합니다.</p>
            </div>
            <span className="badge">{selectedDateItems.length}개</span>
          </div>

          <div className="operation-judgement-grid">
            <div className="operation-judgement-card">
              <span>쉬어도 되는지</span>
              <strong>{selectedDateItems.length > 0 ? "게시 있음" : "판단 필요"}</strong>
              <p>{selectedDateItems.length > 0 ? "이미 올린 게시물의 성과를 확인하세요." : restDecision}</p>
            </div>
            <div className="operation-judgement-card">
              <span>추천 주제</span>
              <strong>{missingTopic}</strong>
              <p>최근 적게 다룬 주제라 다음 소재 후보로 볼 수 있습니다.</p>
            </div>
            <div className="operation-judgement-card">
              <span>추천 형식</span>
              <strong>{leastUsedFormat}</strong>
              <p>반복을 줄이고 콘텐츠 리듬을 바꾸는 선택지입니다.</p>
            </div>
            <div className="operation-judgement-card">
              <span>참고할 과거 글</span>
              <strong>{oldHighScoreContent?.title ?? "없음"}</strong>
              <p>{oldHighScoreContent ? "반응이 좋았던 게시물을 변주해볼 수 있습니다." : "성과가 쌓이면 참고 후보가 표시됩니다."}</p>
            </div>
          </div>

          {selectedContent && (
            <div className="selected-content-detail">
              <div className="content-thumbnail">
                {selectedContent.externalThumbnailUrl ? (
                  <img src={selectedContent.externalThumbnailUrl} alt="" />
                ) : (
                  <span>{platformLabels[selectedContent.platform]}</span>
                )}
              </div>
              <div className="selected-content-copy">
                <span className="badge">{platformLabels[selectedContent.platform]}</span>
                <h3>{selectedContent.title}</h3>
                <p>{selectedContent.caption ?? selectedContent.text ?? selectedContent.draftMemo ?? "본문 미리보기가 없습니다."}</p>
                <div className="insight-summary-row">
                  <span>반응 점수 {selectedContentInsight ? getReactionScore(selectedContentInsight) : "-"}</span>
                  <span>
                    저장률{" "}
                    {getRateLabel(
                      selectedContentInsight?.saves,
                      selectedContentInsight?.reach ?? selectedContentInsight?.views,
                    )}
                  </span>
                  <span>{hasInsightRecord(selectedContent, insights) ? "성과 기록 있음" : "성과 기록 없음"}</span>
                </div>
                <div className="keyword-row">
                  <b>{accountMap.get(selectedContent.accountId)?.displayName ?? "계정 없음"}</b>
                  <b>{selectedContent.publishedDate ?? selectedContent.plannedDate ?? "날짜 없음"}</b>
                  <b>{formatLabels[selectedContent.format ?? "other"]}</b>
                  <b>{selectedContent.topic ?? "기타"}</b>
                  {getContentKeywords(selectedContent).slice(0, 3).map((keyword) => (
                    <b key={keyword}>{keyword}</b>
                  ))}
                </div>
                <div className="account-card__actions">
                  {selectedContent.externalPermalink && (
                    <a className="secondary-button" href={selectedContent.externalPermalink} target="_blank" rel="noreferrer">
                      링크 열기
                    </a>
                  )}
                  <button className="secondary-button" type="button" disabled>
                    인사이트 확인
                  </button>
                  <button className="secondary-button" type="button" onClick={() => handleEdit(selectedContent)}>
                    수정
                  </button>
                  <button className="danger-button" type="button" onClick={() => handleDelete(selectedContent.id)}>
                    삭제
                  </button>
                </div>
              </div>
            </div>
          )}

          {selectedDateItems.length > 0 ? (
            <div className="date-content-strip">
              {selectedDateItems.map((content) => (
                <div className="date-content-card" key={content.id}>
                  <strong>{content.title}</strong>
                  <p>
                    {platformLabels[content.platform]} · {formatLabels[content.format ?? "other"]} ·{" "}
                    {content.topic ?? "기타"}
                  </p>
                  <div className="account-card__actions">
                    <button className="secondary-button" type="button" onClick={() => handleEdit(content)}>
                      수정
                    </button>
                    <button className="danger-button" type="button" onClick={() => handleDelete(content.id)}>
                      삭제
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="date-recommendation-card">
              <strong>이 날짜에는 아직 콘텐츠가 없습니다.</strong>
              {selectedDateRecommendations.map((recommendation) => (
                <p key={recommendation}>{recommendation}</p>
              ))}
            </div>
          )}

          <form className="account-form date-editor-form" onSubmit={handleSubmit}>
            <fieldset>
              <legend>{editingContentId ? "선택한 콘텐츠 수정" : "이 날짜에 콘텐츠 추가"}</legend>
              <div className="form-grid">
                <label className="form-field">
                  <span>계정</span>
                  <select
                    required
                    value={form.accountId}
                    onChange={(event) => updateForm("accountId", event.target.value)}
                  >
                    <option value="">계정 선택</option>
                    {accounts.map((account) => (
                      <option key={account.id} value={account.id}>
                        {account.displayName} · {platformLabels[account.platform]}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="form-field">
                  <span>제목</span>
                  <input
                    required
                    value={form.title}
                    onChange={(event) => updateForm("title", event.target.value)}
                    placeholder="오늘 올릴 이야기"
                  />
                </label>
                <label className="form-field">
                  <span>형식</span>
                  <select
                    value={form.format}
                    onChange={(event) =>
                      updateForm("format", event.target.value as ContentFormState["format"])
                    }
                  >
                    {Object.entries(formatLabels).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="form-field">
                  <span>주제</span>
                  <input
                    value={form.topic}
                    onChange={(event) => updateForm("topic", event.target.value)}
                    placeholder="가족, 일상, 창작..."
                  />
                </label>
                <label className="form-field">
                  <span>상태</span>
                  <select
                    value={form.status}
                    onChange={(event) => updateForm("status", event.target.value as ContentStatus)}
                  >
                    {Object.entries(statusLabels).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="form-field">
                  <span>날짜</span>
                  <input
                    type="date"
                    value={form.plannedDate || selectedDate}
                    onChange={(event) => {
                      updateForm("plannedDate", event.target.value);
                      setSelectedDate(event.target.value || selectedDate);
                    }}
                  />
                </label>
              </div>
            </fieldset>
            <div className="form-actions">
              <button className="primary-button" type="submit">
                {editingContentId ? "수정 저장" : "콘텐츠 추가"}
              </button>
              <button className="secondary-button" type="button" onClick={() => prepareFormForDate(selectedDate)}>
                새로 입력
              </button>
            </div>
          </form>
        </article>

        <details className="panel-card panel-card--wide legacy-content-list">
          <summary>기획 목록 보기</summary>
          <h3>콘텐츠 기획 목록</h3>
          {filteredContents.length === 0 ? (
            <p>선택된 필터에 해당하는 콘텐츠가 없습니다.</p>
          ) : (
            <div className="content-list">
              {filteredContents.map((content) => (
                <div className="content-row" key={content.id}>
                  <ContentSummary content={content} account={accountMap.get(content.accountId)} />
                  <div className="account-card__actions">
                    <button className="secondary-button" type="button" onClick={() => handleEdit(content)}>
                      수정
                    </button>
                    <button className="danger-button" type="button" onClick={() => handleHold(content.id)}>
                      보류
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </details>

        <article className="panel-card">
          <h3>제작 상태 요약</h3>
          <div className="status-row">
            {Object.entries(statusLabels).map(([status, label]) => (
              <span className="badge" key={status}>
                {label} {filteredContents.filter((content) => content.status === status).length}
              </span>
            ))}
          </div>
        </article>
      </div>
    </section>
  );
}

function ContentSummary({ content, account }: { content: ContentItem; account?: Account }) {
  return (
    <div className="content-summary">
      <div>
        <strong>{content.title}</strong>
        <p>
          {account?.displayName ?? "계정 없음"} · {platformLabels[content.platform]} ·{" "}
          {content.plannedDate ?? "예정일 없음"}
        </p>
      </div>
      <span className="badge">{statusLabels[content.status]}</span>
    </div>
  );
}
