/**
 * The single place that knows how CRM tables are named.
 *
 * CRM_PREFIX (default "crm_") is read from .env once, when this module loads (main.ts and the scripts load .env before
 * anything else). CRM and users tables live in the same database (DB_NAME).
 *
 * Table names cannot be bound as query parameters, so the prefix is validated here and every name is returned already
 * quoted, for example `crm_master_branches`. Use them in SQL as they are, without adding backticks.
 *
 * Only CRM code imports this file. users_* tables are never named here.
 */
const IDENTIFIER = /^[A-Za-z0-9_]*$/;

export const CRM_PREFIX = process.env.CRM_PREFIX ?? 'crm_';

if (!IDENTIFIER.test(CRM_PREFIX))
  throw new Error(`CRM_PREFIX "${CRM_PREFIX}" is not valid: use letters, digits and underscores only.`);

/** Quoted, prefixed name of a CRM table: crmTable('applications'). */
export function crmTable(base: string): string {
  if (!base || !IDENTIFIER.test(base)) throw new Error(`Invalid CRM table name "${base}".`);
  return `\`${CRM_PREFIX}${base}\``;
}

/** Every CRM table of the crm_liugong design (apps/backend/db/1-schema.sql), keyed without the prefix. */
export const CRM = {
  masterBranches: crmTable('master_branches'),
  masterBusinessCategories: crmTable('master_business_categories'),
  masterIndustrySegments: crmTable('master_industry_segments'),
  masterBusinessRoles: crmTable('master_business_roles'),
  masterPicPositions: crmTable('master_pic_positions'),
  masterPremiseStatuses: crmTable('master_premise_statuses'),
  masterCountries: crmTable('master_countries'),
  masterProvinces: crmTable('master_provinces'),
  masterCities: crmTable('master_cities'),
  masterDistricts: crmTable('master_districts'),
  masterPostalCodes: crmTable('master_postal_codes'),
  masterVillages: crmTable('master_villages'),
  masterFinancialInstitutions: crmTable('master_financial_institutions'),
  masterProjectRoles: crmTable('master_project_roles'),
  masterApplicationSources: crmTable('master_application_sources'),
  masterEquipmentCategories: crmTable('master_equipment_categories'),
  masterEquipmentBrands: crmTable('master_equipment_brands'),
  masterEquipmentTypes: crmTable('master_equipment_types'),
  masterEquipmentModels: crmTable('master_equipment_models'),
  masterEquipmentAssets: crmTable('master_equipment_assets'),
  masterFacilityPurposes: crmTable('master_facility_purposes'),
  masterFinancingPurposeOptions: crmTable('master_financing_purpose_options'),
  masterFinancingMethods: crmTable('master_financing_methods'),
  masterCurrencies: crmTable('master_currencies'),
  masterPaymentTimings: crmTable('master_payment_timings'),
  masterFapDocumentRequirements: crmTable('master_fap_document_requirements'),
  masterLegalRemarkCategories: crmTable('master_legal_remark_categories'),
  masterLegalRepresentativeTypes: crmTable('master_legal_representative_types'),
  masterLegalDesignations: crmTable('master_legal_designations'),
  masterStakeholderPositions: crmTable('master_stakeholder_positions'),
  masterDocumentTypes: crmTable('master_document_types'),
  masterForms: crmTable('master_forms'),
  masterFormFields: crmTable('master_form_fields'),
  masterPreanalysisInvestmentOptions: crmTable('master_preanalysis_investment_options'),
  masterBusinessPartners: crmTable('master_business_partners'),
  workflows: crmTable('workflows'),
  workflowStageGroups: crmTable('workflow_stage_groups'),
  workflowStages: crmTable('workflow_stages'),
  workflowStageFields: crmTable('workflow_stage_fields'),
  masterFormSections: crmTable('master_form_sections'),
  masterApprovals: crmTable('master_approvals'),
  masterApprovalLevels: crmTable('master_approval_levels'),
  workflowApprovalAssignments: crmTable('workflow_approval_assignments'),
  masterApprovalLogs: crmTable('master_approval_logs'),
  workflowLogs: crmTable('workflow_logs'),
  applicationApprovalSteps: crmTable('application_approval_steps'),
  workflowStageDocuments: crmTable('workflow_stage_documents'),
  applications: crmTable('applications'),
  applicationDocumentOverrides: crmTable('application_document_overrides'),
  applicationStageProgress: crmTable('application_stage_progress'),
  applicationGroupProgress: crmTable('application_group_progress'),
  prototypePreanalysis: crmTable('prototype_preanalysis'),
  fapApplicationProfiles: crmTable('fap_application_profiles'),
  fapPrimaryContacts: crmTable('fap_primary_contacts'),
  fapFinancingPurposes: crmTable('fap_financing_purposes'),
  fapProjectContracts: crmTable('fap_project_contracts'),
  fapBankFacilities: crmTable('fap_bank_facilities'),
  fapFinancingProposals: crmTable('fap_financing_proposals'),
  fapEquipmentUnits: crmTable('fap_equipment_units'),
  fapDocRequirements: crmTable('fap_doc_requirements'),
  fapFinancialStatements: crmTable('fap_financial_statements'),
  fapLegalDeeds: crmTable('fap_legal_deeds'),
  fapLegalDeedRemarkCategories: crmTable('fap_legal_deed_remark_categories'),
  fapLegalStakeholders: crmTable('fap_legal_stakeholders'),
  applicationDocumentChecklists: crmTable('application_document_checklists'),
  applicationDocumentFiles: crmTable('application_document_files'),
  fapDocumentOcrComparisons: crmTable('fap_document_ocr_comparisons'),
  fapDocumentOcrDiscrepancies: crmTable('fap_document_ocr_discrepancies'),
  applicationActivityLogs: crmTable('application_activity_logs'),
  applicationNotifications: crmTable('application_notifications'),
  frozenWorkflows: crmTable('frozen_workflows'),
  frozenWorkflowStageGroups: crmTable('frozen_workflow_stage_groups'),
  frozenWorkflowStages: crmTable('frozen_workflow_stages'),
  frozenWorkflowStageFields: crmTable('frozen_workflow_stage_fields'),
  frozenWorkflowStageDocuments: crmTable('frozen_workflow_stage_documents'),
  frozenWorkflowApprovalAssignments: crmTable('frozen_workflow_approval_assignments'),
  frozenApprovals: crmTable('frozen_approvals'),
  frozenApprovalLevels: crmTable('frozen_approval_levels'),
  frozenFapApplications: crmTable('frozen_fap_applications'),
  frozenFapPrimaryContacts: crmTable('frozen_fap_primary_contacts'),
  frozenFapFinancingPurposes: crmTable('frozen_fap_financing_purposes'),
  frozenFapProjectContracts: crmTable('frozen_fap_project_contracts'),
  frozenFapBankFacilities: crmTable('frozen_fap_bank_facilities'),
  frozenFapFinancingProposals: crmTable('frozen_fap_financing_proposals'),
  frozenFapEquipmentUnits: crmTable('frozen_fap_equipment_units'),
  frozenFapDocRequirements: crmTable('frozen_fap_doc_requirements'),
  frozenFapFinancialStatements: crmTable('frozen_fap_financial_statements'),
  frozenFapLegalDeeds: crmTable('frozen_fap_legal_deeds'),
  frozenFapLegalDeedRemarkCategories: crmTable('frozen_fap_legal_deed_remark_categories'),
  frozenFapLegalStakeholders: crmTable('frozen_fap_legal_stakeholders'),
  frozenFapDocumentChecklists: crmTable('frozen_fap_document_checklists'),
  frozenFapOcrDiscrepancies: crmTable('frozen_fap_ocr_discrepancies'),
} as const;
