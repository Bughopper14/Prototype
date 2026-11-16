import {Module} from '@nestjs/common';
import {OcrController} from './ocr.controller';
import {OcrWorkerService} from './ocr-worker.service';

/** The Python OCR worker, shared by the FAP comparison and the identity document scans. */
@Module({controllers: [OcrController], providers: [OcrWorkerService], exports: [OcrWorkerService]})
export class OcrModule {}
