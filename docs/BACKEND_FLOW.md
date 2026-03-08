# Kalos Backend Flow (Developer Onboarding)

## What This Backend Does

Kalos backend is an API and orchestration layer.

It does **not** run AI models. Instead it:

- accepts client requests
- stores metadata in PostgreSQL
- uploads/reads media in S3
- enqueues async jobs for AI workers
- receives AI callbacks
- returns signed URLs and IDs to clients

## Main Product Endpoints

### Wardrobe

- `POST /v1/wardrobe/add`
- Stores original image in private S3 (`wardrobe/raw/...`)
- Creates `WardrobeItem` DB record
- Enqueues `clothing_processing` job
- Returns `wardrobe_item_id`, `job_id`

### Avatar

- `POST /v1/user/avatar`
- Alias of onboarding model customization flow
- Reuses model customization logic
- Enqueues `avatar_generation` job
- Creates `Avatar` metadata row linked to `sourceJobId`

### Onboarding Model Customization

- `POST /v1/users/onboarding/model-customization`
- Stores model customization fields and style prefs
- If photo mode: uploads photo to private S3 (`avatars/...`)
- Enqueues `avatar_generation` job
- Returns onboarding payload + signed `photoUrl` + `job_id`

### Try-On

- `POST /v1/try-on`
- Creates `Outfit` row
- Enqueues `virtual_tryon` job
- Returns `outfit_id`, `job_id`

### Stylist

- `POST /v1/stylist/ask`
- Reads wardrobe metadata
- Enqueues `stylist_recommendation` job
- Returns `job_id`

### Job Tracking

- `POST /v1/jobs`
- `GET /v1/jobs/:id`
- Job statuses: `pending`, `processing`, `completed`, `failed`, `retrying`

### AI Callback

- `POST /v1/ai/job-complete`
- AI worker sends completion/failure
- Backend updates `Job` status
- Backend also updates domain records:
  - `WardrobeItem.status/processedPath`
  - `Avatar.status/modelPath`
  - `Outfit.status/resultPath`

## Storage Rules

### Private bucket (presigned URLs)

- `avatars/`
- `wardrobe/raw/`
- `wardrobe/processed/`
- `ai/temp/`

### Public bucket (direct or CDN URL)

- `tryon/`
- `feed/`
- `products/`

Any private media returned to frontend should be resolved to a signed URL first.

## Queue Design

- Redis + BullMQ
- Queue names:
  - `avatar_generation`
  - `clothing_processing`
  - `metadata_extraction`
  - `virtual_tryon`
  - `stylist_recommendation`
- Features:
  - retries with exponential backoff
  - priority support
  - dedup via `dedupKey`
  - idempotent create via `(userId, idempotencyKey)`
  - dead-letter fallback (`<queue>.dlq`) after max retries

## Database Entities (Core)

- `User`
- `WardrobeItem`
- `Avatar`
- `Outfit`
- `Job`
- `UserModelProfile`

`Job` is the system-of-record for async processing lifecycle.

## Environment Variables

Required for this flow:

- `DATABASE_URL`
- `REDIS_URL`
- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`
- `AWS_REGION`
- `S3_PRIVATE_BUCKET`
- `S3_PUBLIC_BUCKET`

Optional/recommended:

- `AI_WEBHOOK_TOKEN` for `POST /v1/ai/job-complete`

## Typical End-to-End Flow (Avatar)

1. App calls `POST /v1/user/avatar`
2. Backend stores onboarding/model metadata
3. Backend uploads photo (if provided) to private S3
4. Backend enqueues `avatar_generation`
5. App polls `GET /v1/jobs/:id`
6. AI worker completes and calls `POST /v1/ai/job-complete`
7. Backend updates `Job` + `Avatar` row
8. App fetches status/result; backend returns signed URL for private result path

## Notes for New Developers

- Keep endpoints fast: enqueue and return IDs.
- Never block on AI processing in API requests.
- Always sign private S3 paths before returning to frontend.
- Prefer adding new AI features as a new job type + callback mapping.
