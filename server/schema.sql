CREATE TABLE IF NOT EXISTS "business_partner" (
  "id" TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  "company_name" VARCHAR(255) NOT NULL,
  "company_type" TEXT NOT NULL DEFAULT 'CORPORATE' CHECK ("company_type" IN ('CORPORATE','COMMERCIAL','MICRO','LIUGONG_USER')),
  "business_partner_type" TEXT NOT NULL DEFAULT 'Prorpect Customer',
  "nib" VARCHAR(13) NOT NULL UNIQUE,
  "npwp" VARCHAR(20) NOT NULL UNIQUE,
  "skt_no" VARCHAR(100),
  "sppkp_no" VARCHAR(100),
  "establishment_act_no" VARCHAR(100),
  "establishment_date" DATE,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS "applications" (
  "id" TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  "customer_id" TEXT NOT NULL,
  "fap_number" VARCHAR(50) NOT NULL UNIQUE,
  "application_date" DATE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "branch_code" VARCHAR(20) NOT NULL,
  "customer_status" TEXT NOT NULL CHECK ("customer_status" IN ('NEW','EXISTING')),
  "status" TEXT NOT NULL DEFAULT 'DRAFT' CHECK ("status" IN ('DRAFT','SUBMITTED_TO_BS','BS_VERIFIED','IN_CA_LEGAL_REVIEW','CREDIT_COMMITTEE_REVIEW','APPROVED','REJECTED','RETURNED')),
  "company_address" TEXT NOT NULL,
  "city" VARCHAR(100) NOT NULL,
  "province" VARCHAR(100) NOT NULL,
  "postal_code" VARCHAR(10) NOT NULL,
  "phone_fax" VARCHAR(50) NOT NULL,
  "email" VARCHAR(100) NOT NULL,
  "website" VARCHAR(150),
  "main_business" VARCHAR(150) NOT NULL,
  "experience_years" INTEGER NOT NULL DEFAULT 0,
  "experience_months" INTEGER NOT NULL DEFAULT 0,
  "location_status" TEXT NOT NULL CHECK ("location_status" IN ('OWNED','RENTED')),
  "repayment_source" TEXT NOT NULL,
  "latest_deed_no" VARCHAR(100),
  "latest_deed_date" DATE,
  "industry_segment" TEXT NOT NULL CHECK ("industry_segment" IN ('MINING','AGRICULTURE','FORESTRY','CONSTRUCTION','OIL_AND_GAS','OTHER')),
  "business_role" TEXT NOT NULL CHECK ("business_role" IN ('CONS_OWNER','CONTRACTORS','SUB_CONT','RENTAL','OTHER')),
  "asset_summary_he_liugong" INTEGER NOT NULL DEFAULT 0,
  "asset_summary_truck_liugong" INTEGER NOT NULL DEFAULT 0,
  "asset_summary_he_non_liugong" INTEGER NOT NULL DEFAULT 0,
  "asset_summary_truck_non_liugong" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS "application_pics" (
  "id" TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  "application_id" TEXT NOT NULL UNIQUE,
  "pic_name" VARCHAR(150) NOT NULL,
  "position" VARCHAR(100) NOT NULL,
  "phone" VARCHAR(50) NOT NULL,
  "email" VARCHAR(100) NOT NULL,
  "current_address" TEXT NOT NULL,
  "city" VARCHAR(100) NOT NULL,
  "province" VARCHAR(100) NOT NULL,
  "postal_code" VARCHAR(10) NOT NULL
);
CREATE TABLE IF NOT EXISTS "stakeholders" (
  "id" TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  "application_id" TEXT NOT NULL,
  "name" VARCHAR(150) NOT NULL,
  "position" VARCHAR(100) NOT NULL,
  "stakeholder_type" TEXT NOT NULL CHECK ("stakeholder_type" IN ('INDIVIDUAL','CORPORATE')),
  "nationality_type" TEXT NOT NULL DEFAULT 'WNI' CHECK ("nationality_type" IN ('WNI','WNA')),
  "id_number" VARCHAR(50) NOT NULL,
  "tax_number" VARCHAR(50),
    "share_amount" NUMERIC(18, 2) NOT NULL DEFAULT 0,
    "share_percentage" NUMERIC(5, 2) NOT NULL,
    "representative_type" TEXT,
    "signatory" TEXT,
    "id_type" TEXT,
    "title" TEXT,
    "first_name" TEXT,
    "middle_name" TEXT,
    "last_name" TEXT,
    "date_of_birth" DATE,
    "age_years" INTEGER,
    "age_months" INTEGER,
    "marital_status" TEXT,
    "email" TEXT,
    "mobile_phone" TEXT,
    "gender" TEXT,
    "primary_capital" NUMERIC(18, 2),
    "citizenship" TEXT,
    "country" TEXT,
    "province" TEXT,
    "city_regency" TEXT,
    "district" TEXT,
    "village" TEXT,
    "rw" TEXT,
    "rt" TEXT,
    "address" TEXT,
    "postal_code" TEXT
  );
CREATE TABLE IF NOT EXISTS "project_contracts" (
  "id" TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  "application_id" TEXT NOT NULL,
  "project_owner" VARCHAR(200) NOT NULL,
  "project_location" VARCHAR(255) NOT NULL,
  "project_role" VARCHAR(100) NOT NULL,
  "contract_status" VARCHAR(20) NOT NULL
);
CREATE TABLE IF NOT EXISTS "bank_references" (
  "id" TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  "application_id" TEXT NOT NULL,
  "bank_or_fin_institution" VARCHAR(150) NOT NULL,
  "currency" VARCHAR(5) NOT NULL DEFAULT 'IDR',
  "credit_facility" NUMERIC(18, 2) NOT NULL,
  "monthly_installment" NUMERIC(18, 2) NOT NULL,
  "year_started" INTEGER NOT NULL,
  "interest_rate" NUMERIC(5, 2) NOT NULL,
  "payment_record" VARCHAR(50) NOT NULL,
  "facility_status" VARCHAR(50) NOT NULL
);
CREATE TABLE IF NOT EXISTS "financing_proposals" (
  "id" TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  "application_id" TEXT NOT NULL UNIQUE,
  "facility_purpose" TEXT NOT NULL CHECK ("facility_purpose" IN ('INVESTMENT','WORKING_CAPITAL')),
  "purpose_detail" VARCHAR(100),
  "financing_method" TEXT NOT NULL CHECK ("financing_method" IN ('FINANCIAL_LEASE','SALE_AND_LEASE_BACK','INSTALLMENT_FINANCING')),
  "currency" VARCHAR(5) NOT NULL DEFAULT 'IDR',
  "financing_value" NUMERIC(18, 2) NOT NULL,
  "down_payment_value" NUMERIC(18, 2) NOT NULL DEFAULT 0,
  "security_deposit" NUMERIC(18, 2) NOT NULL DEFAULT 0,
  "interest_rate" NUMERIC(5, 2) NOT NULL,
  "tenor_months" INTEGER NOT NULL,
  "payment_method" VARCHAR(50) NOT NULL,
  "application_source" VARCHAR(100),
  "terms_notes" TEXT
);
CREATE TABLE IF NOT EXISTS "financing_unit_items" (
  "id" TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  "proposal_id" TEXT NOT NULL,
  "brand" VARCHAR(50) NOT NULL,
  "unit_category" TEXT NOT NULL CHECK ("unit_category" IN ('HE','TRUCK')),
  "model_name" VARCHAR(100) NOT NULL,
  "quantity" INTEGER NOT NULL DEFAULT 1,
  "unit_price" NUMERIC(18, 2) NOT NULL,
  "total_price" NUMERIC(18, 2) NOT NULL
);
CREATE TABLE IF NOT EXISTS "financial_statements" (
  "id" TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  "application_id" TEXT NOT NULL,
  "fiscal_year" INTEGER NOT NULL,
  "is_audited" BOOLEAN NOT NULL DEFAULT false,
  "current_assets" NUMERIC(18, 2) NOT NULL,
  "non_current_assets" NUMERIC(18, 2) NOT NULL,
  "total_assets" NUMERIC(18, 2) NOT NULL,
  "current_liabilities" NUMERIC(18, 2) NOT NULL,
  "non_current_liabilities" NUMERIC(18, 2) NOT NULL,
  "total_liabilities" NUMERIC(18, 2) NOT NULL,
  "equity" NUMERIC(18, 2) NOT NULL,
  "total_liab_and_equity" NUMERIC(18, 2) NOT NULL,
  "revenue" NUMERIC(18, 2) NOT NULL,
  "gross_margin" NUMERIC(18, 2) NOT NULL,
  "operating_margin" NUMERIC(18, 2) NOT NULL,
  "tax" NUMERIC(18, 2) NOT NULL,
  "net_income" NUMERIC(18, 2) NOT NULL,
  UNIQUE ("application_id","fiscal_year")
);
CREATE TABLE IF NOT EXISTS "document_checklists" (
  "id" TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  "application_id" TEXT NOT NULL,
  "document_code" VARCHAR(50) NOT NULL,
  "document_name" VARCHAR(150) NOT NULL,
  "is_mandatory" BOOLEAN NOT NULL DEFAULT false,
  "assigned_role" TEXT NOT NULL CHECK ("assigned_role" IN ('MKT','BS','CA','LEGAL')),
  "checked_by_mkt" BOOLEAN NOT NULL DEFAULT false,
  "checked_by_bs" BOOLEAN NOT NULL DEFAULT false,
  "checked_by_ca" BOOLEAN NOT NULL DEFAULT false,
  "checked_by_legal" BOOLEAN NOT NULL DEFAULT false,
  "registration_date" DATE,
  "expired_date" DATE,
  "data_summary" TEXT,
  "notes" TEXT,
  "status" TEXT NOT NULL DEFAULT 'PENDING' CHECK ("status" IN ('PENDING','UPLOADED','VERIFIED','REJECTED','WAIVED'))
);
CREATE TABLE IF NOT EXISTS "document_files" (
  "id" TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  "checklist_id" TEXT NOT NULL,
  "file_name" VARCHAR(255) NOT NULL,
  "file_key" VARCHAR(500) NOT NULL,
  "file_size" INTEGER NOT NULL,
  "mime_type" VARCHAR(100) NOT NULL,
  "uploaded_by" VARCHAR(100) NOT NULL,
  "uploaded_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS "approval_logs" (
  "id" TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  "application_id" TEXT NOT NULL,
  "action_by" VARCHAR(100) NOT NULL,
  "user_role" VARCHAR(50) NOT NULL,
  "previous_status" TEXT NOT NULL CHECK ("previous_status" IN ('DRAFT','SUBMITTED_TO_BS','BS_VERIFIED','IN_CA_LEGAL_REVIEW','CREDIT_COMMITTEE_REVIEW','APPROVED','REJECTED','RETURNED')),
  "new_status" TEXT NOT NULL CHECK ("new_status" IN ('DRAFT','SUBMITTED_TO_BS','BS_VERIFIED','IN_CA_LEGAL_REVIEW','CREDIT_COMMITTEE_REVIEW','APPROVED','REJECTED','RETURNED')),
  "comments" TEXT,
  "action_timestamp" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
ALTER TABLE "applications" ADD CONSTRAINT "fk_applications_customerId" FOREIGN KEY ("customer_id") REFERENCES "business_partner" ("id");
ALTER TABLE "application_pics" ADD CONSTRAINT "fk_application_pics_applicationId" FOREIGN KEY ("application_id") REFERENCES "applications" ("id") ON DELETE CASCADE;
ALTER TABLE "stakeholders" ADD CONSTRAINT "fk_stakeholders_applicationId" FOREIGN KEY ("application_id") REFERENCES "applications" ("id") ON DELETE CASCADE;
ALTER TABLE "project_contracts" ADD CONSTRAINT "fk_project_contracts_applicationId" FOREIGN KEY ("application_id") REFERENCES "applications" ("id") ON DELETE CASCADE;
ALTER TABLE "bank_references" ADD CONSTRAINT "fk_bank_references_applicationId" FOREIGN KEY ("application_id") REFERENCES "applications" ("id") ON DELETE CASCADE;
ALTER TABLE "financing_proposals" ADD CONSTRAINT "fk_financing_proposals_applicationId" FOREIGN KEY ("application_id") REFERENCES "applications" ("id") ON DELETE CASCADE;
ALTER TABLE "financing_unit_items" ADD CONSTRAINT "fk_financing_unit_items_proposalId" FOREIGN KEY ("proposal_id") REFERENCES "financing_proposals" ("id") ON DELETE CASCADE;
ALTER TABLE "financial_statements" ADD CONSTRAINT "fk_financial_statements_applicationId" FOREIGN KEY ("application_id") REFERENCES "applications" ("id") ON DELETE CASCADE;
ALTER TABLE "document_checklists" ADD CONSTRAINT "fk_document_checklists_applicationId" FOREIGN KEY ("application_id") REFERENCES "applications" ("id") ON DELETE CASCADE;
ALTER TABLE "document_files" ADD CONSTRAINT "fk_document_files_checklistId" FOREIGN KEY ("checklist_id") REFERENCES "document_checklists" ("id") ON DELETE CASCADE;
ALTER TABLE "approval_logs" ADD CONSTRAINT "fk_approval_logs_applicationId" FOREIGN KEY ("application_id") REFERENCES "applications" ("id") ON DELETE CASCADE;
