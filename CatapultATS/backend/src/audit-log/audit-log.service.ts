import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';

export interface LogParams {
  actorId: string;
  action: string;
  entityType: string;
  entityId?: string | null;
  description: string;
  metadata?: Record<string, unknown>;
}

@Injectable()
export class AuditLogService {
  constructor(private prisma: PrismaService) {}

  // Fire-and-forget-ish, but awaited by callers so a failure surfaces
  // rather than silently dropping an audit entry. Never throws in a way
  // that should block the underlying action — callers wrap this so a
  // logging failure doesn't itself break job/user/settings mutations.
  async log(params: LogParams) {
    await this.prisma.auditLog.create({
      data: {
        actorId: params.actorId,
        action: params.action,
        entityType: params.entityType,
        entityId: params.entityId ?? undefined,
        description: params.description,
        metadata: (params.metadata ?? undefined) as Prisma.InputJsonValue | undefined,
      },
    });
  }

  async findAll(params: { page: number; pageSize: number; entityType?: string; actorId?: string }) {
    const where = {
      ...(params.entityType ? { entityType: params.entityType } : {}),
      ...(params.actorId ? { actorId: params.actorId } : {}),
    };
    const [items, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (params.page - 1) * params.pageSize,
        take: params.pageSize,
        include: { actor: { select: { id: true, name: true, email: true } } },
      }),
      this.prisma.auditLog.count({ where }),
    ]);
    return { items, total, page: params.page, totalPages: Math.max(1, Math.ceil(total / params.pageSize)) };
  }
}
