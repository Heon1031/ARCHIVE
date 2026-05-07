# Account 모델

## 목적

`Account`는 플랫폼별 계정, API 연결 상태, 토큰 관련 정보를 관리하는 기준 모델이다.

## 필드 예시

```ts
type Account = {
  id: string;
  platform: Platform;
  displayName: string;
  username?: string;
  externalAccountId?: string;
  profileUrl?: string;
  accessToken?: string;
  tokenExpiresAt?: string;
  connectionStatus: "connected" | "needs_check" | "failed" | "expired" | "unsupported";
  lastSyncedAt?: string;
  isApiSupported: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};
```

## 필드 기준

- `id`: 앱 내부에서 사용하는 계정 식별자
- `platform`: Instagram, Threads, Brunch, Blog, Other 중 하나
- `displayName`: UI에 표시할 계정명
- `externalAccountId`: 외부 API에서 사용하는 계정 ID
- `accessToken`: API 호출에 필요한 토큰
- `connectionStatus`: 계정 연결 상태
- `lastSyncedAt`: 마지막 API 동기화 시각
- `isApiSupported`: API 지원 여부
- `isActive`: 현재 운영 대상 여부

## 보안 한계

- MVP에서 localStorage에 Access Token을 저장하면 보안상 한계가 있다.
- 토큰은 계정 등록·설정 탭에서만 다룬다.
- 메인 탭과 성과 탭에 토큰 값을 직접 노출하지 않는다.
- 서버/DB 단계에서는 토큰을 클라이언트 저장소에서 분리하는 구조로 이전해야 한다.
