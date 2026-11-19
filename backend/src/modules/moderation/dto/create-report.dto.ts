import { IsEnum, IsOptional, IsString, MinLength } from 'class-validator';

export enum ReportTypeDto {
  NON_RETURN = 'NON_RETURN',
  DAMAGE = 'DAMAGE',
  MISUSE = 'MISUSE',
  CONTENT_VIOLATION = 'CONTENT_VIOLATION',
  OTHER = 'OTHER',
}

export class CreateReportDto {
  @IsEnum(ReportTypeDto)
  type!: ReportTypeDto;

  @IsString()
  @MinLength(1)
  description!: string;

  @IsOptional()
  @IsString()
  loanId?: string;

  @IsOptional()
  @IsString()
  itemId?: string;
}
