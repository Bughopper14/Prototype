-- =============================================================================
-- CRM Liugong (crm_liugong1) — Full Database Inspection Queries (104 Tables)
-- Disortir per modul / bagian agar mudah dicek di DBeaver / MySQL Workbench.
-- =============================================================================

USE `crm_liugong1`;

-- =============================================================================
-- 1. USER MANAGEMENT & AUTH (10 Tables)
-- =============================================================================
SELECT * FROM `users_users`;
SELECT * FROM `users_applications`;
SELECT * FROM `users_roles`;
SELECT * FROM `users_authorities`;
SELECT * FROM `users_role_authorities`;
SELECT * FROM `users_user_app_roles`;
SELECT * FROM `users_session_logs`;
SELECT * FROM `users_audit_logs`;
SELECT * FROM `users_vapid_keys`;
SELECT * FROM `users_web_push_subscriptions`;

-- =============================================================================
-- 2. MASTER DATA — LOCATION / WILAYAH (6 Tables)
-- =============================================================================
SELECT * FROM `crm_master_countries`;
SELECT * FROM `crm_master_provinces`;
SELECT * FROM `crm_master_cities`;
SELECT * FROM `crm_master_districts`;
SELECT * FROM `crm_master_villages`;
SELECT * FROM `crm_master_postal_codes`;

-- =============================================================================
-- 3. MASTER DATA — CUSTOMER, ORGANIZATION & GENERAL (9 Tables)
-- =============================================================================
SELECT * FROM `crm_master_branches`;
SELECT * FROM `crm_master_business_partners`;
SELECT * FROM `crm_master_business_categories`;
SELECT * FROM `crm_master_business_roles`;
SELECT * FROM `crm_master_industry_segments`;
SELECT * FROM `crm_master_premise_statuses`;
SELECT * FROM `crm_master_pic_positions`;
SELECT * FROM `crm_master_currencies`;
SELECT * FROM `crm_master_field_mandatory_rules`;

-- =============================================================================
-- 4. MASTER DATA — FINANCING, EQUIPMENT & PRE-ANALYSIS (14 Tables)
-- =============================================================================
SELECT * FROM `crm_master_application_sources`;
SELECT * FROM `crm_master_facility_purposes`;
SELECT * FROM `crm_master_financing_methods`;
SELECT * FROM `crm_master_financing_purpose_options`;
SELECT * FROM `crm_master_payment_timings`;
SELECT * FROM `crm_master_financial_institutions`;
SELECT * FROM `crm_master_project_roles`;
SELECT * FROM `crm_master_preanalysis_investment_options`;
SELECT * FROM `crm_master_equipment_categories`;
SELECT * FROM `crm_master_equipment_brands`;
SELECT * FROM `crm_master_equipment_types`;
SELECT * FROM `crm_master_equipment_models`;
SELECT * FROM `crm_master_equipment_assets`;
SELECT * FROM `crm_master_fap_document_requirements`;

-- =============================================================================
-- 5. MASTER DATA — WORKFLOW, DOCUMENTS & LEGAL (9 Tables)
-- =============================================================================
SELECT * FROM `crm_master_workflow_stages`;
SELECT * FROM `crm_master_workflow_statuses`;
SELECT * FROM `crm_master_workflow`;
SELECT * FROM `crm_master_reject_reason_codes`;
SELECT * FROM `crm_master_document_types`;
SELECT * FROM `crm_master_legal_designations`;
SELECT * FROM `crm_master_legal_representative_types`;
SELECT * FROM `crm_master_legal_remark_categories`;
SELECT * FROM `crm_master_stakeholder_positions`;

-- =============================================================================
-- 6. CORE APPLICATIONS, WORKFLOW, DOCUMENTS & ACTIVITY (8 Tables)
-- =============================================================================
SELECT * FROM `crm_applications`;
SELECT * FROM `crm_application_stage_progress`;
SELECT * FROM `crm_application_stage_transitions`;
SELECT * FROM `crm_application_signoffs`;
SELECT * FROM `crm_application_document_checklists`;
SELECT * FROM `crm_application_document_files`;
SELECT * FROM `crm_application_activity_logs`;
SELECT * FROM `crm_application_activity_changes`;
SELECT * FROM `crm_application_notifications`;

-- =============================================================================
-- 7. FAP — CUSTOMER PROFILE, PIC, PROJECTS, BANKS & FINANCIALS (5 Tables)
-- =============================================================================
SELECT * FROM `crm_fap_application_profiles`;
SELECT * FROM `crm_fap_primary_contacts`;
SELECT * FROM `crm_fap_project_contracts`;
SELECT * FROM `crm_fap_bank_facilities`;
SELECT * FROM `crm_fap_financial_statements`;

-- =============================================================================
-- 8. FAP — FINANCING PROPOSAL, TERMS, EQUIPMENT & CHECKLISTS (5 Tables)
-- =============================================================================
SELECT * FROM `crm_fap_financing_proposals`;
SELECT * FROM `crm_fap_proposal_terms`;
SELECT * FROM `crm_fap_equipment_units`;
SELECT * FROM `crm_fap_financing_purposes`;
SELECT * FROM `crm_fap_doc_requirements`;

-- =============================================================================
-- 9. FAP — LEGAL, STAKEHOLDERS & OCR (14 Tables)
-- =============================================================================
SELECT * FROM `crm_fap_legal_deeds`;
SELECT * FROM `crm_fap_legal_deed_reviews`;
SELECT * FROM `crm_fap_legal_deed_review_histories`;
SELECT * FROM `crm_fap_legal_deed_approved_snapshots`;
SELECT * FROM `crm_fap_legal_deed_parties`;
SELECT * FROM `crm_fap_legal_deed_category_remarks`;
SELECT * FROM `crm_fap_legal_deed_remark_categories`;
SELECT * FROM `crm_fap_legal_stakeholders`;
SELECT * FROM `crm_fap_ocr_ktp`;
SELECT * FROM `crm_fap_ocr_npwp`;
SELECT * FROM `crm_fap_ocr_passport`;
SELECT * FROM `crm_fap_ocr_kitas`;
SELECT * FROM `crm_fap_document_ocr_comparisons`;
SELECT * FROM `crm_fap_document_ocr_discrepancies`;

-- =============================================================================
-- 10. PRE-ANALYSIS (13 Tables)
-- =============================================================================
SELECT * FROM `crm_pre_analysis_forms`;
SELECT * FROM `crm_pre_analysis_group_entities`;
SELECT * FROM `crm_pre_analysis_group_shareholders`;
SELECT * FROM `crm_pre_analysis_investment_plans`;
SELECT * FROM `crm_pre_analysis_unit_compositions`;
SELECT * FROM `crm_pre_analysis_project_groups`;
SELECT * FROM `crm_pre_analysis_project_items`;
SELECT * FROM `crm_pre_analysis_lender_exposures`;
SELECT * FROM `crm_pre_analysis_competitors`;
SELECT * FROM `crm_pre_analysis_slik_reviews`;
SELECT * FROM `crm_pre_analysis_suggestions`;
SELECT * FROM `crm_pre_analysis_milestones`;
SELECT * FROM `crm_pre_analysis_signatories`;

-- =============================================================================
-- 11. FROZEN FAP SNAPSHOTS / ARCHIVE (15 Tables)
-- =============================================================================
SELECT * FROM `crm_frozen_fap_applications`;
SELECT * FROM `crm_frozen_fap_primary_contacts`;
SELECT * FROM `crm_frozen_fap_project_contracts`;
SELECT * FROM `crm_frozen_fap_bank_facilities`;
SELECT * FROM `crm_frozen_fap_financial_statements`;
SELECT * FROM `crm_frozen_fap_financing_proposals`;
SELECT * FROM `crm_frozen_fap_proposal_terms`;
SELECT * FROM `crm_frozen_fap_equipment_units`;
SELECT * FROM `crm_frozen_fap_financing_purposes`;
SELECT * FROM `crm_frozen_fap_doc_requirements`;
SELECT * FROM `crm_frozen_fap_document_checklists`;
SELECT * FROM `crm_frozen_fap_legal_deeds`;
SELECT * FROM `crm_frozen_fap_legal_deed_remark_categories`;
SELECT * FROM `crm_frozen_fap_legal_stakeholders`;
SELECT * FROM `crm_frozen_fap_ocr_discrepancies`;

