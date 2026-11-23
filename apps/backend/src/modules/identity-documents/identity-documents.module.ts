import {Module} from '@nestjs/common';
import {ApplicationsModule} from '../applications/applications.module';
import {OcrModule} from '../ocr/ocr.module';
import {IdentityDocumentsController} from './identity-documents.controller';
import {IdentityDocumentsRepository} from './identity-documents.repository';
import {IdentityScanCleanup} from './identity-scan-cleanup.service';

/** OCR of stakeholder identity documents (KTP, NPWP, passport, KITAS). */
@Module({imports: [OcrModule, ApplicationsModule], controllers: [IdentityDocumentsController], providers: [IdentityDocumentsRepository, IdentityScanCleanup]})
export class IdentityDocumentsModule {}
