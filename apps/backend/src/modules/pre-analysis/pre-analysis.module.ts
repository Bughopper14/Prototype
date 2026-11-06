import {Module} from '@nestjs/common';
import {PreAnalysisController} from './pre-analysis.controller';

@Module({controllers: [PreAnalysisController]})
export class PreAnalysisModule {}
