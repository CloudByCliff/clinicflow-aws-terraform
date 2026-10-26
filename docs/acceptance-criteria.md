# ClinicFlow Acceptance Criteria

| Field | Value |
| --- | --- |
| Document | `docs/acceptance-criteria.md` |
| Project | ClinicFlow |
| Milestone | 0 — criteria defined, not executed |
| Status | Draft for review |
| Version | 1.0 — consolidated review baseline |
| Date | 2026-10-26 |
| Companion | `docs/clinicflow-final-requirements.md`, `docs/architecture-decisions.md` |

## 1. How to use these criteria

Milestone 0 is accepted when a reviewer approves the requirements baseline, the architecture decisions, and this criteria list, including the open TBD items. Milestone 0 does not require a running clinic system.

Later milestones execute the product criteria. A criterion is met only when the pass measure is observed and recorded. A demonstration that contradicts an approved requirement fails even if the screen looks complete.

| Result | When to use it |
| --- | --- |
| Pass | The pass measure was observed in the approved environment, or in a local environment when the criterion says local evidence is enough. |
| Fail | The pass measure was not observed. |
| Blocked | A listed TBD or ADR-012 decision prevents a fair test. The blocker ID is recorded. |
| Waived | The owner explicitly waived the criterion in an ADR-012 option C decision. The waiver names the criterion ID. |

Fictional people are used in every test. Example names in this document are placeholders, not a real clinic panel: `Riley Example`, `Jordan Example`, `Avery Example`, therapist `Taylor Example`, receptionist `Casey Example`, administrator `Morgan Example`.

Where a criterion depends on an unresolved rule, the test uses the rule that is approved later. Until then the result is Blocked, not a guessed Pass.

## 2. Milestone 0 document gate

| ID | Criterion | Pass measure | Evidence |
| --- | --- | --- | --- |
| AC-M0-01 | The three Milestone 0 documents exist in the repository and match the approved decision set. | Reviewer finds no invented clinic identity, no invented business statistic, and no HIPAA compliance claim. | Review record in the approval section of the requirements document |
| AC-M0-02 | Unresolved items stay on the TBD register. | Each gap in section 14 of the requirements document has an ID and a "needed before" point. | Document review |
| AC-M0-03 | Approved requirements are distinguishable from proposals. | A reader can identify Approved, Proposed, TBD, Out of scope, and Constraint without reading this criteria document. | Document review |
| AC-M0-04 | No implementation was started as part of Milestone 0. | The change set for Milestone 0 contains the requirements documents and no application code, Terraform apply, AWS resource, or Project 1 edit. | Repository contents and reviewer confirmation |
| AC-M0-05 | The budget conflict is explicit. | ADR-012 identifies the unresolved affordability risk, requires a current account-wide estimate against $25, and pre-selects no option. | `docs/architecture-decisions.md` |

Detailed fixtures, viewports, and failure-injection methods are proposed verification methods for approval, not additional clinic policies. No product criterion has been executed in Milestone 0. Record criterion ID, build, environment, date, tester, expected/actual result, evidence location, and blocker or defect. A waiver is not a Pass.

Product criteria below become testable after the milestone named in each row. They are not M0 execution tasks.

## 3. Schedule and conflicts

Approved sources: BR-03, BR-08, BR-09, BR-10, FR-SCH-01 through FR-SCH-11, NFR-03.

Test data for this section, once timezone and hours exist:

- Therapist `Taylor Example`
- Rooms `Room A` and `Room B` (names are fixtures, not an approved room inventory)
- A bookable hour inside approved operating hours
- Durations of 30 minutes and 60 minutes, or the approved catalog values from TBD-05

| ID | Criterion | Pass measure | Milestone | Blocked by |
| --- | --- | --- | --- | --- |
| AC-SCH-01 | A second appointment cannot overlap the same therapist. | Given Taylor booked 09:00–09:45, a booking for Taylor at 09:30–10:15 is rejected. The original row is unchanged. The rejected interval is absent. | M5 | TBD-02, TBD-03 |
| AC-SCH-02 | A second appointment cannot overlap the same room. | Given Room A booked 09:00–09:45 with Taylor, a booking for Room A at 09:30–10:15 with a different therapist is rejected. Both the original appointment and the other therapist's schedule stay unchanged. | M5 | TBD-02, TBD-04 |
| AC-SCH-03 | Adjacent appointments may share an endpoint. | An appointment ending at 10:00 and another starting at 10:00 for the same therapist and a free room are both stored, unless an approved buffer rule says otherwise. | M5 | TBD-06. If a buffer is later required, this criterion is rewritten to match it. |
| AC-SCH-04 | Duration defines the occupied interval. | A 30-minute appointment and a 60-minute appointment store different end times. The 60-minute appointment blocks a start 45 minutes after its start. The 30-minute appointment does not block a start 45 minutes after its start. | M5 | TBD-05 |
| AC-SCH-05 | Operating hours are enforced. | A booking that starts or ends outside approved operating hours is rejected and is not stored. | M5 | TBD-03 |
| AC-SCH-06 | A scheduling exception is enforced. | After an exception marks Taylor unavailable for an interval, a booking for Taylor in that interval is rejected. A booking for another therapist in a free room during that interval still succeeds. | M5 | TBD-27 for who may create the exception. The rejection itself can be tested with administrator-created data. |
| AC-SCH-07 | Room exceptions are enforced. | After Room A is unavailable for an interval, a booking that uses Room A in that interval is rejected. The same interval in Room B succeeds when the therapist is free. | M5 | TBD-04 |
| AC-SCH-08 | Reschedule is all or nothing. | When the target interval conflicts, the appointment remains on the original interval. When the target interval is free, the original interval becomes available and the new interval is occupied. | M5 | TBD-02 |
| AC-SCH-09 | Cancellation frees capacity. | After cancellation, the therapist and room accept a new appointment in that interval. The cancelled appointment no longer appears as an active booking. | M5 | TBD-26 only if cancellation is represented as a status. The capacity result is still required. |
| AC-SCH-10 | Concurrent claims do not double book. | Two simultaneous booking requests for the same therapist and overlapping times produce one stored appointment and one rejection. Repeat for the same room with two therapists. | M5 | Schedule foundations; the mechanism is selectable, but preventing concurrent double booking is mandatory |
| AC-SCH-11 | Existing appointments survive a new exception until a handling rule exists. | Creating an exception over an existing appointment does not delete or move that appointment unless TBD-35 has approved that behavior. The test records which approved behavior ran. | M5 | TBD-35. Until resolved, this criterion is Blocked; unchanged rows alone do not establish the approved workflow. |

## 4. One schedule for every channel

Approved sources: BR-03, BR-04, BR-05, BR-11, FR-SCH-03, FR-WAIT-03.

| ID | Criterion | Pass measure | Milestone | Blocked by |
| --- | --- | --- | --- | --- |
| AC-CH-01 | Patient self-service uses the shared schedule. | An appointment booked by Riley Example appears on Taylor's schedule and on the receptionist schedule view with the same identifier, start, duration, therapist, and room. | M7 | TBD-02 |
| AC-CH-02 | Telephone booking uses the shared schedule. | Casey Example books Jordan Example by the receptionist flow. The appointment is visible to Jordan and to Taylor with the same identifier. | M5 | None beyond schedule foundations |
| AC-CH-03 | Walk-in booking uses the shared schedule. | A walk-in created by Casey occupies the therapist and room and is visible in the same schedule query used by AC-CH-02. It does not appear only on a separate walk-in list. | M5 | TBD-14 for the channel label. The shared-schedule result is still required. |
| AC-CH-04 | Caregiver booking uses the shared schedule. | Avery Example, authorized for Riley, books an appointment. The appointment's patient is Riley. It appears on Riley's schedule and Taylor's schedule. | M8 | TBD-12 |
| AC-CH-05 | Channel does not change conflict behavior. | The overlapping therapist case in AC-SCH-01 fails the same way for patient, receptionist, and caregiver callers. | M8 | TBD-12 for the caregiver leg |
| AC-CH-06 | Waitlist conversion uses the shared schedule. | Converting a waitlist entry creates one normal appointment visible in the same schedule query. A conversion that conflicts creates no appointment, and the waitlist entry is still present. | M6 | TBD-13 for who may convert. Receptionist conversion is enough to test the mechanics. |
| AC-CH-07 | Waitlist entries do not reserve capacity. | While a waitlist entry exists for Taylor, another caller can book Taylor in that interval. The waitlist entry remains. | M6 | PA-04. If a later decision says waitlist entries reserve time, replace this criterion instead of keeping both. |

## 5. Access control

Approved sources: FR-IAM-01 through FR-IAM-07, SEC-06, SEC-07, SEC-20.

Execute these against the API, not only the user interface. Use a second patient, `Jordan Example`, as the record Riley must not see.

| ID | Criterion | Pass measure | Milestone | Blocked by |
| --- | --- | --- | --- | --- |
| AC-AUTH-01 | Unauthenticated callers are denied. | Requests with no token, an expired token, or a malformed token to patient, schedule, document, staff, and report APIs are rejected and return no record body. | M4 | None |
| AC-AUTH-02 | Patients are isolated. | Signed in as Riley, calls for Jordan's profile, appointments, documents, preferences, and consent are denied. Riley's own appointments still load. | M4 | TBD-31 for profile fields. Isolation can be tested with any stored field. |
| AC-AUTH-03 | Enumeration stays generic. | A request for a patient identifier that does not exist and a request for a patient the caller cannot access return the same denial behavior, without a body that identifies the other patient. | M4 | None |
| AC-AUTH-04 | Therapists are restricted. | Taylor can open a patient the approved rule allows and cannot open a patient the rule excludes. The denied call returns no clinical or contact payload. | M4 | TBD-10. Do not substitute an unapproved rule and mark Pass. |
| AC-AUTH-05 | Receptionists cannot administer roles. | Casey cannot create a staff user, change a role, change operating hours, or change the room inventory. Casey can still complete a telephone booking. | M4 | None |
| AC-AUTH-06 | Patients cannot administer the clinic. | Riley cannot change roles, hours, rooms, another patient's appointment, or the waitlist of another patient. | M4 | TBD-13 if patient waitlist self-service is later approved. Update this row if that happens. |
| AC-AUTH-07 | Caregiver scope is limited to the linked patient. | Avery can perform each caregiver action that TBD-12 allows for Riley, and is denied those actions for Jordan. After revocation, the previously allowed call for Riley is denied. | M8 | TBD-12 |
| AC-AUTH-08 | UI hiding is not the control. | A receptionist token sent directly to an administrator endpoint is denied even if the button is absent. Repeat for patient token against a staff endpoint. | M4 | None |
| AC-AUTH-09 | Role assignment works. | Morgan assigns receptionist and therapist roles. Each account can complete one action of its role and is denied one action reserved for the other role, consistent with the permission matrix. | M4 | Proposed matrix cells must be accepted or replaced before those specific actions are failed. |

## 6. Documents

Approved sources: FR-DOC-01 through FR-DOC-03, SEC-03, SEC-08.

Use a small fictional text file. Do not use a real clinical document.

| ID | Criterion | Pass measure | Milestone | Blocked by |
| --- | --- | --- | --- | --- |
| AC-DOC-01 | Upload stores a private object. | An authorized upload of a fictional file results in an S3 object. The bucket blocks public access. An anonymous HTTPS GET of the object URL fails. | M9 | TBD-17 for which role is authorized to upload. Test with one role the owner has approved. |
| AC-DOC-02 | Retrieval is authorized. | A caller allowed by TBD-17 retrieves the file and the contents match the upload. A caller who is not allowed receives a denial and not the bytes. | M9 | TBD-17 |
| AC-DOC-03 | Patient isolation applies to files. | Riley cannot retrieve Jordan's object by identifier or by guessing a key. | M9 | TBD-17 |
| AC-DOC-04 | Therapist restriction applies to files. | The therapist access rule from TBD-10 is applied to document retrieval. A therapist outside the rule receives a denial. | M9 | TBD-10, TBD-17 |
| AC-DOC-05 | Versioning recovers a prior object. | After a second upload replaces a fictional test object, the previous version is still recoverable from S3 and matches the first upload. | M9 | None once the bucket exists |
| AC-DOC-06 | Metadata supports authorization. | The application record ties the object to the patient, the uploader, and the time. Deleting or hiding that metadata is not required for this criterion. An object with no patient relationship is not downloadable through the application. | M9 | PA-06, or an approved substitute |
| AC-DOC-07 | Transport to the bucket is encrypted. | The bucket denies a non-TLS request. Application configuration uses HTTPS endpoints. | M9 | None once the bucket exists |

## 7. Reminders, preferences, and consent

Approved sources: FR-REM-01 through FR-REM-06.

SES may be in sandbox. Tests that send mail use verified recipient addresses and fictional display names (TBD-24). A sandbox limitation blocks production recipient tests. It does not block a test to a verified address.

| ID | Criterion | Pass measure | Milestone | Blocked by |
| --- | --- | --- | --- | --- |
| AC-REM-01 | A permitted reminder sends once. | For a future fictional appointment with consent present and email preference enabled, the pipeline sends one email to the configured address. A forced second delivery after confirmed successful-send recording does not send another email. Ambiguous acceptance is tested under AC-REM-10. | M10 | TBD-15, TBD-16, TBD-24 |
| AC-REM-02 | Missing consent suppresses the send. | With preference enabled and consent absent, no email is sent. The appointment remains unchanged. The suppression is visible in logs or reminder status. | M10 | TBD-16 |
| AC-REM-03 | A declined preference suppresses the send. | With consent present and email reminders declined, no email is sent. The appointment remains unchanged. | M10 | TBD-15 |
| AC-REM-04 | Booking does not wait on email. | Creating an appointment returns successfully when SES is unavailable or the worker is stopped. The appointment exists. The reminder is queued or scheduled for later processing. | M10 | None once M5 and the queue exist |
| AC-REM-05 | Failure is visible and retryable. | A forced worker failure leaves a visible failed or dead-letter signal and an SNS or CloudWatch alarm. After the fault is removed, processing can complete. Combined with AC-REM-01, a reminder that already succeeded is not sent again. | M10 | TBD-34 for the recipient address. The alarm resource itself can be asserted in the test account. |
| AC-REM-06 | Reminder work does not move the appointment. | After a successful send, a suppressed send, and a failed send, start time, therapist, room, and duration are unchanged. | M10 | PA-07 |
| AC-REM-07 | Cancelled appointments do not send an active reminder. | After cancellation before the lead time, no appointment reminder email is sent for that appointment. | M10 | TBD-15 |
| AC-REM-08 | The email does not claim HIPAA compliance and does not include document bytes. | The rendered fictional message has the appointment facts approved for the template and contains neither a HIPAA compliance statement nor file contents. | M10 | TBD-01, TBD-15 template text |

## 8. Administration, waitlist, and caregiver workflows

| ID | Criterion | Pass measure | Milestone | Blocked by |
| --- | --- | --- | --- | --- |
| AC-ADM-01 | Staff and roles can be managed. | Morgan creates a fictional staff user, assigns therapist, and later deactivates the user. The deactivated user cannot sign in to a protected action. New bookings cannot name that user as therapist. | M4 | TBD-33 for the fate of future appointments already on that therapist. Record those rows separately. |
| AC-ADM-02 | Hours and rooms can be managed. | Morgan changes an operating hour and adds a room. Subsequent bookings follow the new hours and can use the new room. Prior appointments remain stored. | M5 | TBD-03, TBD-04 for real values. Fixture values are acceptable for the test. |
| AC-OPS-01 | Receptionist telephone and walk-in flows complete. | Casey registers fictional patient Jordan, books a telephone appointment, and books a walk-in, both visible on the shared schedule, with conflicts rejected. | M5 | TBD-31, TBD-14 |
| AC-WAIT-01 | Receptionist waitlist management completes. | Casey adds, updates, and removes a waitlist entry without changing therapist or room occupancy. Conversion follows AC-CH-06. | M6 | TBD-13 |
| AC-CG-01 | Authorized caregiver can book. | With a current authorization, Avery books for Riley. Without one, the same call is denied and no appointment is stored. | M8 | TBD-12 |
| AC-CG-02 | Caregiver actions stop at the approved boundary. | For each action TBD-12 does not grant, Avery's call is denied. The test lists the granted and denied actions that were approved. | M8 | TBD-12 |

## 9. Patient experience

Approved sources: BR-12, NFR-01, FR-PAT-04, FR-REM-02, FR-REM-03.

| ID | Criterion | Pass measure | Milestone | Blocked by |
| --- | --- | --- | --- | --- |
| AC-UX-01 | A patient can complete registration and booking on a phone-sized viewport. | At a 390 by 844 CSS viewport, Riley can register, sign in, book a free interval, see the appointment, reschedule it, and cancel it without horizontal scrolling that hides the primary actions. | M7 | TBD-07, TBD-08, TBD-31, and ADR-012 if this is tested only in a deployed environment. A local run is sufficient for this UI criterion. |
| AC-UX-02 | The patient path is keyboard accessible. | Using keyboard only, a tester can reach and operate registration, booking, reschedule, cancel, reminder preference, and consent controls. Focus is visible. | M7 | PA-09. If WCAG 2.2 AA is rejected, replace the conformance bar and keep keyboard access as the approved accessibility outcome. |
| AC-UX-03 | Primary patient controls expose accessible names. | Form fields for registration, booking, preferences, and consent have programmatic names. Errors are announced in text, not by color alone. | M7 | PA-09 |
| AC-UX-04 | Preferences and consent can be changed by the patient. | Riley can turn email reminders off and on and can record or withdraw the approved consent choice. The next reminder run matches AC-REM-02 and AC-REM-03. | M7 and M10 | TBD-16 |
| AC-UX-05 | The patient experience does not claim HIPAA compliance. | Screens Riley sees during AC-UX-01 contain no HIPAA compliance or certification statement. | M7 | None |

Staff desktop completion is covered by AC-OPS-01, AC-ADM-01, and AC-AUTH-04. A separate mobile requirement for staff is not approved.

## 10. Reporting and audit

Approved sources: FR-RPT-01, FR-AUD-01, FR-AUD-02.

| ID | Criterion | Pass measure | Milestone | Blocked by |
| --- | --- | --- | --- | --- |
| AC-RPT-01 | Each approved report returns clinic data. | For every report defined when TBD-18 is resolved, Morgan can run it for a day that contains fictional appointments and the totals match the stored appointments for that day. | M11 | TBD-18. No stand-in report is marked Pass. |
| AC-AUD-01 | Appointment changes are audited. | After a book, reschedule, and cancel by a known user, the audit history shows the actor, the time, the appointment identifier, and the type of change. | M11 | TBD-19 for retention. Presence of the events is still required. |
| AC-AUD-02 | Administration changes are audited. | After a role change, an operating-hours change, and a room change, the audit history shows actor, time, and the changed item. | M11 | TBD-19 |
| AC-AUD-03 | Document and consent changes are audited. | After an upload and a consent change, the audit history records the event without storing document bytes or credential material. | M11 | TBD-17, TBD-16 |
| AC-AUD-04 | A patient cannot read another patient's audit entries. | Riley's audit query, if patients are allowed any audit view, returns none of Jordan's events. If TBD-19 denies patients audit access entirely, Riley's call is denied. | M11 | TBD-19 |

## 11. Monitoring

Approved sources: FR-MON-01, ADR-007.

| ID | Criterion | Pass measure | Milestone | Blocked by |
| --- | --- | --- | --- | --- |
| AC-MON-01 | Application health is alarmed. | With the approved stack running, stopping the application tasks or failing their health check produces an unhealthy-target or running-task alarm and an SNS notification. | M11 | ADR-012, TBD-34 |
| AC-MON-02 | Database distress is visible. | A controlled metric or alarm-state simulation triggers the configured alarm and reaches the confirmed SNS recipient within the approved notification window. Record evidence and restore normal state; do not exhaust database storage. | M11 | ADR-012 |
| AC-MON-03 | Reminder failure is alarmed. | AC-REM-05's failed reminder produces an alarm notification within the test window. | M10 and M11 | TBD-34 |
| AC-MON-04 | Logs avoid sensitive payloads. | A sample of application logs from booking, document upload, and reminder send contains no document body, password, secret, or full session token. | M11 | None once those flows exist. Local logs are acceptable evidence. |

## 12. Recovery and rollback

Approved sources: NFR-08, NFR-09, ADR-008, ADR-009.

Drills use fictional data. Drill resources are destroyed at the end of the drill and included in the cost note.

| ID | Criterion | Pass measure | Milestone | Blocked by |
| --- | --- | --- | --- | --- |
| AC-REC-01 | Point-in-time recovery restores a known appointment. | A written procedure is followed. A new RDS instance restored to a chosen time contains a fictional appointment written before that time and does not require the original instance to be overwritten. The drill instance is deleted afterward. The procedure, time, operator, and result are recorded. | M12 | ADR-012, TBD-20 for numeric objectives. Functional restoration may be recorded before targets exist, but recovery-objective acceptance remains Blocked until approved RPO/RTO are measured and met. |
| AC-REC-02 | S3 version recovery restores a known file. | A fictional object is overwritten. The written procedure restores the prior version. Contents match the first upload. The result is recorded. | M12 | ADR-012 |
| AC-REC-03 | A bad deployment rolls back. | An ECS deployment of a deliberately failing image returns the service to the previous healthy task definition through the approved rollback control. Booking succeeds again against the fictional schedule. | M12 | ADR-012 |
| AC-REC-04 | Rollback does not fork the schedule. | After AC-REC-03, appointment rows created before the bad deploy are still present once, not duplicated. | M12 | ADR-012 |

## 13. Security configuration

| ID | Criterion | Pass measure | Milestone | Blocked by |
| --- | --- | --- | --- | --- |
| AC-SEC-01 | The user endpoint is HTTPS. | The approved hostname responds on HTTPS with the ACM certificate. Plain HTTP does not serve the application. | M12 | TBD-23, ADR-012 |
| AC-SEC-02 | The database is private. | The RDS instance has no public address. An unauthorized connection is denied; authorized application and reminder-worker connections succeed. | M3 | ADR-012 |
| AC-SEC-03 | Secrets are outside the repository. | A repository search finds no database password, SES credential, or Cognito client secret. The running task obtains the database credential from Secrets Manager. | M3 | ADR-012. The repository search can pass locally before deploy. |
| AC-SEC-04 | Task privileges are limited. | The web task role cannot administer IAM, cannot read unrelated buckets, and cannot send email if reminder send is reserved for the worker role. The worker role cannot change staff roles. | M10 | ADR-012 |
| AC-SEC-05 | CloudTrail is recording management events. | A controlled management event covered by configured selectors appears in delivered CloudTrail records with actor, time, and action. Logging status alone is insufficient. | M2 | ADR-012. If an existing account trail already covers this, record that instead of creating a second trail. |
| AC-SEC-06 | No HIPAA compliance claim is published. | Repository documents, the patient UI, staff UI, and the reminder template do not state that ClinicFlow is HIPAA compliant, HIPAA certified, or covered by a BAA. | M13 | None. Document portion can be checked at M0 via AC-M0-01. |
| AC-SEC-07 | Fictional data only. | Seeds, fixtures, tests, screenshots, and reminder examples contain no real patient identity. A reviewer spot-checks the data files. | M13 | None |

## 14. Cost, Project 1, and release gate

| ID | Criterion | Pass measure | Milestone | Blocked by |
| --- | --- | --- | --- | --- |
| AC-COST-01 | A dated estimate exists before apply. | M1 attaches or links an AWS Pricing Calculator estimate for the chosen ADR-012 option, in `us-east-1`, dated on the review day, covering every always-on resource in that option. | M1 | Owner must choose an option before the estimate can be the selected one. A comparative estimate of the options may be prepared without applying anything. |
| AC-COST-02 | The account budget is alarmed. | An AWS Budget for the account notifies at the approved thresholds at or below the approved monthly cap. The cap remains $25 unless the owner wrote a different cap. | M2 | ADR-012 |
| AC-COST-03 | Resources are tagged. | Every taggable ClinicFlow resource carries the approved tags; unsupported exceptions are recorded. Activate the project cost-allocation tag and verify attribution when billing data becomes available. | M2 | PA-20 owner value |
| AC-COST-04 | Project 1 is unchanged unless explicitly approved. | If no decommission approval exists, Project 1 resources and repositories are untouched. If approval exists, the preservation checklist in ADR-012 was completed first and the approval names the resources removed. | Any later milestone | TBD-22 |
| AC-COST-05 | Drill leftovers are removed. | After AC-REC-01, the restored database instance is gone. Snapshots created only for the drill are deleted or given an expiry recorded in the drill notes. | M12 | ADR-012 |
| AC-REL-01 | The pipeline can deploy and roll back. | A normal pipeline execution deploys a healthy image, and AC-REC-03 shows rollback. | M12 | ADR-012 |
| AC-REL-02 | Acceptance record is complete. | M13 produces a checklist with Pass, Fail, Blocked, or Waived for every criterion in this document. Failed items are listed with the defect. Waived items cite the owner decision. | M13 | Execution of prior criteria |

## 14.1 Additional verification scenarios proposed for approval

| ID | Criterion | Pass measure | Milestone | Blocked by |
| --- | --- | --- | --- | --- |
| AC-REM-09 | Stale jobs cannot send old details. | Reschedule after queuing; process the old job and observe no obsolete email. Withdraw consent after queuing and observe suppression at send time. | M10 | TBD-15, TBD-16 |
| AC-REM-10 | Ambiguous sends are reconciled. | Simulate provider acceptance followed by failure before success recording. Observe the approved reconciliation policy and auditable outcome; do not claim guaranteed exactly-once email delivery. | M10 | TBD-37 |
| AC-REM-11 | Reminder intent is not lost. | Interrupt Scheduler registration after appointment commit. Reconciliation restores eligible reminder work without changing or duplicating the appointment. Exhausted delivery failures are visible. | M10 | Approved integration design, TBD-34 |
| AC-PERF-01 | Workload meets approved objectives. | Exercise fictional workloads representing approximately six employees and 80 appointments/day, with separately approved peaks. Record latency percentiles and error rate against TBD-36; zero double bookings are permitted. | M13 | TBD-36 |
| AC-DOC-08 | Uploads and temporary access are bounded. | Reject disallowed types and oversized files without a retrievable object. If temporary URLs are selected, expired URLs fail and cross-patient requests cannot mint them. Apply the approved screening/quarantine policy. | M9 | TBD-17, approved upload design |
| AC-SEC-08 | Encryption is verified. | Inspect RDS and S3 encryption configuration and demonstrate TLS database connections and HTTPS object access. Record key ownership and permissions. | M12 | Approved encryption design |
| AC-COST-06 | Anomaly monitoring and cleanup operate. | Record configured monitor coverage and recipients; validate routing through a supported test or documented review. Inventory unused resources, owners, and cleanup decisions, preserving required recovery assets. | M13 | ADR-012, TBD-34 |
| AC-REC-05 | Recovery restores a usable application. | Reconnect to the restored database; verify login, shared schedule, document ownership references, and reminder reconciliation. Measure data loss and elapsed restoration against approved RPO/RTO. | M12 | TBD-20, ADR-012 |
| AC-SCH-12 | Time boundaries are unambiguous. | Test the confirmed clinic timezone, daylight-saving gaps/repeated times where applicable, invalid or nonpositive durations, and buffers. Displayed and stored intervals agree; conflicts remain prevented. | M5 | TBD-02, TBD-05, TBD-06 |

## 15. Traceability

| Requirement | Criteria |
| --- | --- |
| Single schedule and all booking channels | AC-CH-01 through AC-CH-07 |
| Therapist and room conflicts, duration, hours, exceptions | AC-SCH-01 through AC-SCH-12 |
| Roles and restricted access | AC-AUTH-01 through AC-AUTH-09, AC-ADM-01 |
| Caregiver booking | AC-CG-01, AC-CG-02, AC-CH-04 |
| Documents | AC-DOC-01 through AC-DOC-08 |
| Reminders, preferences, consent | AC-REM-01 through AC-REM-11, AC-UX-04 |
| Accessible mobile patient experience | AC-UX-01 through AC-UX-05 |
| Reporting and audit | AC-RPT-01, AC-AUD-01 through AC-AUD-04 |
| Monitoring | AC-MON-01 through AC-MON-04 |
| Recovery and rollback | AC-REC-01 through AC-REC-05, AC-REL-01 |
| Security and fictional data | AC-SEC-01 through AC-SEC-08 |
| Budget and Project 1 | AC-COST-01 through AC-COST-06 |
| Capacity and performance | AC-PERF-01 |
| Milestone 0 paperwork | AC-M0-01 through AC-M0-05 |

## 16. Execution rules

- Do not mark a Blocked criterion as Pass by inventing the missing business rule.
- Do not use real patient information to make a test more realistic.
- Do not leave restored RDS instances or extra load balancers running after a drill.
- Do not treat a screenshot of a form as evidence for a conflict rule. Conflict criteria require the stored schedule before and after the call.
- Local evidence is enough only where the criterion says so. Network, budget, encryption, and recovery criteria require the approved AWS environment.
- A waiver applies only to the IDs named in the ADR-012 decision.

## 17. Approval

| Decision | Record |
| --- | --- |
| Criteria set accepted as the Milestone 0 test baseline | Pending review |
| Permission to execute AWS drills | Not granted |
| Permission to waive any AC-SCH, AC-AUTH, or AC-DOC item | Not granted |

Reviewer notes:

```
Date:
Reviewer:
Criteria to add:
Criteria to remove:
```


