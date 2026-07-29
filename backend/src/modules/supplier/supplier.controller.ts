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
import { ApiTags, ApiOperation, ApiResponse, ApiHeader, ApiQuery } from '@nestjs/swagger';
import { SupplierService } from './supplier.service';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { CurrentTenant, TenantContext } from '../../core/decorators/tenant.decorator';
import { TenantContextInterceptor } from '../../core/interceptors/tenant-context.interceptor';
import { PartyStatus } from '@prisma/client';

@ApiTags('Supplier Management')
@ApiHeader({ name: 'x-company-id', description: 'Tenant Company UUID', required: true })
@UseInterceptors(TenantContextInterceptor)
@Controller('api/v1/suppliers')
export class SupplierController {
  constructor(private readonly supplierService: SupplierService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new Supplier profile' })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'Supplier created successfully.' })
  create(@Body() dto: CreateSupplierDto, @CurrentTenant() tenant: TenantContext) {
    return this.supplierService.create(dto, tenant);
  }

  @Get()
  @ApiOperation({ summary: 'List and filter Suppliers (Paginated)' })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'productCategory', required: false })
  @ApiQuery({ name: 'keyStrengthSubcategory', required: false })
  @ApiQuery({ name: 'country', required: false })
  @ApiQuery({ name: 'supplierType', required: false })
  @ApiQuery({ name: 'grade', required: false })
  @ApiQuery({ name: 'currentStatus', required: false })
  @ApiQuery({ name: 'potential', required: false })
  @ApiQuery({ name: 'visitedFactory', required: false })
  findAll(@CurrentTenant() tenant: TenantContext, @Query() query: any) {
    return this.supplierService.findAll(tenant, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get Supplier profile details by ID' })
  findOne(@Param('id') id: string, @CurrentTenant() tenant: TenantContext) {
    return this.supplierService.findOne(id, tenant);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Update Current Status (Enforces NEW -> EXISTING 1-way rule)' })
  updateStatus(
    @Param('id') id: string,
    @Body('currentStatus') currentStatus: PartyStatus,
    @CurrentTenant() tenant: TenantContext,
  ) {
    return this.supplierService.updateStatus(id, currentStatus, tenant);
  }

  @Patch(':id/grade-potential')
  @ApiOperation({ summary: 'Update Grade or Potential in list view' })
  updateGradeOrPotential(
    @Param('id') id: string,
    @Body() dto: { grade?: any; potential?: any },
    @CurrentTenant() tenant: TenantContext,
  ) {
    return this.supplierService.updateGradeOrPotential(id, dto, tenant);
  }

  @Patch(':id/toggle-active')
  @ApiOperation({ summary: 'Toggle Active/Inactive status' })
  toggleActive(@Param('id') id: string, @CurrentTenant() tenant: TenantContext) {
    return this.supplierService.toggleActiveStatus(id, tenant);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete Supplier (Strictly blocked if Status=EXISTING or Potential=YES)' })
  remove(@Param('id') id: string, @CurrentTenant() tenant: TenantContext) {
    return this.supplierService.remove(id, tenant);
  }
}
