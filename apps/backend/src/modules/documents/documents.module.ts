import {Module} from '@nestjs/common';
import {ApplicationsModule} from '../applications/applications.module';
import {FapModule} from '../fap/fap.module';
import {DocumentsController} from './documents.controller';
import {StoredDocumentsController} from './stored-documents.controller';

/** Document checklist, uploads and stored files. DocumentsRepository comes from ApplicationsModule. */
@Module({
  imports: [ApplicationsModule, FapModule],
  controllers: [DocumentsController, StoredDocumentsController],
})
export class DocumentsModule {}
