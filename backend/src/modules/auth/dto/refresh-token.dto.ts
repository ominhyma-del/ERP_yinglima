import { IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

// BUG FIX: refreshToken was previously @IsNotEmpty(), which made the
// cookie-based refresh flow completely unreachable. The frontend's silent
// "restore session on page reload" call intentionally sends an EMPTY body
// (see frontend/src/lib/api.ts: `.post('/auth/refresh', {})`) and relies
// entirely on the httpOnly refreshToken cookie riding along automatically —
// that's the whole point of storing it as a cookie instead of in JS-readable
// storage. But the global ValidationPipe (main.ts) validates this DTO BEFORE
// AuthController#refresh's body ever runs, so `@IsNotEmpty()` on a field that
// is legitimately absent from the body every single time rejected the
// request with a 400 unconditionally — the controller's fallback to
// `req.cookies?.refreshToken` was unreachable dead code. Making this
// @IsOptional() lets a body-supplied token still work (e.g. for non-browser
// API clients that can't rely on cookies), while allowing an empty/missing
// body through to the controller, which is where the cookie is actually read.
export class RefreshTokenDto {
  @ApiPropertyOptional({
    description:
      'Refresh token string. Optional in the request body — browsers should omit this and rely on the httpOnly refreshToken cookie instead; only non-browser clients that cannot use cookies need to supply this explicitly.',
  })
  @IsOptional()
  @IsString()
  refreshToken?: string;
}