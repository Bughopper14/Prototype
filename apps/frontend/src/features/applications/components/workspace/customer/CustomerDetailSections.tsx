/** Customer & PIC accordion: debtor identity, registration office, business profile, PIC, industry. */

import {BusinessProfileSection} from '@/features/applications/components/workspace/customer/BusinessProfileSection';
import {DebtorIdentitySection} from '@/features/applications/components/workspace/customer/DebtorIdentitySection';
import {PrimaryContactSection} from '@/features/applications/components/workspace/customer/PrimaryContactSection';
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

      {/* 05: Segmentation & Active Projects */}
      <SegmentationSection />
    </div>
  );
}
