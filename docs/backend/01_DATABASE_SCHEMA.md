# 데이터베이스 스키마 초안

## users
- `id`: 사용자 ID
- `email`: 로그인 이메일
- `created_at`

## accounts
- `id`
- `user_id`
- `platform`
- `account_name`
- `display_name`
- `username`
- `external_account_id`
- `profile_url`
- `encrypted_access_token`
- `token_expires_at`
- `connection_status`
- `last_synced_at`
- `is_api_supported`
- `is_active`
- `created_at`
- `updated_at`

## content_items
- `id`
- `user_id`
- `account_id`
- `platform`
- `title`
- `format`
- `content_type`
- `topic`
- `caption`
- `text`
- `topic_keywords`
- `custom_keywords`
- `status`
- `planned_date`
- `published_date`
- `external_media_id`
- `external_permalink`
- `external_thumbnail_url`
- `source`
- `created_at`
- `updated_at`

## insight_records
- `id`
- `user_id`
- `content_id`
- `account_id`
- `platform`
- `source`
- `measured_at`
- `reach`
- `views`
- `likes`
- `comments`
- `saves`
- `shares`
- `replies`
- `reposts`
- `quotes`
- `api_sync_status`
- `last_synced_at`
- `sync_error_message`
- `created_at`
- `updated_at`

## taxonomy_settings
- `id`
- `user_id`
- `managed_keywords`
- `content_topics`
- `content_types`
- `recommendation_tags`
- `stop_words`
- `created_at`
- `updated_at`

## 설계 원칙
- 모든 데이터는 `user_id` 기준으로 분리한다.
- 성과 수치는 `ContentItem`에 넣지 않고 `InsightRecord`에만 저장한다.
- Access Token은 `encrypted_access_token`처럼 암호화된 값으로만 저장한다.
- App Secret은 DB에 저장하지 않고 서버 환경변수로만 관리한다.
