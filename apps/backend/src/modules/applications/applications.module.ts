import {Module} from '@nestjs/common';
import {ActivityModule} from '../activity/activity.module';
import {ApprovalsModule} from '../approvals/approvals.module';
import {CustomersModule} from '../customers/customers.module';
import {DocumentsRepository} from '../documents/documents.repository';
import {FapFreezeRepository} from '../fap/fap-freeze.repository';
import {FapOcrRepository} from '../fap/fap-ocr.repository';
import {LegalRepository} from '../legal/legal.repository';
import {ApplicationsController} from './applications.controller';
import {ApplicationsService} from './applications.service';
import {ApplicationProfileRepository} from './repositories/application-profile.repository';
import {ApplicationsRepository} from './repositories/applications.repository';
import {FapSectionsRepository} from './repositories/fap-sections.repository';
import {FinancialStatementsRepository} from './repositories/financial-statements.repository';
import {WorkflowConfigRepository} from './workflow/workflow-config.repository';

/** Applications on crm_liugong: header, FAP profile, primary contact and workflow. */
@Module({
  imports: [CustomersModule, ActivityModule, ApprovalsModule],
  controllers: [ApplicationsController],
  providers: [
    ApplicationsService,
    ApplicationsRepository,
    ApplicationProfileRepository,
    FapSectionsRepository,
    FinancialStatementsRepository,
    WorkflowConfigRepository,
    LegalRepository,
    DocumentsRepository,
    FapOcrRepository,
    FapFreezeRepository,
  ],
  exports: [ApplicationsService, WorkflowConfigRepository, ApplicationsRepository, LegalRepository, DocumentsRepository, FapOcrRepository, FapFreezeRepository, ActivityModule, ApprovalsModule],
})
export class ApplicationsModule {}
