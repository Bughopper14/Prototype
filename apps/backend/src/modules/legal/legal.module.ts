import {Module} from '@nestjs/common';
import {ApplicationsModule} from '../applications/applications.module';
import {LegalController} from './legal.controller';
import {LegalService} from './legal.service';

/** Legal tab (deeds, stakeholders, deed review). LegalRepository comes from ApplicationsModule, which reads it too. */
@Module({
  imports: [ApplicationsModule],
  controllers: [LegalController],
  providers: [LegalService],
})
export class LegalModule {}
