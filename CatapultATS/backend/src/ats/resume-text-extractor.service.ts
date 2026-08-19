import { Injectable, Logger } from '@nestjs/common';

// Extracts plain text from an uploaded resume so the ATS engine has
// something to match keywords against. Works directly off the in-memory
// Multer buffer at upload time — no need to re-download the file from
// Cloudinary afterward.
@Injectable()
export class ResumeTextExtractorService {
  private readonly logger = new Logger(ResumeTextExtractorService.name);

  async extract(file: Express.Multer.File): Promise<string | null> {
    const name = (file.originalname || '').toLowerCase();
    try {
      if (name.endsWith('.pdf') || file.mimetype === 'application/pdf') {
        const pdfParse = await import('pdf-parse');
        const parse = (pdfParse as any).default ?? pdfParse;
        const result = await parse(file.buffer);
        return result.text ?? '';
      }
      if (name.endsWith('.docx')) {
        const mammoth = await import('mammoth');
        const result = await mammoth.extractRawText({ buffer: file.buffer });
        return result.value ?? '';
      }
      // Legacy .doc (binary format) isn't supported by mammoth — the ATS
      // engine simply won't have text to score for these, and the
      // application still goes through normally (see applications.service).
      return null;
    } catch (err) {
      this.logger.warn(`Could not extract resume text from ${file.originalname}: ${(err as Error).message}`);
      return null;
    }
  }
}
