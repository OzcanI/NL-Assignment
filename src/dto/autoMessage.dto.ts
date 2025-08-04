import { IsString, IsOptional, MinLength, MaxLength, IsEnum, IsDateString, IsArray } from 'class-validator';

export class CreateAutoMessageDto {
  @IsString({ message: 'Conversation ID string olmalıdır' })
  conversationId!: string;

  @IsString({ message: 'Content string olmalıdır' })
  @MinLength(1, { message: 'Content boş olamaz' })
  @MaxLength(2000, { message: 'Content en fazla 2000 karakter olabilir' })
  content!: string;

  @IsOptional()
  @IsEnum(['text', 'image', 'file', 'audio', 'video'], { message: 'Geçerli bir mesaj tipi seçiniz' })
  messageType?: string;

  @IsDateString({}, { message: 'Geçerli bir tarih formatı giriniz' })
  sendDate!: string;

  @IsOptional()
  @IsEnum(['none', 'daily', 'weekly', 'monthly'], { message: 'Geçerli bir tekrar tipi seçiniz' })
  repeatType?: string;

  @IsOptional()
  @IsString({ message: 'Repeat interval string olmalıdır' })
  repeatInterval?: string;
}

export class UpdateAutoMessageDto {
  @IsOptional()
  @IsString({ message: 'Content string olmalıdır' })
  @MinLength(1, { message: 'Content boş olamaz' })
  @MaxLength(2000, { message: 'Content en fazla 2000 karakter olabilir' })
  content?: string;

  @IsOptional()
  @IsEnum(['text', 'image', 'file', 'audio', 'video'], { message: 'Geçerli bir mesaj tipi seçiniz' })
  messageType?: string;

  @IsOptional()
  @IsDateString({}, { message: 'Geçerli bir tarih formatı giriniz' })
  sendDate?: string;

  @IsOptional()
  @IsEnum(['none', 'daily', 'weekly', 'monthly'], { message: 'Geçerli bir tekrar tipi seçiniz' })
  repeatType?: string;

  @IsOptional()
  @IsString({ message: 'Repeat interval string olmalıdır' })
  repeatInterval?: string;
} 