import { Module } from '@nestjs/common';
import { ApplicationsService } from './applications.service';
import { ApplicationsController } from './applications.controller';
import { CloudinaryModule } from '../cloudinary/cloudinary.module';
import { AtsModule } from '../ats/ats.module';
import { PushModule } from '../push/push.module';

@Module({
  imports: [CloudinaryModule, AtsModule, PushModule],
  providers: [ApplicationsService],
  controllers: [ApplicationsController],
})
export class ApplicationsModule {}
