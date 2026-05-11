import { useState, type FormEvent } from "react";
import {
  defaultContentTopics,
  defaultContentTypes,
  defaultManagedKeywords,
  defaultStopWords,
  loadTaxonomySettings,
  saveTaxonomySettings,
} from "../lib/taxonomy";
import type { TaxonomySettings } from "../types/models";

type DictionaryKey = "managedKeywords" | "contentTopics" | "contentTypes" | "stopWords";

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
    key: "stopWords",
    title: "불용어 사전",
    description: "인사말, 접속사, 문장 조각처럼 통계에서 제외할 단어입니다.",
    placeholder: "예: 매우",
  },
];

const contentTypeDescriptions = [
  ["짧은글", "1장짜리 짧은 산문/문장 중심"],
  ["긴글", "2장 이상 또는 긴 산문/에세이"],
  ["산문", "정서와 장면 중심의 글"],
  ["에세이", "경험과 생각을 길게 풀어낸 글"],
  ["사진+글", "이미지와 글이 함께 의미를 만드는 게시물"],
  ["이미지만", "텍스트가 거의 없는 게시물"],
  ["이미지+캡션", "이미지가 있고 캡션이 핵심인 게시물"],
  ["캐러셀", "여러 장 묶음"],
  ["릴스/영상", "영상 중심"],
  ["Threads", "Threads 게시물"],
  ["질문형", "댓글과 반응을 유도하는 질문 중심"],
  ["고백형", "개인적인 고백이나 선언 중심"],
  ["회고형", "과거 경험을 돌아보는 형식"],
  ["공지형", "소식이나 안내 중심"],
];

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
    </section>
  );
}
