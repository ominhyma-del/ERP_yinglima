import { IsEmail, IsNotEmpty, IsString, IsBoolean, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({ example: 'admin@yinglima.com', description: 'Registered user email address' })
  @IsEmail({}, { message: 'Please enter a valid email address' })
  @IsNotEmpty({ message: 'Email address is required' })
  email: string;

  @ApiProperty({ example: 'admin123', description: 'User password' })
  @IsString()
  @IsNotEmpty({ message: 'Password is required' })
  password: string;

  @ApiPropertyOptional({ example: true, description: 'Extends session duration (30 days vs 24 hours)' })
  @IsBoolean()
  @IsOptional()
  rememberMe?: boolean;
}
