import { IsString, IsOptional, MinLength, MaxLength, IsEnum, IsArray, IsMongoId, IsObject } from 'class-validator';
import { Transform } from 'class-transformer';

export class CreateConversationDto {
  @IsOptional()
  @IsString({ message: 'Name string olmalıdır' })
  @MinLength(1, { message: 'Name boş olamaz' })
  @MaxLength(100, { message: 'Name en fazla 100 karakter olabilir' })
  name?: string;

  @IsOptional()
  @IsEnum(['direct', 'group', 'channel'], { message: 'Geçerli bir konuşma tipi seçiniz' })
  type?: string;

  @IsArray({ message: 'Participants array olmalıdır' })
  @IsMongoId({ each: true, message: 'Geçerli participant ID\'leri giriniz' })
  participants!: string[];

  @IsOptional()
  @IsString({ message: 'Description string olmalıdır' })
  @MaxLength(500, { message: 'Description en fazla 500 karakter olabilir' })
  description?: string;

  @IsOptional()
  @IsObject({ message: 'Settings object olmalıdır' })
  settings?: any;
}

export class UpdateConversationDto {
  @IsOptional()
  @IsString({ message: 'Name string olmalıdır' })
  @MinLength(1, { message: 'Name boş olamaz' })
  @MaxLength(100, { message: 'Name en fazla 100 karakter olabilir' })
  name?: string;

  @IsOptional()
  @IsString({ message: 'Description string olmalıdır' })
  @MaxLength(500, { message: 'Description en fazla 500 karakter olabilir' })
  description?: string;

  @IsOptional()
  @IsObject({ message: 'Settings object olmalıdır' })
  settings?: any;
}

export class AddParticipantsDto {
  @IsArray({ message: 'Participants array olmalıdır' })
  @IsMongoId({ each: true, message: 'Geçerli participant ID\'leri giriniz' })
  participants!: string[];
}

export class RemoveParticipantsDto {
  @IsArray({ message: 'Participants array olmalıdır' })
  @IsMongoId({ each: true, message: 'Geçerli participant ID\'leri giriniz' })
  participants!: string[];
}

export class GetConversationsQueryDto {
  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  page?: number;

  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  limit?: number;

  @IsOptional()
  @IsEnum(['direct', 'group', 'channel'], { message: 'Geçerli bir konuşma tipi seçiniz' })
  type?: string;

  @IsOptional()
  @IsString({ message: 'Search string olmalıdır' })
  search?: string;
} 