/**
 * How the mandatory rules of a workflow (crm_workflow_stage_fields) meet the forms. A rule names a master form field by the code of its
 * section (crm_master_form_sections.code) and its key (crm_master_form_fields.field_key); the master has exactly the inputs the forms have,
 * under the same key. The server (what must be filled before a submit) and the forms (the red star) read the rule the same way.
 */

/** The master form sections (crm_master_form_sections.code) the forms are built from. */
export const FORM_SECTION = {
  DEBTOR: 'DEBTOR-IDENTITY-CLASSIFICATION',
  REGISTRATION: 'REGISTRATION-OFFICE-COMPANY-DOMICILE',
  BUSINESS: 'BUSINESS-PROFILE-DEED-LEGALITY',
  PIC: 'PRIMARY-CONTACT-PERSON-IN-CHARGE-PIC',
  PURPOSE: 'PURPOSE-OF-FINANCING-FIXED-ASSETS',
  SEGMENTATION: 'INDUSTRY-SEGMENTATION-ACTIVE-PROJECTS',
  BANKS: 'BANK-FACILITIES-REFERENCES',
  PROPOSAL: 'FINANCING-PROPOSAL',
  FINANCIAL: 'FINANCIAL-STATEMENTS',
  DEEDS: 'LEGAL-DEEDS-AMENDMENTS',
  STAKEHOLDERS: 'SHAREHOLDERS-MANAGEMENT',
  PRE_GENERAL: 'GENERAL-INFORMATION',
  PRE_PROJECT: 'PROJECT-INFORMATION',
  PRE_CUSTOMER: 'CUSTOMER-GROUP-BACKGROUND',
  PRE_EQUIPMENT: 'EQUIPMENT-POSSIBILITY-OF-SUCCESS',
  PRE_DELIVERY: 'UNIT-DELIVERY-STATUS-QA-CHECK',
  PRE_CROSSCHECK: 'CROSS-CHECK-WITH-DEALER-LMI',
  PRE_EXPERT: 'EXPERT-JUDGEMENT-CONCLUSION',
} as const;
