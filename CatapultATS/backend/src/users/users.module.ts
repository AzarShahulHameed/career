import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { EmailModule } from '../email/email.module';
import { AuditLogModule } from '../audit-log/audit-log.module';

@Module({
  imports: [EmailModule, AuditLogModule],
  providers: [UsersService],
  controllers: [UsersController],
})
export class UsersModule {}
