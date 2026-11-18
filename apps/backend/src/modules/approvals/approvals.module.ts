import {Module} from '@nestjs/common';
import {ApprovalsRepository} from './approvals.repository';
import {ApprovalsService} from './approvals.service';
import {UsersNamesLookup} from './users-names.lookup';

/** Rounds of approval of an application: the steps come from the workflow, anyone holding a step's authority can decide. */
@Module({
  providers: [ApprovalsRepository, ApprovalsService, UsersNamesLookup],
  exports: [ApprovalsRepository, ApprovalsService, UsersNamesLookup],
})
export class ApprovalsModule {}
