import { IsOptional, IsString, IsEmail, IsBoolean, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateSettingsDto {
  @IsOptional() @IsString()
  companyName?: string;

  @IsOptional() @IsEmail()
  senderEmail?: string;

  @IsOptional() @IsBoolean()
  atsEnabled?: boolean;

  @IsOptional() @Type(() => Number) @IsInt() @Min(0) @Max(100)
  atsPassThreshold?: number;
}
