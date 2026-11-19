import { IsString } from 'class-validator';

export class CreateDirectRequestDto {
  @IsString()
  itemId!: string;
}
