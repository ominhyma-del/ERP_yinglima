import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../core/database/prisma.service';

@Injectable()
export class AuditService {
  constructor(private prisma: PrismaService) {}

  private inMemoryLogs: any[] = [
    {
      id: 'log-1',
      timestamp: new Date().toISOString(),
      user_email: 'admin@yinglima.com',
      action: 'LOGIN_SUCCESS',
      entity: 'USER_AUTH',
      role: 'ADMIN',
      ip_address: '127.0.0.1 (Local Session)',
      status: 'SUCCESS',
      description: 'User "admin@yinglima.com" authenticated successfully as ADMIN',
    },
  ];

  async createLog(logData: {
    user_email: string;
    action: string;
    entity: string;
    role?: string;
    description: string;
    ip_address?: string;
  }) {
    const newLog = {
      id: `log-${Date.now()}`,
      timestamp: new Date().toISOString(),
      user_email: logData.user_email,
      action: logData.action,
      entity: logData.entity,
      role: logData.role || 'USER',
      ip_address: logData.ip_address || '127.0.0.1',
      status: 'SUCCESS',
      description: logData.description,
    };
    this.inMemoryLogs.unshift(newLog);
    return newLog;
  }

  async getLogs() {
    return this.inMemoryLogs;
  }
}
