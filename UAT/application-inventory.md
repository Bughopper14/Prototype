# Application Inventory (master checklist)

Source: static inspection on 2026-11-10. Every row starts as NOT TESTED; update as tasks complete.

## Frontend routes (apps/frontend/src/App.tsx)
| Section | Route | Component | Guard | Status |
|---|---|---|---|---|
| A1 | `/login` | features/auth/LoginPage | public | NOT TESTED |
| A2 | `/gallery` (default `/` redirects here) | features/portal/GalleryPage | RequireSession | NOT TESTED |
| A3 | `/user-management` | features/user-management/UserManagementPage | RequireSession | NOT TESTED |
| A4 | `/crm-dashboard` | CrmLayout + OverviewPage | RequireSession | NOT TESTED |
| A5 | `/crm-dashboard/applications` | ApplicationsPage / ApplicationTable | session + authority | NOT TESTED |
| A6 | `/crm-dashboard/applications/new` | NewApplicationPage (NIB OCR, wilayah cascade) | session + authority | NOT TESTED |
| A7 | `/crm-dashboard/applications/:id` | ApplicationPage / ApplicationWorkspace | session + authority | NOT TESTED |
| A7a-f | workspace tabs: Customer, Business and Banks, Financial Statements, Legal, Stakeholders, Pre-Analysis | tabs/*.tsx | per-tab authority | NOT TESTED |
| A7g | dialogs: SaveLegalConfirm, StageTransition, SubmitFapConfirm; stepper, print FAP | workspace/dialogs | | NOT TESTED |
| A8 | `/crm-dashboard/document-desk` | DocumentDeskPage (checklist, evidence viewer, FAP diff, upload history) | crm_view_document_desk | NOT TESTED |
| A9 | `/crm-dashboard/customers` | CustomersPage / CustomerDirectory | crm_view_customers | NOT TESTED |
| A10 | `/crm-dashboard/master-data` | MasterDataPage | crm_manage_master_data | NOT TESTED |
| A11 | `/crm-dashboard/notifications` | NotificationsPage | crm_view_notifications | NOT TESTED |
| A12 | `/crm-dashboard/activity` | ActivityPage (diff cards, filters) | crm_view_activity | NOT TESTED |
| A13 | `*` fallback redirect to `/gallery`; ChangePasswordModal; user menu / logout | | | NOT TESTED |

## Backend endpoints (prefix `/api/v1` unless noted; from controller decorators)
| Group | Endpoints | Status |
|---|---|---|
| Auth (`/api/auth`) | POST login, POST logout, POST change-password; GET `auth/me` | NOT TESTED |
| System | GET health, GET mysql/health | NOT TESTED (health GET observed 200 during discovery, not a test result) |
| Portal | GET portal/apps, GET portal/access | NOT TESTED |
| Applications | GET/POST applications, GET applications/:id, PUT :id/page-1, PUT :id/stage, POST :id/transition, PATCH :id/checklist/:checklistId/verify | NOT TESTED |
| Customers | GET/POST customers | NOT TESTED |
| Documents | GET document-desk, POST applications/:id/documents/upload, DELETE applications/:id/documents/files/:fileId, GET files/:id/url, GET files/:id/content; GET `/documents/*path` (stored files) | NOT TESTED |
| FAP | GET fap-comparison, POST fap-comparison/remarks, POST fap-comparison/run, POST fap-changes/approve, POST fap-changes/dismiss, GET applications/:id/fap-archive, GET fap-archive/:archiveId, PUT/POST/PATCH/DELETE ARCHIVE_PATHS | NOT TESTED |
| Identity docs / OCR | POST ocr/scan, POST ocr/warmup, POST stakeholders/documents/save, GET stakeholders/documents/:docType/:stakeholderId | NOT TESTED |
| Legal | PUT :id/page-legal, PUT :id/deeds/:deedId/draft, POST :id/deeds/:deedId/review | NOT TESTED |
| Pre-analysis | GET/PUT applications/:id/pre-analysis | NOT TESTED |
| Master data | GET/PUT master-data, GET/PUT mandatory | NOT TESTED |
| Activity | POST user-activity, GET activity, GET notifications, PATCH notifications/:id/read | NOT TESTED |
| User management (`/um`) | GET overview; POST/PUT/DELETE users; GET/PUT users/:id/permissions; PUT users/:id/session-timeout; POST users/:id/force-logout; POST sessions/:sessionId/terminate; POST/DELETE applications; POST/PUT/DELETE roles; POST/PUT/DELETE authorities | NOT TESTED |

## Authorities seen in guards
crm_view_applications, crm_create_application, crm_edit_app_customer_pic, crm_edit_app_business_banks, crm_edit_app_financing_units, crm_edit_app_financial, crm_edit_app_legal, crm_edit_app_stakeholders, crm_workflow_submit, crm_verify_app_documents, crm_view_customers, crm_manage_customers, crm_view_document_desk, crm_view_app_documents, crm_upload_app_documents, crm_delete_app_documents, crm_manage_master_data, crm_quick_add_master_option, crm_view_activity, crm_view_app_activity, crm_view_notifications. (39 authorities exist in the DB; full list to be reconciled in DB-003.)
Roles: DB `crm-liugong` has 4 roles, `crm_test` had 9. Role matrix to be built per live roles.

## Database (crm-liugong, 68 tables per earlier dump; `crm_test` has 69)
Groups: users/auth (users, crm_users, crm_users_legacy, roles, authorities, role_authorities, user_app_roles, session_logs, audit_logs), applications (applications, all_applications, new_application_fap_stage, new_application_pre_analisis, application_pre_analysis, application_activity, application_submit_lock), customers (master_cust_n_pic_business_partner, customer_pic, project_contract), legal (daftar_akta, deed_review, legal_stakeholder, ktp, kitas, passport, npwp), finance (financial_statement, financing_detail, bank_facilities, equipment_units), documents (application_document_checklist, application_document_file, master_document_jenis_dokumen_wajib), FAP (fap_form, fap_submission_archive), master tables (master_*; location tables hold about 100k rows), notifications (notifications, web_push_subscriptions, vapid_keys), master_mandatory (203 rows). 0 views, 0 routines, 134 triggers, 34 FKs. All DB rows: NOT AUDITED yet.

## Integrations and jobs
Python OCR (NIB/KTP/KITAS/passport) via child process; S3 presigned URLs; web push (VAPID). No scheduled jobs found. All NOT TESTED.

## Pre-test observations (from reading code and the earlier dump; not executed, so not findings yet)
- Runtime `CREATE TABLE IF NOT EXISTS` / `ALTER TABLE` in `*/initialize.ts` at app start duplicates `db/schema.sql`: schema drift risk. (DB-005)
- Two parallel user tables (`users`, `crm_users`, plus `crm_users_legacy`). (DB-003)
- `crm_test` location master tables are empty while `crm-liugong` has 83k villages. (DB-004)
- `main.ts` startup message refers to frontend port 3000, actual dev port 3100. Cosmetic.
- Prior run flagged write APIs lacking authority checks (`PUT /mandatory`, now guarded in code: needs re-test) and date shifts of -1 day. Re-verify in BE/UAT tasks.
