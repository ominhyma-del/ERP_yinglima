import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Public } from './core/decorators/public.decorator';

@ApiTags('Root')
@Public()
@Controller()
export class AppController {
  @Get()
  @ApiOperation({ summary: 'Enterprise ERP REST API Root Endpoint' })
  getRoot() {
    return {
      service: 'Enterprise Multi-Tenant ERP Backend API',
      status: 'Active & Operational',
      version: '1.0.0',
      documentation: '/api/docs',
      healthCheck: '/health',
      endpoints: {
        suppliers: '/api/v1/suppliers',
        buyers: '/api/v1/buyers',
        products: '/api/v1/products',
        inquiry: '/api/v1/inquiry',
        company: '/api/v1/company',
        auth: '/auth',
        users: '/users',
      },
    };
  }
}
