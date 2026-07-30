import { IsString, IsNotEmpty, IsOptional, IsEnum, IsArray, IsBoolean, ValidateNested, ArrayMinSize } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PartyType, PartyGrade, PartyStatus, PotentialStatus } from '@prisma/client';

export class CreateSupplierContactDto {
  @ApiPropertyOptional({ example: 'Mr.' })
  @IsOptional()
  @IsString()
  salutation?: string;

  @ApiProperty({ example: 'John Zhang' })
  @IsNotEmpty()
  @IsString()
  full_name: string;

  @ApiPropertyOptional({ example: 'Sales Manager' })
  @IsOptional()
  @IsString()
  designation?: string;

  @ApiPropertyOptional({ example: 'Export India' })
  @IsOptional()
  @IsString()
  handling_territory?: string;

  @ApiPropertyOptional({ example: 'China' })
  @IsOptional()
  @IsString()
  country?: string;

  @ApiPropertyOptional({ example: '+86 13800138000' })
  @IsOptional()
  @IsString()
  calling_number?: string;

  @ApiPropertyOptional({ example: '+86 13800138000' })
  @IsOptional()
  @IsString()
  whatsapp_number?: string;

  @ApiPropertyOptional({ example: 'wxid_123456789' })
  @IsOptional()
  @IsString()
  wechat_number?: string;

  @ApiPropertyOptional({ example: 'john@supplier.com' })
  @IsOptional()
  @IsString()
  email?: string;
}

export class CreateSupplierDto {
  @ApiProperty({ example: 'Zhejiang Packaging Machinery Ltd' })
  @IsNotEmpty()
  @IsString()
  name: string;

  @ApiPropertyOptional({ enum: PartyType, default: PartyType.MANUFACTURER })
  @IsOptional()
  @IsEnum(PartyType)
  supplier_type?: PartyType;

  @ApiPropertyOptional({ example: 'FR Series Band Sealers & Spare Parts' })
  @IsOptional()
  @IsString()
  brand_description?: string;

  @ApiPropertyOptional({ example: 'China', default: 'China' })
  @IsOptional()
  @IsString()
  country?: string;

  @ApiPropertyOptional({ example: 'Zhejiang' })
  @IsOptional()
  @IsString()
  province?: string;

  @ApiPropertyOptional({ example: 'Wenzhou' })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional({ example: 'Ruian' })
  @IsOptional()
  @IsString()
  town?: string;

  @ApiPropertyOptional({ example: 'No. 888 Industrial Zone' })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional({ example: '91330300MA12345678' })
  @IsOptional()
  @IsString()
  tax_id?: string;

  @ApiPropertyOptional({ example: 'https://www.zhejiangpack.com' })
  @IsOptional()
  @IsString()
  primary_website?: string;

  @ApiPropertyOptional({ example: 'https://zhejiangpack.en.alibaba.com' })
  @IsOptional()
  @IsString()
  secondary_website?: string;

  @ApiPropertyOptional({ enum: PartyGrade })
  @IsOptional()
  @IsEnum(PartyGrade)
  grade?: PartyGrade;

  @ApiPropertyOptional({ enum: PartyStatus, default: PartyStatus.NEW })
  @IsOptional()
  @IsEnum(PartyStatus)
  current_status?: PartyStatus;

  @ApiPropertyOptional({ enum: PotentialStatus, default: PotentialStatus.UNSELECTED })
  @IsOptional()
  @IsEnum(PotentialStatus)
  potential?: PotentialStatus;

  @ApiPropertyOptional({ example: 'High quality manufacturing capability' })
  @IsOptional()
  @IsString()
  potential_reason?: string;

  @ApiPropertyOptional({ example: 'Vacuum packing machines, strapping tools' })
  @IsOptional()
  @IsString()
  secondary_products_desc?: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  visited_factory?: boolean;

  @ApiPropertyOptional({ example: 'Visited Ruian facility in March 2025. 5 production lines.' })
  @IsOptional()
  @IsString()
  visit_remarks?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  visit_attachments?: string[];

  @ApiPropertyOptional({ example: 'Reliable supplier for band sealers' })
  @IsOptional()
  @IsString()
  overall_remarks?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  product_categories?: string[];

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  key_strength_subcategories?: string[];

  @ApiPropertyOptional({ type: [CreateSupplierContactDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateSupplierContactDto)
  contacts?: CreateSupplierContactDto[];
}
