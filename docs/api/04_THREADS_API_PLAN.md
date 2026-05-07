# Threads API 연결 계획

## 필요한 값

- Threads 계정 ID
- Access Token
- Media 또는 Post ID
- 필요한 권한

실제 endpoint, metric, 권한 이름은 구현 단계에서 최신 공식 문서로 검증한다.

## 계정 연결 확인 흐름

1. 계정 설정 탭에서 Threads 계정 ID와 Access Token을 입력한다.
2. API 연결 확인 버튼을 누른다.
3. 계정 기본 정보 조회로 연결 가능 여부를 확인한다.
4. 결과를 `connectionStatus`, `lastSyncedAt`, 오류 메시지로 표현한다.

## 최근 게시물 조회 흐름

1. 연결된 Threads 계정 기준으로 최근 게시물 목록을 조회한다.
2. 외부 Post ID, 게시물 링크, 게시일을 내부 `ContentItem`과 연결할 후보로 다룬다.
3. 자동 업로드는 MVP 범위에서 제외한다.

## 게시물 인사이트 조회 흐름

1. Post ID 기준으로 인사이트를 조회한다.
2. 조회 결과를 내부 `NormalizedInsight`로 변환한다.
3. `accountId`, `contentId`, `source: "api"`, `measuredAt`을 포함해 `InsightRecord`로 저장한다.

## Instagram과 다른 점

- Threads는 Instagram과 제공 지표가 다를 수 있다.
- 저장, 공유, 답글, 재게시, 인용 같은 지표 제공 여부를 구현 단계에서 확인한다.
- 없는 지표는 `undefined`로 두고 UI에서 출처와 한계를 표시한다.

