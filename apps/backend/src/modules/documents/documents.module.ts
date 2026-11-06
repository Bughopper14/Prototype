import {Module} from '@nestjs/common';
import {DocumentsController} from './documents.controller';
import {StoredDocumentsController} from './stored-documents.controller';

@Module({controllers: [DocumentsController, StoredDocumentsController]})
export class DocumentsModule {}
