# ContentItem 모델

## 목적

`ContentItem`은 계정에 연결된 콘텐츠 기획, 제작 상태, 일정 정보를 관리한다.

## 필드 예시

```ts
type ContentItem = {
  id: string;
  accountId: string;
  platform: Platform;
  title: string;
  format?: "post" | "reel" | "thread" | "carousel" | "story" | "article" | "other";
  topic?: string;
  status: "idea" | "planned" | "in_progress" | "review" | "scheduled" | "published" | "archived";
  scheduledAt?: string;
  publishedAt?: string;
  externalPostId?: string;
  postUrl?: string;
  planningMemo?: string;
  visualMemo?: string;
  reminderMemo?: string;
  retrospectiveMemo?: string;
  source: "api" | "manual";
  createdAt: string;
  updatedAt: string;
};
```

## 필수 원칙

- `accountId`는 필수다.
- `platform`은 연결된 `Account.platform`과 동기화되어야 한다.
- 단일 플랫폼만 보고 계정을 추정하지 않는다.
- 콘텐츠 성과 수치는 이 모델에 직접 넣지 않는다.

## 메모 필드

- `planningMemo`: 기획 메모
- `visualMemo`: 시각 자료 또는 제작 메모
- `reminderMemo`: 리마인드 메모
- `retrospectiveMemo`: 게시 후 회고 메모

## 외부 게시물 정보

- `externalPostId`: Instagram / Threads 등 외부 플랫폼의 게시물 ID
- `postUrl`: 게시물 링크
- API에서 가져온 콘텐츠와 수기 등록 콘텐츠 모두 이 구조를 사용할 수 있다.
