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
  UnauthorizedException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { Request, Response, CookieOptions } from 'express';

import { Public } from '../../core/decorators/public.decorator';

// BUG FIX: cookie `secure` was previously computed inline as
// `process.env.NODE_ENV === 'production'`. That's a silent trap: if
// NODE_ENV is ever unset, misspelled, or set to 'production' by whatever
// launched the process (some IDE "run" tasks, some Windows shells, and some
// process managers default to 'production' unless told otherwise) while the
// app is actually being served over plain http:// (e.g. local dev on
// localhost:3000/4000), the cookie gets marked Secure — and browsers refuse
// to ever send a Secure cookie back over a non-https connection. The result
// looks exactly like "login works, but a reload silently logs you out": the
// refreshToken cookie IS being set by the Set-Cookie header (visible in
// DevTools), the browser just never sends it back on the next request, so
// POST /auth/refresh has nothing to read and fails, and the app correctly
// (but confusingly) treats that as "not logged in".
//
// Fix: make this explicit and independent of NODE_ENV. COOKIE_SECURE, if
// set, wins outright ('true'/'1' => secure, anything else => not secure).
// If COOKIE_SECURE isn't set at all, fall back to detecting the actual
// scheme the request came in on (also more reliable than NODE_ENV, since it
// reflects reality regardless of how the process was launched).
function isSecureCookieRequest(req: Request): boolean {
  const override = process.env.COOKIE_SECURE;
  if (override !== undefined) {
    return override.toLowerCase() === 'true' || override === '1';
  }
  // req.secure is true for direct https://, and also correctly accounts for
  // `X-Forwarded-Proto: https` when the app sits behind a trusted proxy/load
  // balancer terminating TLS — as long as `app.set('trust proxy', ...)` is
  // configured appropriately for that deployment.
  return req.secure;
}

function refreshCookieOptions(req: Request, maxAgeMs: number): CookieOptions {
  return {
    httpOnly: true,
    secure: isSecureCookieRequest(req),
    sameSite: 'lax',
    maxAge: maxAgeMs,
    path: '/',
  };
}

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) { }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Authenticate user with bcrypt, JWT Access/Refresh tokens & multi-device tracking' })
  @ApiResponse({ status: HttpStatus.OK, description: 'User authenticated successfully.' })
  async login(@Body() dto: LoginDto, @Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const ipAddress = (req.headers['x-forwarded-for'] as string) || req.ip || '127.0.0.1';
    const userAgent = req.headers['user-agent'] || 'Browser';
    const result = await this.authService.login(dto, ipAddress, userAgent);

    // Set Future-Ready Secure HttpOnly Cookie
    res.cookie(
      'refreshToken',
      result.refreshToken,
      refreshCookieOptions(req, (dto.rememberMe ? 30 : 1) * 24 * 60 * 60 * 1000),
    );

    return result;
  }

  @Public()
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

    res.cookie('refreshToken', result.refreshToken, refreshCookieOptions(req, 7 * 24 * 60 * 60 * 1000));

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
    res.clearCookie('refreshToken', { path: '/' });
    return this.authService.logout(body?.sessionId, tokenToUse);
  }

  @Post('logout-all')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Forced logout from all active devices and sessions for the authenticated user' })
  async logoutAll(@Req() req: Request) {
    const userId = (req as any).user?.id;
    if (!userId) {
      throw new UnauthorizedException('Authentication required.');
    }
    return this.authService.logoutAll(userId);
  }

  @Get('sessions')
  @ApiOperation({ summary: 'Get list of active login sessions and devices for the authenticated user' })
  async getSessions(@Req() req: Request) {
    const userId = (req as any).user?.id;
    if (!userId) {
      throw new UnauthorizedException('Authentication required.');
    }
    return this.authService.getActiveSessions(userId);
  }

  @Get('me')
  @ApiOperation({ summary: 'Get the current authenticated user profile (from the verified JWT, never faked)' })
  async me(@Req() req: Request) {
    const user = (req as any).user;
    if (!user) {
      throw new UnauthorizedException('Authentication required.');
    }
    return user;
  }
}