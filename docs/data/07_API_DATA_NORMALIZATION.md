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
## 게시물 정규화와 ContentItem 연결 방향

- 최근 게시물 API 응답은 먼저 `ExternalMediaItem`으로 정규화한다.
- 이후 `externalMediaId`를 기준으로 기존 `ContentItem`을 찾고, 없으면 업로드 완료 `ContentItem`을 자동 생성하는 방향을 기본으로 한다.
- `caption` 또는 `text`는 키워드 추출, 주제 분류, 콘텐츠 종류 분류의 입력값으로 사용할 수 있다.
- 초기 분류는 규칙 기반과 수동 보정으로 시작하고, 이후 AI 분류로 확장할 수 있다.
- `NormalizedInsight`와 `InsightRecord`는 성과 데이터만 다루며, 콘텐츠 본문/주제 관리의 중심은 `ContentItem`이다.

