import { IsEnum, IsOptional } from 'class-validator';
import { ItemFileAccessModeDto } from './item-file-access-mode.dto.js';

export class UploadItemFileDto {
  @IsOptional()
  @IsEnum(ItemFileAccessModeDto)
  accessMode?: ItemFileAccessModeDto;
}
