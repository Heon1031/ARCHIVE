import { useMemo, useState, type FormEvent } from "react";
import type { Account, AccountFilterValue, ContentItem, ContentStatus, Platform } from "../types/models";

type MainTabProps = {
  accounts: Account[];
  contents: ContentItem[];
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
  post: "Post",
  reel: "Reel",
  thread: "Thread",
  carousel: "Carousel",
  story: "Story",
  article: "Article",
  other: "Other",
};

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

export function MainTab({
  accounts,
  contents,
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
        <article className="panel-card panel-card--wide">
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
        </article>

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

        <article className="panel-card panel-card--wide">
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
                        {statusLabels[content.status]}
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
