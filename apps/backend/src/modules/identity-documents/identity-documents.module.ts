import {Module} from '@nestjs/common';
import {IdentityDocumentsController} from './identity-documents.controller';

@Module({controllers: [IdentityDocumentsController]})
export class IdentityDocumentsModule {}
