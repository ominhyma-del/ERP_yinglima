import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';
import { RequestContext } from './request-context';

@Injectable()
export class RequestContextMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    const requestId =
      (req.headers['x-request-id'] as string) || `req-${randomUUID()}`;

    // Ensure header is set on incoming request and outgoing response
    req.headers['x-request-id'] = requestId;
    res.setHeader('x-request-id', requestId);

    const user = (req as any).user;
    const userId = user?.id || user?.userId || (req.headers['x-user-id'] as string);
    const companyId = user?.companyId || (req.headers['x-company-id'] as string);

    const store = {
      requestId,
      userId,
      companyId,
      startTime: Date.now(),
    };

    RequestContext.run(store, () => {
      next();
    });
  }
}
