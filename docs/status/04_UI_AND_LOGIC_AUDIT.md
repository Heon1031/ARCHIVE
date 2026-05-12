# UI and Logic Audit

## 1. 현재 문제 요약
- 메인탭의 추천, 리마인드, 선택 상세, 달력 판단 로직이 `MainTab.tsx` 한 파일에 몰려 있어 수정 영향 범위가 크다.
- 리마인드 카드는 렌더링 구조는 있으나 CSS 오버라이드가 누적되어 크기, grid 위치, overflow가 충돌할 가능성이 높다.
- 추천 알고리즘은 월간 목표 비율을 일부 반영하지만, `leastUsedFormat`과 fallback 추천이 겹치면 짧은글 반복이 다시 생길 수 있다.
- 개선 카드는 평균 이하 reactionScore 기준으로 좁혀졌지만, 낮은 지표가 무엇인지까지는 충분히 설명하지 못한다.
- 콘텐츠 형식 분류는 API 데이터만으로 이미지+캡션, 글이미지, 사진+글을 안정적으로 구분하기 어렵다.
- 성과탭은 시각화 구조가 추가되었지만 숫자 요약, 플랫폼 요약, 상세 기록이 같은 grid 흐름 안에 있어 겹침과 우선순위 혼선이 생길 수 있다.
- `styles.css`에는 Green, Purple, Apple, Liquid Glass, reminder refinement 오버라이드가 누적되어 최종 규칙 의존도가 높다.
- 현재 작업 트리에는 `src/styles.css`, `src/tabs/MainTab.tsx`, `src/tabs/PerformanceTab.tsx` 변경이 섞여 있어 기능 단위 커밋 전 재분류가 필요하다.

## 2. 파일별 점검 결과
### MainTab.tsx
- 운영 판단, 추천 생성, 추천 dedupe, 리마인드 후보, 달력 렌더링, 콘텐츠 상세 표시가 한 파일에 함께 있다.
- `visibleJudgementCards`는 오늘/추천/조건부 개선 중심으로 좁혀졌으나 `judgementCards` 내부에는 리마인드, 휴식, 월간 흐름 정의가 여전히 남아 있다.
- `getDateRecommendation`, `getCalendarRecommendations`, `dedupeCalendarRecommendations`, `getTargetFormatRecommendation`의 책임이 겹친다.
- 추천 결과가 날짜별 성장 판단인지, 빈 날짜 보완인지 구분하기 어렵다.

### PerformanceTab.tsx
- `getContentKeywords` 안에 `return getManagedKeywords(content).slice(0, 5);` 이후 도달 불가능한 fallback 코드가 남아 있다.
- 상단 설정 헤더와 숫자 요약, 시각화 카드, 상세 records가 모두 같은 화면 흐름에 있어 시각화 우선 구조가 CSS에 크게 의존한다.
- `managementSuggestions` 계열 로직이 여전히 계산되며, 성과탭이 판단 화면처럼 보일 위험이 있다.

### TaxonomyTab.tsx
- 게시물별 수동 보정 UI는 제거되고 사전 관리 중심으로 정리되어 있다.
- 관리 키워드, 주제, 콘텐츠 형식, 추천 태그, 불용어를 추가/삭제할 수 있다.
- 사전 기본값은 충분하지만, 메인 추천 로직이 실제로 사전 값을 얼마나 사용하는지는 더 분리해서 확인해야 한다.

### taxonomy.ts
- 기본 사전과 localStorage 저장 정책이 분리되어 있다.
- `getManagedKeywords`는 사전 기준 키워드만 우선 사용하므로 인사말/접속사 유입을 줄이는 방향은 맞다.
- `normalizeContentType`은 API `format` 기반 단순 매핑이므로 산문 운영에 필요한 세부 형식 구분에는 한계가 있다.

### models.ts
- `ContentItem`은 `contentType`, `topicKeywords`, `customKeywords`, `externalThumbnailUrl`을 포함해 콘텐츠 DB 확장 기반은 있다.
- 성과 수치는 `InsightRecord`에 분리되어 있어 ContentItem 오염 위험은 낮다.
- API/수기 성과는 `source`와 `apiSyncStatus`로 구분된다.

### styles.css
- 디자인 오버라이드가 여러 시대별 섹션으로 누적되어 있다.
- 같은 클래스의 grid, display, padding, min-height, background가 여러 번 재정의된다.
- 최종 Liquid Glass 규칙이 우선하지만, 일부 Green/Purple/Apple 규칙이 여전히 중간 우선순위에서 영향을 줄 수 있다.

## 3. 메인탭 문제
### 카드 구성 문제
- 왼쪽 카드의 최종 목표는 오늘의 방향, 추천, 개선, 선택 상세, 오늘의 리마인드다.
- 코드에는 리마인드, 휴식, 월간 흐름 카드 정의가 남아 있어 향후 수정자가 혼동할 수 있다.
- 선택 상세 카드와 월간 흐름 요약 카드가 같은 `.flow-summary-card` 이름을 공유해 역할이 불명확하다.

### 리마인드 문제
- 리마인드 JSX는 왼쪽 컬럼 안에 있으나 CSS에서 min-height, thumbnail 크기, grid row를 여러 번 덮어쓴다.
- 이미지가 큰 경우 왼쪽 컬럼을 밀어내거나 달력 높이와 균형을 깨뜨릴 수 있다.
- 후보는 최대 3개로 제한되지만, 성과 데이터가 부족하면 카드의 유용성이 낮아진다.

### 추천/개선/오늘의 방향 문제
- 오늘의 방향은 오늘 게시물 수와 선택 날짜 추천을 섞어 보여주어 판단 기준이 선명하지 않다.
- 추천 카드는 부족 주제와 형식을 말하지만 월간 목표 대비 수치가 충분히 드러나지 않는다.
- 개선은 평균 이하 score 기준으로 좁혀졌으나 저장률, 댓글, 공유 등 낮은 지표별 개선 문구가 부족하다.

## 4. 추천 알고리즘 문제
### 짧은글 반복 원인
- 월간 부족 형식 산출이 추가되었지만, fallback `leastUsedFormat`과 기본 가벼운 추천이 짧은글에 쏠릴 수 있다.
- 추천 간 주간 빈도 제한은 약하고, 같은 주에 같은 label이 반복되는지까지는 강하게 제어하지 않는다.

### 월간 목표 비율 반영 여부
- 월 14개 기준 형식 목표는 일부 반영된다.
- 주제 목표 비율은 문서/요구에는 있지만 실제 날짜별 추천에는 제한적으로만 반영된다.
- 게시 수 구간별 추천 강도는 존재하지만, 휴식/재활용/개선과 형식 추천 간 우선순위가 더 명확해야 한다.

### 하루 여러 추천 문제
- dedupe는 label과 type+format 기준으로 동작한다.
- 휴식은 단독 처리 방향이 있으나, 실제 게시물과 운영 추천이 섞이는 경우 우선순위가 더 명확해야 한다.
- +N 구조는 있으나 최대 2개 노출로 줄어든 상태다.

### 휴식/재활용/개선 기준 문제
- 휴식은 게시 간격과 월간 운영 단계 기준이지만, 실제 업로드 발생 후 주변 날짜 재배치까지는 정교하지 않다.
- 재활용은 오래된 고반응 콘텐츠 기반이나 주 1회/월 단위 밀도 제어가 약하다.
- 개선은 low score 콘텐츠 기준이나 낮은 지표의 종류를 분석하지 않는다.

## 5. 콘텐츠 형식 분류 문제
### 현재 자동 판독 가능 항목
- API `media_type` 또는 내부 `format`으로 캐러셀, 릴스/영상, Threads, 일반 post 정도는 구분 가능하다.
- `externalThumbnailUrl`, `caption`, `text`, `publishedDate`는 캘린더/DB 표시 기준으로 활용 가능하다.

### 현재 자동 판독 어려운 항목
- 이미지+캡션과 글이미지는 현재 구조만으로 안정적으로 구분하기 어렵다.
- 사진+글, 이미지만, 본문글은 이미지 내부 텍스트 여부와 캡션 비중을 알아야 정확해진다.
- 산문/에세이/짧은글/긴글은 caption/text 길이 기준으로 추정 가능하지만 품질은 제한적이다.

### AI/OCR/수동 보정이 필요한 항목
- 이미지 안 글자 판독은 OCR 또는 이미지 분석이 필요하다.
- 산문적 정서, 관계 맥락, 콘텐츠 목적 분류는 향후 AI 분류 또는 수동 보정이 필요하다.
- 현재 MVP에서는 사전 기반 키워드와 단순 규칙 기반 분류로 제한하는 것이 안전하다.

## 6. 성과탭 문제
### 겹침 원인
- 시각화 카드와 일반 panel-card가 같은 `.section-grid` 안에서 CSS order와 flex/grid 재정의에 의존한다.
- `.performance-panel .section-grid` 관련 규칙이 여러 번 정의되어 최종 배치 추적이 어렵다.
- 그래프 카드 내부 min-height와 padding이 누적 규칙에 따라 달라질 수 있다.

### 중복 섹션
- 상단 헤더의 “성과” 설명이 아직 남아 있다.
- `성과 집계 요약` 내부에 숫자 요약과 시각화가 함께 있어 첫 화면 우선순위가 흐려진다.
- 플랫폼별 요약, 계정별 요약, 상세 성과 기록은 하단 details 또는 보조 영역으로 묶는 편이 낫다.

### 시각화 우선 구조 여부
- 월별 업로드 추세, 반응 좋은 콘텐츠 Top 5, 형식/주제/키워드별 평균 반응은 존재한다.
- 다만 숫자 요약이 같은 visual card 상단에 있어 “그래프 우선”으로 보이지 않을 수 있다.
- 성과탭은 판단보다 근거 데이터 화면으로 유지해야 한다.

## 7. CSS/디자인 문제
### 충돌 가능성
- Green app-style, Purple compact, Apple-style, Apple Glass, Liquid Glass, Reminder refinement가 모두 남아 있다.
- `.flow-summary-card`, `.calendar-cell`, `.calendar-recommendation-chip`, `.main-home-panel .section-grid`가 반복 정의된다.
- 최종 스타일은 파일 하단 규칙에 의존하므로 작은 추가 수정도 예상 밖의 영향을 낼 수 있다.

### 중복 스타일
- calendar cell min-height/padding/background가 여러 번 바뀐다.
- reminder thumbnail 크기와 card min-height가 큰 카드/compact 카드 기준으로 모두 존재한다.
- performance grid는 grid/flex/order 규칙이 섞여 있다.

### 레이아웃 깨짐 원인
- 왼쪽 컬럼 grid row가 flow-summary, reminder, date-management 순서와 충돌할 수 있다.
- `.flow-summary-card`가 선택 상세인지 월간 흐름인지 클래스명과 내용이 맞지 않는다.
- 하단 오버라이드로 숨긴 요소가 JSX에는 남아 있어 추후 CSS 삭제 시 다시 노출될 수 있다.

## 8. 제거 후보
- `judgementCards`의 리마인드, 휴식, 월간 흐름 카드 정의: 현재 표시 정책과 맞지 않으면 제거 후보.
- MainTab 하단의 오래된 `리마인드` article: CSS로 숨겨져 있다면 JSX 제거 후보.
- `flow-summary-card` 내부 월간 summary, keyword, recommendation 리스트: 선택 상세 역할만 남길 경우 제거 후보.
- PerformanceTab의 `getManagementSuggestions`와 managementSuggestions 계산: 성과탭에서 다음 콘텐츠 판단을 제거한다면 제거 후보.
- PerformanceTab의 `getContentKeywords` 도달 불가능 fallback 코드: 즉시 제거 후보.
- styles.css의 Green/Purple/Apple 중간 오버라이드 섹션: Liquid Glass 기준 정리 시 제거 후보.

## 9. 유지 후보
- `ContentItem`과 `InsightRecord` 분리 구조: 성과 수치가 ContentItem에 들어가지 않도록 유지.
- `getManagedKeywords`, `normalizeContentType` 기반 사전 분류: MVP 사전 기반 분류의 핵심.
- `dedupeCalendarRecommendations`: 날짜별 중복 뱃지 방지의 최소 안전장치.
- `getTargetFormatRecommendation`: 월간 목표 비율 기반 추천의 출발점.
- `getReminderCandidates`: 리마인드 카드의 핵심 후보 생성 로직.
- Account/API/Insight 저장 흐름: 이번 UI/추천 정리에서는 건드리지 않는 편이 안전.

## 10. 다음 작업 우선순위
1. 메인 리마인드/카드 정리
   - JSX에서 실제 노출 카드만 남기고, 선택 상세와 리마인드 위치를 명확히 한다.
   - `.flow-summary-card` 이름을 역할에 맞게 바꾸거나 CSS 책임을 분리한다.
2. 추천 알고리즘 정리
   - 추천 후보 생성, 월간 목표 부족 계산, 날짜 배치, dedupe를 별도 helper로 분리한다.
   - 주간 반복 제한과 개선/휴식/재활용 우선순위를 명시한다.
3. 콘텐츠 형식 분류 문서화
   - API만으로 가능한 분류와 OCR/AI/수동 보정이 필요한 분류를 분리한다.
   - 이미지+캡션, 글이미지, 사진+글 기준을 MVP/향후 단계로 나눈다.
4. 성과탭 정리
   - 숫자 요약을 하단 details로 내리고 시각화 카드만 첫 화면에 둔다.
   - 도달 불가능 코드와 판단 제안 로직을 제거한다.
5. 최종 QA
   - build, 모바일 레이아웃, 링크 버튼 미노출, 토큰 미노출, localStorage 유지 여부를 확인한다.

## 11. 수정 시 주의사항
- Meta API 호출, 토큰 저장, InsightRecord 저장 로직은 이번 정리 범위에서 건드리지 않는다.
- ContentItem에 reach, likes, saves 같은 성과 수치를 직접 추가하지 않는다.
- 콘텐츠 작성/추가 UI, 링크 보기 버튼, 자동 업로드 기능을 재추가하지 않는다.
- 추천 알고리즘을 고치더라도 모든 빈 날짜를 채우는 방향으로 만들지 않는다.
- CSS 정리는 한 번에 전체 삭제보다 Liquid Glass 최종 섹션을 기준으로 충돌 클래스부터 좁게 제거한다.
- 실제 토큰/API 키/시크릿 값은 문서, 콘솔, UI에 출력하지 않는다.
