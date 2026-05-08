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
## API 게시물 기반 ContentItem 확장 방향

- `ContentItem`은 수동 기획 콘텐츠뿐 아니라 API로 가져온 실제 게시물도 표현한다.
- API 게시물이 들어오면 `externalMediaId` 기준으로 `ContentItem`을 자동 생성하거나 업데이트하는 방향을 기본으로 한다.
- 주요 필드는 `externalMediaId`, `externalPermalink`, `publishedDate`, `caption`, `text`, `contentType`, `topicKeywords`, `source`를 포함할 수 있다.
- 콘텐츠 종류 예시는 `threads`, `short_text`, `long_text`, `essay`, `image_post`, `carousel`, `reel_video`, `other`로 둔다.
- 주제 예시는 가족, 결혼/관계, 일상, 성장, 위로, 창작, 회고, 공지, 기타로 둔다.
- 성과 수치는 계속 `InsightRecord`에 저장하고 `ContentItem`에 직접 넣지 않는다.

