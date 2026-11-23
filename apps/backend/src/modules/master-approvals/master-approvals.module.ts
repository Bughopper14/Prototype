import {Module} from '@nestjs/common';
import {ApprovalsModule} from '../approvals/approvals.module';
import {MasterApprovalsController} from './master-approvals.controller';
import {MasterApprovalsService} from './master-approvals.service';

/** Master approval: approvals that stand on their own (levels and authorities); workflows only point at their code. */
@Module({
  imports: [ApprovalsModule],
  controllers: [MasterApprovalsController],
  providers: [MasterApprovalsService],
})
export class MasterApprovalsModule {}
