import { HttpException, HttpStatus } from '@nestjs/common';

export type SecurityErrorCode =
  | 'INVALID_CREDENTIALS'
  | 'ACCOUNT_LOCKED'
  | 'TOKEN_EXPIRED'
  | 'TOKEN_INVALID'
  | 'SESSION_EXPIRED'
  | 'ACCESS_DENIED'
  | 'PERMISSION_DENIED'
  | 'USER_DISABLED'
  | 'PASSWORD_EXPIRED';

export class SecurityException extends HttpException {
  constructor(errorCode: SecurityErrorCode, message: string, status: HttpStatus = HttpStatus.UNAUTHORIZED) {
    super(
      {
        statusCode: status,
        errorCode,
        message,
        details: [message],
      },
      status,
    );
  }
}
