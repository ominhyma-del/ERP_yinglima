import { IsString, IsNotEmpty, IsOptional, IsNumber, IsUUID, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateProductDto {
  @ApiProperty({ example: 'FR900 MSH Band Sealer' })
  @IsNotEmpty()
  @IsString()
  name_tally: string;

  @ApiPropertyOptional({ example: 'FR900 Heavy Duty Continuous Band Sealer' })
  @IsOptional()
  @IsString()
  name_invoice?: string;

  @ApiProperty({ example: 'PRD-BS-FR900' })
  @IsNotEmpty()
  @IsString()
  product_code: string;

  @ApiProperty({ example: '00000000-0000-0000-0000-000000000001' })
  @IsNotEmpty()
  @IsUUID()
  category_id: string;

  @ApiProperty({ example: '00000000-0000-0000-0000-000000000002' })
  @IsNotEmpty()
  @IsUUID()
  subcategory_id: string;

  @ApiPropertyOptional({ example: '00000000-0000-0000-0000-000000000003' })
  @IsOptional()
  @IsUUID()
  brand_id?: string;

  @ApiPropertyOptional({ example: '84223000' })
  @IsOptional()
  @IsString()
  hsn_id?: string;

  @ApiPropertyOptional({ example: '84223000' })
  @IsOptional()
  @IsString()
  hsn_code?: string;

  @ApiPropertyOptional({ example: 13.0 })
  @IsOptional()
  @IsNumber()
  vat_refund_pct?: number;

  @ApiPropertyOptional({ example: 'Requires CE Certificate & Import Standard License' })
  @IsOptional()
  @IsString()
  license_required_info?: string;

  @ApiProperty({ example: 'PCS' })
  @IsNotEmpty()
  @IsString()
  uom: string;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsNumber()
  packaging_qty?: number;

  @ApiPropertyOptional({ example: 19.5 })
  @IsOptional()
  @IsNumber()
  net_weight?: number;

  @ApiPropertyOptional({ example: 21.0 })
  @IsOptional()
  @IsNumber()
  gross_weight?: number;

  @ApiPropertyOptional({ example: 95.0 })
  @IsOptional()
  @IsNumber()
  length_cm?: number;

  @ApiPropertyOptional({ example: 45.0 })
  @IsOptional()
  @IsNumber()
  width_cm?: number;

  @ApiPropertyOptional({ example: 38.0 })
  @IsOptional()
  @IsNumber()
  height_cm?: number;

  @ApiPropertyOptional({ example: 'FR900 MSH with emergency stop button and digital temperature controller' })
  @IsOptional()
  @IsString()
  specifications?: string;

  @ApiPropertyOptional({ example: 'https://storage.erp.com/products/fr900.jpg' })
  @IsOptional()
  @IsString()
  image_url?: string;
}
