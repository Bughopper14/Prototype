import {Module} from '@nestjs/common';
import {APP_FILTER, APP_GUARD, APP_INTERCEPTOR} from '@nestjs/core';
import {CrmDatabaseModule} from './core/db/crm-database';
import {ApiResultInterceptor} from './core/http/api-result.interceptor';
import {OriginGuard, SessionGuard} from './core/http/guards';
import {ProblemFilter} from './core/http/problem.filter';
import {StorageModule} from './core/storage';
import {ActivityModule} from './modules/activity/activity.module';
import {ApplicationsModule} from './modules/applications/applications.module';
import {AuthModule} from './modules/auth/auth.module';
import {CustomersModule} from './modules/customers/customers.module';
import {DocumentsModule} from './modules/documents/documents.module';
import {FapModule} from './modules/fap/fap.module';
import {IdentityDocumentsModule} from './modules/identity-documents/identity-documents.module';
import {LegalModule} from './modules/legal/legal.module';
import {MasterDataModule} from './modules/master-data/master-data.module';
import {OcrModule} from './modules/ocr/ocr.module';
import {PortalModule} from './modules/portal/portal.module';
import {PreAnalysisModule} from './modules/pre-analysis/pre-analysis.module';
import {SystemModule} from './modules/system/system.module';
import {UsersModule} from './modules/users/users.module';
import {MasterApprovalsModule} from './modules/master-approvals/master-approvals.module';
import {WorkflowsModule} from './modules/workflows/workflows.module';

/**
 * One Nest module per domain (see src/modules). Cross-cutting HTTP behaviour lives in src/core/http and applies to
 * every route: guards run in the order listed (origin → session → write validation).
 */
@Module({
  imports: [
    CrmDatabaseModule,
    StorageModule,
    SystemModule,
    AuthModule,
    PortalModule,
    UsersModule,
    CustomersModule,
    ApplicationsModule,
    PreAnalysisModule,
    LegalModule,
    DocumentsModule,
    IdentityDocumentsModule,
    OcrModule,
    FapModule,
    MasterDataModule,
    WorkflowsModule,
    MasterApprovalsModule,
    ActivityModule,
  ],
  providers: [
    {provide: APP_GUARD, useClass: OriginGuard},
    {provide: APP_GUARD, useClass: SessionGuard},
    {provide: APP_INTERCEPTOR, useClass: ApiResultInterceptor},
    {provide: APP_FILTER, useClass: ProblemFilter},
  ],
})
export class AppModule {}
