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
import { CurrentTenant, TenantContext } from '../../core/decorators/tenant.decorator';
import { TenantContextInterceptor } from '../../core/interceptors/tenant-context.interceptor';
import { PartyStatus } from '@prisma/client';

@ApiTags('Buyer Management')
@ApiHeader({ name: 'x-company-id', description: 'Tenant Company UUID', required: true })
@UseInterceptors(TenantContextInterceptor)
@Controller('api/v1/buyers')
export class BuyerController {
  constructor(private readonly buyerService: BuyerService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new Buyer profile' })
  create(@Body() dto: CreateBuyerDto, @CurrentTenant() tenant: TenantContext) {
    return this.buyerService.create(dto, tenant);
  }

  @Get()
  @ApiOperation({ summary: 'List and filter Buyers (Paginated)' })
  findAll(@CurrentTenant() tenant: TenantContext, @Query() query: any) {
    return this.buyerService.findAll(tenant, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get Buyer profile by ID' })
  findOne(@Param('id') id: string, @CurrentTenant() tenant: TenantContext) {
    return this.buyerService.findOne(id, tenant);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update Buyer profile by ID' })
  update(
    @Param('id') id: string,
    @Body() dto: CreateBuyerDto,
    @CurrentTenant() tenant: TenantContext,
  ) {
    return this.buyerService.update(id, dto, tenant);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Update Current Status (NEW -> EXISTING 1-way rule)' })
  updateStatus(
    @Param('id') id: string,
    @Body('currentStatus') currentStatus: PartyStatus,
    @CurrentTenant() tenant: TenantContext,
  ) {
    return this.buyerService.updateStatus(id, currentStatus, tenant);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete Buyer (Strictly blocked if Status=EXISTING or Potential=YES)' })
  remove(@Param('id') id: string, @CurrentTenant() tenant: TenantContext) {
    return this.buyerService.remove(id, tenant);
  }
}
