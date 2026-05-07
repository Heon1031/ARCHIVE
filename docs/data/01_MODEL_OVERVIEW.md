# 모델 개요

## 핵심 모델

- `Account`: Instagram / Threads / 수기 보조 채널의 계정 또는 출처 단위
- `ContentItem`: 계정에 연결된 콘텐츠 기획, 제작, 게시 항목
- `InsightRecord`: 콘텐츠와 계정에 연결된 성과 기록

## 관계 원칙

- `ContentItem`은 반드시 `accountId`를 가진다.
- `InsightRecord`는 반드시 `contentId`와 `accountId`를 가진다.
- 성과 데이터는 `ContentItem`에 직접 넣지 않고 `InsightRecord`로 분리한다.
- `platform`만으로 계정을 구분하지 않는다.

## 연결 기준

- 계정 기준 연결: `Account.id`
- 콘텐츠 기준 연결: `ContentItem.id`
- 성과 기준 연결: `InsightRecord.contentId`, `InsightRecord.accountId`

## 플랫폼 원칙

`Platform`은 Instagram / Threads API 우선 구조를 유지하되, API 미지원 보조 입력을 위해 다음 값을 포함한다.

```ts
type Platform = "instagram" | "threads" | "brunch" | "blog" | "other";
```

## 출처 원칙

- API에서 가져온 데이터는 `source: "api"`로 표시한다.
- 사용자가 직접 입력한 보조 데이터는 `source: "manual"`로 표시한다.
- UI는 `source`를 기준으로 데이터 출처를 구분해 보여준다.
