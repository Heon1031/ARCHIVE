# MainTab Split Plan

## 1. Graphify 결과 요약

Graphify 결과에서 `MainTab.tsx`는 현재 코드베이스에서 가장 큰 UI 허브로 확인되었다.

- `MainTab.tsx`: 54 edges
- `MainTab()`: 15 edges
- 주요 연결 노드: `ContentItem`, `InsightRecord`, `Account`, `getManagedKeywords()`

`MainTab()`은 현재 아래 책임을 한 파일 안에서 함께 처리한다.

- 월간 콘텐츠 캘린더
- 캘린더 추천 뱃지
- 운영 판단 카드
- 리마인드 카드와 modal
- 멀티유즈 후보
- 추천 키워드
- 선택한 게시물/추천/개선 후보 상세

이 상태에서 기능을 계속 추가하면 작은 UI 수정도 캘린더, 리마인드, 추천, 상세 패널 전체에 영향을 줄 수 있다. 다음 기능 추가 전에 안전한 분리 기준을 먼저 정한다.

## 2. 최소 분리 후보

### A. `DecisionDetailPanel.tsx`

역할:

- 하단 게시물 결과
- 운영 판단
- 개선 후보 상세
- 선택 없음 상태

분리 우선순위: 1순위

이유:

- `selectedContent`, `selectedDecision`, `selectedDetailMode`에 따라 갈라지는 상세 표시 책임이 명확하다.
- 캘린더나 리마인드 후보 선정 로직을 건드리지 않고 UI만 분리할 수 있다.
- 가장 먼저 분리해도 위험이 낮다.

### B. `ReminderCard.tsx` + `ReminderModal.tsx`

역할:

- 리마인드 썸네일
- 점 indicator
- 8초 자동 슬라이드
- 상세 modal

훅 후보:

- `useReminderCarousel(reminderCandidates)`

분리 우선순위: 2순위

이유:

- 리마인드 인덱스, 자동 슬라이드, modal open/close는 UI 상태에 가깝다.
- 외부 데이터 구조를 바꾸지 않고 분리할 수 있다.
- `getReminderCandidates()` 자체는 처음에는 `MainTab.tsx`에 둔다.

### C. `OperationPanel.tsx`

역할:

- 오늘의 방향
- 추천 키워드
- 개선 후보
- 멀티유즈 후보
- 리마인드 카드 배치

분리 우선순위: 3순위

주의:

- 계산 로직은 처음에는 `MainTab.tsx`에 두고 props로 전달한다.
- Operation Panel은 표시와 클릭 이벤트 위임만 담당한다.
- 리마인드와 멀티유즈 후보 선정 로직을 함께 옮기지 않는다.

### D. `CalendarPanel.tsx`

역할:

- 월간 콘텐츠 캘린더
- 날짜 셀
- 실제 게시물 뱃지
- 추천 뱃지 클릭

분리 우선순위: 4순위

주의:

- `getCalendarRecommendations()` 계열 함수는 처음에는 이동하지 않는다.
- 캘린더 UI만 props 기반으로 분리한다.
- 추천 알고리즘 수정과 컴포넌트 분리를 같은 단계에서 하지 않는다.

### E. `mainRecommendations.ts` 또는 `useMainOperationSignals.ts`

역할:

- `getCalendarRecommendations()`
- `getReminderCandidates()`
- `getMultiUseCandidates()`
- `getMultiUseDirection()`
- 추천/운영 판단 pure logic

분리 우선순위: 마지막

주의:

- UI 분리 후에만 이동한다.
- 추천 로직 이동 시에는 테스트 또는 수동 QA 기준을 먼저 정한다.
- 캘린더 뱃지, 리마인드, 멀티유즈 후보가 동시에 바뀌지 않게 단계별로 분리한다.

## 3. 훅 후보

### `useReminderCarousel(reminderCandidates)`

담당:

- `reminderIndex`
- `activeReminder`
- `activeReminderIndex`
- 8초 자동 슬라이드
- 점 indicator 클릭 이동
- interval cleanup

### `useMainSelection(filteredContents, insights, selectedContentId, selectedDecision, selectedDetailMode)`

담당:

- `selectedContent`
- `selectedContentInsight`
- 게시물 결과 표시용 파생값
- 추천 상세 표시용 파생값
- 개선 후보 상세 표시용 파생값

### `useOperationSignals(monthContents, filteredContents, insights, todayKey)`

담당:

- `missingTopic`
- `leastUsedFormat`
- `recentKeywords`
- `reminderCandidates`
- `multiUseCandidates`
- 운영 판단 카드에 필요한 신호

주의:

- 이 훅은 가장 나중에 도입한다.
- 현재 추천, 리마인드, 키워드, 멀티유즈가 얽혀 있으므로 UI 분리 후 이동한다.

## 4. 건드리면 안 되는 것

- `getManagedKeywords()` 이름 변경/이동 금지
- `ContentItem` 모델 수정 금지
- `InsightRecord` 모델 수정 금지
- `Account` 모델 수정 금지
- `getCalendarRecommendations()` 계열 즉시 이동 금지
- `src/services/metaApi.ts` 수정 금지
- `src/tabs/PerformanceTab.tsx` 수정 금지
- `src/tabs/TaxonomyTab.tsx` 수정 금지

## 5. 가장 안전한 분리 순서

1. `DecisionDetailPanel` 분리
2. `ReminderCard` / `ReminderModal` / `useReminderCarousel` 분리
3. `OperationPanel` 분리
4. `CalendarPanel` 분리
5. 추천 로직을 `mainRecommendations.ts` 또는 `useMainOperationSignals.ts`로 이동

## 6. 2.5단계 진행 기준

2.5단계에서는 아직 `MainTab.tsx` 대분리를 하지 않는다.

허용:

- 개선 후보 목록 modal 최소 구현
- 추천 키워드 근거 표시
- 간단한 CSS bar 형태의 분포 그래프
- 기존 `MainTab.tsx` 내부에서 작은 범위 수정

금지:

- 새 컴포넌트 분리
- 추천 알고리즘 대수정
- 리마인드 구조 재수정
- `getCalendarRecommendations()` 이동
- `getManagedKeywords()` 이동 또는 이름 변경
- 대규모 리팩터링

2.5단계의 목표는 기능 보강이며, 구조 분리는 2.5 이후 별도 단계에서 진행한다.
