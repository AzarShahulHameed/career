import { Module } from '@nestjs/common';
import { SettingsService } from './settings.service';
import { SettingsController } from './settings.controller';
import { CloudinaryModule } from '../cloudinary/cloudinary.module';
import { AuditLogModule } from '../audit-log/audit-log.module';

@Module({
  imports: [CloudinaryModule, AuditLogModule],
  providers: [SettingsService],
  controllers: [SettingsController],
})
export class SettingsModule {}
