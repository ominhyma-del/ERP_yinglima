import { Controller, Get, Post, Body, Query, UseInterceptors } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiHeader } from '@nestjs/swagger';
import { MastersService } from './masters.service';
import { CurrentTenant, TenantContext } from '../../core/decorators/tenant.decorator';
import { TenantContextInterceptor } from '../../core/interceptors/tenant-context.interceptor';

@ApiTags('Masters Management')
@ApiHeader({ name: 'x-company-id', description: 'Tenant Company UUID', required: true })
@UseInterceptors(TenantContextInterceptor)
@Controller('api/v1/masters')
export class MastersController {
  constructor(private readonly mastersService: MastersService) {}

  @Post('categories')
  @ApiOperation({ summary: 'Create Product Category' })
  createCategory(@Body('name') name: string, @CurrentTenant() tenant: TenantContext) {
    return this.mastersService.createCategory(name, tenant);
  }

  @Get('categories')
  @ApiOperation({ summary: 'List Product Categories' })
  getCategories(@CurrentTenant() tenant: TenantContext) {
    return this.mastersService.getCategories(tenant);
  }

  @Post('subcategories')
  @ApiOperation({ summary: 'Create Product SubCategory' })
  createSubCategory(
    @Body('category_id') categoryId: string,
    @Body('name') name: string,
    @CurrentTenant() tenant: TenantContext,
  ) {
    return this.mastersService.createSubCategory(categoryId, name, tenant);
  }

  @Get('subcategories')
  @ApiOperation({ summary: 'List Product SubCategories' })
  getSubCategories(@CurrentTenant() tenant: TenantContext, @Query('category_id') categoryId?: string) {
    return this.mastersService.getSubCategories(tenant, categoryId);
  }

  @Post('brands')
  @ApiOperation({ summary: 'Create Brand' })
  createBrand(
    @Body('name') name: string,
    @Body('description') description: string | undefined,
    @CurrentTenant() tenant: TenantContext,
  ) {
    return this.mastersService.createBrand(name, description, tenant);
  }

  @Get('brands')
  @ApiOperation({ summary: 'List Brands' })
  getBrands(@CurrentTenant() tenant: TenantContext) {
    return this.mastersService.getBrands(tenant);
  }

  @Get('hsn')
  @ApiOperation({ summary: 'List HSN Master codes and VAT Refund %' })
  getHsnCodes() {
    return this.mastersService.getHsnCodes();
  }

  @Get('countries')
  @ApiOperation({ summary: 'List Country Master with phone digit limits' })
  getCountries() {
    return this.mastersService.getCountries();
  }
}
