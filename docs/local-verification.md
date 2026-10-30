# ClinicFlow local verification

Date: 2026-10-29  
Environment: Node.js on the host; PostgreSQL 17 and Mailpit in isolated ClinicFlow Docker Compose services. Fictional data only.

## Automated results

The existing integration suite completed with **17 passed, 0 failed** against the running API and real PostgreSQL:

1. Anonymous access and cross-origin writes denied.
2. Four roles authenticate; patient/receptionist administrative access denied.
3. Concurrent therapist claims: exactly one stored booking.
4. Concurrent room claims: exactly one stored booking.
5. Duration, adjacency, hours, and invalid duration checks.
6. Failed reschedule preserves original booking; successful reschedule releases it.
7. Cancellation releases capacity.
8. Telephone/walk-in bookings share the schedule and conflict checks.
9. Patient isolation and therapist assignment restrictions.
10. Caregiver booking scope and immediate revocation.
11. Waitlist conversion and rollback on conflict.
12. Exceptions enforced without silently displacing existing bookings.
13. Document upload/download, isolation, size, and type validation.
14. Current consent, confirmed-send deduplication, stale reminder suppression, and captured-email evidence.
15. Staff/room changes preserve future appointments; audit events recorded.
16. Production startup refuses local shortcuts.
17. Logout invalidates the server session.

TypeScript checking and the optimized React build passed. The production dependency audit returned zero known vulnerabilities after upgrading Nodemailer. This is a point-in-time check, not a guarantee of security.

## Browser verification

Patient sign-in and booking were exercised in Google Chrome. A fictional appointment was saved and appeared on the patient dashboard with its therapist, room, duration, and time. Screenshot evidence is kept in the ignored local artifact directory.

The patient dashboard was also inspected at a 390 × 844 viewport. Its document width did not exceed the viewport; the navigation uses a separate horizontal scroll area. This is a responsive layout check, not full accessibility conformance testing.

## Limits and remaining gates

- This is local functional acceptance, not AWS or production acceptance.
- Full application Docker image build has not been verified; database and email containers are running and tested.
- Cognito/S3/AWS reminder adapters, Terraform deployment, CloudWatch/SNS alarms, and AWS recovery drills remain pending.
- The ambiguous reminder state is durable and has a manual reconciliation endpoint; process-crash fault injection and SMTP outage recovery have not yet been exercised.
- Formal WCAG conformance and approved latency, peak-load, RPO, and RTO targets remain unverified.
- Demo policy values are recorded in README.md; unresolved client policies have not been declared approved.
- No real patient information, AWS spending, deployment, or Project 1 changes occurred.

