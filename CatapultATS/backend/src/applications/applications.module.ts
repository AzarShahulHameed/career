import { Module } from '@nestjs/common';
import { ApplicationsService } from './applications.service';
import { ApplicationsController } from './applications.controller';
import { CloudinaryModule } from '../cloudinary/cloudinary.module';
import { AtsModule } from '../ats/ats.module';

@Module({
  imports: [CloudinaryModule, AtsModule],
  providers: [ApplicationsService],
  controllers: [ApplicationsController],
})
export class ApplicationsModule {}
