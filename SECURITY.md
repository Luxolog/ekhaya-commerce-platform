# Security Policy

Ekhaya Technologies is an operating name of Ekhaya Scents (Pty) Ltd.

## Reporting a vulnerability

Please report suspected security vulnerabilities privately to **hello@ekhayatech.co.za**. Do not publish exploit details, customer information, access tokens, API keys, screenshots containing personal data, or proof-of-concept data in public issues.

Include the affected URL or component, impact, reproduction steps using test data, and a safe way for us to contact you. We will acknowledge reports as soon as reasonably practicable and coordinate remediation before any public disclosure.

## Security practices

- Keep secrets in managed environment variables or secret stores; never commit them.
- Use least-privilege credentials and separate development, staging and production secrets.
- Require reviewed changes, dependency updates and automated secret/code scanning.
- Keep customer and personal information out of source control, logs and test fixtures.
- Apply authentication, authorisation and row-level access controls on server-side data services.
- Report suspected personal-information compromises immediately so the responsible party can assess POPIA notification duties.

## Scope and limitations

A security scan or this policy is not a guarantee that the application is vulnerability-free. Do not perform destructive testing, denial-of-service testing, social engineering, or access other users' data without written authorisation.
