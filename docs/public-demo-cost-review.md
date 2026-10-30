# Public demo: initial cost and readiness review

Reviewed: 2026-10-29. Region: us-east-1. Status: deployment blocked pending a budget/profile decision. No AWS resources or DNS records changed.

## Cost screening

For a continuously running Linux/x86 demo, assume 730 hours/month, one Application Load Balancer, two public IPv4 addresses, and one Fargate task with 0.25 vCPU / 0.5 GB memory. Task sizing is illustrative, not a tested capacity recommendation.

| Component | Calculation | Monthly USD |
| --- | --- | ---: |
| ALB base charge | 730 × $0.0225 | 16.43 |
| Two public IPv4 addresses | 730 × 2 × $0.005 | 7.30 |
| Small Fargate task | 730 × 3,600 × (0.25 × $0.000011244 + 0.5 × $0.000001235) | 9.01 |
| Partial subtotal | Before all items below | **32.74** |

Sources checked on the review date: [AWS ALB pricing](https://aws.amazon.com/elasticloadbalancing/pricing/), [AWS public IPv4 pricing](https://aws.amazon.com/vpc/pricing/), and [AWS Fargate pricing examples for Northern Virginia](https://aws.amazon.com/fargate/pricing/).

The partial subtotal already exceeds the $25 entire-account budget under these assumptions. It excludes ALB capacity charges, RDS compute/storage/backups, NAT or VPC endpoints, S3, Cognito, reminders, logging, secrets, delivery pipeline, DNS, transfer, taxes, and all existing account spend. No credits, free tier, or discounts are assumed. IPv6-only, ARM, scheduled runtime, or alternate egress profiles would require separate compatibility and cost analysis; none is selected here.

This is a screening calculation, not a complete AWS Pricing Calculator quote or account billing review. Account spend, credit eligibility/expiry, and Project 1 costs have not been retrieved. No metered Cost Explorer API queries were run. There is no reason to remove Project 1 based on this calculation; removal would not increase the account cap.

## Current application readiness

The working application remains a local demo. Its production-startup guard stays enabled.

Before deploying the complete AWS application:

- Implement Cognito sign-in and token validation with persistent backend role/relationship authorization; remove local password/demo-account flows from production.
- Move documents to private S3 with scoped access, versioning, upload controls, and an approved screening/retention policy.
- Connect transactional reminder intent to Scheduler, SQS, Lambda, and SES; verify stale-event suppression, retries, dead-letter handling, and ambiguous outcomes.
- Configure encrypted RDS connections, restricted networking, Secrets Manager, migrations, and recovery procedures.
- Complete and validate the Fargate image, Terraform, controlled delivery, health checks, rollback, CloudWatch/SNS, and cost controls.
- Define a public-demo policy: fictional fixtures, visitor isolation, limits on writes/uploads, safe outbound-email behavior, and protection against modifying administrative access. Do not publish the local administrator credentials or publicly expose the laptop.
- Verify control of the proposed clinicflow.cloudbycliff.com hostname and configure HTTPS only after deployment approval.

These are remaining work, not claims that the application is cloud-ready.

## Decision options

1. **Keep the $25 cap and prepare a separate portfolio demo.** A static/browser-only showcase could display the UI and simulate workflows with fictional data confined to the visitor's browser. It would not provide shared PostgreSQL scheduling, real patient accounts, documents in S3, or email delivery. Retain the complete application and AWS target as separate work. Label the showcase accurately.
2. **Continue toward the complete AWS-hosted application.** Prepare a full account-wide estimate and select a revised budget or an explicitly limited runtime profile before provisioning. No new cap is proposed from this partial calculation.
3. **Keep the local app and public GitHub repository for now.** No hosting changes; share screenshots or a walkthrough separately if requested.

GitHub Pages supports static sites on public repositories with GitHub Free and supports custom domains, so it is a candidate for option 1. It does not run the Node/PostgreSQL backend. Domain/DNS charges, service limits, and ownership still need verification. Sources: [GitHub Pages overview](https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages) and [custom domains](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site).

No option has been approved by this review. A browser-only showcase would be an explicit interim scope change, not satisfaction of the full AWS architecture acceptance criteria. Publishing, DNS changes, AWS spending, and Project 1 modifications remain separate approval gates.
