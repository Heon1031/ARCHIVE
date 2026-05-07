# API 데이터 정규화

## 기본 원칙

Instagram / Threads API 응답을 UI가 직접 사용하지 않는다. API 응답은 앱 내부 모델로 정규화한 뒤 사용한다.

## 정규화 대상

- 계정 정보는 `Account` 형태로 변환한다.
- 콘텐츠 정보는 `ContentItem` 형태로 변환한다.
- 성과 정보는 `InsightRecord` 또는 `NormalizedInsight` 형태로 변환한다.

## NormalizedInsight 예시

```ts
type NormalizedInsight = {
  accountId: string;
  contentId: string;
  platform: Platform;
  source: "api";
  measuredAt: string;
  metrics: {
    reach?: number;
    views?: number;
    likes?: number;
    comments?: number;
    saves?: number;
    shares?: number;
    replies?: number;
    reposts?: number;
    quotes?: number;
  };
  apiSyncStatus: "success" | "failed" | "expired";
  lastSyncedAt: string;
  syncErrorMessage?: string;
};
```

## 없는 지표 처리

- API가 제공하지 않는 지표는 `undefined`를 기본으로 한다.
- 실제 값이 0인 경우에만 `0`을 사용한다.
- 지원하지 않는 지표와 값이 0인 지표를 혼동하지 않는다.

## API 실패 응답

```ts
type ApiSyncError = {
  accountId: string;
  platform: Platform;
  status: "failed" | "expired" | "permission_denied";
  message: string;
  occurredAt: string;
};
```

## UI 의존 원칙

- UI는 원본 API 응답 필드에 직접 의존하지 않는다.
- UI는 정규화된 `Account`, `ContentItem`, `InsightRecord`만 사용한다.
- API별 필드 차이는 API 연동 계층에서 흡수한다.
