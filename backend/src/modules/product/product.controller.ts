import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  Query,
  Patch,
  UseInterceptors,
  HttpStatus,
  HttpCode,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiHeader } from '@nestjs/swagger';
import { ProductService } from './product.service';
import { CreateProductDto } from './dto/create-product.dto';
import { CurrentTenant, TenantContext } from '../../core/decorators/tenant.decorator';
import { TenantContextInterceptor } from '../../core/interceptors/tenant-context.interceptor';
import { RequirePermission } from '../../core/decorators/permissions.decorator';
import { Roles } from '../../core/decorators/roles.decorator';

// SECURITY: see the identical note in supplier.controller.ts — every route
// here previously had no @RequirePermission/@Roles, so the 'products'
// permission matrix and the "only Admin can delete products" rule the
// frontend enforces (ProductMasterPage.tsx: `if (!IS_ADMIN) ...`) were both
// only UI-side. Fixed below — delete uses @Roles() to match that explicit
// admin-only intent; the rest use the standard 'products' permission module.
@ApiTags('Product Master')
@ApiHeader({ name: 'x-company-id', description: 'Tenant Company UUID', required: true })
@UseInterceptors(TenantContextInterceptor)
@Controller('api/v1/products')
export class ProductController {
  constructor(private readonly productService: ProductService) { }

  @Post()
  @RequirePermission({ module: 'products', action: 'EDIT' })
  @ApiOperation({ summary: 'Create a new Product in Master Catalog' })
  create(@Body() dto: CreateProductDto, @CurrentTenant() tenant: TenantContext) {
    return this.productService.create(dto, tenant);
  }

  @Get()
  @RequirePermission({ module: 'products', action: 'VIEW' })
  @ApiOperation({ summary: 'List and filter Products (Paginated)' })
  findAll(@CurrentTenant() tenant: TenantContext, @Query() query: any) {
    return this.productService.findAll(tenant, query);
  }

  @Get(':id')
  @RequirePermission({ module: 'products', action: 'VIEW' })
  @ApiOperation({ summary: 'Get Product details by ID' })
  findOne(@Param('id') id: string, @CurrentTenant() tenant: TenantContext) {
    return this.productService.findOne(id, tenant);
  }

  @Patch(':id/toggle-active')
  @RequirePermission({ module: 'products', action: 'EDIT' })
  @ApiOperation({ summary: 'Toggle Active/Inactive (Allowed ONLY IF Stock == 0)' })
  toggleActive(@Param('id') id: string, @CurrentTenant() tenant: TenantContext) {
    return this.productService.toggleActiveStatus(id, tenant);
  }

  @Delete(':id')
  @Roles('ADMIN', 'SUPER_ADMIN')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete Product (Admin only & Allowed ONLY IF Status=INACTIVE & Stock=0)' })
  remove(@Param('id') id: string, @CurrentTenant() tenant: TenantContext) {
    return this.productService.remove(id, tenant);
  }
}