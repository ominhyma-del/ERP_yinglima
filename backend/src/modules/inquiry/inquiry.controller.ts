import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Patch,
  UseInterceptors,
  HttpStatus,
  HttpCode,
  Delete,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiHeader } from '@nestjs/swagger';
import { InquiryService } from './inquiry.service';
import { CreateInquiryItemDto, BulkShiftItemsDto, BulkTallyPostDto } from './dto/create-inquiry-item.dto';
import { BulkDeleteDto } from '../../core/dto/bulk-delete.dto';
import { CurrentTenant, TenantContext } from '../../core/decorators/tenant.decorator';
import { TenantContextInterceptor } from '../../core/interceptors/tenant-context.interceptor';
import { RequirePermission } from '../../core/decorators/permissions.decorator';

// SECURITY: see the identical note in supplier.controller.ts — every route
// here previously had no @RequirePermission, so the 'inquiry' permission
// module (frontend route: /localpurchase) was enforced only client-side.
// Fixed below.
@ApiTags('Inquiry & Consignment Management')
@ApiHeader({ name: 'x-company-id', description: 'Tenant Company UUID', required: true })
@UseInterceptors(TenantContextInterceptor)
@Controller('api/v1/inquiries')
export class InquiryController {
  constructor(private readonly inquiryService: InquiryService) { }

  @Get('layer1-summary')
  @RequirePermission({ module: 'inquiry', action: 'VIEW' })
  @ApiOperation({ summary: 'Layer 1: Company & Consignment Summary List (FB1, FB2, OS1, aggregate CBM & Weight)' })
  getLayer1Summary(@CurrentTenant() tenant: TenantContext) {
    return this.inquiryService.getLayer1Summary(tenant);
  }

  @Get('layer2-grid/:code')
  @RequirePermission({ module: 'inquiry', action: 'VIEW' })
  @ApiOperation({ summary: 'Layer 2: Interactive Excel Grid for a specific Consignment Code' })
  getLayer2Grid(@Param('code') code: string, @CurrentTenant() tenant: TenantContext) {
    return this.inquiryService.getLayer2Grid(code, tenant);
  }

  @Post('items')
  @RequirePermission({ module: 'inquiry', action: 'EDIT' })
  @ApiOperation({ summary: 'Add product item to consignment' })
  addItem(@Body() dto: CreateInquiryItemDto, @CurrentTenant() tenant: TenantContext) {
    return this.inquiryService.addItem(dto, tenant);
  }

  @Patch('items/:id/quantity')
  @RequirePermission({ module: 'inquiry', action: 'EDIT' })
  @ApiOperation({ summary: 'Inline update item quantity (triggers auto CBM/Weight recalc)' })
  updateQuantity(
    @Param('id') id: string,
    @Body('quantity') quantity: number,
    @CurrentTenant() tenant: TenantContext,
  ) {
    return this.inquiryService.updateItemQuantity(id, quantity, tenant);
  }

  @Post('items/bulk-shift')
  @RequirePermission({ module: 'inquiry', action: 'EDIT' })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Shift selected line items to another Consignment Code (e.g. FB1 to FB2)' })
  bulkShiftItems(@Body() dto: BulkShiftItemsDto, @CurrentTenant() tenant: TenantContext) {
    return this.inquiryService.bulkShiftItems(dto, tenant);
  }

  @Post('items/bulk-tally-post')
  @RequirePermission({ module: 'inquiry', action: 'EDIT' })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Bulk mark Tally Post Status to POSTED' })
  bulkTallyPost(@Body() dto: BulkTallyPostDto, @CurrentTenant() tenant: TenantContext) {
    return this.inquiryService.bulkTallyPost(dto, tenant);
  }

  @Patch('items/:id/approve')
  @RequirePermission({ module: 'inquiry', action: 'EDIT' })
  @ApiOperation({ summary: 'Approve line item' })
  approveItem(@Param('id') id: string, @CurrentTenant() tenant: TenantContext) {
    return this.inquiryService.approveItem(id, tenant);
  }

  @Delete('items/:id')
  @RequirePermission({ module: 'inquiry', action: 'DELETE' })
  @ApiOperation({ summary: 'Delete line item (blocked if Approved or already Tally-posted, unless force=true)' })
  deleteItem(
    @Param('id') id: string,
    @CurrentTenant() tenant: TenantContext,
    @Query('force') force?: string,
  ) {
    return this.inquiryService.deleteItem(id, tenant, { force: force === 'true' });
  }

  @Delete('consignments/:id')
  @RequirePermission({ module: 'inquiry', action: 'DELETE' })
  @ApiOperation({ summary: 'Delete entire consignment (blocked if any item is Approved or Tally-posted, unless force=true)' })
  deleteConsignment(
    @Param('id') id: string,
    @CurrentTenant() tenant: TenantContext,
    @Query('force') force?: string,
  ) {
    return this.inquiryService.deleteConsignment(id, tenant, { force: force === 'true' });
  }

  @Post('consignments/bulk-delete')
  @RequirePermission({ module: 'inquiry', action: 'DELETE' })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Bulk delete selected Consignments',
    description:
      'Each id is checked for Approved/Tally-posted items. Records that fail are returned in "blocked" (not deleted). ' +
      'Re-call with { force: true, forceIds: [...] } to override specific blocked records after user confirmation.',
  })
  bulkDeleteConsignments(@Body() dto: BulkDeleteDto, @CurrentTenant() tenant: TenantContext) {
    return this.inquiryService.bulkDeleteConsignments(dto.ids, tenant, { force: dto.force, forceIds: dto.forceIds });
  }
}