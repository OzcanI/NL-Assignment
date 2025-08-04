import { IsString, IsOptional, MinLength, MaxLength, IsEnum } from 'class-validator';

export class SendSystemMessageDto {
  @IsString({ message: 'Room ID string olmalıdır' })
  roomId!: string;

  @IsString({ message: 'Message string olmalıdır' })
  @MinLength(1, { message: 'Message boş olamaz' })
  @MaxLength(1000, { message: 'Message en fazla 1000 karakter olabilir' })
  message!: string;

  @IsOptional()
  @IsEnum(['info', 'warning', 'error', 'success'], { message: 'Geçerli bir mesaj tipi seçiniz' })
  type?: string;
}

export class SendPrivateMessageDto {
  @IsString({ message: 'User ID string olmalıdır' })
  userId!: string;

  @IsString({ message: 'Message string olmalıdır' })
  @MinLength(1, { message: 'Message boş olamaz' })
  @MaxLength(1000, { message: 'Message en fazla 1000 karakter olabilir' })
  message!: string;

  @IsOptional()
  @IsEnum(['notification', 'alert', 'info'], { message: 'Geçerli bir mesaj tipi seçiniz' })
  type?: string;
}

export class BroadcastMessageDto {
  @IsString({ message: 'Message string olmalıdır' })
  @MinLength(1, { message: 'Message boş olamaz' })
  @MaxLength(1000, { message: 'Message en fazla 1000 karakter olabilir' })
  message!: string;

  @IsOptional()
  @IsEnum(['announcement', 'notification', 'alert'], { message: 'Geçerli bir mesaj tipi seçiniz' })
  type?: string;
} 

export class GetUserRoomsDto {
  @IsString({ message: 'User ID string olmalıdır' })
  userId!: string;
}