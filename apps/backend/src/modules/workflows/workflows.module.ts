import {Module} from '@nestjs/common';
import {ApplicationsModule} from '../applications/applications.module';
import {ApprovalsModule} from '../approvals/approvals.module';
import {UsersApproversLookup} from './users-approvers.lookup';
import {WorkflowsController} from './workflows.controller';
import {WorkflowsService} from './workflows.service';

/** Workflow setup (groups, stages, statuses, actions, mandatory fields, documents), and activation. */
@Module({
  imports: [ApplicationsModule, ApprovalsModule],
  controllers: [WorkflowsController],
  providers: [WorkflowsService, UsersApproversLookup],
})
export class WorkflowsModule {}
