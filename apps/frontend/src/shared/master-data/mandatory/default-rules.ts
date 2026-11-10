/** Built-in mandatory-field rules, used until the server copy has loaded. */
import {FAP_DEBTOR_IDENTITY_AND_CLASSIFICATION_RULES} from '@/shared/master-data/mandatory/rules/fap-debtor-identity-and-classification';
import {FAP_REGISTRATION_OFFICE_AND_COMPANY_DOMICILE_RULES} from '@/shared/master-data/mandatory/rules/fap-registration-office-and-company-domicile';
import {FAP_BUSINESS_PROFILE_AND_DEED_LEGALITY_RULES} from '@/shared/master-data/mandatory/rules/fap-business-profile-and-deed-legality';
import {FAP_PRIMARY_CONTACT_PERSON_IN_CHARGE_PIC_RULES} from '@/shared/master-data/mandatory/rules/fap-primary-contact-person-in-charge-pic';
import {FAP_INDUSTRY_SEGMENTATION_AND_ACTIVE_PROJECTS_RULES} from '@/shared/master-data/mandatory/rules/fap-industry-segmentation-and-active-projects';
import {PRE_AN_GENERAL_INFORMATION_RULES} from '@/shared/master-data/mandatory/rules/pre-an-general-information';
import {PRE_AN_PROJECT_INFORMATION_RULES} from '@/shared/master-data/mandatory/rules/pre-an-project-information';
import {PRE_AN_CUSTOMER_AND_GROUP_BACKGROUND_RULES} from '@/shared/master-data/mandatory/rules/pre-an-customer-and-group-background';
import {PRE_AN_EQUIPMENT_POSSIBILITY_OF_SUCCESS_RULES} from '@/shared/master-data/mandatory/rules/pre-an-equipment-possibility-of-success';
import {PRE_AN_UNIT_DELIVERY_STATUS_AND_QA_CHECK_RULES} from '@/shared/master-data/mandatory/rules/pre-an-unit-delivery-status-and-qa-check';
import {PRE_AN_CROSS_CHECK_WITH_DEALER_LMI_RULES} from '@/shared/master-data/mandatory/rules/pre-an-cross-check-with-dealer-lmi';
import {PRE_AN_EXPERT_JUDGEMENT_CONCLUSION_RULES} from '@/shared/master-data/mandatory/rules/pre-an-expert-judgement-conclusion';
import {FAP_PURPOSE_OF_FINANCING_AND_FIXED_ASSETS_RULES} from '@/shared/master-data/mandatory/rules/fap-purpose-of-financing-and-fixed-assets';
import {FAP_BANK_FACILITIES_AND_REFERENCES_RULES} from '@/shared/master-data/mandatory/rules/fap-bank-facilities-and-references';
import {FAP_FINANCING_PROPOSAL_RULES} from '@/shared/master-data/mandatory/rules/fap-financing-proposal';
import {FAP_FINANCIAL_STATEMENTS_RULES} from '@/shared/master-data/mandatory/rules/fap-financial-statements';
import {FAP_LEGAL_DEEDS_AND_AMENDMENTS_RULES} from '@/shared/master-data/mandatory/rules/fap-legal-deeds-and-amendments';
import {FAP_SHAREHOLDERS_AND_MANAGEMENT_RULES} from '@/shared/master-data/mandatory/rules/fap-shareholders-and-management';
import type {MandatoryRuleRow} from '@/shared/master-data/mandatory/rules/define-rules';

export const DEFAULT_MANDATORY_RULES: MandatoryRuleRow[] = [
  ...FAP_DEBTOR_IDENTITY_AND_CLASSIFICATION_RULES,
  ...FAP_REGISTRATION_OFFICE_AND_COMPANY_DOMICILE_RULES,
  ...FAP_BUSINESS_PROFILE_AND_DEED_LEGALITY_RULES,
  ...FAP_PRIMARY_CONTACT_PERSON_IN_CHARGE_PIC_RULES,
  ...FAP_INDUSTRY_SEGMENTATION_AND_ACTIVE_PROJECTS_RULES,
  ...PRE_AN_GENERAL_INFORMATION_RULES,
  ...PRE_AN_PROJECT_INFORMATION_RULES,
  ...PRE_AN_CUSTOMER_AND_GROUP_BACKGROUND_RULES,
  ...PRE_AN_EQUIPMENT_POSSIBILITY_OF_SUCCESS_RULES,
  ...PRE_AN_UNIT_DELIVERY_STATUS_AND_QA_CHECK_RULES,
  ...PRE_AN_CROSS_CHECK_WITH_DEALER_LMI_RULES,
  ...PRE_AN_EXPERT_JUDGEMENT_CONCLUSION_RULES,
  ...FAP_PURPOSE_OF_FINANCING_AND_FIXED_ASSETS_RULES,
  ...FAP_BANK_FACILITIES_AND_REFERENCES_RULES,
  ...FAP_FINANCING_PROPOSAL_RULES,
  ...FAP_FINANCIAL_STATEMENTS_RULES,
  ...FAP_LEGAL_DEEDS_AND_AMENDMENTS_RULES,
  ...FAP_SHAREHOLDERS_AND_MANAGEMENT_RULES,
].sort((a, b) => a.id - b.id);
