import type { ContentItem, TaxonomySettings } from "../types/models";

export const defaultManagedKeywords = [
  "행복",
  "슬픔",
  "외로움",
  "불안",
  "평온",
  "설렘",
  "그리움",
  "미안함",
  "고마움",
  "따뜻함",
  "피로",
  "회복",
  "위로",
  "응원",
  "용기",
  "사랑",
  "마음",
  "가족",
  "결혼",
  "배우자",
  "연인",
  "친구",
  "부모",
  "동료",
  "관계",
  "거리감",
  "이해",
  "다정함",
  "지지",
  "함께",
  "성장",
  "회고",
  "기록",
  "일상",
  "휴식",
  "루틴",
  "변화",
  "선택",
  "시작",
  "실패",
  "도전",
  "버티기",
  "자존감",
  "균형",
  "집중",
  "내려놓음",
  "창작",
  "글쓰기",
  "작업",
  "사진",
  "산문",
  "에세이",
  "아이디어",
  "영감",
  "과정",
  "결과",
  "몰입",
  "표현",
  "공감",
  "공유",
  "저장",
  "질문",
  "고백",
  "선언",
  "안내",
  "공지",
  "후기",
  "감사",
  "추천",
  "기타",
];

export const defaultContentTopics = [
  "가족",
  "결혼/관계",
  "마음",
  "위로/응원",
  "성장",
  "회고",
  "일상",
  "휴식",
  "창작",
  "글쓰기",
  "사진",
  "공지",
  "후기",
  "기타",
];

export const defaultContentTypes = [
  "짧은글",
  "긴글",
  "산문",
  "에세이",
  "사진+글",
  "이미지만",
  "이미지+캡션",
  "캐러셀",
  "릴스/영상",
  "Threads",
  "질문형",
  "고백형",
  "회고형",
  "공지형",
  "기타",
];

export const defaultRecommendationTags = [
  "추천-짧은글",
  "추천-긴글",
  "추천-사진+글",
  "추천-이미지+캡션",
  "추천-Threads",
  "개선-캐러셀",
  "개선-릴스/영상",
  "개선-이미지+캡션",
  "재활용-결혼/관계",
  "재활용-위로",
  "재활용-성장",
  "재활용-마음",
  "휴식",
  "리듬조정",
  "주제전환",
];

export const defaultStopWords = [
  "안녕하세요",
  "오랜만입니다",
  "다들",
  "그동안",
  "그리고",
  "하지만",
  "그래서",
  "오늘",
  "이번",
  "있는",
  "없는",
  "하는",
  "했다",
  "합니다",
  "입니다",
  "있습니다",
  "같은",
  "그런",
  "이런",
  "저런",
  "조금",
  "많이",
  "그냥",
  "정말",
  "너무",
  "약간",
  "다시",
  "소파",
  "우산",
  "문",
  "밥",
  "책상",
];

export const taxonomyStorageKey = "content-dashboard.taxonomy";
export const excludedKeywordFragments = defaultStopWords;

export const defaultTaxonomySettings: TaxonomySettings = {
  managedKeywords: defaultManagedKeywords,
  contentTopics: defaultContentTopics,
  contentTypes: defaultContentTypes,
  recommendationTags: defaultRecommendationTags,
  stopWords: defaultStopWords,
};

function canUseLocalStorage() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function uniqueValues(values: string[]) {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
}

export function loadTaxonomySettings(): TaxonomySettings {
  if (!canUseLocalStorage()) {
    return defaultTaxonomySettings;
  }

  const rawValue = window.localStorage.getItem(taxonomyStorageKey);

  if (!rawValue) {
    return defaultTaxonomySettings;
  }

  try {
    const parsedValue = JSON.parse(rawValue) as Partial<TaxonomySettings>;

    return {
      managedKeywords: uniqueValues(parsedValue.managedKeywords ?? defaultManagedKeywords),
      contentTopics: uniqueValues(parsedValue.contentTopics ?? defaultContentTopics),
      contentTypes: uniqueValues(parsedValue.contentTypes ?? defaultContentTypes),
      recommendationTags: uniqueValues(parsedValue.recommendationTags ?? defaultRecommendationTags),
      stopWords: uniqueValues(parsedValue.stopWords ?? defaultStopWords),
      updatedAt: parsedValue.updatedAt,
    };
  } catch {
    return defaultTaxonomySettings;
  }
}

export function saveTaxonomySettings(settings: TaxonomySettings) {
  if (!canUseLocalStorage()) {
    return;
  }

  window.localStorage.setItem(taxonomyStorageKey, JSON.stringify(settings));
}

export function getActiveManagedKeywords() {
  return loadTaxonomySettings().managedKeywords;
}

export function getActiveContentTopics() {
  return loadTaxonomySettings().contentTopics;
}

export function getActiveContentTypes() {
  return loadTaxonomySettings().contentTypes;
}

export function getActiveRecommendationTags() {
  return loadTaxonomySettings().recommendationTags;
}

export function getActiveStopWords() {
  return loadTaxonomySettings().stopWords;
}

export const managedKeywords = defaultManagedKeywords;
export const contentTopics = defaultContentTopics;
export const contentTypes = defaultContentTypes;

export function getContentText(content: Pick<ContentItem, "title" | "topic" | "caption" | "text" | "draftMemo" | "retrospective">) {
  return [content.title, content.topic, content.caption, content.text, content.draftMemo, content.retrospective]
    .filter(Boolean)
    .join(" ");
}

export function inferManagedKeywordsFromText(
  text: string,
  keywordDictionary = getActiveManagedKeywords(),
  stopWords = getActiveStopWords(),
) {
  const normalizedText = text.toLowerCase();
  const matchedKeywords = keywordDictionary.filter((keyword) => {
    if (keyword === "기타" || stopWords.includes(keyword)) {
      return false;
    }

    return normalizedText.includes(keyword.toLowerCase());
  });

  return matchedKeywords.length > 0 ? matchedKeywords : ["기타"];
}

export function getManagedKeywords(content: ContentItem) {
  const keywordDictionary = getActiveManagedKeywords();
  const stopWords = getActiveStopWords();
  const selectedKeywords =
    content.topicKeywords?.filter(
      (keyword) => keywordDictionary.includes(keyword) && !stopWords.includes(keyword),
    ) ?? [];
  const customKeywords =
    content.customKeywords?.filter((keyword) => keyword.trim().length > 0 && !stopWords.includes(keyword)) ?? [];
  const inferredKeywords =
    selectedKeywords.length > 0
      ? selectedKeywords
      : inferManagedKeywordsFromText(getContentText(content), keywordDictionary, stopWords);

  return Array.from(new Set([...inferredKeywords, ...customKeywords])).slice(0, 8);
}

export function normalizeContentType(content: ContentItem) {
  const contentTypeDictionary = getActiveContentTypes();

  if (content.contentType && contentTypeDictionary.includes(content.contentType)) {
    return content.contentType;
  }

  if (content.platform === "threads" || content.format === "thread") {
    return "Threads";
  }

  if (content.format === "carousel") {
    return "캐러셀";
  }

  if (content.format === "reel") {
    return "릴스/영상";
  }

  if (content.format === "post") {
    return "이미지+캡션";
  }

  if (content.format === "article") {
    return "긴글";
  }

  return "기타";
}
