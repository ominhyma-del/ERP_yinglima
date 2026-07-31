import { IsString, IsNotEmpty, IsOptional, IsNumber, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateInquiryItemDto {
  @ApiProperty({ example: 'FB1' })
  @IsNotEmpty()
  @IsString()
  consignment_code: string;

  @ApiPropertyOptional({ example: '00000000-0000-0000-0000-000000000001' })
  @IsOptional()
  @IsUUID()
  product_id?: string;

  @ApiPropertyOptional({ example: 'Citric Acid' })
  @IsOptional()
  @IsString()
  product_name?: string;

  @ApiPropertyOptional({ example: 'PRD-ING-CA01' })
  @IsOptional()
  @IsString()
  product_code?: string;

  @ApiProperty({ example: 100 })
  @IsNotEmpty()
  @IsNumber()
  quantity: number;

  @ApiPropertyOptional({ example: 'Yinglima Brand' })
  @IsOptional()
  @IsString()
  brand_preference?: string;

  @ApiPropertyOptional({ example: '220V 50Hz single phase stainless steel finish' })
  @IsOptional()
  @IsString()
  product_specs?: string;

  @ApiPropertyOptional({ example: 'China supplier has stock ready to ship' })
  @IsOptional()
  @IsString()
  procurement_remarks?: string;
}

export class BulkShiftItemsDto {
  @ApiProperty({ type: [String] })
  @IsNotEmpty()
  item_ids: string[];

  @ApiProperty({ example: 'FB2' })
  @IsNotEmpty()
  @IsString()
  target_consignment_code: string;
}

export class BulkTallyPostDto {
  @ApiProperty({ type: [String] })
  @IsNotEmpty()
  item_ids: string[];
}
