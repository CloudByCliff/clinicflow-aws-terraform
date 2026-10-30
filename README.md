# ClinicFlow

A working local physical therapy scheduling application using React, TypeScript, Node.js, PostgreSQL, and Docker. All patient records are fictional.

## Start locally

Prerequisites: Node.js 24, npm, and a running Docker Desktop Linux engine.

1. Run `npm ci`.
2. Run `npm run setup`. This creates ignored local configuration and random demo credentials; it preserves existing configuration.
3. Run `docker compose up -d db mail`.
4. Run `npm run build`.
5. Run `npm start`.

Open **http://localhost:3000**. The captured email inbox is **http://localhost:8025**. Local sign-in credentials are in **.local/access.txt**. Do not commit or share that file.

On this Windows machine, if npm is missing from PATH, use `& "C:\Program Files\nodejs\npm.cmd"` in place of `npm`.

The verified runtime uses the Node application on the host and PostgreSQL/Mailpit in Docker. A full application container is also defined: `docker compose up --build -d`. Stop the host application first to avoid port 3000 conflicts. The full application image has not yet been built or verified.

For frontend development, run `npm run client` in a second terminal; Vite serves port 5173 and proxies the API to port 3000.

## What works

- Patient registration and sign-in; four role-specific workspaces.
- Patient, telephone, walk-in, and authorized caregiver bookings on one schedule.
- Available-time selection, different durations, atomic rescheduling, cancellation, and PostgreSQL exclusion constraints preventing therapist/room overlap.
- Receptionist patient registration, waitlist editing, and atomic conversion to a booking.
- Therapist access limited to patients with a scheduled appointment assigned to them within the demo access window.
- Administrator staff/role management, rooms, operating hours, and schedule exceptions.
- Private document uploads/downloads with file type and size checks.
- Reminder preferences/consent, durable scheduling intent, a local email worker, delivery status, safe retries, and ambiguous-send reconciliation.
- Reporting and application audit history.

## Security and local boundaries

Passwords are scrypt-hashed with random salts. Sessions are random opaque tokens stored as hashes in PostgreSQL, expire after eight hours, and use HttpOnly/SameSite=Strict cookies. API mutations require a same-origin custom header. Authorization is enforced on the server.

HTTP cookies are used only for this loopback local demo. The host API binds to 127.0.0.1. Docker publishes ports only on loopback. Do not expose this environment to a public network.

Production startup is deliberately blocked. This release does not enable local authentication, demo accounts, filesystem documents, or SMTP capture in production. Cognito, private S3, and the AWS reminder pipeline must be integrated and verified before deployment; setting an environment flag cannot turn this demo into production.

Uploads are immutable separate records, stored outside the web root. Only the patient and an assigned therapist can access them in the demo policy; administrators/receptionists do not automatically gain file access. File signatures and limits are checked, but malware scanning is not implemented. Upload trusted fictional files only.

Reminder intent is stored in the same transaction as the appointment. The worker checks cancellation, current appointment version, consent, and preferences before sending. It commits an ambiguous marker before SMTP, so a crash cannot silently requeue a possibly delivered message. Ambiguous sends require operator review; exactly-once email delivery is not claimed.

## Demo policy choices

These are implementation defaults, not newly approved clinic policies:

- America/New_York; Monday–Friday, 08:00–18:00; 15–120 minute appointments; no buffer.
- One therapist and one room per appointment.
- Caregivers may book only; patient-granted authorization is revocable.
- Therapist patient access requires a scheduled assigned appointment ending within the past 30 days or in the future.
- Staff-created patient records do not automatically establish a patient login. Secure account linking is still required.
- Email reminder lead time is 24 hours. Recently booked appointments within that window are processed on the next worker cycle.
- Operating-hour changes, staff/room deactivation, and exceptions reject conflicts with existing future bookings; reschedule those appointments first.
- Document limit: 5 MB; PDF, PNG, JPEG, and text. Production retention, malware handling, and version recovery remain open.

The original requirements documents are preserved in `docs/`. The user's subsequent instruction authorizes local implementation; the original Milestone 0 restrictions describe that earlier phase.

## Verification

With the local app and containers running:

- `npm run build` — TypeScript and optimized React build.
- `npm test` — API/database integration tests against the running application.
- `npm audit --omit=dev` — dependency vulnerability review.

Tests create uniquely named fictional accounts, rooms, and appointments in the local database. They cancel their own appointments afterward and preserve audit evidence; they never reset the database. Do not point the suite at production.

See [local verification](docs/local-verification.md) for recorded results and limits.

## AWS target and approval gate

The approved target remains ECS Fargate, RDS PostgreSQL, Cognito, private S3, EventBridge Scheduler, SQS, Lambda, SES, CloudWatch/SNS, and Terraform in us-east-1, with the approved network, delivery, recovery, and cost controls.

No AWS resources have been created, no Terraform apply has run, and Project 1 is untouched. The $25 account-wide budget and explicit deployment approval remain gates. AWS adapters, infrastructure, monitoring, PITR/version restore drills, production identity/account recovery, and formal accessibility/performance acceptance are subsequent work—not verified features of this local release.

## Git

Public portfolio repository: https://github.com/CloudByCliff/clinicflow-aws-terraform

Credentials, environment files, local uploads, test artifacts, private keys, Terraform state, and variable files are ignored. Source and the three baseline documents are committed in meaningful milestones. No deployment workflow runs automatically on push.

