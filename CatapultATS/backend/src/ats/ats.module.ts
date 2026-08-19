import { Module } from '@nestjs/common';
import { ResumeTextExtractorService } from './resume-text-extractor.service';
import { AtsScoringService } from './ats-scoring.service';

@Module({
  providers: [ResumeTextExtractorService, AtsScoringService],
  exports: [ResumeTextExtractorService, AtsScoringService],
})
export class AtsModule {}
