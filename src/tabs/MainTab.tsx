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
  const reminderItems = filteredContents.filter((content) => content.reminderMemo);

  function updateForm<Key extends keyof ContentFormState>(key: Key, value: ContentFormState[Key]) {
    setForm((currentForm) => ({ ...currentForm, [key]: value }));
  }

  function resetForm() {
    setForm(emptyForm);
    setEditingContentId(null);
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
    <section className="tab-panel" aria-label="메인 탭">
      <div className="settings-header">
        <div>
          <h2>콘텐츠 운영</h2>
          <p>계정 기준으로 콘텐츠를 기획하고 월간 일정과 제작 상태를 확인합니다.</p>
        </div>
        <span className="badge">{filteredContents.length}개 콘텐츠</span>
      </div>

      <div className="section-grid">
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

        <details className="panel-card panel-card--wide content-editor-card" open={Boolean(editingContentId)}>
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
                >
                  {!day.isBlank && <span className="calendar-day">{day.day}</span>}
                  {dayContents.map((content) => (
                    <button
                      className="calendar-content-card"
                      key={content.id}
                      type="button"
                      onClick={() => handleEdit(content)}
                    >
                      <span>{platformLabels[content.platform]}</span>
                      <strong>{content.title}</strong>
                      <small>
                        {accountMap.get(content.accountId)?.displayName ?? "계정 없음"} ·{" "}
                        {statusLabels[content.status]} · {formatLabels[content.format ?? "other"]} ·{" "}
                        {content.topic ?? "기타"}
                      </small>
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

        <article className="panel-card panel-card--wide">
          <h3>콘텐츠 DB</h3>
          {filteredContents.length === 0 ? (
            <p>선택한 필터에 해당하는 게시물 기록이 없습니다.</p>
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
              </div>
              {filteredContents.map((content) => (
                <div className="content-db-row" key={content.id}>
                  <span>{getContentDate(content) || "-"}</span>
                  <span>{platformLabels[content.platform]}</span>
                  <span>{accountMap.get(content.accountId)?.displayName ?? "-"}</span>
                  <strong>{content.title}</strong>
                  <span>{formatLabels[content.format ?? "other"]}</span>
                  <span>{content.topic ?? "기타"}</span>
                  <span>{getContentKeywords(content).join(", ") || "키워드 없음"}</span>
                  <span>{statusLabels[content.status]}</span>
                  <span>{hasInsightRecord(content, insights) ? "있음" : "없음"}</span>
                  <div className="account-card__actions">
                    {content.externalPermalink ? (
                      <a href={content.externalPermalink} target="_blank" rel="noreferrer">
                        열기
                      </a>
                    ) : (
                      <span>-</span>
                    )}
                    <button className="secondary-button" type="button" onClick={() => handleEdit(content)}>
                      수정
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </article>

        <article className="panel-card panel-card--wide legacy-content-list">
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
        </article>

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
