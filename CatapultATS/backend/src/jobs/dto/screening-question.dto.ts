import { IsString, IsNotEmpty, IsOptional, IsEnum, IsArray, IsBoolean, IsInt } from 'class-validator';
import { Type } from 'class-transformer';
import { ScreeningQuestionType } from '@prisma/client';

export class ScreeningQuestionDto {
  // Present when editing an existing question (so the service can diff
  // against what's already saved); absent for a newly added one.
  @IsOptional() @IsString()
  id?: string;

  @IsString() @IsNotEmpty()
  question: string;

  @IsOptional() @IsEnum(ScreeningQuestionType)
  type?: ScreeningQuestionType;

  @IsOptional() @IsArray() @IsString({ each: true })
  options?: string[];

  @IsOptional() @IsBoolean()
  required?: boolean;

  @IsOptional() @Type(() => Number) @IsInt()
  order?: number;

  @IsOptional() @IsString()
  disqualifyingAnswer?: string;
}
