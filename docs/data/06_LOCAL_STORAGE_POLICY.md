# localStorage 저장 정책

## 목적

MVP에서는 서버/DB 없이 localStorage 기반으로 시작하되, 나중에 서버 저장소로 옮길 수 있게 모델별 저장 책임을 분리한다.

## 권장 key

- `content-dashboard.accounts`
- `content-dashboard.contents`
- `content-dashboard.insights`
- `content-dashboard.uiState`

## 저장 기준

- 계정 목록은 `content-dashboard.accounts`에 저장한다.
- 콘텐츠 목록은 `content-dashboard.contents`에 저장한다.
- 성과 기록은 `content-dashboard.insights`에 저장한다.
- 선택 탭, 필터, 날짜 같은 화면 상태는 `content-dashboard.uiState`에 저장한다.

## 책임 분리

- UI 컴포넌트가 localStorage를 직접 길게 다루지 않는다.
- 저장/불러오기 로직은 별도 저장소 유틸 또는 서비스로 분리할 수 있게 설계한다.
- 모델별 key를 분리해 부분 이전과 부분 동기화가 가능하게 한다.

## DB 이전 기준

- localStorage key 단위를 서버 테이블 또는 컬렉션 후보로 본다.
- `id`, `createdAt`, `updatedAt`은 DB 이전을 고려해 유지한다.
- API 토큰은 서버/DB 단계에서 클라이언트 저장소에서 분리해야 한다.

## 보안 주의

- localStorage는 민감 정보 저장에 안전한 공간이 아니다.
- MVP에서는 Access Token 저장의 위험을 UI와 문서에서 명확히 안내한다.
- 상용화 단계에서는 토큰 저장 방식을 반드시 재설계한다.
