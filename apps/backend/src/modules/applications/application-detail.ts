import {ensure} from '../../core/domain';
import {intakeDetail} from './intake.repository';

export const detailOr404 = async (id: string) => {
  const application = await intakeDetail(id);
  ensure(application, 'Application not found', 404);
  return application;
};
