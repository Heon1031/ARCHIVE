# 필터와 화면 모델

## 목적

전역 필터는 전체 계정, 플랫폼 전체, 개별 계정 기준으로 주요 화면의 데이터를 제한한다.

## 필터 예시

```ts
type AccountFilter =
  | { type: "all" }
  | { type: "platform"; platform: "instagram" | "threads" }
  | { type: "account"; accountId: string };
```

## 적용 원칙

- `all`: 모든 활성 계정을 포함한다.
- `platform`: 해당 플랫폼의 활성 계정을 포함한다.
- `account`: 선택한 단일 계정만 포함한다.
- Brunch, Blog, Other는 수기 보조 흐름에서만 제한적으로 노출한다.

## 모델별 적용

- `Account`: 필터에 맞는 계정 목록을 보여준다.
- `ContentItem`: 필터에 포함된 `accountId`를 가진 콘텐츠만 보여준다.
- `InsightRecord`: 필터에 포함된 `accountId`와 연결된 성과만 보여준다.

## 탭별 사용 기준

- 메인 탭: 오늘 할 일, 캘린더, 기획 목록, 제작 상태에 적용한다.
- 성과 탭: 전체 성과, 플랫폼별 성과, 계정별 성과, 콘텐츠별 성과에 적용한다.
- 계정 등록·설정 탭: 계정 목록을 탐색하거나 좁히는 용도로 사용한다.

## UI 상태 예시

```ts
type UiState = {
  selectedTab: "main" | "performance" | "account_settings";
  accountFilter: AccountFilter;
  selectedDate?: string;
};
```
