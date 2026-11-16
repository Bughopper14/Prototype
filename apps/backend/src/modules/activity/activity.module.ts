import {Module} from '@nestjs/common';
import {ActivityController} from './activity.controller';

/** Activity feed and notifications (activity logs, activity changes and notifications tables). */
@Module({controllers: [ActivityController]})
export class ActivityModule {}
