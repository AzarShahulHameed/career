import { IsOptional, IsEnum, IsString, IsInt, IsIn, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApplicationStatus } from '@prisma/client';

const SORTABLE_FIELDS = ['createdAt', 'candidateName', 'atsScore', 'status', 'jobTitle', 'company', 'source'] as const;
export type SortableField = (typeof SORTABLE_FIELDS)[number];

export class QueryApplicationsDto {
  @IsOptional() @IsEnum(ApplicationStatus)
  status?: ApplicationStatus;

  @IsOptional() @IsString()
  jobId?: string;

  @IsOptional() @IsString()
  companyId?: string;

  @IsOptional() @IsString()
  department?: string;

  @IsOptional() @IsString()
  location?: string;

  @IsOptional() @IsString()
  employmentType?: string;

  @IsOptional() @IsString()
  source?: string;

  @IsOptional() @IsIn(SORTABLE_FIELDS)
  sortBy?: SortableField = 'createdAt';

  @IsOptional() @IsIn(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc' = 'desc';

  @IsOptional() @Type(() => Number) @IsInt() @Min(1)
  page?: number = 1;

  @IsOptional() @Type(() => Number) @IsInt() @Min(1)
  pageSize?: number = 20;
}
