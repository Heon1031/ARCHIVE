# InsightRecord 모델

## 목적

`InsightRecord`는 콘텐츠 성과 데이터를 콘텐츠와 계정에서 분리해 저장한다.

## 필드 예시

```ts
type InsightRecord = {
  id: string;
  contentId: string;
  accountId: string;
  platform: Platform;
  source: "api" | "manual";
  measuredAt: string;
  reach?: number;
  views?: number;
  likes?: number;
  comments?: number;
  saves?: number;
  shares?: number;
  replies?: number;
  reposts?: number;
  quotes?: number;
  apiSyncStatus: "idle" | "syncing" | "success" | "failed" | "expired" | "manual";
  lastSyncedAt?: string;
  syncErrorMessage?: string;
  createdAt: string;
  updatedAt: string;
};
```

## 필수 원칙

- `contentId`는 필수이며 반드시 `ContentItem.id`를 저장한다. API의 mediaId 또는 외부 게시물 ID를 넣지 않는다.
- `accountId`는 필수다.
- `source`로 API 데이터와 수기 데이터를 구분한다.
- `platform`만으로 계정이나 콘텐츠를 찾지 않는다.

## 지표 기준

- Instagram / Threads에서 제공하지 않는 지표는 비워둘 수 있다.
- 없는 지표를 임의로 계산하거나 다른 지표로 대체하지 않는다.
- API 실패와 성과 없음은 다른 상태로 다룬다.

## 동기화 상태

- API 데이터는 `apiSyncStatus: "success" | "failed" | "expired"`와 `lastSyncedAt`을 함께 관리한다.
- 실패 시 `syncErrorMessage`에 사용자가 이해할 수 있는 요약 메시지를 저장한다.
- 수기 데이터는 `apiSyncStatus: "manual"`로 저장한다.
