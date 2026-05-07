# Instagram API 연결 계획

## 필요한 값

- Instagram 계정 ID
- Access Token
- Media ID
- 필요한 권한

실제 endpoint, metric, 권한 이름은 구현 단계에서 최신 공식 문서로 검증한다.

## 계정 연결 확인 흐름

1. 계정 설정 탭에서 Instagram 계정 ID와 Access Token을 입력한다.
2. API 연결 확인 버튼을 누른다.
3. 계정 기본 정보를 조회해 토큰과 계정 ID가 유효한지 확인한다.
4. 결과를 `connectionStatus`, `lastSyncedAt`, 오류 메시지로 표현한다.

## 최근 게시물 조회 흐름

1. 연결된 계정 기준으로 최근 Media 목록을 조회한다.
2. 외부 Media ID, 게시물 링크, 게시일을 내부 `ContentItem`과 연결할 후보로 다룬다.
3. 자동 업로드나 자동 콘텐츠 생성은 하지 않는다.

## 게시물 인사이트 조회 흐름

1. Media ID 기준으로 인사이트를 조회한다.
2. 조회 결과를 내부 `NormalizedInsight`로 변환한다.
3. `accountId`, `contentId`, `source: "api"`, `measuredAt`을 포함해 `InsightRecord`로 저장한다.

## 정규화 원칙

- UI는 Instagram 원본 응답에 직접 의존하지 않는다.
- 없는 지표는 무리하게 0으로 확정하지 않고 `undefined`를 고려한다.
- 실제 값이 0인 경우에만 0으로 저장한다.
- 플랫폼별 지표 차이는 API 연동 계층에서 흡수한다.

