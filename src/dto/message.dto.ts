import { IsString, IsOptional, MinLength, MaxLength, IsEnum, IsArray, IsMongoId, IsDateString } from 'class-validator';
import { Transform } from 'class-transformer';

export class SendMessageDto {
  @IsMongoId({ message: 'Geçerli bir conversation ID giriniz' })
  conversationId!: string;

  @IsString({ message: 'Content string olmalıdır' })
  @MinLength(1, { message: 'Content boş olamaz' })
  @MaxLength(5000, { message: 'Content en fazla 5000 karakter olabilir' })
  content!: string;

  @IsOptional()
  @IsEnum(['text', 'image', 'file', 'audio', 'video', 'location', 'system'], { 
    message: 'Geçerli bir mesaj tipi seçiniz' 
  })
  messageType?: string;

  @IsOptional()
  @IsArray({ message: 'Attachments array olmalıdır' })
  attachments?: any[];

  @IsOptional()
  @IsMongoId({ message: 'Geçerli bir reply message ID giriniz' })
  replyTo?: string;
}

export class UpdateMessageDto {
  @IsString({ message: 'Content string olmalıdır' })
  @MinLength(1, { message: 'Content boş olamaz' })
  @MaxLength(5000, { message: 'Content en fazla 5000 karakter olabilir' })
  content!: string;

  @IsOptional()
  @IsArray({ message: 'Attachments array olmalıdır' })
  attachments?: any[];
}

export class UpdateMessageStatusDto {
  @IsEnum(['sent', 'delivered', 'read'], { message: 'Geçerli bir status seçiniz' })
  status!: string;
}

export class SearchMessagesQueryDto {
  @IsString({ message: 'Query string olmalıdır' })
  @MinLength(1, { message: 'Query boş olamaz' })
  query!: string;

  @IsOptional()
  @IsMongoId({ message: 'Geçerli bir conversation ID giriniz' })
  conversationId?: string;

  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  page?: number;

  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  limit?: number;
}

export class GetMessagesQueryDto {
  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  page?: number;

  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  limit?: number;

  @IsOptional()
  @IsDateString({}, { message: 'Geçerli bir tarih formatı giriniz' })
  before?: string;

  @IsOptional()
  @IsDateString({}, { message: 'Geçerli bir tarih formatı giriniz' })
  after?: string;
} 