import {Injectable} from '@nestjs/common';
import {ActivityRepository, type ActivityActor, type ActivityEntry} from './activity.repository';
import {NotificationsRepository, type NewNotification} from './notifications.repository';
import {UsersRecipientsLookup} from './users-recipients.lookup';

/**
 * Activity feed and notifications of applications. Logging and notifying never fail the action that triggered them:
 * the action is already committed, so an error here is only reported on the server log.
 */
@Injectable()
export class ActivityService {
  constructor(
    readonly activity: ActivityRepository,
    readonly notifications: NotificationsRepository,
    private readonly users: UsersRecipientsLookup,
  ) {}

  async record(entry: ActivityEntry, actor: ActivityActor) {
    try {
      await this.activity.log(entry, actor);
    } catch (e) {
      console.error('Activity log failed:', (e as Error).message);
    }
  }

  /** Notifies every active user holding one of the authorities, except the actor. */
  async notifyHolders(authorities: string[], except: ActivityActor, n: NewNotification) {
    try {
      const ids = (await this.users.holdersOf(authorities)).filter(id => id !== Number(except.portalUserId));
      await this.notifications.create(ids, n);
    } catch (e) {
      console.error('Notification failed:', (e as Error).message);
    }
  }

  /** Notifies the given users (by username), except the actor. */
  async notifyUsers(usernames: string[], except: ActivityActor, n: NewNotification) {
    try {
      const ids = (await this.users.idsOf(usernames)).filter(id => id !== Number(except.portalUserId));
      await this.notifications.create(ids, n);
    } catch (e) {
      console.error('Notification failed:', (e as Error).message);
    }
  }
}
