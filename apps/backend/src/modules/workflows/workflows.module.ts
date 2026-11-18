import {Module} from '@nestjs/common';
import {ApplicationsModule} from '../applications/applications.module';
import {WorkflowsController} from './workflows.controller';
import {WorkflowsService} from './workflows.service';

/** Workflow setup (groups, stages, statuses, actions, mandatory fields, documents), and activation. */
@Module({
  imports: [ApplicationsModule],
  controllers: [WorkflowsController],
  providers: [WorkflowsService],
})
export class WorkflowsModule {}
