import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class ResolveReportDto {
  @IsString()
  resolution!: string;

  @IsOptional()
  @IsBoolean()
  suspendReportedUser?: boolean;

  @IsOptional()
  @IsString()
  reportedUserId?: string;
}
