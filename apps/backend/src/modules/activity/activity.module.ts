import {Module} from '@nestjs/common';
import {ActivityController} from './activity.controller';
import {ActivityRepository} from './activity.repository';
import {ActivityService} from './activity.service';
import {NotificationsRepository} from './notifications.repository';
import {UsersRecipientsLookup} from './users-recipients.lookup';

/** Activity feed and notifications (crm_application_activity_logs / crm_application_notifications). */
@Module({
  controllers: [ActivityController],
  providers: [ActivityRepository, NotificationsRepository, UsersRecipientsLookup, ActivityService],
  exports: [ActivityService, ActivityRepository],
})
export class ActivityModule {}
