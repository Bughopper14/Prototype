# LiuGong Finance · LOS-DMS

Working local full-stack implementation of the supplied functional specification: React + TypeScript, Express REST API, PostgreSQL schema, cookie-based JWT authentication, department permissions, private documents and append-only audit records.

## Run

Requires Node.js 22 or later.

```sh
npm install
npm run dev
```

Open http://127.0.0.1:5173. The API runs on port 3001. Local data persists in `.data/db`; document binaries persist in `.data/files`.

Local demo accounts: `mkt@liugong.local`, `bs@liugong.local`, `ca@liugong.local`, `legal@liugong.local`, and `committee@liugong.local`. Default password: `LiuGong2026!`. The login screen provides department shortcuts. These are synthetic demo accounts and records.

```sh
npm test
npm run build
npm start
```

After building, `npm start` serves both the API and built frontend at http://127.0.0.1:3001.

## Implemented

- Portfolio dashboard; searchable applications; branch, date and status filters; CSV export; customer directory.
- Customer creation and reusable master records; automatic atomic FAP numbering.
- Five editing sections: profile/PIC, ownership, projects/bank facilities, financing/equipment, three-year financial spreading.
- Decimal financial validation, shareholder checks, installment estimates and financial ratios.
- Document upload, file history, PDF/image preview, image zoom/rotation, department verification, expiry checks and document audit events.
- MKT → BS → independent CA/Legal sign-offs → committee approval/rejection, with returns, stage locks and role checks.
- Authenticated file access with signed links valid for 15 minutes; PDF/PNG/JPEG signatures checked; 20 MB maximum size.
- Database triggers prevent changing/deleting application and document audit records.

## Deployment configuration

Copy `.env.example` to `.env`. Set `DATABASE_URL` to use a PostgreSQL service instead of embedded PGlite. Schema migration runs on startup. Configure `S3_BUCKET`, `S3_REGION`, `S3_ACCESS_KEY_ID`, and `S3_SECRET_ACCESS_KEY` for private S3 storage; set `S3_ENDPOINT` for MinIO. This adapter is included but was not tested against an external service in this workspace.

For production set `NODE_ENV=production`, a strong `JWT_SECRET`, and `BOOTSTRAP_PASSWORD` **before the first startup against an empty production database**. Production does not seed sample applications. The initial five department users share the bootstrap password; replace this bootstrap arrangement with your organization’s identity provisioning before live use. Place the loopback listener behind an HTTPS reverse proxy and set `APP_ORIGIN` to the exact HTTPS origin. Secure cookies require HTTPS. Use dedicated PostgreSQL/S3 credentials, backups and your organization’s retention policies.

## Specification decisions and limits

- All authenticated departments can read all applications, matching the FSD. No branch-specific access policy was supplied.
- FAP sequence resets annually and increments atomically. Number dates use UTC.
- Corporate shareholders use NPWP; individual WNI use KTP plus NPWP. WNA individuals require an E-KITAS checklist item before submission.
- The exact category-dependent checklist matrix was not supplied. A documented baseline of ten checklist items is used. Mandatory legal opinion is required for final review, but not initial MKT submission.
- `START_REVIEW`, `RECOMMEND_LEGAL`, and `REJECT_COMMITTEE` complete transitions missing from the sample action list. Both CA and Legal must sign off. Re-uploading files invalidates sign-offs.
- DSCR is explicitly unavailable because depreciation is absent from the supplied schema. Other ratios return N/A for zero denominators.
- Financing value means gross equipment value, matching the FSD example; down payment is deducted for the reducing-balance installment estimate. Fees, tax, insurance and security-deposit treatment are excluded from that estimate.
- Demonstration applications show example workflow stages without fabricated document files. Real transitions enforce completion rules.
- Offering-letter and contract generation, SSO, user administration, malware scanning and a category-specific checklist policy are not implemented. No production deployment has been performed.
- The UI uses responsive in-app navigation, rather than dedicated URL routes for each application section. PDF controls depend on the browser’s PDF viewer.

Relational DDL is in `server/schema.sql`. API routes are implemented in `server/index.ts`.

## Verification

Unit tests cover exact decimal balances, share validation, FAP formatting, financing totals, annuity calculations and zero denominators. The integration test starts an isolated server and database under `.data/tests`, exercises authenticated document access and the full dual-review workflow, checks transaction rollback and role/stage restrictions, verifies append-only audit triggers, and restarts the server to check persistence.
