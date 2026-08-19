import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { UpdateSettingsDto } from './dto/update-settings.dto';
import { AuditLogService } from '../audit-log/audit-log.service';

@Injectable()
export class SettingsService {
  constructor(private prisma: PrismaService, private cloudinary: CloudinaryService, private auditLog: AuditLogService) {}

  // Singleton row — created on first read if it doesn't exist yet, so there's
  // no separate "initialize settings" step to forget.
  async get() {
    return this.prisma.settings.upsert({
      where: { id: 'singleton' },
      update: {},
      create: { id: 'singleton' },
    });
  }

  async update(dto: UpdateSettingsDto, actorId: string) {
    const updated = await this.prisma.settings.upsert({
      where: { id: 'singleton' },
      update: dto,
      create: { id: 'singleton', ...dto },
    });
    await this.auditLog.log({
      actorId,
      action: 'settings.updated',
      entityType: 'Settings',
      entityId: 'singleton',
      description: `Updated settings (${Object.keys(dto).join(', ') || 'no fields changed'})`,
      metadata: dto as Record<string, unknown>,
    });
    return updated;
  }

  async updateLogo(file: Express.Multer.File, actorId: string) {
    const current = await this.get();
    if (current.logoPublicId) {
      await this.cloudinary.deleteImage(current.logoPublicId).catch(() => undefined);
    }
    const upload = await this.cloudinary.uploadImage(file, 'branding');
    const updated = await this.prisma.settings.upsert({
      where: { id: 'singleton' },
      update: { logoUrl: upload.url, logoPublicId: upload.publicId },
      create: { id: 'singleton', logoUrl: upload.url, logoPublicId: upload.publicId },
    });
    await this.auditLog.log({
      actorId,
      action: 'settings.logo_updated',
      entityType: 'Settings',
      entityId: 'singleton',
      description: 'Updated company logo',
    });
    return updated;
  }
}
