import { Injectable, NotFoundException } from '@nestjs/common';
import { Region } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateJobDto } from './dto/create-job.dto';
import { UpdateJobDto } from './dto/update-job.dto';

@Injectable()
export class JobsService {
  constructor(private prisma: PrismaService) {}

  // Public: only active postings, optionally filtered by region (a BOTH job
  // shows on either regional page). Featured postings sort first, matching
  // the old site's behavior. applicantCount is exposed publicly on purpose —
  // parity with the old site, which showed it too.
  findAllActive(region?: Region) {
    return this.prisma.jobPosting.findMany({
      where: {
        isActive: true,
        ...(region ? { region: { in: [region, Region.BOTH] } } : {}),
      },
      include: {
        company: true,
        _count: { select: { applications: true } },
        screeningQuestions: { where: { archived: false }, orderBy: { order: 'asc' } },
      },
      orderBy: [{ isFeatured: 'desc' }, { createdAt: 'desc' }],
    });
  }

  // Admin: everything, including closed postings
  findAllAdmin() {
    return this.prisma.jobPosting.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        _count: { select: { applications: true } },
        company: true,
        screeningQuestions: { orderBy: { order: 'asc' } },
      },
    });
  }

  async findOne(id: string) {
    const job = await this.prisma.jobPosting.findUnique({
      where: { id },
      include: { company: true, screeningQuestions: { where: { archived: false }, orderBy: { order: 'asc' } } },
    });
    if (!job) throw new NotFoundException('Job posting not found');
    return job;
  }

  create(dto: CreateJobDto) {
    return this.prisma.jobPosting.create({
      data: {
        title: dto.title,
        department: dto.department,
        location: dto.location,
        employmentType: dto.employmentType,
        region: dto.region,
        description: dto.description,
        responsibilities: dto.responsibilities ?? [],
        requirements: dto.requirements ?? [],
        niceToHave: dto.niceToHave ?? [],
        salaryRange: dto.salaryRange,
        deadline: dto.deadline ? new Date(dto.deadline) : undefined,
        isFeatured: dto.isFeatured ?? false,
        companyId: dto.companyId,
        screeningQuestions: dto.screeningQuestions?.length
          ? {
              create: dto.screeningQuestions.map((q, i) => ({
                question: q.question,
                type: q.type,
                options: q.options ?? [],
                required: q.required ?? true,
                order: q.order ?? i,
                disqualifyingAnswer: q.disqualifyingAnswer || null,
              })),
            }
          : undefined,
      },
      include: { screeningQuestions: true },
    });
  }

  async update(id: string, dto: UpdateJobDto) {
    const exists = await this.prisma.jobPosting.findUnique({ where: { id }, select: { id: true } });
    if (!exists) throw new NotFoundException('Job posting not found');

    // Screening questions: the admin form submits its full current list.
    // Incoming items WITH an id are updates to existing rows (so their
    // answers stay linked); items without an id are new. Existing rows not
    // present in the incoming list are removed — hard-deleted if nothing
    // has answered them yet, archived (kept, hidden from new applicants) if
    // they already have candidate answers on record.
    return this.prisma.$transaction(async (tx) => {
      const job = await tx.jobPosting.update({
        where: { id },
        data: {
          ...(dto.title !== undefined ? { title: dto.title } : {}),
          ...(dto.department !== undefined ? { department: dto.department } : {}),
          ...(dto.location !== undefined ? { location: dto.location } : {}),
          ...(dto.employmentType !== undefined ? { employmentType: dto.employmentType } : {}),
          ...(dto.region !== undefined ? { region: dto.region } : {}),
          ...(dto.description !== undefined ? { description: dto.description } : {}),
          ...(dto.responsibilities !== undefined ? { responsibilities: dto.responsibilities } : {}),
          ...(dto.requirements !== undefined ? { requirements: dto.requirements } : {}),
          ...(dto.niceToHave !== undefined ? { niceToHave: dto.niceToHave } : {}),
          ...(dto.salaryRange !== undefined ? { salaryRange: dto.salaryRange } : {}),
          ...(dto.deadline !== undefined ? { deadline: new Date(dto.deadline) } : {}),
          ...(dto.isFeatured !== undefined ? { isFeatured: dto.isFeatured } : {}),
          ...(dto.companyId !== undefined ? { companyId: dto.companyId } : {}),
          ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
        },
      });

      if (dto.screeningQuestions !== undefined) {
        const incoming = dto.screeningQuestions;
        const existing = await tx.screeningQuestion.findMany({ where: { jobId: id } });
        const incomingIds = new Set(incoming.filter((q) => q.id).map((q) => q.id));

        for (const old of existing) {
          if (incomingIds.has(old.id)) continue;
          const answerCount = await tx.screeningAnswer.count({ where: { questionId: old.id } });
          if (answerCount > 0) {
            await tx.screeningQuestion.update({ where: { id: old.id }, data: { archived: true } });
          } else {
            await tx.screeningQuestion.delete({ where: { id: old.id } });
          }
        }

        for (const [i, q] of incoming.entries()) {
          const data = {
            question: q.question,
            type: q.type ?? 'TEXT' as const,
            options: q.options ?? [],
            required: q.required ?? true,
            order: q.order ?? i,
            disqualifyingAnswer: q.disqualifyingAnswer || null,
            archived: false,
          };
          if (q.id) {
            await tx.screeningQuestion.update({ where: { id: q.id }, data });
          } else {
            await tx.screeningQuestion.create({ data: { ...data, jobId: id } });
          }
        }
      }

      return job;
    });
  }

  async close(id: string) {
    await this.findOne(id);
    return this.prisma.jobPosting.update({ where: { id }, data: { isActive: false } });
  }
}
