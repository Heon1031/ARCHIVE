# 백엔드 전환 개요

## 현재 상태
- 현재 앱은 개인 테스트용 Vite React 앱이다.
- 계정, 콘텐츠, 인사이트, 분류 사전은 브라우저 `localStorage`에 저장된다.
- 같은 PC와 같은 브라우저에서는 데이터가 유지되지만, 다른 PC나 다른 브라우저와 자동 공유되지 않는다.

## 백엔드가 필요한 이유
- 여러 PC에서 같은 계정 DB와 콘텐츠 DB를 사용하려면 로그인과 서버 DB가 필요하다.
- Instagram / Threads Access Token을 여러 기기에서 안전하게 쓰려면 프론트 저장이 아니라 백엔드 저장이 필요하다.
- 정식 배포에서는 프론트가 Meta API를 직접 호출하지 않고, 백엔드 API를 통해 호출해야 한다.

## 권장 구조
- 인증: Supabase Auth
- DB: Supabase Postgres
- 서버 API: Vercel API Route
- 배포: Vercel

## 토큰 보관 원칙
- Access Token은 프론트 코드나 localStorage에 영구 보관하지 않는다.
- 정식 서비스에서는 Access Token을 백엔드 DB에 암호화해서 저장한다.
- App Secret은 프론트 코드, 환경변수 번들, UI 입력값에 절대 넣지 않는다.
- 프론트는 백엔드 API만 호출하고, 백엔드가 Meta API 호출과 토큰 관리를 담당한다.

## 이번 단계 제외
- 로그인 구현
- Supabase 설치
- 백엔드 API 구현
- DB 마이그레이션
- 토큰 암호화 구현
