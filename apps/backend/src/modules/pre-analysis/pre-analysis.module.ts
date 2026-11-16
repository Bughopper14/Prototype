import {Module} from '@nestjs/common';
import {ApplicationsModule} from '../applications/applications.module';
import {PreAnalysisController} from './pre-analysis.controller';
import {PreAnalysisRepository} from './pre-analysis.repository';
import {PreAnalysisService} from './pre-analysis.service';

/** The Pre-Analysis form of an application (crm_prototype_preanalysis). */
@Module({
  imports: [ApplicationsModule],
  controllers: [PreAnalysisController],
  providers: [PreAnalysisService, PreAnalysisRepository],
})
export class PreAnalysisModule {}
