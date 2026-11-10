/** FAP form accordion: the nine sections of the physical FAP sheet, in sheet order. */

import {BusinessProfileSection} from '@/features/applications/components/workspace/customer/BusinessProfileSection';
import {DebtorIdentitySection} from '@/features/applications/components/workspace/customer/DebtorIdentitySection';
import {FinancialStatementsSection} from '@/features/applications/components/workspace/customer/FinancialStatementsSection';
import {FinancingProposalSection} from '@/features/applications/components/workspace/customer/FinancingProposalSection';
import {PrimaryContactSection} from '@/features/applications/components/workspace/customer/PrimaryContactSection';
import {PurposeAssetsSection} from '@/features/applications/components/workspace/customer/PurposeAssetsSection';
import {ReferencesSection} from '@/features/applications/components/workspace/customer/ReferencesSection';
import {RegistrationOfficeSection} from '@/features/applications/components/workspace/customer/RegistrationOfficeSection';
import {SegmentationSection} from '@/features/applications/components/workspace/customer/SegmentationSection';
export function CustomerDetailSections() {
  return (
    <div className="fap-accordion-group">
      {/* 01: Debtor Identity & Classification */}
      <DebtorIdentitySection />

      {/* 02: Registration Office & Domicile */}
      <RegistrationOfficeSection />

      {/* 03: Business Profile & Deed Legality */}
      <BusinessProfileSection />

      {/* 04: Primary Contact / PIC */}
      <PrimaryContactSection />

      {/* 05: Financing Purpose & List of Fixed Assets */}
      <PurposeAssetsSection />

      {/* 06: Segmentation & Active Projects */}
      <SegmentationSection />

      {/* 07: References */}
      <ReferencesSection />

      {/* 08: Financing Proposal */}
      <FinancingProposalSection />

      {/* 09: Financial Statements */}
      <FinancialStatementsSection />
    </div>
  );
}
