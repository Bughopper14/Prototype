import {Module} from '@nestjs/common';
import {FapController} from './fap.controller';

@Module({controllers: [FapController]})
export class FapModule {}
