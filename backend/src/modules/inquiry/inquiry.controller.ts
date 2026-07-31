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
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiHeader } from '@nestjs/swagger';
import { InquiryService } from './inquiry.service';
import { CreateInquiryItemDto, BulkShiftItemsDto, BulkTallyPostDto } from './dto/create-inquiry-item.dto';
import { CurrentTenant, TenantContext } from '../../core/decorators/tenant.decorator';
import { TenantContextInterceptor } from '../../core/interceptors/tenant-context.interceptor';

@ApiTags('Inquiry & Consignment Management')
@ApiHeader({ name: 'x-company-id', description: 'Tenant Company UUID', required: true })
@UseInterceptors(TenantContextInterceptor)
@Controller('api/v1/inquiries')
export class InquiryController {
  constructor(private readonly inquiryService: InquiryService) {}

  @Get('layer1-summary')
  @ApiOperation({ summary: 'Layer 1: Company & Consignment Summary List (FB1, FB2, OS1, aggregate CBM & Weight)' })
  getLayer1Summary(@CurrentTenant() tenant: TenantContext) {
    return this.inquiryService.getLayer1Summary(tenant);
  }

  @Get('layer2-grid/:code')
  @ApiOperation({ summary: 'Layer 2: Interactive Excel Grid for a specific Consignment Code' })
  getLayer2Grid(@Param('code') code: string, @CurrentTenant() tenant: TenantContext) {
    return this.inquiryService.getLayer2Grid(code, tenant);
  }

  @Post('items')
  @ApiOperation({ summary: 'Add product item to consignment' })
  addItem(@Body() dto: CreateInquiryItemDto, @CurrentTenant() tenant: TenantContext) {
    return this.inquiryService.addItem(dto, tenant);
  }

  @Patch('items/:id/quantity')
  @ApiOperation({ summary: 'Inline update item quantity (triggers auto CBM/Weight recalc)' })
  updateQuantity(
    @Param('id') id: string,
    @Body('quantity') quantity: number,
    @CurrentTenant() tenant: TenantContext,
  ) {
    return this.inquiryService.updateItemQuantity(id, quantity, tenant);
  }

  @Post('items/bulk-shift')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Shift selected line items to another Consignment Code (e.g. FB1 to FB2)' })
  bulkShiftItems(@Body() dto: BulkShiftItemsDto, @CurrentTenant() tenant: TenantContext) {
    return this.inquiryService.bulkShiftItems(dto, tenant);
  }

  @Post('items/bulk-tally-post')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Bulk mark Tally Post Status to POSTED' })
  bulkTallyPost(@Body() dto: BulkTallyPostDto, @CurrentTenant() tenant: TenantContext) {
    return this.inquiryService.bulkTallyPost(dto, tenant);
  }

  @Patch('items/:id/approve')
  @ApiOperation({ summary: 'Approve line item' })
  approveItem(@Param('id') id: string, @CurrentTenant() tenant: TenantContext) {
    return this.inquiryService.approveItem(id, tenant);
  }

  @Delete('items/:id')
  @ApiOperation({ summary: 'Delete line item' })
  deleteItem(@Param('id') id: string, @CurrentTenant() tenant: TenantContext) {
    return this.inquiryService.deleteItem(id, tenant);
  }

  @Delete('consignments/:id')
  @ApiOperation({ summary: 'Delete entire consignment' })
  deleteConsignment(@Param('id') id: string, @CurrentTenant() tenant: TenantContext) {
    return this.inquiryService.deleteConsignment(id, tenant);
  }
}
