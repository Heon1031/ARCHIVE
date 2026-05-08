# API 데이터 정규화

## 기본 원칙

Instagram / Threads API 응답은 UI가 직접 사용하지 않는다. API 응답은 내부 모델로 정규화한 뒤 사용한다.

## 정규화 대상

- 계정 정보는 `Account` 형태로 변환한다.
- 게시물 정보는 외부 게시물 ID를 가진 `ExternalMediaItem` 형태로 변환한다.
- 성과 정보는 저장 전에는 `NormalizedInsight`, 저장 후에는 `InsightRecord` 형태로 다룬다.

## NormalizedInsight 예시

`NormalizedInsight`는 아직 특정 `ContentItem`에 연결되기 전의 API 조회 결과다. 따라서 `contentId`를 가지지 않고, API 게시물을 가리키는 `externalMediaId`를 가진다.

```ts
type NormalizedInsight = {
  accountId: string;
  externalMediaId: string;
  platform: Platform;
  source: "api";
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
  apiSyncStatus: "success" | "failed" | "expired";
  lastSyncedAt?: string;
  syncErrorMessage?: string;
};
```

## InsightRecord 저장 기준

- `InsightRecord.contentId`에는 반드시 사용자가 선택한 `ContentItem.id`만 저장한다.
- API에서 온 게시물 ID는 `externalMediaId`로만 다룬다.
- 외부 게시물과 콘텐츠의 자동 매칭은 보조 정보일 뿐, 저장 전 사용자가 연결할 콘텐츠를 확인해야 한다.

## 없는 지표 처리

- API가 제공하지 않는 지표는 `undefined`를 기본으로 둔다.
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

## UI 참조 원칙

- UI는 원본 API 응답 필드에 직접 의존하지 않는다.
- UI는 정규화된 `Account`, `ExternalMediaItem`, `NormalizedInsight`, `InsightRecord`만 사용한다.
- API별 필드 차이는 API 연동 계층에서 흡수한다.
