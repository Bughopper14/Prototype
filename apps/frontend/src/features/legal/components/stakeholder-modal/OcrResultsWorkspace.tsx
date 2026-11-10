/** OCR results per field with copy / apply buttons. */
import {KitasOcrTiles} from '@/features/legal/components/stakeholder-modal/ocr-results/KitasOcrTiles';
import {NpwpOcrTiles} from '@/features/legal/components/stakeholder-modal/ocr-results/NpwpOcrTiles';
import {PassportOcrTiles} from '@/features/legal/components/stakeholder-modal/ocr-results/PassportOcrTiles';
import {KtpOcrTiles} from '@/features/legal/components/stakeholder-modal/ocr-results/KtpOcrTiles';
import {OcrResultsHeader} from '@/features/legal/components/stakeholder-modal/ocr-results/OcrResultsHeader';

import {useStakeholderModalContext} from '@/features/legal/components/stakeholder-modal/StakeholderModalContext';

export function OcrResultsWorkspace() {
  const {docType} = useStakeholderModalContext();
  return (
    <div className="ktp-ocr-workspace-card">
      {/* OCR CARD HEADER */}
      <OcrResultsHeader />

      {/* STRUCTURED DATA TILES PER DOCUMENT TYPE */}
      {docType === 'KTP' && <KtpOcrTiles />}

      {docType === 'PASSPORT' && <PassportOcrTiles />}

      {docType === 'NPWP' && <NpwpOcrTiles />}

      {docType === 'KITAS' && <KitasOcrTiles />}
    </div>
  );
}
