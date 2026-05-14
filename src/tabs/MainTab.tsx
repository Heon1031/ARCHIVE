import { useEffect, useMemo, useState, type FormEvent } from "react";
import { contentTypes, getManagedKeywords, normalizeContentType } from "../lib/taxonomy";
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

type JudgementKey = "today" | "recommend" | "improve";

type DateRecommendation = {
  type: "추천" | "개선" | "재활용" | "휴식";
  title: string;
  reason: string;
  topic: string;
  format: string;
  basis: string;
  expectedEffect: string;
  caution: string;
  tags: string[];
};

type ReminderCandidate = {
  content: ContentItem;
  score: number;
  reason: string;
  summary: string;
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

type MonthlyOperationLevel = "low" | "minimum" | "recommended" | "active" | "overloaded";

const monthlyOperationTarget = {
  recommendedPosts: 14,
  weeklyCadence: "주 3회 전후",
  formatMix: {
    shortText: 5,
    imageText: 4,
    essay: 2,
    carousel: 2,
    experiment: 1,
  },
  topicMix: {
    relationship: 4,
    comfort: 3,
    growth: 3,
    daily: 2,
    creation: 2,
  },
};

function getMonthlyOperationLevel(monthContentCount: number): MonthlyOperationLevel {
  if (monthContentCount <= 7) {
    return "low";
  }

  if (monthContentCount <= 11) {
    return "minimum";
  }

  if (monthContentCount <= 16) {
    return "recommended";
  }

  if (monthContentCount <= 22) {
    return "active";
  }

  return "overloaded";
}

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
  return getManagedKeywords(content).slice(0, 5);

  if (content.topicKeywords?.length) {
    return content.topicKeywords?.slice(0, 5) ?? [];
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

function getDateRecommendation(
  dateKey: string,
  missingTopic: string,
  leastUsedFormat: string,
  keywords: string[],
  oldHighScoreContent?: ContentItem,
  contents: ContentItem[] = [],
  insights: InsightRecord[] = [],
): DateRecommendation {
  const dayOfWeek = new Date(dateKey).getDay();
  const dayOfMonth = new Date(dateKey).getDate();
  const keyword = keywords[0] ?? missingTopic;
  const targetTime = new Date(dateKey).getTime();
  const postedTimes = contents
    .map((content) => getContentDate(content))
    .filter(Boolean)
    .map((contentDate) => new Date(contentDate).getTime())
    .filter((time) => Number.isFinite(time));
  const previousPostGap = postedTimes
    .filter((time) => time < targetTime)
    .map((time) => Math.round((targetTime - time) / (1000 * 60 * 60 * 24)))
    .sort((first, second) => first - second)[0];
  const scoredContents = contents.filter((content) => hasInsightRecord(content, insights));
  const averageContentScore =
    scoredContents.length > 0
      ? scoredContents.reduce((total, content) => total + getContentScore(content, insights), 0) / scoredContents.length
      : 0;
  const lowScoreFormat = scoredContents
    .filter((content) => getContentScore(content, insights) < averageContentScore)
    .sort((first, second) => getContentScore(first, insights) - getContentScore(second, insights))[0];
  const recentContents = contents
    .filter((content) => {
      const contentDate = getContentDate(content);
      return contentDate && new Date(contentDate).getTime() < targetTime;
    })
    .sort((first, second) => new Date(getContentDate(second)).getTime() - new Date(getContentDate(first)).getTime())
    .slice(0, 3);
  const repeatedTopic =
    recentContents.length >= 3 &&
    recentContents.filter((content) => (content.topic ?? "") === (recentContents[0].topic ?? "")).length >= 2
      ? recentContents[0].topic
      : undefined;
  const repeatedFormat =
    recentContents.length >= 3 &&
    recentContents.filter((content) => normalizeContentType(content) === normalizeContentType(recentContents[0])).length >= 2
      ? normalizeContentType(recentContents[0])
      : undefined;
  const monthContentCount = contents.filter((content) => getContentDate(content).slice(0, 7) === dateKey.slice(0, 7)).length;
  const monthlyLevel = getMonthlyOperationLevel(monthContentCount);
  const defaultLightFormat = monthContentCount <= 7 ? "짧은글" : leastUsedFormat;

  if (previousPostGap === 1) {
    return {
      type: monthlyLevel === "low" ? "추천" : lowScoreFormat ? "개선" : "휴식",
      title:
        monthlyLevel === "low"
          ? defaultLightFormat
          : lowScoreFormat
            ? `개선-${normalizeContentType(lowScoreFormat)}`
            : "휴식",
      reason: previousPostGap === 1
        ? monthlyLevel === "low"
          ? `월간 게시 수가 ${monthContentCount}개로 부족 구간이라 휴식보다 ${defaultLightFormat}로 흐름을 이어가는 편이 좋습니다.`
          : lowScoreFormat
          ? "전날 게시 흐름을 바로 잇기보다 낮은 반응 형식을 점검하기 좋은 날입니다."
          : "전날 실제 게시물이 있어 바로 이어 올리기보다 반응을 지켜보는 편이 좋습니다."
        : "최근 게시 흐름을 기준으로 만든 운영 판단입니다.",
      topic: monthlyLevel === "low" ? missingTopic : lowScoreFormat?.topic ?? "휴식",
      format: monthlyLevel === "low" ? defaultLightFormat : lowScoreFormat ? normalizeContentType(lowScoreFormat) : "리듬조정",
      basis: monthlyLevel === "low" ? "월 0~7개 부족 구간" : "직전 업로드 다음날",
      expectedEffect:
        monthlyLevel === "low"
          ? "월 14개 권장 기준에 가까워지도록 가벼운 게시 리듬을 회복합니다."
          : lowScoreFormat
            ? "낮은 반응 형식의 다음 변주를 준비합니다."
            : "반복 업로드 피로를 줄이고 다음 게시물의 집중도를 높입니다.",
      caution: "쉬는 날에도 성과 흐름만 확인하고 새 작성 흐름은 만들지 않습니다.",
      tags: [
        monthlyLevel === "low" ? `추천-${defaultLightFormat}` : lowScoreFormat ? `개선-${normalizeContentType(lowScoreFormat)}` : "휴식",
        "리듬조정",
      ].slice(0, 5),
    };
  }

  if (oldHighScoreContent && monthlyLevel !== "low" && (previousPostGap ?? 0) >= 3 && dayOfMonth % 5 === 0) {
    return {
      type: "재활용",
      title: `재활용-${oldHighScoreContent.topic ?? keyword}`,
      reason: "오래전에 반응이 좋았던 게시물을 현재 상황에 맞게 다시 다듬어볼 만합니다.",
      topic: oldHighScoreContent.topic ?? keyword,
      format: normalizeContentType(oldHighScoreContent),
      basis: "30일 이상 지난 고반응 게시물",
      expectedEffect: "검증된 주제를 새 맥락으로 되살려 반응 가능성을 높입니다.",
      caution: "문장을 그대로 반복하지 말고 현재 경험이나 계절감을 더하세요.",
      tags: [`재활용-${oldHighScoreContent.topic ?? keyword}`, "추천-짧은글"].slice(0, 5),
    };
  }

  if (repeatedTopic || repeatedFormat) {
    return {
      type: "추천",
      title: `추천-${leastUsedFormat}`,
      reason: "최근 비슷한 주제나 형식이 반복되어 다른 결의 콘텐츠로 흐름을 바꾸는 편이 좋습니다.",
      topic: repeatedTopic ? missingTopic : keyword,
      format: repeatedFormat ? leastUsedFormat : "짧은글",
      basis: "최근 3개 게시물의 주제/형식 반복",
      expectedEffect: "반복 피로를 줄이고 콘텐츠 캘린더의 균형을 회복합니다.",
      caution: "새로운 주제를 억지로 만들기보다 기존 이야기의 다른 감정선을 선택하세요.",
      tags: [`추천-${leastUsedFormat}`, "주제전환"].slice(0, 5),
    };
  }

  if ((previousPostGap ?? 0) >= 3) {
    return {
      type: "추천",
      title: monthlyLevel === "low" ? defaultLightFormat : `추천-${leastUsedFormat}`,
      reason: `최근 ${previousPostGap}일간 빈틈이 있어 ${missingTopic} 주제를 ${monthlyLevel === "low" ? defaultLightFormat : leastUsedFormat} 형식으로 가볍게 이어가기 좋습니다.`,
      topic: missingTopic,
      format: monthlyLevel === "low" ? defaultLightFormat : leastUsedFormat,
      basis: `${monthlyLevel === "low" ? "월 0~7개 부족 구간" : `최근 ${previousPostGap}일 공백`}`,
      expectedEffect:
        monthlyLevel === "low"
          ? `월 ${monthlyOperationTarget.recommendedPosts}개, ${monthlyOperationTarget.weeklyCadence} 기준에 맞게 게시 리듬을 회복합니다.`
          : "게시 리듬을 끊지 않고 부족한 주제 비중을 보완합니다.",
      caution: "반복되는 주제라면 다른 감정 키워드로 각도를 바꿔야 합니다.",
      tags: [`추천-${monthlyLevel === "low" ? defaultLightFormat : leastUsedFormat}`, "주제전환"].slice(0, 5),
    };
  }

  if ((previousPostGap ?? 0) >= 2) {
    return {
      type: "추천",
      title: `추천-${leastUsedFormat}`,
      reason: `최근 ${previousPostGap}일간 빈틈이 있어 ${missingTopic} 주제를 ${leastUsedFormat} 형식으로 가볍게 이어가기 좋습니다.`,
      topic: missingTopic,
      format: leastUsedFormat,
      basis: `최근 ${previousPostGap}일 공백`,
      expectedEffect: "게시 리듬을 끊지 않고 부족한 주제 비중을 보완합니다.",
      caution: "반복되는 주제라면 다른 감정 키워드로 각도를 바꿔야 합니다.",
      tags: [`추천-${leastUsedFormat}`, "주제전환"].slice(0, 5),
    };
  }

  if (lowScoreFormat && dayOfWeek % 2 === 1) {
    return {
      type: "개선",
      title: `개선-${normalizeContentType(lowScoreFormat)}`,
      reason: "성과가 낮았던 형식입니다. 메시지 선명도나 저장을 부르는 구조를 점검해볼 수 있습니다.",
      topic: lowScoreFormat.topic ?? missingTopic,
      format: normalizeContentType(lowScoreFormat),
      basis: "낮은 reactionScore 콘텐츠",
      expectedEffect: "낮은 반응 형식의 원인을 줄이고 같은 주제의 전달력을 개선합니다.",
      caution: "같은 형식을 반복하기보다 훅, 문장 길이, 첫 장 구성을 바꿔보세요.",
      tags: [`개선-${normalizeContentType(lowScoreFormat)}`, "리듬조정"].slice(0, 5),
    };
  }

  if ((monthlyLevel === "active" || monthlyLevel === "overloaded") && dayOfWeek === 0) {
    return {
      type: "휴식",
      title: "휴식",
      reason:
        monthlyLevel === "overloaded"
          ? "월 23개 이상은 과다 가능성이 있어 새 글보다 휴식과 정리 중심으로 운영하는 편이 좋습니다."
          : "월 17~22개 적극 운영 구간이라 새 글보다 휴식, 재활용, 개선 비중을 높이는 편이 좋습니다.",
      topic: "휴식",
      format: "리듬조정",
      basis: monthlyLevel === "overloaded" ? "월 23개 이상 과다 가능성" : "월 17~22개 적극 운영",
      expectedEffect: "과한 반복을 줄이고 다음 콘텐츠의 밀도를 높입니다.",
      caution: "완전히 멈추기보다 저장/댓글 반응을 확인하는 날로 쓰세요.",
      tags: ["휴식", "리듬조정"],
    };
  }

  return {
    type: "추천",
    title: `추천-${leastUsedFormat}`,
    reason: keyword
      ? `${keyword} 키워드를 중심으로 짧고 선명한 운영 흐름을 이어갈 수 있습니다.`
      : "최근 부족했던 주제와 형식을 기준으로 만든 추천입니다.",
    topic: missingTopic,
    format: leastUsedFormat,
    basis: "기본 운영 비율과 최근 월간 흐름",
    expectedEffect: "부족한 주제와 형식을 보완해 캘린더 균형을 맞춥니다.",
    caution: "달력 셀을 채우기 위한 추천이 아니라 운영 방향 참고용입니다.",
    tags: [`추천-${leastUsedFormat}`, `재활용-${missingTopic}`].slice(0, 5),
  };
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

function getImproveMetricLabel(insight?: InsightRecord) {
  if (!insight) {
    return "성과 기록 없음";
  }

  if (!insight.saves) {
    return "저장 낮음";
  }

  if (!(insight.shares ?? insight.reposts)) {
    return "공유 낮음";
  }

  if (!(insight.comments ?? insight.replies)) {
    return "댓글 낮음";
  }

  return "반응 낮음";
}

function getImproveReason(content: ContentItem, insight?: InsightRecord) {
  if (!insight) {
    return "성과 기록을 먼저 확인하세요.";
  }

  if (!insight.saves) {
    return "저장으로 이어지는 문장이 약합니다.";
  }

  if (!(insight.shares ?? insight.reposts)) {
    return "공유할 만한 핵심 문장이 약합니다.";
  }

  if (!(insight.comments ?? insight.replies)) {
    return "질문형 첫 문장으로 반응을 열어보세요.";
  }

  return `${normalizeContentType(content)} 반복 피로를 줄여보세요.`;
}

function getKeywordUsage(contents: ContentItem[]) {
  const counts = contents.flatMap(getContentKeywords).reduce<Record<string, number>>((accumulator, keyword) => {
    accumulator[keyword] = (accumulator[keyword] ?? 0) + 1;
    return accumulator;
  }, {});

  return Object.entries(counts)
    .map(([keyword, count]) => ({ keyword, count }))
    .sort((first, second) => second.count - first.count || first.keyword.localeCompare(second.keyword))
    .slice(0, 6);
}

function getRateLabel(numerator: number | undefined, denominator: number | undefined) {
  if (!denominator || denominator <= 0 || numerator === undefined) {
    return "-";
  }

  const rate = numerator / denominator;
  return Number.isFinite(rate) ? `${(rate * 100).toFixed(1)}%` : "-";
}

function getRestDecision(monthContentCount: number) {
  const monthlyLevel = getMonthlyOperationLevel(monthContentCount);

  if (monthlyLevel === "overloaded") {
    return "월 23개 이상은 과다 가능성이 있습니다. 새 글보다 휴식과 정리 중심으로 보세요.";
  }

  if (monthlyLevel === "active") {
    return "적극 운영 구간입니다. 새 글 추천보다 휴식, 재활용, 개선 비중을 높여도 좋습니다.";
  }

  if (monthlyLevel === "recommended") {
    return "월 12~16개 권장 운영 구간입니다. 휴식, 재활용, 개선을 균형 있게 배치하세요.";
  }

  if (monthlyLevel === "minimum") {
    return "월 8~11개는 최소 유지 구간입니다. 주 2~3회 리듬을 맞추는 추천을 우선합니다.";
  }

  return "월 0~7개는 부족 구간입니다. 휴식보다 짧은글이나 이미지 중심 추천을 우선합니다.";
}

function shouldShowDateRecommendation(dateKey: string, contents: ContentItem[]) {
  const targetTime = new Date(dateKey).getTime();
  const dayOfMonth = new Date(dateKey).getDate();
  const dayOfWeek = new Date(dateKey).getDay();
  const monthlyLevel = getMonthlyOperationLevel(
    contents.filter((content) => getContentDate(content).slice(0, 7) === dateKey.slice(0, 7)).length,
  );
  const postedTimes = contents
    .map((content) => getContentDate(content))
    .filter(Boolean)
    .map((contentDate) => new Date(contentDate).getTime())
    .filter((time) => Number.isFinite(time));
  const previousPostGap = postedTimes
    .filter((time) => time < targetTime)
    .map((time) => Math.round((targetTime - time) / (1000 * 60 * 60 * 24)))
    .sort((first, second) => first - second)[0];

  if (previousPostGap === 1) {
    return monthlyLevel === "low" ? dayOfMonth % 3 === 0 : monthlyLevel === "overloaded" || dayOfWeek === 0;
  }

  if ((previousPostGap ?? 0) >= 3) {
    if (monthlyLevel === "overloaded") {
      return dayOfMonth % 3 === 0;
    }

    if (monthlyLevel === "active" || monthlyLevel === "recommended") {
      return dayOfMonth % 3 !== 1;
    }

    return dayOfMonth % 2 === 0 || (previousPostGap ?? 0) >= 4;
  }

  if ((previousPostGap ?? 0) >= 2) {
    return monthlyLevel === "low" || monthlyLevel === "minimum" ? dayOfMonth % 3 !== 1 : dayOfMonth % 4 === 0;
  }

  return postedTimes.length === 0 ? dayOfMonth % 5 === 0 : false;
}

function getCalendarRecommendations(
  dateKey: string,
  missingTopic: string,
  leastUsedFormat: string,
  keywords: string[],
  oldHighScoreContent: ContentItem | undefined,
  contents: ContentItem[],
  insights: InsightRecord[],
) {
  if (!shouldShowDateRecommendation(dateKey, contents)) {
    return [];
  }

  const monthContentsForDate = contents.filter((content) => getContentDate(content).slice(0, 7) === dateKey.slice(0, 7));
  const monthCount = monthContentsForDate.length;
  const monthlyLevel = getMonthlyOperationLevel(monthCount);
  const dayOfMonth = new Date(dateKey).getDate();
  const dayOfWeek = new Date(dateKey).getDay();
  const targetFormats = getTargetFormatRecommendations(monthContentsForDate);
  const recentContents = contents
    .filter((content) => {
      const contentDate = getContentDate(content);
      return contentDate && new Date(contentDate).getTime() < new Date(dateKey).getTime();
    })
    .sort((first, second) => new Date(getContentDate(second)).getTime() - new Date(getContentDate(first)).getTime())
    .slice(0, 3);
  const recentFormats = recentContents.map(normalizeContentType);
  const repeatedFormat = recentFormats.find(
    (format) => recentFormats.filter((currentFormat) => currentFormat === format).length >= 2,
  );
  const weekStart = new Date(dateKey);
  weekStart.setDate(weekStart.getDate() - dayOfWeek);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);
  const weekContents = monthContentsForDate.filter((content) => {
    const contentTime = new Date(getContentDate(content)).getTime();
    return contentTime >= weekStart.getTime() && contentTime <= weekEnd.getTime();
  });
  const weekFormats = weekContents.map(normalizeContentType);
  const scoredContents = contents.filter((content) => hasInsightRecord(content, insights));
  const averageScore =
    scoredContents.length > 0
      ? scoredContents.reduce((total, content) => total + getContentScore(content, insights), 0) / scoredContents.length
      : 0;
  const improveTarget = scoredContents
    .filter((content) => getContentScore(content, insights) < averageScore)
    .sort((first, second) => getContentScore(first, insights) - getContentScore(second, insights))[0];
  const recommendations: DateRecommendation[] = [];
  const chooseFormat = () => {
    const available = targetFormats.filter((format) => {
      if (format.deficit <= 0 && monthlyLevel !== "low") {
        return false;
      }

      if (format.label === repeatedFormat) {
        return false;
      }

      if (weekFormats.filter((weekFormat) => weekFormat === format.label).length >= 2) {
        return false;
      }

      if ((format.label === "긴글" || format.label === "캐러셀") && weekFormats.includes(format.label)) {
        return false;
      }

      if (format.label === "릴스" && monthContentsForDate.some((content) => normalizeContentType(content) === "릴스")) {
        return false;
      }

      return true;
    });

    return available[dayOfMonth % Math.max(available.length, 1)] ?? targetFormats[0];
  };
  const targetFormat = chooseFormat();

  const addFormatRecommendation = (formatLabel: string) => {
    recommendations.push({
      type: "추천",
      title: formatLabel,
      reason: `이번 달 ${formatLabel} 콘텐츠가 목표 대비 부족해 ${missingTopic} 주제로 균형을 맞추기 좋습니다.`,
      topic: missingTopic,
      format: formatLabel,
      basis: `월 ${monthCount}개 · ${formatLabel} 목표 대비 ${Math.max(targetFormat.deficit, 0)}개 부족`,
      expectedEffect: "짧은글 반복을 줄이고 월간 콘텐츠 형식 비율을 고르게 맞춥니다.",
      caution: repeatedFormat
        ? `최근 ${repeatedFormat} 형식이 반복되어 같은 형식은 피하는 편이 좋습니다.`
        : "달력 셀을 채우기 위한 추천이 아니라 운영 균형 참고용입니다.",
      tags: [formatLabel, missingTopic, "형식균형"].slice(0, 5),
    });
  };

  if (monthlyLevel === "overloaded" || (monthlyLevel === "active" && dayOfWeek === 0)) {
    recommendations.push({
      type: "휴식",
      title: "휴식",
      reason:
        monthlyLevel === "overloaded"
          ? "월 23개 이상은 과다 가능성이 있어 새 글보다 휴식과 정리 중심으로 운영하는 편이 좋습니다."
          : "적극 운영 구간이라 일부 빈 날짜는 새 글보다 성과 확인과 정리에 쓰는 편이 좋습니다.",
      topic: "휴식",
      format: "리듬조정",
      basis: monthlyLevel === "overloaded" ? "월 23개 이상 과다 가능성" : "월 17~22개 적극 운영",
      expectedEffect: "과한 반복을 줄이고 다음 콘텐츠의 밀도를 높입니다.",
      caution: "휴식 뱃지는 단독 판단입니다. 다른 추천과 함께 실행하지 않습니다.",
      tags: ["휴식", "리듬조정"],
    });

    return recommendations;
  }

  if (targetFormat) {
    addFormatRecommendation(targetFormat.label);
  }

  if (
    oldHighScoreContent &&
    monthlyLevel !== "low" &&
    dayOfMonth % 6 === 0 &&
    recommendations.every((recommendation) => recommendation.type !== "휴식")
  ) {
    recommendations.push({
      type: "재활용",
      title: "재활용",
      reason: `${oldHighScoreContent.title} 게시물은 30일 이상 지났고 반응이 좋아 현재 맥락에 맞게 다시 꺼내볼 만합니다.`,
      topic: oldHighScoreContent.topic ?? missingTopic,
      format: normalizeContentType(oldHighScoreContent),
      basis: "고반응 과거 게시물",
      expectedEffect: "검증된 메시지를 새 형식으로 변주해 반응 가능성을 높입니다.",
      caution: "같은 문장을 반복하지 말고 현재 경험이나 계절감을 더하세요.",
      tags: ["재활용", oldHighScoreContent.topic ?? missingTopic].slice(0, 5),
    });
  }

  if (
    improveTarget &&
    recommendations.length < 2 &&
    recommendations.every((recommendation) => recommendation.type !== "휴식") &&
    dayOfMonth % 4 === 0
  ) {
    const improveFormat = normalizeContentType(improveTarget);
    recommendations.push({
      type: "개선",
      title: "개선",
      reason: `${improveFormat} 형식의 반응 점수가 평균보다 낮아 문장 첫머리나 저장을 부르는 구조를 점검하기 좋습니다.`,
      topic: improveTarget.topic ?? missingTopic,
      format: improveFormat,
      basis: `평균 반응 점수 ${Math.round(averageScore)} 대비 낮은 콘텐츠`,
      expectedEffect: "낮은 반응 형식의 원인을 줄이고 다음 변주의 전달력을 높입니다.",
      caution: "개선 근거가 있는 형식만 다룹니다. 근거 없이 개선 뱃지를 띄우지 않습니다.",
      tags: ["개선", improveFormat, improveTarget.topic ?? missingTopic].slice(0, 5),
    });
  }

  return dedupeCalendarRecommendations(recommendations);
}

function getCalendarBadgeLabel(recommendation: DateRecommendation) {
  const rawLabel = recommendation.title.includes("-")
    ? recommendation.title.split("-").slice(1).join("-")
    : recommendation.title;

  if (recommendation.type === "개선") {
    return "개선";
  }

  if (recommendation.type === "재활용") {
    return "재활용";
  }

  if (recommendation.type === "휴식") {
    return "휴식";
  }

  if (rawLabel.includes("사진") || rawLabel.includes("이미지")) {
    return "이미지";
  }

  if (rawLabel.includes("릴스") || rawLabel.includes("영상")) {
    return "릴스";
  }

  if (rawLabel.includes("캐러셀")) {
    return "캐러셀";
  }

  if (rawLabel.toLowerCase().includes("threads")) {
    return "Threads";
  }

  if (rawLabel.includes("긴글") || rawLabel.includes("긴 글") || rawLabel.includes("에세이")) {
    return "긴글";
  }

  return rawLabel || "짧은글";
}

function dedupeCalendarRecommendations(recommendations: DateRecommendation[]) {
  const seenLabels = new Set<string>();
  const seenCombinations = new Set<string>();
  const deduped: DateRecommendation[] = [];

  for (const recommendation of recommendations) {
    const label = getCalendarBadgeLabel(recommendation);
    const isRest =
      label === "휴식" ||
      label.includes("?댁떇") ||
      recommendation.type === "휴식" ||
      recommendation.type.includes("?댁떇");

    if (isRest) {
      return [recommendation];
    }

    const combinationKey = `${recommendation.type}-${recommendation.format}`;

    if (seenLabels.has(label) || seenCombinations.has(combinationKey)) {
      continue;
    }

    seenLabels.add(label);
    seenCombinations.add(combinationKey);
    deduped.push(recommendation);
  }

  return deduped.slice(0, 2);
}

function getTargetFormatRecommendations(contents: ContentItem[]) {
  const bucketLabels = {
    shortText: "짧은글",
    imageText: "이미지",
    essay: "긴글",
    carousel: "캐러셀",
    experiment: "릴스",
  };
  const counts = {
    shortText: 0,
    imageText: 0,
    essay: 0,
    carousel: 0,
    experiment: 0,
  };

  contents.forEach((content) => {
    const type = normalizeContentType(content).toLowerCase();

    if (type.includes("thread") || type.includes("릴스") || type.includes("영상") || type.includes("reel")) {
      counts.experiment += 1;
      return;
    }

    if (type.includes("캐러셀") || type.includes("carousel")) {
      counts.carousel += 1;
      return;
    }

    if (type.includes("긴") || type.includes("에세이") || type.includes("essay") || type.includes("article")) {
      counts.essay += 1;
      return;
    }

    if (type.includes("이미지") || type.includes("사진") || type.includes("캡션") || type.includes("post")) {
      counts.imageText += 1;
      return;
    }

    counts.shortText += 1;
  });

  return (Object.entries(monthlyOperationTarget.formatMix) as Array<[
    keyof typeof monthlyOperationTarget.formatMix,
    number,
  ]>)
    .map(([bucket, target]) => ({
      bucket,
      label: bucketLabels[bucket],
      deficit: target - counts[bucket],
    }))
    .sort((first, second) => second.deficit - first.deficit);
}

function getTargetFormatRecommendation(contents: ContentItem[]) {
  return getTargetFormatRecommendations(contents)[0];
}

function getReminderCandidates(
  contents: ContentItem[],
  insights: InsightRecord[],
  dateKey: string,
  missingTopic: string,
  leastUsedFormat: string,
) {
  const targetTime = new Date(dateKey).getTime();
  const recentTopics = contents
    .filter((content) => {
      const contentDate = getContentDate(content);
      return contentDate && targetTime - new Date(contentDate).getTime() <= 1000 * 60 * 60 * 24 * 14;
    })
    .map((content) => content.topic)
    .filter(Boolean);
  const repeatedTopic = recentTopics.find(
    (topic) => recentTopics.filter((currentTopic) => currentTopic === topic).length >= 2,
  );

  const candidates = contents
    .map((content) => {
      const contentDate = getContentDate(content);
      const latestInsight = getLatestInsight(content, insights);
      const daysAgo = contentDate ? (targetTime - new Date(contentDate).getTime()) / (1000 * 60 * 60 * 24) : 0;
      const score = latestInsight ? getReactionScore(latestInsight) : 0;
      const saves = latestInsight?.saves ?? 0;
      const comments = latestInsight?.comments ?? latestInsight?.replies ?? 0;
      const shares = latestInsight?.shares ?? latestInsight?.reposts ?? latestInsight?.quotes ?? 0;
      const topicMatchBonus = content.topic === missingTopic ? 12 : 0;
      const formatMatchBonus = normalizeContentType(content) === leastUsedFormat ? 8 : 0;
      const repeatedPenalty = repeatedTopic && content.topic === repeatedTopic ? 16 : 0;
      const weightedScore = score + saves * 2 + comments * 2 + shares * 2 + topicMatchBonus + formatMatchBonus - repeatedPenalty;

      return {
        content,
        score,
        weightedScore,
        daysAgo,
        reason:
          daysAgo >= 30 && score > 0
            ? "30일 이상 지난 고반응 게시물입니다."
            : saves > 0
              ? "저장 반응이 있어 다시 다듬어볼 만합니다."
              : content.topic === missingTopic
                ? "이번 달 부족한 주제와 연결됩니다."
                : "같은 메시지를 다른 형식으로 변주하기 좋습니다.",
        summary: `반응 ${score} · 저장 ${saves} · 댓글/공유 ${comments + shares}`,
      };
    })
    .filter((candidate) => candidate.daysAgo >= 30 || candidate.score > 0)
    .sort((first, second) => second.weightedScore - first.weightedScore);

  if (candidates.length === 0) {
    return [];
  }

  const rotateBy = new Date(dateKey).getDate() % candidates.length;
  return [...candidates.slice(rotateBy), ...candidates.slice(0, rotateBy)]
    .slice(0, 3)
    .map(({ content, score, reason, summary }) => ({ content, score, reason, summary }));
}

function getMultiUseDirection(content: ContentItem) {
  const contentType = normalizeContentType(content);

  if (content.platform === "instagram" && (content.format === "carousel" || contentType === "캐러셀")) {
    return {
      direction: "Threads 변환",
      platform: "Threads",
      suggestion: "핵심 문장 1~2개를 짧은 글로 옮겨보세요.",
    };
  }

  if (contentType === "긴글" || contentType === "에세이" || contentType === "산문") {
    return {
      direction: "짧은글 변환",
      platform: "Threads",
      suggestion: "긴 문장을 2~4문장으로 압축해보세요.",
    };
  }

  if (content.format === "reel" || contentType === "릴스/영상") {
    return {
      direction: "후기 글 변환",
      platform: "Threads",
      suggestion: "장면 뒤의 생각을 질문형 글로 풀어보세요.",
    };
  }

  if (content.platform === "threads") {
    return {
      direction: "이미지 캡션",
      platform: "Instagram",
      suggestion: "반응 좋았던 문장을 이미지 캡션으로 다시 써보세요.",
    };
  }

  return {
    direction: "짧은글 변환",
    platform: "Threads",
    suggestion: "고반응 메시지를 짧은 문장으로 바꿔보세요.",
  };
}

function getMultiUseCandidates(contents: ContentItem[], insights: InsightRecord[]) {
  return contents
    .map((content) => {
      const latestInsight = getLatestInsight(content, insights);
      const contentDate = getContentDate(content);
      const daysAgo = contentDate ? (Date.now() - new Date(contentDate).getTime()) / (1000 * 60 * 60 * 24) : 0;
      const score = latestInsight ? getReactionScore(latestInsight) : 0;
      const reusableFormat =
        content.format === "carousel" ||
        content.format === "reel" ||
        ["긴글", "에세이", "산문", "이미지+캡션", "캐러셀", "릴스/영상"].includes(normalizeContentType(content));
      const direction = getMultiUseDirection(content);
      const priority = score + (daysAgo >= 30 ? 20 : 0) + (reusableFormat ? 12 : 0);

      return {
        ...direction,
        content,
        score,
        priority,
        reason:
          score > 0
            ? "반응이 있는 게시물이라 다른 형식으로 다시 쓰기 좋습니다."
            : "형식 변환 여지가 있어 원소스 멀티유즈 후보로 볼 수 있습니다.",
      };
    })
    .filter((candidate) => candidate.score > 0 || candidate.priority >= 20)
    .sort((first, second) => second.priority - first.priority)
    .slice(0, 3);
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
  const [selectedDetailMode, setSelectedDetailMode] = useState<"post" | "improve" | null>(null);
  const [reminderModalContentId, setReminderModalContentId] = useState<string | null>(null);
  const [multiUseModalContentId, setMultiUseModalContentId] = useState<string | null>(null);
  const [isImproveModalOpen, setIsImproveModalOpen] = useState(false);
  const [isKeywordModalOpen, setIsKeywordModalOpen] = useState(false);
  const [activeJudgement, setActiveJudgement] = useState<JudgementKey>("today");
  const [selectedDecision, setSelectedDecision] = useState<DateRecommendation | null>(null);
  const [selectedDecisionList, setSelectedDecisionList] = useState<DateRecommendation[]>([]);
  const [reminderIndex, setReminderIndex] = useState(0);

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
  const monthlyOperationLevel = getMonthlyOperationLevel(publishedThisMonthCount);
  const monthlyOperationLabel: Record<MonthlyOperationLevel, string> = {
    low: "부족",
    minimum: "최소 유지",
    recommended: "권장 운영",
    active: "적극 운영",
    overloaded: "과다 가능성",
  };
  const missingTopic =
    defaultTopics.find((topic) => !monthContents.some((content) => (content.topic ?? "기타") === topic)) ??
    "기타";
  const formatUsage = contentTypes.map((contentType) => ({
    contentType,
    count: monthContents.filter((content) => normalizeContentType(content) === contentType).length,
  }));
  const leastUsedFormat =
    formatUsage.sort((first, second) => first.count - second.count)[0]?.contentType ?? "기타";
  const recentKeywords = getRecentKeywords(monthContents);
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
  const reminderCandidates = getReminderCandidates(
    filteredContents,
    insights,
    todayKey,
    missingTopic,
    leastUsedFormat,
  );
  const activeReminder = reminderCandidates[reminderIndex % Math.max(reminderCandidates.length, 1)];
  const activeReminderIndex = reminderCandidates.length > 0 ? reminderIndex % reminderCandidates.length : 0;
  const multiUseCandidates = getMultiUseCandidates(filteredContents, insights);
  const activeMultiUseCandidate = multiUseCandidates[0];
  const selectedContent = selectedContentId
    ? filteredContents.find((content) => content.id === selectedContentId)
    : undefined;
  const selectedContentInsight = selectedContent ? getLatestInsight(selectedContent, insights) : undefined;
  const reminderModalContent = reminderModalContentId
    ? filteredContents.find((content) => content.id === reminderModalContentId)
    : undefined;
  const reminderModalInsight = reminderModalContent ? getLatestInsight(reminderModalContent, insights) : undefined;
  const multiUseModalCandidate = multiUseModalContentId
    ? multiUseCandidates.find((candidate) => candidate.content.id === multiUseModalContentId) ??
      getMultiUseCandidates(
        filteredContents.filter((content) => content.id === multiUseModalContentId),
        insights,
      )[0]
    : undefined;

  useEffect(() => {
    if (reminderCandidates.length === 0) {
      setReminderIndex(0);
      return;
    }

    setReminderIndex((currentIndex) => currentIndex % reminderCandidates.length);
  }, [reminderCandidates.length]);

  useEffect(() => {
    if (reminderCandidates.length <= 1) {
      return;
    }

    const intervalId = window.setInterval(() => {
      setReminderIndex((currentIndex) => (currentIndex + 1) % reminderCandidates.length);
    }, 8000);

    return () => window.clearInterval(intervalId);
  }, [reminderCandidates.length]);

  const scoredFilteredContents = filteredContents.filter((content) => hasInsightRecord(content, insights));
  const averageFilteredScore =
    scoredFilteredContents.length > 0
      ? scoredFilteredContents.reduce((total, content) => total + getContentScore(content, insights), 0) /
        scoredFilteredContents.length
      : 0;
  const improveCandidates = scoredFilteredContents
    .map((content) => {
      const insight = getLatestInsight(content, insights);
      const score = getContentScore(content, insights);

      return {
        content,
        insight,
        score,
        metric: getImproveMetricLabel(insight),
        reason: getImproveReason(content, insight),
      };
    })
    .filter((candidate) => candidate.score < averageFilteredScore)
    .sort((first, second) => first.score - second.score)
    .slice(0, 6);
  const improveTarget = improveCandidates[0]?.content;
  const todayDirectionValue = todayItems.length > 0 ? "점검" : oldHighScoreContent ? "재활용" : "유지";
  const todayDirectionSummary =
    todayItems.length > 0 ? "올린 글의 반응을 확인하세요." : "새 글보다 흐름 점검이 좋습니다.";
  const keywordUsage = getKeywordUsage(monthContents);
  const maxKeywordUsage = Math.max(...keywordUsage.map((item) => item.count), 1);
  const recommendedKeywordUseCount = monthContents.filter((content) => {
    return (content.topic ?? "기타") === missingTopic || getContentKeywords(content).includes(missingTopic);
  }).length;
  const repeatedKeywords = recentKeywords.slice(0, 3);
  const relatedKeywordContents = filteredContents
    .filter((content) => {
      return (content.topic ?? "기타") === missingTopic || getContentKeywords(content).includes(missingTopic);
    })
    .sort((first, second) => new Date(getContentDate(second)).getTime() - new Date(getContentDate(first)).getTime())
    .slice(0, 3);
  const keywordActionLine = `${missingTopic}을 짧은 장면으로 써보세요.`;
  const keywordSummary = monthContents.some((content) => (content.topic ?? "기타") === missingTopic)
    ? `${missingTopic}을 다른 감정선으로 분산하세요.`
    : keywordActionLine;
  const improveSummary = improveTarget ? "반응 낮은 글을 다듬어보세요." : "개선 후보 없음";
  const judgementCards: Array<{
    key: JudgementKey;
    title: string;
    value: string | number;
    summary: string;
    detail: string;
  }> = [
    {
      key: "today",
      title: "오늘의 방향",
      value: todayDirectionValue,
      summary: todayDirectionSummary,
      detail:
        todayItems.length > 0
          ? "오늘은 새 게시보다 이미 올라간 글의 반응을 확인하는 날입니다."
          : "캘린더 뱃지와 리마인드만 보고 운영 방향을 정리하세요.",
    },
    {
      key: "recommend",
      title: "추천 키워드",
      value: missingTopic,
      summary: keywordSummary,
      detail: keywordActionLine,
    },
    {
      key: "improve",
      title: "개선 후보",
      value: improveCandidates.length,
      summary: improveSummary,
      detail: improveTarget
        ? `${normalizeContentType(improveTarget)} 형식의 첫 문장을 더 선명하게 다듬어보세요.`
        : "성과 기록이 더 쌓이면 표시됩니다.",
    },
  ];
  const visibleJudgementCards = judgementCards.filter((card) =>
    ["today", "recommend"].includes(card.key) || (card.key === "improve" && improveTarget),
  );
  const activeJudgementCard =
    judgementCards.find((card) => card.key === activeJudgement) ?? judgementCards[0];
  const selectedContentScore = selectedContentInsight ? getReactionScore(selectedContentInsight) : undefined;
  const selectedContentCopy =
    selectedContent?.caption ??
    selectedContent?.text ??
    selectedContent?.draftMemo ??
    "본문 미리보기가 없습니다.";
  const selectedContentResult = selectedContentInsight
    ? selectedContentInsight.saves
      ? "저장 반응 있음"
      : selectedContentInsight.comments || selectedContentInsight.replies
        ? "댓글 반응 있음"
        : "반응 확인"
    : "데이터 부족";
  const selectedContentFixPoint = selectedContentInsight
    ? selectedContentInsight.saves
      ? "저장 포인트 유지"
      : "저장 유도 보강"
    : "성과 기록 필요";
  const selectedContentMetricLabel = selectedContentInsight
    ? selectedContentInsight.saves
      ? `저장 ${selectedContentInsight.saves}`
      : selectedContentInsight.comments || selectedContentInsight.replies
        ? `댓글 ${selectedContentInsight.comments ?? selectedContentInsight.replies}`
        : `반응 ${selectedContentScore}`
    : "성과 기록 없음";
  const selectedContentKeywordLabel = selectedContent
    ? `${selectedContent.topic ?? "기타"} · ${normalizeContentType(selectedContent)}`
    : "";
  const selectedDecisionAction = selectedDecision ? getCalendarBadgeLabel(selectedDecision) : "";
  const selectedDecisionProposal = selectedDecision
    ? selectedDecision.type === "휴식"
      ? "흐름 점검하기"
      : selectedDecision.type === "재활용"
        ? "다른 감정선으로 변주"
        : `${selectedDecision.topic}을 ${selectedDecision.format}로`
    : "";

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
    setSelectedDetailMode("post");
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
        <aside className="operation-panel" aria-label="Operation panel">
        <div className="home-mini-grid judgement-card-grid">
          {visibleJudgementCards.map((card) => (
            <button
              className={`panel-card home-mini-card judgement-card${
                activeJudgement === card.key ? " judgement-card--active" : ""
              }`}
              key={card.key}
              type="button"
              onClick={() => {
                setActiveJudgement(card.key);
                if (card.key === "improve") {
                  setIsImproveModalOpen(true);
                } else if (card.key === "recommend") {
                  setIsKeywordModalOpen(true);
                  setSelectedContentId(null);
                  setSelectedDetailMode(null);
                } else {
                  setSelectedContentId(null);
                  setSelectedDetailMode(null);
                }
                setSelectedDecision(null);
                setSelectedDecisionList([]);
              }}
            >
              <span>{card.title}</span>
              <strong>{card.value}</strong>
              <p>{card.summary}</p>
            </button>
          ))}
        </div>

        <article className="panel-card panel-card--wide flow-summary-card">
          <div className="active-judgement-detail">
            {selectedContent ? (
              <>
                <span>선택한 게시물</span>
                <strong>{selectedContent.title}</strong>
                <p>
                  {selectedContent.caption ??
                    selectedContent.text ??
                    selectedContent.draftMemo ??
                    "본문 미리보기가 없습니다."}
                </p>
                <div className="keyword-row">
                  <b>{accountMap.get(selectedContent.accountId)?.displayName ?? "계정 없음"}</b>
                  <b>{selectedContent.topic ?? "기타"}</b>
                  <b>{normalizeContentType(selectedContent)}</b>
                  <b>반응 점수 {selectedContentInsight ? getReactionScore(selectedContentInsight) : "-"}</b>
                </div>
              </>
            ) : selectedDecision ? (
              <>
                <span>{selectedDecision.type}</span>
                <strong>{selectedDecision.title}</strong>
                <p>{selectedDecision.reason}</p>
                <div className="keyword-row">
                  <b>{selectedDate}</b>
                  <b>{selectedDecision.topic}</b>
                  <b>{selectedDecision.format}</b>
                </div>
                <p>{selectedDecision.expectedEffect}</p>
              </>
            ) : (
              <>
                <span>{activeJudgementCard.title}</span>
                <strong>{activeJudgementCard.summary}</strong>
                <p>{activeJudgementCard.detail}</p>
              </>
            )}
          </div>
        </article>

        <button
          className="panel-card multiuse-card"
          type="button"
          disabled={!activeMultiUseCandidate}
          onClick={() => {
            if (activeMultiUseCandidate) {
              setMultiUseModalContentId(activeMultiUseCandidate.content.id);
            }
          }}
        >
          <span>멀티유즈 후보</span>
          <strong>{activeMultiUseCandidate?.direction ?? "후보 없음"}</strong>
          <p>
            {activeMultiUseCandidate?.suggestion ??
              "성과가 쌓이면 다른 플랫폼이나 형식으로 다시 쓸 후보를 보여줍니다."}
          </p>
          {activeMultiUseCandidate && (
            <div className="keyword-row">
              <b>{activeMultiUseCandidate.platform}</b>
              <b>{normalizeContentType(activeMultiUseCandidate.content)}</b>
              <b>{activeMultiUseCandidate.content.topic ?? "기타"}</b>
            </div>
          )}
        </button>

        <article className="panel-card today-reminder-card">
          <div className="card-heading reminder-summary-card">
            <div className="reminder-summary-copy">
              <h3>리마인드</h3>
            </div>
          </div>
          {activeReminder ? (
            <div className="reminder-slide" style={{ display: "flex", flexDirection: "column", gap: "10px", maxHeight: "none" }}>
              <div
                className="reminder-hero-visual"
                key={activeReminder.content.id}
                style={{
                  display: "block",
                  width: "100%",
                  aspectRatio: "1 / 1",
                  borderRadius: "18px",
                  overflow: "hidden",
                  background: "rgba(94, 92, 230, 0.12)",
                  cursor: "pointer",
                }}
                onClick={() => setReminderModalContentId(activeReminder.content.id)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    setReminderModalContentId(activeReminder.content.id);
                  }
                }}
                role="button"
                tabIndex={0}
              >
                {activeReminder.content.externalThumbnailUrl ? (
                  <img src={activeReminder.content.externalThumbnailUrl} alt="" />
                ) : (
                  <span>{platformLabels[activeReminder.content.platform]}</span>
                )}
              </div>
              <div className="reminder-dots">
                {reminderCandidates.map((candidate, index) => (
                  <button
                    aria-label={`${index + 1}번째 리마인드`}
                    className={index === activeReminderIndex ? "is-active" : ""}
                    key={candidate.content.id}
                    type="button"
                    onClick={() => setReminderIndex(index)}
                  />
                ))}
              </div>
            </div>
          ) : (
            <p className="empty-copy">아직 다시 꺼내볼 만한 과거 게시물이 없습니다.</p>
          )}
        </article>

        </aside>

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
                  className={`calendar-cell ${day.isBlank ? "calendar-cell--blank" : ""}${
                    day.dateKey === todayKey ? " calendar-cell--today" : ""
                  }`}
                  key={day.dateKey}
                  onClick={() => {
                    if (!day.isBlank) {
                      const dayRecommendations = getCalendarRecommendations(
                        day.dateKey,
                        missingTopic,
                        leastUsedFormat,
                        recentKeywords,
                        oldHighScoreContent,
                        filteredContents,
                        insights,
                      );
                      setSelectedDate(day.dateKey);
                      setSelectedContentId(null);
                      setSelectedDetailMode(null);
                      setSelectedDecision(dayRecommendations[0] ?? null);
                      setSelectedDecisionList(dayRecommendations);
                    }
                  }}
                  role={day.isBlank ? undefined : "button"}
                  tabIndex={day.isBlank ? undefined : 0}
                >
                  {!day.isBlank && (
                    <span className="calendar-day">
                      {day.day}
                      {day.dateKey === todayKey && <small>오늘</small>}
                    </span>
                  )}
                  <div className="calendar-badge-stack">
                    {dayContents.length === 0 && !day.isBlank && (() => {
                      const dayRecommendations = getCalendarRecommendations(
                        day.dateKey,
                        missingTopic,
                        leastUsedFormat,
                        recentKeywords,
                        oldHighScoreContent,
                        filteredContents,
                        insights,
                      );
                      const visibleRecommendations = dayRecommendations.slice(0, 2);
                      const hiddenCount = Math.max(0, dayRecommendations.length - visibleRecommendations.length);

                      return (
                        <>
                          {visibleRecommendations.map((dayRecommendation) => (
                            <button
                              className={`calendar-recommendation-chip calendar-recommendation-chip--${dayRecommendation.type} calendar-recommendation-chip--${getCalendarBadgeLabel(dayRecommendation)}${
                                selectedDate === day.dateKey && selectedDecision?.title === dayRecommendation.title
                                  ? " calendar-recommendation-chip--selected"
                                  : ""
                              }`}
                              key={dayRecommendation.title}
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation();
                                setSelectedDate(day.dateKey);
                                setSelectedContentId(null);
                                setSelectedDetailMode(null);
                                setSelectedDecision(dayRecommendation);
                                setSelectedDecisionList(dayRecommendations);
                              }}
                            >
                              {getCalendarBadgeLabel(dayRecommendation)}
                            </button>
                          ))}
                          {hiddenCount > 0 && (
                            <button
                              className="calendar-recommendation-chip calendar-recommendation-chip--more"
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation();
                                setSelectedDate(day.dateKey);
                                setSelectedContentId(null);
                                setSelectedDetailMode(null);
                                setSelectedDecision(dayRecommendations[0]);
                                setSelectedDecisionList(dayRecommendations);
                              }}
                            >
                              +{hiddenCount}
                            </button>
                          )}
                        </>
                      );
                    })()}
                    {dayContents.map((content) => (
                      <button
                        className={`calendar-content-card${
                          selectedContentId === content.id ? " calendar-content-card--selected" : ""
                        }`}
                        key={content.id}
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          setSelectedDate(getContentDate(content) || day.dateKey);
                          setSelectedContentId(content.id);
                          setSelectedDetailMode("post");
                          setSelectedDecision(null);
                          setSelectedDecisionList([]);
                        }}
                      >
                        <span>
                          {content.platform === "instagram"
                            ? "IG"
                            : content.platform === "threads"
                              ? "TH"
                              : platformLabels[content.platform]}
                        </span>
                        <strong>{content.title}</strong>
                        <small>
                          {accountMap.get(content.accountId)?.displayName ?? "계정 없음"} ·{" "}
                          {statusLabels[content.status]} · {normalizeContentType(content)} ·{" "}
                          {content.topic ?? "기타"}
                        </small>
                        <span className="calendar-hover-preview">
                          <b>{content.title}</b>
                          <em>{content.caption ?? content.text ?? content.draftMemo ?? "본문 미리보기 없음"}</em>
                          <em>
                            {platformLabels[content.platform]} · {normalizeContentType(content)} ·{" "}
                            {content.topic ?? "기타"}
                          </em>
                          <em>{getContentKeywords(content).join(", ") || "키워드 없음"}</em>
                          <em>{hasInsightRecord(content, insights) ? "인사이트 있음" : "인사이트 없음"}</em>
                        </span>
                      </button>
                    ))}
                  </div>
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
              <h3>
                {selectedContent
                  ? selectedDetailMode === "improve"
                    ? "개선 후보"
                    : "게시물 결과"
                  : selectedDecision
                    ? "운영 판단"
                    : "운영 판단"}
              </h3>
              <p>
                {selectedContent
                  ? selectedDetailMode === "improve"
                    ? "다듬을 게시물과 이유를 확인합니다."
                    : "게시물 성과와 보완점을 확인합니다."
                  : selectedDecision
                    ? "추천 뱃지의 판단 근거입니다."
                    : "날짜나 뱃지를 누르면 판단 근거를 확인할 수 있습니다."}
              </p>
            </div>
            <span className="badge">{selectedContent ? "게시물" : selectedDecision ? selectedDecision.type : selectedDate}</span>
          </div>

          {selectedContent ? (
            <>
              <div className="operation-judgement-grid">
                {selectedDetailMode === "improve" ? (
                  <>
                    <div className="operation-judgement-card">
                      <span>대상 게시물</span>
                      <strong>{selectedContent.title}</strong>
                      <p>{selectedContentKeywordLabel}</p>
                    </div>
                    <div className="operation-judgement-card">
                      <span>낮은 지표</span>
                      <strong>{selectedContentMetricLabel}</strong>
                      <p>{selectedContentInsight ? "저장과 댓글을 봅니다." : "성과 입력 후 판단합니다."}</p>
                    </div>
                    <div className="operation-judgement-card">
                      <span>개선 이유</span>
                      <strong>첫 문장</strong>
                      <p>저장할 이유를 앞에 둡니다.</p>
                    </div>
                    <div className="operation-judgement-card">
                      <span>다음 보완점</span>
                      <strong>{selectedContentFixPoint}</strong>
                      <p>첫 문장을 더 선명하게.</p>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="operation-judgement-card">
                      <span>인사이트</span>
                      <strong>{selectedContentInsight ? `반응 ${selectedContentScore}` : "성과 기록 없음"}</strong>
                      <p>저장/댓글/공유를 봅니다.</p>
                    </div>
                    <div className="operation-judgement-card">
                      <span>결과 해석</span>
                      <strong>{selectedContentResult}</strong>
                      <p>핵심 반응만 표시합니다.</p>
                    </div>
                    <div className="operation-judgement-card">
                      <span>보완점</span>
                      <strong>{selectedContentFixPoint}</strong>
                      <p>다음 글에 반영합니다.</p>
                    </div>
                    <div className="operation-judgement-card">
                      <span>키워드/형식</span>
                      <strong>{selectedContent.topic ?? "기타"}</strong>
                      <p>{normalizeContentType(selectedContent)}</p>
                    </div>
                  </>
                )}
              </div>

              <div className="selected-content-detail">
                <div className="content-thumbnail">
                  {selectedContent.externalThumbnailUrl ? (
                    <img src={selectedContent.externalThumbnailUrl} alt="" />
                  ) : (
                    <span>{platformLabels[selectedContent.platform]}</span>
                  )}
                </div>
                <div className="selected-content-copy">
                  <span className="badge">
                    {selectedDetailMode === "improve" ? "개선 대상" : platformLabels[selectedContent.platform]}
                  </span>
                  <h3>{selectedContent.title}</h3>
                  <p>{selectedContentCopy}</p>
                  <div className="insight-summary-row">
                    <span>반응 {selectedContentInsight ? getReactionScore(selectedContentInsight) : "-"}</span>
                    <span>도달 {selectedContentInsight?.reach ?? "-"}</span>
                    <span>좋아요 {selectedContentInsight?.likes ?? "-"}</span>
                    <span>댓글 {selectedContentInsight?.comments ?? selectedContentInsight?.replies ?? "-"}</span>
                    <span>저장 {selectedContentInsight?.saves ?? "-"}</span>
                    <span>공유 {selectedContentInsight?.shares ?? selectedContentInsight?.reposts ?? "-"}</span>
                  </div>
                  <div className="keyword-row">
                    <b>{accountMap.get(selectedContent.accountId)?.displayName ?? "계정 없음"}</b>
                    <b>{selectedContent.publishedDate ?? selectedContent.plannedDate ?? "날짜 없음"}</b>
                    <b>{normalizeContentType(selectedContent)}</b>
                    <b>{selectedContent.topic ?? "기타"}</b>
                    {getContentKeywords(selectedContent).slice(0, 3).map((keyword) => (
                      <b key={keyword}>{keyword}</b>
                    ))}
                  </div>
                  <div className="account-card__actions">
                    <button className="secondary-button" type="button" onClick={() => handleEdit(selectedContent)}>
                      수정
                    </button>
                    <button className="danger-button" type="button" onClick={() => handleDelete(selectedContent.id)}>
                      삭제
                    </button>
                  </div>
                </div>
              </div>
            </>
          ) : selectedDecision ? (
            <>
              <div className="operation-judgement-grid">
                <div className="operation-judgement-card">
                  <span>추천 내용</span>
                  <strong>{selectedDecisionAction}</strong>
                  <p>오늘 실행할 형식입니다.</p>
                </div>
                <div className="operation-judgement-card">
                  <span>추천 키워드</span>
                  <strong>{selectedDecision.topic}</strong>
                  <p>오늘 쓸 감정선입니다.</p>
                </div>
                <div className="operation-judgement-card">
                  <span>기준</span>
                  <strong>{selectedDecision.basis}</strong>
                  <p>월간 흐름 기준입니다.</p>
                </div>
                <div className="operation-judgement-card">
                  <span>제안</span>
                  <strong>{selectedDecisionProposal}</strong>
                  <p>바로 실행할 방향입니다.</p>
                </div>
              </div>

              <div className="selected-decision-detail">
                <span className={`calendar-recommendation-chip calendar-recommendation-chip--${selectedDecision.type}`}>
                  {selectedDecision.type}
                </span>
                <h3>{selectedDecision.title}</h3>
                <p>{selectedDecision.reason}</p>
                <div className="decision-detail-grid">
                  <div>
                    <span>추천 내용</span>
                    <strong>{selectedDecisionAction}</strong>
                  </div>
                  <div>
                    <span>추천 키워드</span>
                    <strong>{selectedDecision.topic}</strong>
                  </div>
                  <div>
                    <span>기준</span>
                    <strong>{selectedDecision.basis}</strong>
                  </div>
                  <div>
                    <span>제안</span>
                    <strong>{selectedDecisionProposal}</strong>
                  </div>
                </div>
                <div className="keyword-row">
                  {selectedDecision.tags.slice(0, 5).map((tag) => (
                    <b key={tag}>{tag}</b>
                  ))}
                </div>
                {selectedDecisionList.length > 1 && (
                  <div className="same-day-recommendations">
                    <span>같은 날짜의 다른 추천</span>
                    {selectedDecisionList.map((recommendation) => (
                      <button
                        className={`calendar-recommendation-chip calendar-recommendation-chip--${recommendation.type}`}
                        key={recommendation.title}
                        type="button"
                        onClick={() => setSelectedDecision(recommendation)}
                      >
                        {getCalendarBadgeLabel(recommendation)}
                      </button>
                    ))}
                  </div>
                )}
                <p className="decision-caution">{selectedDecision.caution}</p>
                {oldHighScoreContent && selectedDecision.type === "재활용" && (
                  <div className="date-content-card">
                    <strong>{oldHighScoreContent.title}</strong>
                    <p>참고할 과거 게시물 · 반응 점수 {getContentScore(oldHighScoreContent, insights)}</p>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="selected-decision-detail selected-decision-detail--empty">
              <h3>운영 판단</h3>
              <p>날짜나 뱃지를 누르면 판단 근거를 확인할 수 있습니다.</p>
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
      {reminderModalContent && (
        <div className="modal-backdrop reminder-modal-backdrop" role="dialog" aria-modal="true">
          <article className="panel-card reminder-modal-card">
            <div className="card-heading">
              <div>
                <h3>리마인드 상세</h3>
                <p>다시 꺼내볼 만한 이유를 확인합니다.</p>
              </div>
              <button
                className="secondary-button"
                type="button"
                onClick={() => setReminderModalContentId(null)}
              >
                닫기
              </button>
            </div>
            <div className="selected-content-detail">
              <div className="content-thumbnail">
                {reminderModalContent.externalThumbnailUrl ? (
                  <img src={reminderModalContent.externalThumbnailUrl} alt="" />
                ) : (
                  <span>{platformLabels[reminderModalContent.platform]}</span>
                )}
              </div>
              <div className="selected-content-copy">
                <span className="badge">{platformLabels[reminderModalContent.platform]}</span>
                <h3>{reminderModalContent.title}</h3>
                <p>
                  {reminderModalContent.caption ??
                    reminderModalContent.text ??
                    reminderModalContent.draftMemo ??
                    "본문 미리보기가 없습니다."}
                </p>
                <div className="keyword-row">
                  <b>{reminderModalContent.publishedDate ?? reminderModalContent.plannedDate ?? "날짜 없음"}</b>
                  <b>{normalizeContentType(reminderModalContent)}</b>
                  <b>{reminderModalContent.topic ?? "기타"}</b>
                  {getContentKeywords(reminderModalContent).slice(0, 3).map((keyword) => (
                    <b key={keyword}>{keyword}</b>
                  ))}
                </div>
                <div className="insight-summary-row">
                  <span>반응 {reminderModalInsight ? getReactionScore(reminderModalInsight) : "-"}</span>
                  <span>도달 {reminderModalInsight?.reach ?? "-"}</span>
                  <span>저장 {reminderModalInsight?.saves ?? "-"}</span>
                  <span>댓글 {reminderModalInsight?.comments ?? reminderModalInsight?.replies ?? "-"}</span>
                  <span>공유 {reminderModalInsight?.shares ?? reminderModalInsight?.reposts ?? "-"}</span>
                </div>
                <p className="decision-caution">
                  30일 이상 지난 게시물 중 반응 흐름과 이번 달 부족한 주제를 함께 보고 고른 후보입니다.
                </p>
              </div>
            </div>
          </article>
        </div>
      )}
      {multiUseModalCandidate && (
        <div className="modal-backdrop reminder-modal-backdrop" role="dialog" aria-modal="true">
          <article className="panel-card reminder-modal-card">
            <div className="card-heading">
              <div>
                <h3>멀티유즈 후보</h3>
                <p>이미 올린 게시물을 다른 형식으로 다시 쓰는 방향입니다.</p>
              </div>
              <button className="secondary-button" type="button" onClick={() => setMultiUseModalContentId(null)}>
                닫기
              </button>
            </div>
            <div className="selected-content-detail">
              <div className="content-thumbnail">
                {multiUseModalCandidate.content.externalThumbnailUrl ? (
                  <img src={multiUseModalCandidate.content.externalThumbnailUrl} alt="" />
                ) : (
                  <span>{platformLabels[multiUseModalCandidate.content.platform]}</span>
                )}
              </div>
              <div className="selected-content-copy">
                <span className="badge">{multiUseModalCandidate.direction}</span>
                <h3>{multiUseModalCandidate.content.title}</h3>
                <p>
                  {multiUseModalCandidate.content.caption ??
                    multiUseModalCandidate.content.text ??
                    multiUseModalCandidate.content.draftMemo ??
                    "본문 미리보기가 없습니다."}
                </p>
                <div className="decision-detail-grid">
                  <div className="operation-judgement-card">
                    <span>추천 플랫폼</span>
                    <strong>{multiUseModalCandidate.platform}</strong>
                    <p>{multiUseModalCandidate.suggestion}</p>
                  </div>
                  <div className="operation-judgement-card">
                    <span>왜 다시 쓸까</span>
                    <strong>반응 {multiUseModalCandidate.score}</strong>
                    <p>{multiUseModalCandidate.reason}</p>
                  </div>
                  <div className="operation-judgement-card">
                    <span>한 줄 실행</span>
                    <strong>{normalizeContentType(multiUseModalCandidate.content)}</strong>
                    <p>{multiUseModalCandidate.suggestion}</p>
                  </div>
                </div>
              </div>
            </div>
          </article>
        </div>
      )}
      {isImproveModalOpen && (
        <div className="modal-backdrop reminder-modal-backdrop" role="dialog" aria-modal="true">
          <article className="panel-card reminder-modal-card insight-modal-card">
            <div className="card-heading">
              <div>
                <h3>개선 후보 목록</h3>
                <p>평균보다 낮은 반응과 저장/공유 흐름을 함께 봅니다.</p>
              </div>
              <button className="secondary-button" type="button" onClick={() => setIsImproveModalOpen(false)}>
                닫기
              </button>
            </div>
            <div className="criteria-list">
              <span>평균보다 반응 점수가 낮음</span>
              <span>저장/공유가 낮음</span>
              <span>같은 형식 반복 가능성</span>
              <span>첫 문장 개선 여지</span>
            </div>
            {improveCandidates.length > 0 ? (
              <div className="insight-modal-list">
                {improveCandidates.map((candidate) => (
                  <button
                    className="insight-list-button"
                    key={candidate.content.id}
                    type="button"
                    onClick={() => {
                      setSelectedContentId(candidate.content.id);
                      setSelectedDetailMode("improve");
                      setSelectedDecision(null);
                      setSelectedDecisionList([]);
                      setActiveJudgement("improve");
                      setSelectedDate(getContentDate(candidate.content) || selectedDate);
                      setIsImproveModalOpen(false);
                    }}
                  >
                    <div>
                      <strong>{candidate.content.title}</strong>
                      <p>{candidate.reason}</p>
                    </div>
                    <div className="keyword-row">
                      <b>{candidate.content.publishedDate ?? candidate.content.plannedDate ?? "날짜 없음"}</b>
                      <b>{platformLabels[candidate.content.platform]}</b>
                      <b>{normalizeContentType(candidate.content)}</b>
                      <b>{candidate.metric}</b>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <p className="empty-copy">현재 개선 후보가 없습니다. 성과 기록이 쌓이면 다시 확인하세요.</p>
            )}
          </article>
        </div>
      )}
      {isKeywordModalOpen && (
        <div className="modal-backdrop reminder-modal-backdrop" role="dialog" aria-modal="true">
          <article className="panel-card reminder-modal-card insight-modal-card">
            <div className="card-heading">
              <div>
                <h3>추천 키워드 근거</h3>
                <p>{keywordActionLine}</p>
              </div>
              <button className="secondary-button" type="button" onClick={() => setIsKeywordModalOpen(false)}>
                닫기
              </button>
            </div>
            <div className="decision-detail-grid">
              <div className="operation-judgement-card">
                <span>추천 키워드</span>
                <strong>{missingTopic}</strong>
                <p>오늘 쓸 감정선입니다.</p>
              </div>
              <div className="operation-judgement-card">
                <span>이번 달 사용</span>
                <strong>{recommendedKeywordUseCount}회</strong>
                <p>월간 콘텐츠 기준입니다.</p>
              </div>
              <div className="operation-judgement-card">
                <span>최근 반복</span>
                <strong>{repeatedKeywords.join(" · ") || "없음"}</strong>
                <p>분산할 키워드입니다.</p>
              </div>
              <div className="operation-judgement-card">
                <span>부족한 키워드</span>
                <strong>{missingTopic}</strong>
                <p>이번 주 보강 후보입니다.</p>
              </div>
            </div>
            {keywordUsage.length > 0 ? (
              <div className="keyword-distribution">
                {keywordUsage.map((item) => (
                  <div className={`keyword-bar-row${item.keyword === missingTopic ? " is-recommended" : ""}`} key={item.keyword}>
                    <span>{item.keyword}</span>
                    <div className="keyword-bar-track" aria-hidden="true">
                      <i style={{ width: `${Math.max(8, (item.count / maxKeywordUsage) * 100)}%` }} />
                    </div>
                    <b>{item.count}</b>
                  </div>
                ))}
              </div>
            ) : (
              <p className="empty-copy">이번 달 키워드 데이터가 아직 없습니다.</p>
            )}
            <div className="related-content-list">
              <span>관련 과거 게시물</span>
              {relatedKeywordContents.length > 0 ? (
                relatedKeywordContents.map((content) => (
                  <button
                    className="date-content-card"
                    key={content.id}
                    type="button"
                    onClick={() => {
                      setSelectedContentId(content.id);
                      setSelectedDetailMode("post");
                      setSelectedDecision(null);
                      setSelectedDecisionList([]);
                      setIsKeywordModalOpen(false);
                    }}
                  >
                    <strong>{content.title}</strong>
                    <p>
                      {content.publishedDate ?? content.plannedDate ?? "날짜 없음"} · {normalizeContentType(content)}
                    </p>
                  </button>
                ))
              ) : (
                <p className="empty-copy">관련 과거 게시물이 아직 없습니다.</p>
              )}
            </div>
          </article>
        </div>
      )}
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
