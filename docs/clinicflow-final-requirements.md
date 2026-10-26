# ClinicFlow Final Requirements

| Field | Value |
| --- | --- |
| Document | `docs/clinicflow-final-requirements.md` |
| Project | ClinicFlow |
| Repository | `clinicflow-aws-terraform` |
| Milestone | 0 — requirements consolidation |
| Status | Draft for review. Implementation is not authorized. |
| Version | 1.0 — consolidated review baseline |
| Date | 2026-10-26 |
| Region | `us-east-1` (approved) |
| Proposed domain | `clinicflow.cloudbycliff.com` |
| Sources | Approved business requirements, approved AWS architecture, and project constraints supplied for Milestone 0 |
| Non-sources | Existing Milestone 0 drafts were revised. Underlying discovery interviews and the complete implementation plan were not supplied for verification; the current user decision set is authoritative. Harbor & Pine Family Medicine remains unapproved reference material if supplied. |

## 1. How to read this baseline

| Label | Meaning |
| --- | --- |
| Approved | Stated in the Milestone 0 decision set. Later milestones must satisfy it. |
| Proposed | A working implementation detail or planning assumption offered so the build can be estimated. It is not a client requirement until it is approved. |
| TBD | Needed to build or test the system, and not approved. It must stay open rather than be filled in with an invented answer. |
| Out of scope | Not part of the approved request. It stays out unless a later change adds it. |
| Constraint | A limit on how the project may be carried out. |

Approval of this document accepts the requirements baseline. It does not authorize Terraform apply, AWS resource creation, software installation, application code, or any change to Project 1.

Related documents:

- `docs/architecture-decisions.md` — service choices, security, and the reasoning behind them
- `docs/acceptance-criteria.md` — measurable proof that the approved behavior works

## 2. Project context

ClinicFlow is a physical therapy clinic scheduling and management application.

Approved planning assumptions for capacity:

- About six employees
- About 80 appointments per day

These figures size the product. They are not a claim about a named clinic, a census, or a measured historical volume. No clinic legal name, address, brand, or site count was approved. The product name is ClinicFlow. The clinic identity remains TBD-01.

The schedule is one shared record. An appointment created by a patient, a receptionist (telephone or walk-in), or an authorized caregiver is the same kind of appointment and appears on the same schedule.

## 3. Goals

| ID | Goal | Status |
| --- | --- | --- |
| G-01 | Let the clinic register patients and book, reschedule, and cancel appointments | Approved |
| G-02 | Let receptionists handle telephone bookings, walk-ins, and waitlists | Approved |
| G-03 | Give therapists their schedules and restrict which patients they can access | Approved |
| G-04 | Let administrators manage staff, roles, operating hours, and treatment rooms | Approved |
| G-05 | Prevent scheduling conflicts for therapist availability and room availability | Approved |
| G-06 | Support different appointment durations and scheduling exceptions | Approved |
| G-07 | Let an authorized caregiver book for a patient | Approved |
| G-08 | Provide an accessible, mobile-friendly patient experience | Approved |
| G-09 | Accept secure uploads of patient documents | Approved |
| G-10 | Send automated appointment reminders that follow preferences and consent | Approved |
| G-11 | Provide reporting, audit history, and operational monitoring | Approved |
| G-12 | Meet the approved resilience, recovery, and security requirements | Approved |
| G-13 | Keep one consistent schedule for every booking channel | Approved |

## 4. Scope

### 4.1 In scope

- Patient registration
- Appointment booking, rescheduling, and cancellation
- Receptionist telephone booking, walk-in booking, and waitlist management
- Therapist schedules and restricted patient access
- Administrator management of staff, roles, operating hours, and treatment rooms
- Conflict prevention against therapist availability, room availability, operating hours, durations, and exceptions
- Authorized caregiver booking
- Accessible, mobile-friendly patient experience
- Secure patient document upload and controlled retrieval
- Reminder preferences, consent, and automated email reminders
- Reporting, audit history, and operational monitoring
- The approved AWS architecture in `docs/architecture-decisions.md`
- Fictional patient information in every seed, test, demo, and screenshot
- Cost controls that respect the account budget constraint

### 4.2 Out of scope

These items were not requested. They are excluded until a later approved change adds them.

| Item | Status |
| --- | --- |
| Billing, payments, copays, and fee collection | Out of scope |
| Insurance eligibility, claims, and authorizations | Out of scope |
| Electronic health record or clinical documentation product | Out of scope |
| SMS, voice, or postal reminders | Out of scope. Email through Amazon SES is the approved reminder channel. |
| Multiple clinic sites or franchises | Out of scope. Single-site operation is proposed (PA-01), not yet confirmed. |
| Telehealth as a distinct encounter type | Out of scope |
| Kubernetes | Out of scope. The approved compute platform is Amazon ECS on Fargate. |
| A HIPAA compliance claim or HIPAA certification statement | Out of scope. See section 12. |
| Decommissioning Project 1 as part of Milestone 0 | Out of scope. Allowed only after a cost review and explicit approval. |

### 4.3 Milestone 0 scope boundary

Milestone 0 produces this requirements baseline and the two companion documents. It does not produce application code, container images, Terraform applies, or AWS resources.

## 5. Users and roles

Four user roles are approved: administrator, receptionist, therapist, and patient.

Four primary roles are approved. Modeling caregiver authorization as a delegation associated with a patient account is proposed; the account and relationship model remains unresolved. How a caregiver account is created, how authorization is granted or revoked, and which actions besides booking are allowed are TBD-12.

| Role | Approved responsibility |
| --- | --- |
| Administrator | Manage staff, roles, operating hours, and treatment rooms. Operational reporting, audit review, and monitoring oversight are the proposed primary audience for those capabilities (PA-08). |
| Receptionist | Register patients when needed, book by telephone, book walk-ins, and manage the waitlist, using the same schedule as every other channel. |
| Therapist | View and work the therapist schedule. Access to patients is restricted. The exact restriction rule is TBD-10. |
| Patient | Use an accessible, mobile-friendly experience to register, book, reschedule, cancel, set reminder preferences, and manage consent. Document upload is approved; the exact patient document actions are TBD-17. |

Staff are clinic users. The approved headcount is about six employees. The split among administrator, receptionist, and therapist is TBD-29.

## 6. Business requirements

| ID | Requirement | Status |
| --- | --- | --- |
| BR-01 | The product serves a physical therapy clinic's scheduling and day-to-day management. | Approved |
| BR-02 | Capacity planning uses about six employees and about 80 appointments per day. | Approved planning assumption |
| BR-03 | Every booking channel writes to one schedule. | Approved |
| BR-04 | The clinic can register patients and book, reschedule, and cancel appointments. | Approved |
| BR-05 | Receptionists can create telephone bookings and walk-ins and can manage a waitlist. | Approved |
| BR-06 | Therapists have schedules. Their access to patients is restricted. | Approved |
| BR-07 | Administrators manage staff, role assignment, operating hours, and treatment rooms. | Approved |
| BR-08 | The system prevents conflicting use of a therapist and conflicting use of a treatment room. | Approved |
| BR-09 | Appointments may have different durations. | Approved |
| BR-10 | Scheduling exceptions can block or alter otherwise normal availability. | Approved |
| BR-11 | A caregiver with authorization can book for a patient. | Approved |
| BR-12 | The patient experience is accessible and usable on a mobile device. | Approved |
| BR-13 | Patient documents can be uploaded and stored securely. | Approved |
| BR-14 | Appointment reminders are automated and honor reminder preferences and consent. | Approved |
| BR-15 | The clinic can use reporting, retain an audit history, and monitor operations. | Approved |
| BR-16 | The system has defined resilience, recovery, and security behavior, tested for recovery. | Approved |
| BR-17 | Only fictional patient information is used in the project. | Approved constraint |
| BR-18 | The project must be operable inside a $25 monthly budget for the entire AWS account, or work must stop at the cost gate until the owner approves a different spend decision. | Approved constraint |
| BR-19 | Project 1's GitHub repository, Terraform source, and recovery information remain preserved. Temporary decommission of Project 1 resources is a separate decision. | Approved constraint |

## 7. Functional requirements

### 7.1 Identity and access

| ID | Requirement | Status |
| --- | --- | --- |
| FR-IAM-01 | Each user authenticates before using protected clinic or patient functions. Amazon Cognito is the approved authentication service. | Approved |
| FR-IAM-02 | The application enforces authorization on the server for every protected action. Hiding a control in the interface is not sufficient. | Approved |
| FR-IAM-03 | The four approved roles are distinguishable and assignable. | Approved |
| FR-IAM-04 | Administrators assign staff roles. | Approved |
| FR-IAM-05 | A patient can act on their own record within the permissions in section 8. | Approved |
| FR-IAM-06 | A caregiver action is allowed only when a current authorization links that caregiver to that patient for that action. | Approved for booking. Other caregiver actions are TBD-12. |
| FR-IAM-07 | Therapist access to a patient is limited by the approved restriction rule once that rule is defined. | Approved outcome. Rule is TBD-10. |
| FR-IAM-08 | Session length, password policy, and whether MFA is required for each role. | TBD-25 |

### 7.2 Patients

| ID | Requirement | Status |
| --- | --- | --- |
| FR-PAT-01 | A patient can be registered with the identity and contact data required to book and to send an email reminder. | Approved |
| FR-PAT-02 | The minimum registration fields, required demographics, and whether a medical record number exists. | TBD-31 |
| FR-PAT-03 | Receptionists can register a patient while handling a telephone call or walk-in. | Approved |
| FR-PAT-04 | Patients can register through the patient experience. | Approved, as part of patient registration and the patient experience |
| FR-PAT-05 | Patient search and duplicate handling rules. | TBD-32 |
| FR-PAT-06 | All patient information used anywhere in the project is fictional, including deployed demonstrations. | Approved constraint |

### 7.3 Scheduling

| ID | Requirement | Status |
| --- | --- | --- |
| FR-SCH-01 | An appointment has one patient, one therapist, one time interval with a duration, and one treatment room, unless a later decision defines an exception. Requiring both a therapist and a room is proposed (PA-02). | Approved resources are therapist and room. The "both required on every appointment" rule is proposed. |
| FR-SCH-02 | Authorized users can book, reschedule, and cancel. | Approved |
| FR-SCH-03 | Patient self-service, receptionist telephone booking, receptionist walk-in booking, and authorized caregiver booking all create or change appointments in the same schedule. | Approved |
| FR-SCH-04 | A booking that overlaps an existing appointment for the same therapist is rejected. | Approved |
| FR-SCH-05 | A booking that overlaps an existing appointment for the same treatment room is rejected. | Approved |
| FR-SCH-06 | Durations may differ by appointment. The occupied interval is the scheduled start plus the stored duration. | Approved |
| FR-SCH-07 | A catalog of appointment types and their default durations. | TBD-05 |
| FR-SCH-08 | Operating hours defined by an administrator limit when appointments may be placed. | Approved. The actual hours are TBD-03. |
| FR-SCH-09 | Scheduling exceptions defined for the clinic, a therapist, or a room prevent bookings that violate the exception. Who may create each kind of exception is TBD-27. | Approved outcome. Actor rules are partly TBD. |
| FR-SCH-10 | Reschedule succeeds only when the new interval is free. A failed reschedule leaves the previous interval in place. | Approved implication of conflict prevention |
| FR-SCH-11 | Cancellation frees the therapist and the room for the cancelled interval. | Approved implication of conflict prevention |
| FR-SCH-12 | Two concurrent attempts to claim the same therapist interval or the same room interval result in one success. | Required consequence of approved conflict prevention; implementation mechanism PA-03 is proposed |
| FR-SCH-13 | Whether a patient may hold two overlapping appointments. | TBD-09 |
| FR-SCH-14 | Lead time, booking horizon, buffers between appointments, and same-day rules. | TBD-07 and TBD-06 |
| FR-SCH-15 | Clinic timezone used to interpret operating hours and appointment times. | TBD-02 |
| FR-SCH-16 | Walk-in appointments use the same appointment record as any other booking. What distinguishes a walk-in for reporting is TBD-14. | Approved for the shared schedule |
| FR-SCH-17 | Appointment lifecycle statuses beyond scheduled and cancelled, including checked-in, completed, and no-show. | TBD-26 |

### 7.4 Waitlist

| ID | Requirement | Status |
| --- | --- | --- |
| FR-WAIT-01 | Receptionists can manage a waitlist. | Approved |
| FR-WAIT-02 | A waitlist entry is not an appointment and does not occupy a therapist or a room. | Proposed (PA-04), so the waitlist cannot bypass conflict rules |
| FR-WAIT-03 | Converting a waitlist entry creates an appointment on the shared schedule and applies the same conflict rules. | Approved implication of the single schedule |
| FR-WAIT-04 | Who may add a waitlist entry, sort order, automatic offers, expiry, and notification of an opening. | TBD-13 |

### 7.5 Staff, rooms, and hours

| ID | Requirement | Status |
| --- | --- | --- |
| FR-ADM-01 | Administrators can create, update, and deactivate staff accounts and assign the approved roles. | Approved |
| FR-ADM-02 | Administrators can define operating hours. | Approved. Values are TBD-03. |
| FR-ADM-03 | Administrators can define treatment rooms. | Approved. Inventory is TBD-04. |
| FR-ADM-04 | Deactivated staff cannot receive new appointments. Handling of future appointments already booked with that staff member. | TBD-33 |
| FR-ADM-05 | A room can be made unavailable by a scheduling exception without deleting historical appointments. | Proposed (PA-05) |

### 7.6 Caregivers

| ID | Requirement | Status |
| --- | --- | --- |
| FR-CG-01 | A patient can have an authorized caregiver who books appointments for that patient. | Approved |
| FR-CG-02 | Booking by a caregiver is recorded against the patient and is visible on the shared schedule. | Approved implication |
| FR-CG-03 | Method of authorization, number of caregivers, expiry, revocation, and whether the caregiver may reschedule, cancel, view documents, or change reminder preferences. | TBD-12 |

### 7.7 Documents

| ID | Requirement | Status |
| --- | --- | --- |
| FR-DOC-01 | Patient documents can be uploaded and stored in private Amazon S3. | Approved |
| FR-DOC-02 | Document bytes are retrieved only after the application authorizes the caller. | Approved |
| FR-DOC-03 | S3 Versioning is enabled for the document bucket. | Approved |
| FR-DOC-04 | Document types, maximum size, allowed file types, retention, and which roles may upload or download. | TBD-17 |
| FR-DOC-05 | Metadata needed to enforce authorization (patient identifier, uploader, time, document identifier) is stored with the application's relational data. Object storage holds the file. | Proposed (PA-06) |

### 7.8 Reminders, preferences, and consent

| ID | Requirement | Status |
| --- | --- | --- |
| FR-REM-01 | The system sends automated appointment reminders by email. | Approved. Channel is Amazon SES in the approved architecture. |
| FR-REM-02 | A patient can set reminder preferences. | Approved |
| FR-REM-03 | A reminder is sent only when the required consent is present and the preference allows it. | Approved |
| FR-REM-04 | Reminder lead times, repeat reminders, quiet hours, and the consent text. | TBD-15 and TBD-16 |
| FR-REM-05 | A reminder send does not create, move, or cancel an appointment. | Proposed (PA-07) |
| FR-REM-06 | Failed reminder processing is visible and retryable. Confirmed successful sends are deduplicated; ambiguous provider outcomes follow TBD-37. Exactly-once email delivery is not assumed. | Approved outcome of reliable reminders. Mechanism is specified in the architecture document. |
| FR-REM-07 | SMS is not a ClinicFlow reminder channel in this baseline. | Out of scope |

### 7.9 Reporting, audit, and monitoring

| ID | Requirement | Status |
| --- | --- | --- |
| FR-RPT-01 | The application provides operational reporting for the clinic. | Approved. The report list is TBD-18. |
| FR-AUD-01 | The application retains an audit history of material scheduling and administrative changes. | Approved |
| FR-AUD-02 | Audit entries support later review of who performed an action and when. | Approved |
| FR-AUD-03 | Audit retention period and whether patients can view their own audit history. | TBD-19 |
| FR-MON-01 | Operators can observe application and platform health and receive notifications of operational failures. | Approved. Amazon CloudWatch and Amazon SNS are the approved services. |
| FR-MON-02 | On-call rotation, notification addresses, and dashboard catalog. | TBD-34 |

Detailed workflows and permission defaults below are proposed interpretations where the brief does not specify them. They require explicit acceptance; unresolved access is denied until defined. Administrator status does not automatically grant unrestricted patient-document access.

## 8. Permission matrix

Cells marked **TBD** are unresolved. Cells marked **Proposed** are working assumptions (section 15), not approved grants.

| Action | Administrator | Receptionist | Therapist | Patient | Authorized caregiver |
| --- | --- | --- | --- | --- | --- |
| Sign in to a protected function | Yes | Yes | Yes | Yes | Yes, once an account model is approved (TBD-12) |
| Assign or change roles | Yes | No | No | No | No |
| Manage staff records | Yes | No | No | No | No |
| Manage operating hours | Yes | No | No | No | No |
| Manage treatment rooms | Yes | No | No | No | No |
| Register a patient | Proposed: yes | Yes | TBD | Yes, self-registration | TBD |
| View the clinic-wide schedule | Proposed: yes | Yes | Own schedule is approved. Clinic-wide view is TBD | Own appointments | Own linked patient's appointments: TBD |
| Book an appointment | Proposed: yes | Yes, including telephone and walk-in | TBD | Yes, for self | Yes, for the linked patient |
| Reschedule or cancel | Proposed: yes | Yes | TBD | Yes, for self | TBD-12 |
| Manage waitlist | Proposed: yes | Yes | TBD | TBD-13 | TBD-13 |
| Create scheduling exceptions | Yes for clinic hours and rooms is the approved administration scope. Therapist-specific exceptions are TBD-27 | No, unless later approved | TBD-27 | No | No |
| View a patient record | Proposed: operational fields | Proposed: operational fields required to book | Restricted. Rule TBD-10 | Own record | TBD-12 |
| Upload or retrieve patient documents | TBD-17 | TBD-17 | TBD-17, inside the patient-access restriction | TBD-17, own documents | TBD-12 |
| Manage own reminder preference and consent | No | No | No | Yes | TBD-12 |
| View reports | Proposed: yes | TBD-18 | TBD-18 | No | No |
| View audit history | Proposed: yes | TBD-19 | TBD-19 | TBD-19 | No |
| View operational monitoring | Proposed: yes, for the operator audience | No | No | No | No |

Server-side checks apply to every row. A user who is not signed in cannot perform a protected action.

## 9. Workflows

### 9.1 Patient self-service booking

1. The patient signs in, or registers and then signs in.
2. The patient chooses a bookable interval. The offered interval respects operating hours, duration, therapist availability, room availability, and exceptions.
3. The system writes one appointment to the shared schedule or rejects the request when the interval is no longer free.
4. The patient can reschedule or cancel within the rules that are still TBD for lead time and cancellation (TBD-06, TBD-07, TBD-08).
5. Later reminders follow preferences and consent.

### 9.2 Telephone booking

1. The receptionist identifies or registers the patient.
2. The receptionist books an appointment on the same schedule the patient would use.
3. Conflict checks run before the appointment is stored.
4. The appointment is visible to the assigned therapist and to the patient.

### 9.3 Walk-in

1. The receptionist registers the patient when no record exists.
2. The receptionist creates an appointment on the shared schedule for an interval that is free now.
3. The walk-in occupies the therapist and the room exactly as any other appointment does.
4. The label or source value that marks the channel is TBD-14. The schedule record is not a separate calendar.

### 9.4 Waitlist

1. The receptionist adds or updates a waitlist entry. Other actors are TBD-13.
2. The entry does not block a therapist or a room (PA-04, proposed).
3. When the receptionist converts an entry, the system attempts a normal booking.
4. If that booking conflicts, the waitlist entry remains and no partial appointment is stored.

### 9.5 Authorized caregiver booking

1. A current authorization exists for the caregiver and the patient (mechanism TBD-12).
2. The caregiver books an appointment for the linked patient.
3. The appointment shows on the shared schedule for that patient and the assigned therapist.
4. A caregiver without a current authorization is denied.

### 9.6 Conflict rejection

1. The caller submits a new appointment or a reschedule.
2. The system evaluates therapist overlap, room overlap, operating hours, duration, and applicable exceptions together.
3. Any violation rejects the write.
4. An existing appointment stays as it was when a reschedule is rejected.

### 9.7 Scheduling exception

1. An administrator records an exception that makes a therapist, a room, or the clinic unavailable for an interval. Additional actors are TBD-27.
2. New bookings inside that interval are rejected.
3. Appointments already stored that fall inside a new exception require an explicit handling rule. That rule is TBD-35. This baseline does not invent automatic cancellation.

### 9.8 Document upload

1. An authorized user uploads a file for a patient.
2. The application stores the file in the private document bucket and stores authorization metadata in the relational database.
3. A later download is allowed only after a server-side authorization check.
4. Replacing a file keeps the prior S3 version available for recovery.

### 9.9 Reminder

1. A future appointment exists.
2. The patient has the preference and consent required for email.
3. At the configured lead time (TBD-15), the reminder pipeline sends one email through SES.
4. Missing consent or a preference that declines reminders results in no send.
5. A send failure is observable and retryable. A retry suppresses confirmed successful sends. Ambiguous outcomes follow TBD-37; exactly-once email delivery is not promised.

### 9.10 Audit

1. A successful change to an appointment, waitlist conversion, staff record, role, operating hours, room, exception, document metadata, consent, or reminder preference writes an audit record.
2. Failed authorization attempts are included in security logging. Whether each denied attempt is also in the application audit history is TBD-19.
3. Administrator audit review is proposed under PA-08. Final audiences and permissions are TBD-19.

## 10. Operational requirements

| ID | Requirement | Status |
| --- | --- | --- |
| NFR-01 | The patient experience works on a current mobile browser and supports assistive use. The conformance target is proposed as WCAG 2.2 Level AA (PA-09). | Approved outcome. Conformance level is proposed. |
| NFR-02 | Staff can complete receptionist, therapist, and administrator tasks on a desktop browser. A responsive staff layout is proposed (PA-10). | Approved as required functionality |
| NFR-03 | Scheduling writes are transactional. A conflict cannot leave two overlapping appointments for one therapist or one room. | Approved |
| NFR-04 | The schedule remains the system of record in Amazon RDS for PostgreSQL. | Approved |
| NFR-05 | Patient document objects remain private. Public object access is disabled. | Approved |
| NFR-06 | Authentication uses Amazon Cognito. Authorization is enforced by the application backend. | Approved |
| NFR-07 | Reminders are delivered through the approved asynchronous path so a mail-provider delay does not block booking. | Approved |
| NFR-08 | Deployment of application containers supports a controlled release and rollback. | Approved |
| NFR-09 | The relational database supports point-in-time recovery. Document objects support version recovery. Recovery procedures are tested and recorded. | Approved |
| NFR-10 | Numeric recovery point objective and recovery time objective. | TBD-20 |
| NFR-11 | The network spans two Availability Zones and separates a public load balancer from private application and database subnets in the approved target architecture. | Approved target. A cheaper deployment profile is an open decision (TBD-21) because of the budget constraint. |
| NFR-12 | Operators receive monitoring notifications for failures that prevent booking or reminder delivery. | Approved |
| NFR-13 | Infrastructure and the application are tagged, estimated, budgeted, and watched for cost anomalies and unused resources. | Approved |
| NFR-14 | The entire AWS account is budgeted at $25 per month until the owner records a different approved budget. | Approved constraint |
| NFR-15 | ClinicFlow runs in `us-east-1`. | Approved |
| NFR-16 | The proposed hostname is `clinicflow.cloudbycliff.com`. DNS ownership and certificate issuance for the parent zone are TBD-23. | Proposed hostname |
| NFR-17 | Performance target suitable for about 80 appointments per day and about six staff users. A formal latency SLO is TBD-36. | Approved scale assumption |
| NFR-18 | Personal data used by the project is fictional. | Approved constraint |
| NFR-19 | Apply approved security outcomes; additional detailed controls in the architecture document require explicit baseline acceptance. | Approved outcomes; implementation details proposed |
| NFR-20 | Dependencies and images are built and deployed through the approved pipeline once delivery is in scope. Local-only development before that pipeline exists is a proposed implementation step (PA-11). | Approved target |

## 11. Constraints

| ID | Constraint |
| --- | --- |
| C-01 | Use fictional patient information only. Do not load real patient, caregiver, or clinical files. |
| C-02 | Do not describe ClinicFlow as HIPAA compliant. A formal assessment has not been performed. Security and privacy controls in this baseline still apply. |
| C-03 | The current AWS budget is $25 per month for the whole account, including any remaining Project 1 spend. |
| C-04 | Project 1 may be temporarily decommissioned only after a written cost review and explicit approval. |
| C-05 | Preserve Project 1's GitHub repository, Terraform source, and the recovery information required to rebuild it. |
| C-06 | Do not add client requirements, clinic statistics, or clinic identities that were not approved. Record gaps as TBD. |
| C-07 | Do not treat the Harbor & Pine Family Medicine draft as approved, if it appears later. |
| C-08 | Milestone 0 does not authorize application code, package installation, Terraform apply, AWS resource creation, or changes to Project 1. |
| C-09 | Kubernetes is not a project requirement. |

### 11.1 Budget gate

The approved target architecture and the $25 account cap are both in force. Affordability has not been established. Current prices, total account spend, usage, and credit eligibility must be verified in M1. Do not assume removing Project 1 makes the target affordable. Cost review scope and options are in `docs/architecture-decisions.md`.

Until TBD-21 is decided and explicitly approved:

- No ClinicFlow AWS resources are created.
- Project 1 is not decommissioned.
- Decommissioning Project 1 frees spend under the $25 cap. It does not raise the cap.

### 11.2 Project 1 preservation

Before any approved decommission, the following must already exist and be confirmed by the owner:

- The Project 1 GitHub repository remains intact.
- The Project 1 Terraform source remains intact.
- Recovery information required to recreate Project 1 is written down and stored outside the resources being removed. The location is TBD-22.
- A cost review shows what monthly spend would be released and what ClinicFlow would still cost.

This repository did not contain Project 1's name, account identifiers, or recovery files at the time of Milestone 0. Those facts stay TBD-22 rather than being guessed.

## 12. Privacy and security posture

ClinicFlow must protect patient information with the controls in `docs/architecture-decisions.md`: authenticated access, server-side authorization, encryption in transit, encryption at rest, private document storage, secrets outside source control, network isolation in the approved target design, audit history, and operator logging.

Approved security outcomes are project requirements; additional detailed controls remain proposals until accepted. It is not a HIPAA compliance determination. No page, email template, report, or document in the project may say that ClinicFlow is HIPAA compliant, HIPAA certified, or covered by a Business Associate Agreement unless a later, separate assessment records that conclusion.

Data retention and deletion rules for patient records, documents, reminders, and audit entries are TBD-30.

## 13. Traceability to architecture

| Requirement group | Architecture decision |
| --- | --- |
| FR-SCH, FR-WAIT, FR-ADM, FR-AUD | ADR-001 RDS PostgreSQL |
| Application runtime | ADR-002 ECS Fargate |
| FR-DOC | ADR-003 private S3 |
| FR-IAM | ADR-004 Cognito plus backend authorization |
| FR-REM | ADR-005 EventBridge Scheduler, SQS, Lambda, SES |
| NFR-11 | ADR-006 VPC |
| FR-MON | ADR-007 CloudWatch and SNS |
| NFR-08 | ADR-008 CodePipeline, CodeBuild, ECR, ECS rollback |
| NFR-09 | ADR-009 PITR, S3 Versioning, tested recovery |
| NFR-13, NFR-14, C-03, C-04 | ADR-010 cost controls and ADR-012 open deployment profile |

## 14. Outstanding items

| ID | Topic | Needed before |
| --- | --- | --- |
| TBD-01 | Clinic legal name, public brand, and address | Patient-facing content and email sender identity |
| TBD-02 | Clinic timezone | Any stored appointment |
| TBD-03 | Weekly operating hours and holidays | Booking rules |
| TBD-04 | Treatment room list | Booking rules and seed data |
| TBD-05 | Appointment types and default durations | Booking rules |
| TBD-06 | Buffers, minimum duration, and maximum duration | Conflict rules |
| TBD-07 | Booking horizon and minimum lead time | Patient and receptionist booking |
| TBD-08 | Cancellation and late-change policy. Fees are out of scope. | Cancel and reschedule behavior |
| TBD-09 | Whether a patient may have overlapping appointments | Conflict rules |
| TBD-10 | Therapist patient-access rule | Authorization |
| TBD-12 | Caregiver authorization method and actions beyond booking | Caregiver workflow |
| TBD-13 | Waitlist eligibility, order, offers, and expiry | Waitlist |
| TBD-14 | How telephone and walk-in origins are labeled | Reporting |
| TBD-15 | Reminder lead times and quiet hours | Reminder scheduler |
| TBD-16 | Consent text and whether consent is required before any reminder | Reminder send |
| TBD-17 | Document types, size, file types, screening/quarantine policy, retention, and role permissions | Document feature |
| TBD-18 | Report list, filters, and export format | Reporting |
| TBD-19 | Audit retention and audiences | Audit |
| TBD-20 | Numeric RPO and RTO | Recovery drill design |
| TBD-21 | Deployment profile that reconciles the target architecture with the $25 cap | Any Terraform apply |
| TBD-22 | Project 1 identity, recovery-record location, and decommission decision | Any Project 1 change |
| TBD-23 | Control of DNS for `cloudbycliff.com` and the ClinicFlow hostname | HTTPS go-live |
| TBD-24 | SES sandbox versus production sending, and the approved sender address | Real email delivery |
| TBD-25 | Password policy, session length, and MFA by role | Cognito configuration |
| TBD-26 | Statuses such as checked-in, completed, and no-show | Operations beyond book and cancel |
| TBD-27 | Who may create therapist or room exceptions | Administration |
| TBD-29 | How many of the six employees hold each role | Seed accounts |
| TBD-30 | Retention and deletion | Data lifecycle |
| TBD-31 | Required patient registration fields | Registration |
| TBD-32 | Duplicate patient matching | Registration |
| TBD-33 | Future appointments when a therapist or room is deactivated | Administration |
| TBD-34 | Alert recipients, notification time window, and dashboard set | Monitoring |
| TBD-35 | What happens to existing appointments covered by a new exception | Exceptions |
| TBD-36 | Latency, availability, peak concurrency, test duration, and acceptable error rate | Performance acceptance |
| TBD-37 | Ambiguous reminder-send outcomes, reconciliation, retry limits, and late reminders | Reminder reliability acceptance |

TBD-11 and TBD-28 are reserved. Document permissions are consolidated under TBD-17. The owner coordinates resolution with the client; each open item blocks its dependent work.

## 15. Proposed implementation details

The items in this section are proposals for review. Rejecting one of them does not reject the approved requirements.

| ID | Proposal |
| --- | --- |
| PA-01 | Model one clinic site until a multi-site requirement is approved. |
| PA-02 | Every appointment requires exactly one therapist and exactly one treatment room. |
| PA-03 | Enforce conflicts inside a database transaction so concurrent bookings cannot both commit. |
| PA-04 | Waitlist entries do not reserve a therapist or a room. |
| PA-05 | Deactivating a room or recording an exception preserves historical appointments. |
| PA-06 | S3 stores document bytes. PostgreSQL stores document metadata and access rules. |
| PA-07 | Reminder processing never updates appointment time, therapist, or room. |
| PA-08 | Administrators are the primary audience for reports, audit review, and monitoring notifications. |
| PA-09 | Target WCAG 2.2 Level AA for the patient experience. |
| PA-10 | Build the staff experience for desktop first, with a usable layout on a tablet-width browser. |
| PA-11 | Application development may proceed locally before AWS apply. Deployment to AWS waits for TBD-21 approval. |
| PA-12 | Store absolute appointment instants and display the confirmed clinic timezone. Do not infer clinic timezone from owner location. |
| PA-13 | Instant booking when resources are free, with no separate approval queue. |
| PA-14 | Prevent a patient from holding two appointments that overlap in time. |
| PA-15 | Therapist access proposal until TBD-10 is answered: a therapist may open patients who have an appointment assigned to that therapist. |
| PA-16 | Caregiver proposal until TBD-12 is answered: a caregiver may book, reschedule, and cancel future appointments for the linked patient, and may not open documents. |
| PA-17 | One Fargate service for the web application and API, plus the reminder Lambda. Further service splits wait until a requirement needs them. |
| PA-18 | REST JSON API between the React client and the Node.js service. |
| PA-19 | Proposed statuses, off until TBD-26 is approved: scheduled, cancelled. Checked-in, completed, and no-show stay unimplemented. |
| PA-20 | Tag resources with `Project=ClinicFlow`, `Environment`, `ManagedBy=Terraform`, and `Owner` once an owner value is supplied. |

## 16. Implementation milestone plan

This plan sequences work after Milestone 0. It is a proposed plan for approval with this baseline. Dates are not assigned.

| Milestone | Outcome | AWS resources | Project 1 |
| --- | --- | --- | --- |
| M0 | Approve these three documents or record corrections. | None | No change |
| M1 | Cost review using current AWS prices. Choose TBD-21. Record the Project 1 preservation check. Decide TBD-22 only if the owner wants decommission. | None until the written decision says otherwise | No change unless that decision explicitly approves it |
| M2 | Terraform for the approved deployment profile: account budget alarm, tags, network, IAM boundaries, logging. | Only after M1 approval to apply | No change |
| M3 | PostgreSQL, private document bucket with Versioning, secrets. | After M1 | No change |
| M4 | Cognito and backend authorization for the four roles and caregiver delegation. | After M1 | No change |
| M5 | Shared schedule: book, reschedule, cancel, durations, exceptions, conflicts, telephone, walk-in. | Application | No change |
| M6 | Waitlist conversion onto that schedule. | Application | No change |
| M7 | Patient experience: mobile layout, accessibility, preferences, consent. | Application | No change |
| M8 | Caregiver booking within the approved and any newly approved actions. | Application | No change |
| M9 | Document upload and authorized retrieval. | After M1 | No change |
| M10 | Reminder pipeline and idempotent email send. | After M1 | No change |
| M11 | Reports, audit history, CloudWatch alarms, SNS notifications. | After M1 | No change |
| M12 | Pipeline, controlled ECS deploy, rollback, and a recorded recovery drill for PITR and S3 version recovery. | After M1 | No change |
| M13 | Execute `docs/acceptance-criteria.md` and record pass or fail. | Uses the approved environment | No change |

Audit capture and delivery foundations should begin with the features they support; M11 and M12 complete their operational verification.

M0 approval authorizes the requirements baseline only. M1 is the next implementation milestone. The later master build prompt should treat M1 as a gate, not as optional cleanup.

## 17. Approval

| Decision | Record |
| --- | --- |
| Approved requirements accepted | Pending review |
| Proposed assumptions PA-01 through PA-20 | Pending. Each item may be accepted, rejected, or left TBD. |
| TBD register acknowledged | Pending review |
| Permission to write application code | Not granted |
| Permission to run Terraform apply or create AWS resources | Not granted |
| Permission to decommission or modify Project 1 | Not granted |

Reviewer notes:

```
Date:
Reviewer:
Corrections:
Accepted proposal IDs:
Rejected proposal IDs:
```



