import { IsString, IsNotEmpty, IsOptional, IsIn, IsEnum, IsArray, IsBoolean, IsDateString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { Region } from '@prisma/client';
import { ScreeningQuestionDto } from './screening-question.dto';

export class CreateJobDto {
  @IsString() @IsNotEmpty()
  title: string;

  @IsString() @IsNotEmpty()
  department: string;

  @IsString() @IsNotEmpty()
  location: string;

  @IsOptional() @IsIn(['FULL_TIME', 'PART_TIME', 'CONTRACT', 'INTERN'])
  employmentType?: string;

  @IsOptional() @IsEnum(Region)
  region?: Region;

  @IsString() @IsNotEmpty()
  description: string;

  @IsOptional() @IsArray() @IsString({ each: true })
  responsibilities?: string[];

  @IsOptional() @IsArray() @IsString({ each: true })
  requirements?: string[];

  @IsOptional() @IsArray() @IsString({ each: true })
  niceToHave?: string[];

  @IsOptional() @IsString()
  salaryRange?: string;

  @IsOptional() @IsDateString()
  deadline?: string;

  @IsOptional() @IsBoolean()
  isFeatured?: boolean;

  @IsString() @IsNotEmpty()
  companyId: string;

  // Sent as the full desired list every time (create/replace semantics) —
  // mirrors how requirements/responsibilities already work, so the admin
  // form doesn't need a separate diffing UI.
  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => ScreeningQuestionDto)
  screeningQuestions?: ScreeningQuestionDto[];
}
