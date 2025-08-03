import { IsString, IsEmail, IsOptional, MinLength, MaxLength, IsEnum, IsBoolean } from 'class-validator';
import { Transform } from 'class-transformer';

export class RegisterDto {
  @IsString({ message: 'Username string olmalıdır' })
  @MinLength(3, { message: 'Username en az 3 karakter olmalıdır' })
  @MaxLength(30, { message: 'Username en fazla 30 karakter olabilir' })
  username!: string;

  @IsEmail({}, { message: 'Geçerli bir email adresi giriniz' })
  email!: string;

  @IsString({ message: 'Password string olmalıdır' })
  @MinLength(6, { message: 'Password en az 6 karakter olmalıdır' })
  @MaxLength(100, { message: 'Password en fazla 100 karakter olabilir' })
  password!: string;

  @IsString({ message: 'FirstName string olmalıdır' })
  @MinLength(2, { message: 'FirstName en az 2 karakter olmalıdır' })
  @MaxLength(50, { message: 'FirstName en fazla 50 karakter olabilir' })
  firstName!: string;

  @IsString({ message: 'LastName string olmalıdır' })
  @MinLength(2, { message: 'LastName en az 2 karakter olmalıdır' })
  @MaxLength(50, { message: 'LastName en fazla 50 karakter olabilir' })
  lastName!: string;

  @IsOptional()
  @IsEnum(['user', 'moderator', 'admin'], { message: 'Geçerli bir rol seçiniz' })
  role?: string;
}

export class LoginDto {
  @IsString({ message: 'Username string olmalıdır' })
  username!: string;

  @IsString({ message: 'Password string olmalıdır' })
  password!: string;
}

export class RefreshTokenDto {
  @IsString({ message: 'Refresh token string olmalıdır' })
  refreshToken!: string;
}

export class LogoutDto {
  @IsString({ message: 'Refresh token string olmalıdır' })
  refreshToken!: string;

  @IsString({ message: 'Access token string olmalıdır' })
  accessToken!: string;
}

export class GetUsersQueryDto {
  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  page?: number;

  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  limit?: number;

  @IsOptional()
  @IsEnum(['user', 'moderator', 'admin'], { message: 'Geçerli bir rol seçiniz' })
  role?: string;

  @IsOptional()
  @Transform(({ value }) => value === 'true')
  @IsBoolean({ message: 'isActive boolean olmalıdır' })
  isActive?: boolean;

  @IsOptional()
  @IsString({ message: 'Search string olmalıdır' })
  search?: string;
} 