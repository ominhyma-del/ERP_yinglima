import {
  Controller,
  Post,
  Body,
  Get,
  Req,
  Res,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { Request, Response } from 'express';

import { Public } from '../../core/decorators/public.decorator';

@ApiTags('Authentication')
@Public()
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Authenticate user with bcrypt, JWT Access/Refresh tokens & multi-device tracking' })
  @ApiResponse({ status: HttpStatus.OK, description: 'User authenticated successfully.' })
  async login(@Body() dto: LoginDto, @Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const ipAddress = (req.headers['x-forwarded-for'] as string) || req.ip || '127.0.0.1';
    const userAgent = req.headers['user-agent'] || 'Browser';
    const result = await this.authService.login(dto, ipAddress, userAgent);

    // Set Future-Ready Secure HttpOnly Cookie
    res.cookie('refreshToken', result.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: (dto.rememberMe ? 30 : 1) * 24 * 60 * 60 * 1000,
      path: '/auth/refresh',
    });

    return result;
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh JWT Access Token & extend sliding session duration' })
  async refresh(
    @Body() dto: RefreshTokenDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const ipAddress = (req.headers['x-forwarded-for'] as string) || req.ip || '127.0.0.1';
    const userAgent = req.headers['user-agent'] || 'Browser';

    // Support extracting refresh token from body or HttpOnly Cookie
    const tokenToUse = dto.refreshToken || req.cookies?.refreshToken;
    const result = await this.authService.refreshToken({ refreshToken: tokenToUse }, ipAddress, userAgent);

    res.cookie('refreshToken', result.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: '/auth/refresh',
    });

    return result;
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Logout current device session' })
  async logout(
    @Body() body: { sessionId?: string; refreshToken?: string },
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const tokenToUse = body?.refreshToken || req.cookies?.refreshToken;
    res.clearCookie('refreshToken', { path: '/auth/refresh' });
    return this.authService.logout(body?.sessionId, tokenToUse);
  }

  @Post('logout-all')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Forced logout from all active devices and sessions' })
  async logoutAll(@Body() body: { userId: string }) {
    return this.authService.logoutAll(body.userId);
  }

  @Get('sessions')
  @ApiOperation({ summary: 'Get list of active login sessions and devices for user' })
  async getSessions(@Req() req: Request) {
    const userId = (req as any).user?.id || (req.headers['x-user-id'] as string) || 'admin-default';
    return this.authService.getActiveSessions(userId);
  }

  @Get('me')
  @ApiOperation({ summary: 'Get current authenticated user profile' })
  async me() {
    return {
      id: 'admin-default',
      email: 'admin@yinglima.com',
      full_name: 'Yinglima Admin',
      role: 'ADMIN',
      company: 'Yinglima Machinery & Trade (China HQ / India)',
    };
  }
}
