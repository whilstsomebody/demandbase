import { IsArray, IsString } from 'class-validator';

export class UpdateNotificationPreferencesDto {
  @IsArray()
  @IsString({ each: true })
  optedOutCategoryIds!: string[];
}
