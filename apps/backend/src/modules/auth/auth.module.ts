import {Module} from '@nestjs/common';
import {AuthController} from './auth.controller';
import {CurrentUserController} from './current-user.controller';

@Module({controllers: [AuthController, CurrentUserController]})
export class AuthModule {}
