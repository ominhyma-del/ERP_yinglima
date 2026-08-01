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
import { ApiTags, ApiOperation, ApiResponse, ApiHeader } from '@nestjs/swagger';
import { BuyerService } from './buyer.service';
import { CreateBuyerDto } from './dto/create-buyer.dto';
import { BulkDeleteDto } from '../../core/dto/bulk-delete.dto';
import { CurrentTenant, TenantContext } from '../../core/decorators/tenant.decorator';
import { TenantContextInterceptor } from '../../core/interceptors/tenant-context.interceptor';
import { RequirePermission } from '../../core/decorators/permissions.decorator';
import { PartyStatus } from '@prisma/client';

// SECURITY: see the identical note in supplier.controller.ts — every route
// here previously had no @RequirePermission, so an employee's 'buyers'
// permission toggles (view/edit/delete) were enforced only by the frontend
// hiding buttons, not by the server. Fixed below.
@ApiTags('Buyer Management')
@ApiHeader({ name: 'x-company-id', description: 'Tenant Company UUID', required: true })
@UseInterceptors(TenantContextInterceptor)
@Controller('api/v1/buyers')
export class BuyerController {
  constructor(private readonly buyerService: BuyerService) { }

  @Post()
  @RequirePermission({ module: 'buyers', action: 'EDIT' })
  @ApiOperation({ summary: 'Create a new Buyer profile' })
  create(@Body() dto: CreateBuyerDto, @CurrentTenant() tenant: TenantContext) {
    return this.buyerService.create(dto, tenant);
  }

  @Get()
  @RequirePermission({ module: 'buyers', action: 'VIEW' })
  @ApiOperation({ summary: 'List and filter Buyers (Paginated)' })
  findAll(@CurrentTenant() tenant: TenantContext, @Query() query: any) {
    return this.buyerService.findAll(tenant, query);
  }

  @Get(':id')
  @RequirePermission({ module: 'buyers', action: 'VIEW' })
  @ApiOperation({ summary: 'Get Buyer profile by ID' })
  findOne(@Param('id') id: string, @CurrentTenant() tenant: TenantContext) {
    return this.buyerService.findOne(id, tenant);
  }

  @Patch(':id')
  @RequirePermission({ module: 'buyers', action: 'EDIT' })
  @ApiOperation({ summary: 'Update Buyer profile by ID' })
  update(
    @Param('id') id: string,
    @Body() dto: CreateBuyerDto,
    @CurrentTenant() tenant: TenantContext,
  ) {
    return this.buyerService.update(id, dto, tenant);
  }

  @Patch(':id/status')
  @RequirePermission({ module: 'buyers', action: 'EDIT' })
  @ApiOperation({ summary: 'Update Current Status (NEW -> EXISTING 1-way rule)' })
  updateStatus(
    @Param('id') id: string,
    @Body('currentStatus') currentStatus: PartyStatus,
    @CurrentTenant() tenant: TenantContext,
  ) {
    return this.buyerService.updateStatus(id, currentStatus, tenant);
  }

  @Delete(':id')
  @RequirePermission({ module: 'buyers', action: 'DELETE' })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete Buyer (Strictly blocked if Status=EXISTING or Potential=YES)' })
  remove(@Param('id') id: string, @CurrentTenant() tenant: TenantContext) {
    return this.buyerService.remove(id, tenant);
  }

  @Post('bulk-delete')
  @RequirePermission({ module: 'buyers', action: 'DELETE' })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Bulk delete selected Buyers',
    description:
      'Each id is checked against the same rule as single-row delete (Status=NEW AND Potential=NO/unselected). ' +
      'Records that fail are returned in "blocked" (not deleted) instead of failing the whole request. ' +
      'Re-call with { force: true, forceIds: [...] } to override specific blocked records after user confirmation.',
  })
  bulkRemove(@Body() dto: BulkDeleteDto, @CurrentTenant() tenant: TenantContext) {
    return this.buyerService.bulkRemove(dto.ids, tenant, { force: dto.force, forceIds: dto.forceIds });
  }
}