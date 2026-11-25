import {Module} from '@nestjs/common';
import {ApplicationsModule} from '../applications/applications.module';
import {OcrModule} from '../ocr/ocr.module';
import {IdentityDocumentsController} from './identity-documents.controller';
import {IdentityDocumentsRepository} from './identity-documents.repository';

/** OCR of stakeholder identity documents (KTP, NPWP, passport, KITAS). */
@Module({imports: [OcrModule, ApplicationsModule], controllers: [IdentityDocumentsController], providers: [IdentityDocumentsRepository]})
export class IdentityDocumentsModule {}
