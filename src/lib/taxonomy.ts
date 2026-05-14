import type { ContentItem, TaxonomySettings } from "../types/models";

export const defaultManagedKeywords = [
  "가족",
  "사랑",
  "마음",
  "생각",
  "기분",
  "관계",
  "슬픔",
  "행복",
  "절망",
  "응원",
  "결혼",
  "일상",
  "기억",
  "공간",
  "산책",
  "글쓰기",
  "사진",
  "계절",
  "시간",
  "감정",
  "불안",
  "위로",
  "성장",
  "선택",
  "쉼",
  "반복",
  "시선",
  "장면",
  "여행",
  "거리",
  "말",
  "침묵",
  "후회",
  "기대",
  "외로움",
  "다정",
  "서운함",
  "용기",
  "흔들림",
  "회복",
  "기타",
];

export const defaultContentTopics = [
  "가족과 생활",
  "부부/관계",
  "마음과 감정",
  "생각의 변화",
  "슬픔과 회복",
  "행복의 감각",
  "응원과 용기",
  "일상 관찰",
  "산책과 계절",
  "공간과 기억",
  "사진과 기록",
  "글쓰기 과정",
  "기억과 시간",
  "여행과 장소",
  "말과 침묵",
  "자기 이해",
  "콘텐츠 운영",
];

export const defaultContentTypes = [
  "짧은글",
  "긴글",
  "이미지",
  "이미지_캡션",
  "글이미지",
  "캐러셀",
  "릴스",
  "Threads",
  "재활용",
  "멀티유즈",
  "휴식",
  "개선",
];

export const defaultRecommendationTags = [
  "가족",
  "관계",
  "생활",
  "기억",
  "마음",
  "사랑",
  "다정",
  "서운함",
  "생각",
  "선택",
  "후회",
  "기대",
  "시선",
  "감정",
  "흔들림",
  "회복",
  "일상",
  "계절",
  "쉼",
  "슬픔",
  "외로움",
  "시간",
  "절망",
  "불안",
  "용기",
  "응원",
  "성장",
  "공간",
  "장면",
  "거리",
  "산책",
  "글쓰기",
  "문장",
  "기록",
  "사진",
  "짧은글",
  "긴글",
  "이미지_캡션",
  "글이미지",
  "캐러셀",
  "릴스",
  "Threads",
  "재활용",
  "멀티유즈",
  "개선",
  "휴식",
];

export const defaultRecommendationTagSuggestions: Record<string, string[]> = {
  가족: ["가족", "관계", "생활", "기억", "마음"],
  사랑: ["사랑", "관계", "다정", "서운함", "마음"],
  마음: ["마음", "감정", "생각", "흔들림", "회복"],
  생각: ["생각", "선택", "후회", "기대", "시선"],
  기분: ["기분", "일상", "감정", "계절", "쉼"],
  관계: ["관계", "말", "침묵", "다정", "서운함"],
  슬픔: ["슬픔", "외로움", "회복", "마음", "시간"],
  행복: ["행복", "일상", "감각", "기억", "관계"],
  절망: ["절망", "불안", "흔들림", "회복", "용기"],
  응원: ["응원", "용기", "회복", "마음", "성장"],
  공간: ["공간", "기억", "장면", "거리", "시간"],
  산책: ["산책", "계절", "거리", "생각", "쉼"],
  글쓰기: ["글쓰기", "문장", "기록", "생각", "시선"],
  사진: ["사진", "기록", "장면", "기억", "감정"],
};

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
      managedKeywords: uniqueValues([...defaultManagedKeywords, ...(parsedValue.managedKeywords ?? [])]),
      contentTopics: uniqueValues([...defaultContentTopics, ...(parsedValue.contentTopics ?? [])]),
      contentTypes: uniqueValues([...defaultContentTypes, ...(parsedValue.contentTypes ?? [])]),
      recommendationTags: uniqueValues([...defaultRecommendationTags, ...(parsedValue.recommendationTags ?? [])]),
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
    return "릴스";
  }

  if (content.format === "post") {
    return "이미지_캡션";
  }

  if (content.format === "article") {
    return "긴글";
  }

  return "기타";
}
