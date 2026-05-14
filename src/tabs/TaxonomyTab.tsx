import { useState, type FormEvent } from "react";
import {
  defaultContentTopics,
  defaultContentTypes,
  defaultManagedKeywords,
  defaultRecommendationTagSuggestions,
  defaultRecommendationTags,
  defaultStopWords,
  loadTaxonomySettings,
  saveTaxonomySettings,
} from "../lib/taxonomy";
import type { TaxonomySettings } from "../types/models";

type DictionaryKey = "managedKeywords" | "contentTopics" | "contentTypes" | "recommendationTags" | "stopWords";

type DictionarySection = {
  key: DictionaryKey;
  title: string;
  description: string;
  placeholder: string;
};

const dictionarySections: DictionarySection[] = [
  {
    key: "managedKeywords",
    title: "관리 키워드 사전",
    description: "정서, 관계, 태도, 창작, 콘텐츠 목적 중심 키워드입니다.",
    placeholder: "예: 그리움",
  },
  {
    key: "contentTopics",
    title: "주제 사전",
    description: "메인 추천과 성과 집계의 큰 분류 기준입니다.",
    placeholder: "예: 독립",
  },
  {
    key: "contentTypes",
    title: "콘텐츠 형식 사전",
    description: "게시물의 표현 방식과 구조를 구분합니다.",
    placeholder: "예: 문장 카드",
  },
  {
    key: "recommendationTags",
    title: "추천 태그 사전",
    description: "달력 운영 판단 배지에 사용할 추천/개선/재활용/휴식 태그입니다.",
    placeholder: "예: 추천-산문",
  },
  {
    key: "stopWords",
    title: "불용어 사전",
    description: "인사말, 접속사, 문장 조각처럼 통계에서 제외할 단어입니다.",
    placeholder: "예: 매우",
  },
];

const contentTypeDescriptions = [
  ["짧은글", "짧은 문장이나 산문 중심 형식"],
  ["긴글", "생각과 경험을 길게 풀어낸 형식"],
  ["이미지", "이미지 자체가 중심인 게시물"],
  ["이미지_캡션", "이미지 한 장과 본문 글이 함께 있는 형식"],
  ["글이미지", "글 자체가 이미지 안에 들어간 형식"],
  ["캐러셀", "여러 장의 이미지 흐름으로 읽히는 형식"],
  ["릴스", "짧은 영상이나 장면 중심 형식"],
  ["Threads", "Threads에 맞춘 짧은 글 흐름"],
  ["재활용", "과거 콘텐츠를 다시 활용하는 형식"],
  ["멀티유즈", "하나의 원본을 다른 플랫폼/형식으로 변환"],
  ["휴식", "새 콘텐츠보다 점검/정리/회복이 필요한 날"],
  ["개선", "낮은 지표를 바탕으로 보완이 필요한 콘텐츠"],
];

const recommendationTagEntries = Object.entries(defaultRecommendationTagSuggestions);

function normalizeDictionary(values: string[], keepEtc = true) {
  const nextValues = Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
  return keepEtc && !nextValues.includes("기타") ? [...nextValues, "기타"] : nextValues;
}

export function TaxonomyTab() {
  const [settings, setSettings] = useState<TaxonomySettings>(() => loadTaxonomySettings());
  const [drafts, setDrafts] = useState<Record<DictionaryKey, string>>({
    managedKeywords: "",
    contentTopics: "",
    contentTypes: "",
    recommendationTags: "",
    stopWords: "",
  });

  function commitSettings(nextSettings: TaxonomySettings) {
    const settingsWithDate = {
      ...nextSettings,
      updatedAt: new Date().toISOString(),
    };
    setSettings(settingsWithDate);
    saveTaxonomySettings(settingsWithDate);
  }

  function addValue(event: FormEvent, key: DictionaryKey) {
    event.preventDefault();
    const nextValue = drafts[key].trim();

    if (!nextValue) {
      return;
    }

    commitSettings({
      ...settings,
      [key]: normalizeDictionary([...settings[key], nextValue], key !== "stopWords"),
    });
    setDrafts((currentDrafts) => ({ ...currentDrafts, [key]: "" }));
  }

  function removeValue(key: DictionaryKey, value: string) {
    if (value === "기타" && key !== "stopWords") {
      return;
    }

    commitSettings({
      ...settings,
      [key]: normalizeDictionary(
        settings[key].filter((currentValue) => currentValue !== value),
        key !== "stopWords",
      ),
    });
  }

  function resetDefaults() {
    commitSettings({
      managedKeywords: defaultManagedKeywords,
      contentTopics: defaultContentTopics,
      contentTypes: defaultContentTypes,
      recommendationTags: defaultRecommendationTags,
      stopWords: defaultStopWords,
    });
  }

  return (
    <section className="tab-panel taxonomy-tab" aria-label="분류 관리">
      <div className="settings-header taxonomy-header">
        <div>
          <p className="eyebrow">판단 기준 관리</p>
          <h2>분류 관리</h2>
          <p>메인 추천과 성과 집계에 사용할 키워드, 주제, 형식, 불용어 사전만 관리합니다.</p>
        </div>
        <button className="secondary-button" type="button" onClick={resetDefaults}>
          기본값 복원
        </button>
      </div>

      <div className="taxonomy-reference-grid taxonomy-reference-grid--manager">
        {dictionarySections.map((section) => (
          <article className="panel-card taxonomy-reference-card" key={section.key}>
            <h3>{section.title}</h3>
            <p>{section.description}</p>
            <form className="taxonomy-add-form" onSubmit={(event) => addValue(event, section.key)}>
              <input
                type="text"
                value={drafts[section.key]}
                placeholder={section.placeholder}
                onChange={(event) =>
                  setDrafts((currentDrafts) => ({
                    ...currentDrafts,
                    [section.key]: event.target.value,
                  }))
                }
              />
              <button className="primary-button" type="submit">
                추가
              </button>
            </form>
            <div className="taxonomy-chip-row">
              {settings[section.key].map((value) => (
                <button
                  className={`taxonomy-keyword-button${
                    section.key === "stopWords" ? " taxonomy-keyword-button--muted" : " taxonomy-keyword-button--selected"
                  }`}
                  disabled={value === "기타" && section.key !== "stopWords"}
                  key={value}
                  type="button"
                  onClick={() => removeValue(section.key, value)}
                  title={value === "기타" && section.key !== "stopWords" ? "기타는 삭제할 수 없습니다" : "클릭하면 삭제됩니다"}
                >
                  {value}
                </button>
              ))}
            </div>
          </article>
        ))}
      </div>

      <article className="panel-card panel-card--wide">
        <div className="section-heading-row">
          <div>
            <p className="eyebrow">형식 설명</p>
            <h3>기본 콘텐츠 형식 기준</h3>
          </div>
        </div>
        <div className="taxonomy-description-list">
          {contentTypeDescriptions.map(([title, description]) => (
            <div className="taxonomy-description-item" key={title}>
              <strong>{title}</strong>
              <span>{description}</span>
            </div>
          ))}
        </div>
      </article>

      <article className="panel-card panel-card--wide">
        <div className="section-heading-row">
          <div>
            <p className="eyebrow">추천 태그</p>
            <h3>키워드별 추천 태그 기준</h3>
          </div>
        </div>
        <div className="taxonomy-description-list">
          {recommendationTagEntries.map(([keyword, tags]) => (
            <div className="taxonomy-description-item" key={keyword}>
              <strong>{keyword}</strong>
              <span>{tags.slice(0, 5).join(" · ")}</span>
            </div>
          ))}
        </div>
      </article>
    </section>
  );
}
