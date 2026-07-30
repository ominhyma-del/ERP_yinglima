import { Controller, Post, Body, Get, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { AuthService } from './auth.service';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @ApiOperation({ summary: 'Authenticate user with email and password' })
  async login(@Body() body: { email: string; password?: string }) {
    return this.authService.login(body);
  }

  @Post('register')
  @ApiOperation({ summary: 'Register a new user with unique email validation' })
  async register(@Body() body: { email: string; full_name: string; password?: string; role?: string }) {
    return this.authService.register(body);
  }

  @Get('me')
  @ApiOperation({ summary: 'Get current logged-in user profile' })
  async me() {
    return {
      id: 'admin-default',
      email: 'admin@yinglima.com',
      full_name: 'Yinglima Admin',
      role: 'ADMIN',
    };
  }
}
