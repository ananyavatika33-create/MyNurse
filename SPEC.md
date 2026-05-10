# MyNurse Production Specification

## Purpose

This document is an implementation-ready specification for rebuilding MyNurse from the current Streamlit MVP into a production-grade health education and symptom tracking application.

It is written for an LLM coding agent. Treat this file as the source of truth for product scope, architecture, safety requirements, and implementation priorities.

## Product Summary

MyNurse is a personal health companion that helps users record symptoms, track health context, identify possible warning signs, and generate non-diagnostic health education guidance.

The product should help users prepare for clinician conversations and monitor symptom changes over time. It must not diagnose, prescribe, replace professional care, or present itself as a medical authority.

## Current MVP

The current app is implemented in `app.py` using:

- Streamlit
- Pandas
- OpenAI API
- Local CSV persistence via `symptom_history.csv`

Current capabilities:

- Collects name, age, known conditions, medications, allergies, symptom, severity, and duration.
- Detects simple red-flag terms using keyword matching.
- Generates fixed emergency guidance for red flags.
- Generates rule-based guidance for common symptoms.
- Optionally generates OpenAI guidance.
- Falls back to rule-based guidance if OpenAI is unavailable or unsafe.
- Saves history to CSV.
- Displays, downloads, and clears symptom history.

## Product Positioning

Use this positioning:

> MyNurse is a symptom journal and health education assistant that helps users organize health information, monitor symptoms, recognize possible warning signs, and prepare for clinician conversations.

Avoid these claims:

- AI nurse
- Medical diagnosis
- Clinical triage
- Treatment recommendation
- Prescription advice
- Emergency decision-making
- Replacement for a doctor, nurse, urgent care, or emergency services

## Target Users

Primary users:

- Adults tracking day-to-day symptoms.
- People with recurring symptoms such as headache, cough, nausea, dizziness, rash, or sore throat.
- Users preparing concise notes for a doctor visit.

Secondary users:

- Caregivers tracking symptoms for another person.
- Users who want an exportable symptom timeline.

## Non-Goals

The app must not:

- Diagnose medical conditions.
- Prescribe treatment.
- Recommend prescription medication changes.
- Provide medication dosing beyond generic label-following language for over-the-counter products.
- Tell users to delay or ignore emergency care.
- Make definitive claims such as "you have X."
- Handle emergencies through a conversational flow.
- Replace a clinician, nurse line, urgent care, emergency department, or local emergency number.

## Core User Experience

### Primary Flow

1. User signs in.
2. User creates or reviews a health profile.
3. User starts a symptom check-in.
4. User enters symptom details.
5. App performs deterministic safety evaluation.
6. If emergency red flags are detected, app shows fixed urgent-care guidance and bypasses AI.
7. If no emergency red flags are detected, app generates safe educational guidance.
8. App saves the check-in and guidance metadata.
9. User views symptom timeline and exports a clinician-ready summary.

### Check-In Fields

Required:

- Main symptom
- Severity from 1 to 10
- Duration

Optional:

- Notes
- Temperature
- Onset date/time
- Symptom location
- Triggers
- Associated symptoms
- What has helped
- What has worsened symptoms
- Relevant condition context
- Relevant medication context
- Relevant allergy context

### Health Profile Fields

User profile:

- First name
- Date of birth
- Sex assigned at birth, optional
- Gender, optional
- Emergency location country/region, optional

Health profile:

- Known conditions
- Current medications
- Known allergies
- Pregnancy status, optional
- Primary clinician contact, optional

The initial production version may keep these fields simple, but the data model should support structured records instead of storing all health context as one text blob.

## Safety Requirements

Safety is the highest-priority system requirement.

### Global Disclaimer

The app must display a clear disclaimer in onboarding, check-in, guidance, and exported reports:

```text
MyNurse is for health education and symptom tracking only. It is not a substitute for professional medical care. If symptoms are severe, worsening, or feel urgent, seek medical care immediately.
```

### Emergency Handling

Emergency handling must be deterministic and must not rely on AI-generated text.

If the app detects an emergency red flag, it must:

- Stop normal guidance generation.
- Bypass AI.
- Show fixed emergency language.
- Tell the user to seek urgent medical care or call local emergency services.
- Save the check-in with safety outcome `emergency`.
- Avoid asking extended follow-up questions before showing emergency guidance.

Initial emergency red-flag concepts:

- Chest pain or chest pressure
- Shortness of breath
- Trouble breathing
- Cannot breathe
- Severe bleeding
- Heavy bleeding
- Stroke-like symptoms
- Face drooping
- Weakness on one side
- Seizure
- Passed out
- Fainting
- Suicidal thoughts
- Self-harm intent
- Anaphylaxis
- Severe allergic reaction
- Swelling of lips, tongue, throat, or face
- Blue lips
- Confusion
- Worst headache of life
- Severe abdominal pain
- Pregnancy with severe pain or bleeding

### High Severity Handling

If severity is 8, 9, or 10 and no emergency red flag is detected:

- Show a high-severity warning.
- Recommend prompt clinician, urgent care, or nurse-line follow-up.
- Do not reassure the user that symptoms are harmless.
- Guidance may still include self-care education, but escalation language must be prominent.

### AI Safety

AI must not be the medical source of truth.

Required AI architecture:

1. Structured intake.
2. Deterministic safety engine.
3. Fixed emergency response if needed.
4. Rule-based content selection.
5. AI generation only for low-to-moderate-risk educational phrasing.
6. Output guardrails.
7. Fallback to approved templates if AI fails or is blocked.

AI must never:

- Diagnose.
- Prescribe.
- Recommend stopping, starting, or changing prescription medications.
- Claim certainty.
- Tell users not to seek care.
- Minimize severe or worsening symptoms.
- Generate emergency guidance when deterministic emergency path should be used.

Blocked output phrase examples:

- "I diagnose"
- "you have"
- "definitely"
- "guaranteed"
- "ignore emergency"
- "do not seek medical care"
- "take double dose"
- "stop all medications immediately"
- "no need to see a doctor"

The blocked phrase list is not sufficient by itself. It should be supplemented with structured response validation.

## Functional Requirements

### Authentication

Production app must support:

- Email/password sign-up and sign-in.
- OAuth sign-in if provided by the auth platform.
- Password reset.
- Session management.
- Account deletion.

### User Data

Each user must only access their own records.

Required user-owned resources:

- Profile
- Conditions
- Medications
- Allergies
- Symptom check-ins
- Guidance outputs
- Exported summaries

### Symptom Check-Ins

The app must allow users to:

- Create a check-in.
- View a check-in.
- Edit a check-in.
- Delete a check-in.
- View all check-ins in a timeline.
- Filter check-ins by symptom, date, severity, and safety outcome.

### Guidance

Every guidance response must include:

- Possible concern
- What to monitor
- Self-care
- When to get help

Guidance must include a source label:

- `emergency_template`
- `rule_based_template`
- `ai_generated_with_guardrails`
- `ai_failed_rule_based_fallback`
- `ai_blocked_rule_based_fallback`

### Export

Users must be able to export:

- CSV symptom history
- PDF clinician summary

Clinician summary should include:

- User-selected date range
- Symptom timeline
- Severity trends
- Current conditions
- Current medications
- Current allergies
- User notes
- Generated educational guidance source metadata, excluding raw prompts unless explicitly needed

### Privacy Controls

Users must be able to:

- Download their data.
- Delete individual check-ins.
- Delete their account and associated records.
- Read privacy policy and terms.
- See clear explanation of AI usage.

## Non-Functional Requirements

### Security

Required:

- HTTPS only.
- Encrypted database at rest.
- Strong authentication provider.
- Per-user authorization on every API route.
- No secrets in source code.
- Secrets stored in managed environment variables or secret manager.
- No sensitive health details in application logs by default.
- Audit events for account deletion, data export, and major profile changes.
- CSRF protection where applicable.
- Rate limiting for auth and AI endpoints.

### Privacy

Required:

- Collect minimum necessary data.
- Clear consent before storing health information.
- Clear disclosure when AI is used.
- Delete user data on request.
- Avoid sending unnecessary data to AI providers.
- Store AI request metadata without storing avoidable sensitive content.

### Reliability

Required:

- AI failures must not break check-in flow.
- Database errors must surface cleanly.
- Emergency guidance must work without AI.
- App must be deployable through repeatable CI/CD.

### Accessibility

Required:

- Keyboard navigable UI.
- Visible focus states.
- Sufficient color contrast.
- Form labels for all inputs.
- Screen-reader-friendly status messages.
- No critical guidance communicated by color alone.

## Optimal Production Tech Stack

This stack prioritizes fast implementation, strong type safety, good UX, production deployment, and clean LLM-assisted development.

### Frontend

- Next.js App Router
- React
- TypeScript
- Tailwind CSS
- shadcn/ui
- Lucide React icons
- React Hook Form
- Zod
- TanStack Query if using separate API calls heavily
- Recharts for symptom trends

Why:

- Next.js supports production routing, server components, API routes, and deployment well.
- TypeScript and Zod improve safety for health data forms.
- shadcn/ui gives accessible, composable UI components.
- Tailwind allows fast, consistent styling without a heavy design system.

### Backend

Recommended primary option:

- Next.js Route Handlers and Server Actions
- TypeScript
- Zod validation
- Prisma ORM

Alternative if backend separation is preferred:

- FastAPI
- Python
- Pydantic
- SQLAlchemy

Use the Next.js backend path unless there is a strong reason to split the backend. A single TypeScript codebase will be faster for early production.

### Database

- PostgreSQL
- Prisma migrations

Recommended managed providers:

- Supabase Postgres
- Neon
- AWS RDS
- Google Cloud SQL

For a serious health product, choose infrastructure that can support required privacy/security obligations and legal agreements.

### Authentication

Recommended:

- Clerk or Auth0 for fastest production auth

Alternative:

- NextAuth/Auth.js if self-managing more auth behavior is preferred

Auth must support account deletion and stable user IDs that map cleanly to database records.

### AI

- OpenAI API
- Server-side only API calls
- Prompt templates versioned in code
- Safety engine runs before AI
- Output validator runs after AI
- Rule-based fallback always available

Environment variables:

```text
OPENAI_API_KEY
OPENAI_MODEL
```

Suggested default model:

```text
gpt-4o-mini
```

Use a newer model only after evaluating cost, latency, and safety behavior.

### File And Report Generation

- CSV export generated server-side.
- PDF generation with React PDF, Playwright PDF, or server-side HTML-to-PDF.

### Observability

- Sentry for frontend/backend errors.
- Structured application logs.
- Provider-native metrics for database and hosting.
- AI call metrics: latency, success/failure, fallback reason, safety outcome, model, prompt version.

Do not log raw health text by default.

### Testing

- Vitest for unit tests.
- React Testing Library for components.
- Playwright for end-to-end tests.
- Zod schema tests.
- Safety fixture tests for red-flag handling.

### Deployment

Fastest path:

- Vercel for Next.js.
- Neon or Supabase for Postgres.
- Clerk or Auth0 for auth.
- Sentry for monitoring.

More controlled path:

- AWS ECS/Fargate or App Runner.
- RDS Postgres.
- Cognito/Auth0.
- CloudWatch/Sentry.
- AWS Secrets Manager.

Use the fastest path for MVP production unless legal/security review requires a more controlled environment.

## Recommended Repository Structure

```text
.
├── app/
│   ├── (auth)/
│   ├── (dashboard)/
│   ├── api/
│   ├── check-ins/
│   ├── profile/
│   └── layout.tsx
├── components/
│   ├── check-ins/
│   ├── guidance/
│   ├── profile/
│   └── ui/
├── lib/
│   ├── ai/
│   ├── auth/
│   ├── db/
│   ├── safety/
│   ├── schemas/
│   └── exports/
├── prisma/
│   └── schema.prisma
├── tests/
│   ├── unit/
│   ├── safety/
│   └── e2e/
├── docs/
│   ├── privacy-notes.md
│   └── safety-review.md
├── SPEC.md
├── README.md
└── package.json
```

## Data Model

Use this as the initial production schema.

### User

Fields:

- `id`
- `authProviderUserId`
- `email`
- `createdAt`
- `updatedAt`
- `deletedAt`

### HealthProfile

Fields:

- `id`
- `userId`
- `firstName`
- `dateOfBirth`
- `sexAssignedAtBirth`
- `gender`
- `emergencyRegion`
- `createdAt`
- `updatedAt`

### Condition

Fields:

- `id`
- `userId`
- `name`
- `notes`
- `active`
- `createdAt`
- `updatedAt`

### Medication

Fields:

- `id`
- `userId`
- `name`
- `doseText`
- `frequencyText`
- `notes`
- `active`
- `createdAt`
- `updatedAt`

Do not generate dosing advice from these fields.

### Allergy

Fields:

- `id`
- `userId`
- `substance`
- `reaction`
- `severity`
- `notes`
- `active`
- `createdAt`
- `updatedAt`

### SymptomCheckIn

Fields:

- `id`
- `userId`
- `symptom`
- `severity`
- `duration`
- `onsetAt`
- `location`
- `temperature`
- `associatedSymptoms`
- `triggers`
- `relievingFactors`
- `worseningFactors`
- `notes`
- `safetyOutcome`
- `createdAt`
- `updatedAt`

Allowed `safetyOutcome` values:

- `emergency`
- `high_severity`
- `monitor`
- `unknown`

### Guidance

Fields:

- `id`
- `userId`
- `checkInId`
- `source`
- `contentMarkdown`
- `model`
- `promptVersion`
- `safetyVersion`
- `fallbackReason`
- `createdAt`

Allowed `source` values:

- `emergency_template`
- `rule_based_template`
- `ai_generated_with_guardrails`
- `ai_failed_rule_based_fallback`
- `ai_blocked_rule_based_fallback`

### AuditEvent

Fields:

- `id`
- `userId`
- `type`
- `metadataJson`
- `createdAt`

Example event types:

- `account_created`
- `profile_updated`
- `check_in_created`
- `data_exported`
- `account_deleted`

## Safety Engine Specification

Implement safety logic in a dedicated module:

```text
lib/safety/
```

Required exported functions:

- `evaluateCheckInSafety(input)`
- `hasEmergencyRedFlag(input)`
- `hasHighSeverity(input)`
- `getEmergencyGuidance(input)`
- `validateGuidanceOutput(text)`

Safety evaluation order:

1. Normalize symptom and notes.
2. Check emergency red flags.
3. Check high severity.
4. Return monitor or unknown status.

Emergency red flags must match across:

- Main symptom
- Notes
- Associated symptoms

Do not rely only on the main symptom field.

## Guidance Generation Specification

Implement guidance in:

```text
lib/guidance/
```

Required flow:

1. Evaluate safety.
2. If emergency, return emergency template.
3. Generate rule-based fallback.
4. If AI disabled, return fallback.
5. If AI enabled, call AI with minimal necessary user context.
6. Validate AI output.
7. Return AI output if valid.
8. Otherwise return fallback with fallback reason.

Required guidance sections:

- `Possible concern`
- `What to monitor`
- `Self-care`
- `When to get help`

## Prompt Requirements

Prompt must include:

- Non-diagnostic role.
- No prescribing.
- No certainty.
- Use only educational language.
- Escalate high severity.
- Fixed output headings.
- Concise response.

Prompt must not include:

- Raw full user history unless needed.
- Irrelevant profile details.
- Hidden instructions that contradict safety rules.

Prompt versions must be tracked.

## UI Requirements

Design direction:

- Calm, clinical, trustworthy, and utilitarian.
- Prioritize clarity over marketing style.
- Do not use a landing page as the first authenticated experience.
- Dashboard should show recent check-ins, trend summaries, and primary action to start a check-in.
- Emergency warnings must be visually prominent and textually explicit.
- Do not use color alone to indicate urgency.

Core screens:

- Sign in
- Onboarding/profile setup
- Dashboard
- New check-in
- Guidance result
- Symptom timeline
- Check-in detail
- Profile
- Conditions
- Medications
- Allergies
- Export
- Settings/privacy

## API Requirements

If using Next.js Route Handlers, implement routes equivalent to:

```text
POST   /api/check-ins
GET    /api/check-ins
GET    /api/check-ins/:id
PATCH  /api/check-ins/:id
DELETE /api/check-ins/:id

POST   /api/guidance

GET    /api/profile
PATCH  /api/profile

GET    /api/conditions
POST   /api/conditions
PATCH  /api/conditions/:id
DELETE /api/conditions/:id

GET    /api/medications
POST   /api/medications
PATCH  /api/medications/:id
DELETE /api/medications/:id

GET    /api/allergies
POST   /api/allergies
PATCH  /api/allergies/:id
DELETE /api/allergies/:id

GET    /api/export.csv
GET    /api/export.pdf
DELETE /api/account
```

Every route must enforce authenticated user ownership.

## Testing Requirements

### Unit Tests

Required coverage:

- Safety red-flag matching.
- High severity handling.
- Emergency guidance bypasses AI.
- Rule-based fallback generation.
- AI output validation.
- Zod schema validation.
- Per-user authorization helpers.

### Safety Fixture Tests

Create fixtures for at least:

- Chest pain
- Chest pressure
- Trouble breathing
- Cannot breathe
- Severe bleeding
- Stroke-like symptoms
- Face drooping
- One-sided weakness
- Seizure
- Fainting
- Suicidal thoughts
- Self-harm intent
- Allergic reaction with throat swelling
- Worst headache of life
- Severe abdominal pain
- Pregnancy with bleeding
- High severity headache
- Moderate cough
- Mild nausea

### E2E Tests

Required flows:

- Sign up.
- Create profile.
- Create normal check-in.
- Create high-severity check-in.
- Create emergency check-in.
- Verify emergency path bypasses AI.
- Export CSV.
- Delete check-in.
- Delete account.

## Acceptance Criteria

Production MVP is acceptable when:

- Users can sign up, sign in, and delete accounts.
- Users can create, view, edit, and delete symptom check-ins.
- Users can maintain conditions, medications, and allergies.
- Emergency red flags trigger deterministic emergency guidance.
- High severity triggers escalation language.
- AI can be disabled globally by environment variable.
- AI failures fall back to rule-based guidance.
- Users can export CSV history.
- No user can access another user's records.
- Sensitive data is not logged by default.
- Core safety fixture tests pass.
- Core E2E tests pass.
- App deploys through a documented production path.

## Implementation Phases

### Phase 1: Production Foundation

- Create Next.js app with TypeScript.
- Add Tailwind and shadcn/ui.
- Add auth.
- Add Prisma and Postgres.
- Implement user-owned data models.
- Implement dashboard shell.

### Phase 2: Check-Ins And Safety

- Implement symptom check-in form.
- Implement safety engine.
- Implement emergency templates.
- Implement rule-based guidance.
- Add unit and safety fixture tests.

### Phase 3: AI Guidance

- Add OpenAI server-side integration.
- Add prompt templates and prompt versioning.
- Add output validation.
- Add fallback handling.
- Add source labels and guidance metadata.

### Phase 4: History And Export

- Implement timeline.
- Implement check-in detail pages.
- Implement CSV export.
- Implement PDF clinician summary.

### Phase 5: Privacy, Settings, And Hardening

- Add account deletion.
- Add data download.
- Add privacy/AI disclosure screens.
- Add audit events.
- Add rate limiting.
- Add Sentry.
- Add E2E tests.

## Migration Notes From Current MVP

Preserve these concepts:

- Required symptom field.
- Severity scale from 1 to 10.
- Duration capture.
- Red-flag bypass of AI.
- Rule-based fallback.
- OpenAI optionality.
- Guidance source labels.
- Symptom history export.

Replace these concepts:

- Replace Streamlit with production web app.
- Replace CSV with Postgres.
- Replace free-text-only health context with structured profile resources.
- Replace keyword-only safety with a more comprehensive safety engine.
- Replace one-file app structure with modular frontend, backend, safety, guidance, and data layers.

## Open Questions

Resolve before public launch:

- Is the app for adults only, or will it support children/caregivers?
- Which countries/regions will be supported for emergency language?
- Will the product pursue HIPAA-ready infrastructure from day one?
- Will clinician review be performed before launch?
- Should AI be enabled by default or only after explicit consent?
- What retention period should apply to deleted user data and logs?
- What exact legal disclaimers, terms, and privacy policy language will counsel approve?

## Current Legal And Compliance Assumption

This specification assumes MyNurse remains a health education and tracking product, not a diagnostic or clinical triage product.

If the product starts recommending urgency levels, differential diagnoses, treatment decisions, medication changes, or clinician workflows, obtain regulatory and healthcare legal review before launch.
