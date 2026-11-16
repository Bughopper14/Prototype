import {Module} from '@nestjs/common';
import {ApplicationsModule} from '../applications/applications.module';
import {OcrModule} from '../ocr/ocr.module';
import {FapComparisonService} from './fap-comparison.service';
import {FapController} from './fap.controller';

/** FAP document comparison (OCR) and the FAP freezes. FapOcrRepository and FapFreezeRepository come from ApplicationsModule. */
@Module({
  imports: [ApplicationsModule, OcrModule],
  controllers: [FapController],
  providers: [FapComparisonService],
  exports: [FapComparisonService],
})
export class FapModule {}
