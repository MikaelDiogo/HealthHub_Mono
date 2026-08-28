import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './domain/user.entity';
import { USER_REPOSITORY } from './domain/user-repository.interface';
import { TypeormUserRepository } from './infrastructure/typeorm-user.repository';
import { AuthService } from './application/auth.service';
import { AuthController } from './presentation/auth.controller';

@Module({
  imports: [TypeOrmModule.forFeature([User])],
  controllers: [AuthController],
  providers: [
    AuthService,
    { provide: USER_REPOSITORY, useClass: TypeormUserRepository },
  ],
})
export class AuthModule {}
