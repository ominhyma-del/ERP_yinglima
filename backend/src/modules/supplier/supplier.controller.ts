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
import { BulkDeleteDto } from '../../core/dto/bulk-delete.dto';
import { CurrentTenant, TenantContext } from '../../core/decorators/tenant.decorator';
import { TenantContextInterceptor } from '../../core/interceptors/tenant-context.interceptor';
import { RequirePermission } from '../../core/decorators/permissions.decorator';
import { PartyStatus } from '@prisma/client';

// SECURITY: every route below previously had no @RequirePermission at all.
// The global JwtAuthGuard still required a valid login, but that's it — any
// authenticated employee could create/edit/delete Suppliers even if their
// permission matrix (set in Team Members -> Permissions, module key
// 'suppliers') had view/edit/delete all switched off. The frontend was
// already hiding buttons based on that matrix (see teamStore.ts `can()`), but
// a UI-only gate is not a real gate — calling the API directly bypassed it
// completely. @RequirePermission({ module: 'suppliers', ... }) below makes
// the server enforce exactly what the UI already implied.
@ApiTags('Supplier Management')
@ApiHeader({ name: 'x-company-id', description: 'Tenant Company UUID', required: true })
@UseInterceptors(TenantContextInterceptor)
@Controller('api/v1/suppliers')
export class SupplierController {
  constructor(private readonly supplierService: SupplierService) { }

  @Post()
  @RequirePermission({ module: 'suppliers', action: 'EDIT' })
  @ApiOperation({ summary: 'Create a new Supplier profile' })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'Supplier created successfully.' })
  create(@Body() dto: CreateSupplierDto, @CurrentTenant() tenant: TenantContext) {
    return this.supplierService.create(dto, tenant);
  }

  @Get()
  @RequirePermission({ module: 'suppliers', action: 'VIEW' })
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

  @Get('duplicates')
  @RequirePermission({ module: 'suppliers', action: 'VIEW' })
  @ApiOperation({ summary: 'Find duplicate supplier profiles in database' })
  findDuplicates(@CurrentTenant() tenant: TenantContext) {
    return this.supplierService.findDuplicates(tenant);
  }

  @Post('merge')
  @RequirePermission({ module: 'suppliers', action: 'EDIT' })
  @ApiOperation({ summary: 'Merge selected duplicate suppliers into a single target profile' })
  mergeSuppliers(
    @Body() dto: { targetId: string; sourceIds: string[] },
    @CurrentTenant() tenant: TenantContext,
  ) {
    return this.supplierService.mergeSuppliers(tenant, dto);
  }

  @Get(':id')
  @RequirePermission({ module: 'suppliers', action: 'VIEW' })
  @ApiOperation({ summary: 'Get Supplier profile details by ID' })
  findOne(@Param('id') id: string, @CurrentTenant() tenant: TenantContext) {
    return this.supplierService.findOne(id, tenant);
  }

  @Patch(':id/status')
  @RequirePermission({ module: 'suppliers', action: 'EDIT' })
  @ApiOperation({ summary: 'Update Current Status (Enforces NEW -> EXISTING 1-way rule)' })
  updateStatus(
    @Param('id') id: string,
    @Body('currentStatus') currentStatus: PartyStatus,
    @CurrentTenant() tenant: TenantContext,
  ) {
    return this.supplierService.updateStatus(id, currentStatus, tenant);
  }

  @Patch(':id/grade-potential')
  @RequirePermission({ module: 'suppliers', action: 'EDIT' })
  @ApiOperation({ summary: 'Update Grade or Potential in list view' })
  updateGradeOrPotential(
    @Param('id') id: string,
    @Body() dto: { grade?: any; potential?: any },
    @CurrentTenant() tenant: TenantContext,
  ) {
    return this.supplierService.updateGradeOrPotential(id, dto, tenant);
  }

  @Patch(':id/toggle-active')
  @RequirePermission({ module: 'suppliers', action: 'EDIT' })
  @ApiOperation({ summary: 'Toggle Active/Inactive status' })
  toggleActive(@Param('id') id: string, @CurrentTenant() tenant: TenantContext) {
    return this.supplierService.toggleActiveStatus(id, tenant);
  }

  @Delete(':id')
  @RequirePermission({ module: 'suppliers', action: 'DELETE' })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete Supplier (Strictly blocked if Status=EXISTING or Potential=YES)' })
  remove(@Param('id') id: string, @CurrentTenant() tenant: TenantContext) {
    return this.supplierService.remove(id, tenant);
  }

  @Post('bulk-delete')
  @RequirePermission({ module: 'suppliers', action: 'DELETE' })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Bulk delete selected Suppliers',
    description:
      'Each id is checked against the same rule as single-row delete (Status=NEW AND Potential=NO/unselected). ' +
      'Records that fail are returned in "blocked" (not deleted) instead of failing the whole request. ' +
      'Re-call with { force: true, forceIds: [...] } to override specific blocked records after user confirmation.',
  })
  bulkRemove(@Body() dto: BulkDeleteDto, @CurrentTenant() tenant: TenantContext) {
    return this.supplierService.bulkRemove(dto.ids, tenant, { force: dto.force, forceIds: dto.forceIds });
  }
}