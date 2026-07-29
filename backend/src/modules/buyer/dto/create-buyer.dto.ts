import { IsString, IsNotEmpty, IsOptional, IsEnum, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PartyType, PartyGrade, PartyStatus, PotentialStatus } from '@prisma/client';

export class CreateBuyerContactDto {
  @ApiPropertyOptional({ example: 'Mr.' })
  @IsOptional()
  @IsString()
  salutation?: string;

  @ApiProperty({ example: 'David Musoke' })
  @IsNotEmpty()
  @IsString()
  full_name: string;

  @ApiPropertyOptional({ example: 'Procurement Director' })
  @IsOptional()
  @IsString()
  designation?: string;

  @ApiPropertyOptional({ example: 'Uganda', default: 'Uganda' })
  @IsOptional()
  @IsString()
  country?: string;

  @ApiPropertyOptional({ example: '+256 700123456' })
  @IsOptional()
  @IsString()
  calling_number?: string;

  @ApiPropertyOptional({ example: '+256 700123456' })
  @IsOptional()
  @IsString()
  whatsapp_number?: string;

  @ApiPropertyOptional({ example: 'david@ugandafoods.co.ug' })
  @IsOptional()
  @IsString()
  email?: string;
}

export class CreateBuyerDto {
  @ApiProperty({ example: 'Uganda Beverage Industries Ltd' })
  @IsNotEmpty()
  @IsString()
  name: string;

  @ApiPropertyOptional({ enum: PartyType, default: PartyType.MANUFACTURER })
  @IsOptional()
  @IsEnum(PartyType)
  buyer_type?: PartyType;

  @ApiPropertyOptional({ example: 'Uganda', default: 'Uganda' })
  @IsOptional()
  @IsString()
  country?: string;

  @ApiPropertyOptional({ example: 'Kampala' })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional({ example: 'Plot 45 Industrial Area' })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional({ example: '1000123456' })
  @IsOptional()
  @IsString()
  tax_id?: string;

  @ApiPropertyOptional({ example: 'https://www.ugandabeverages.co.ug' })
  @IsOptional()
  @IsString()
  website?: string;

  @ApiPropertyOptional({ enum: PartyStatus, default: PartyStatus.NEW })
  @IsOptional()
  @IsEnum(PartyStatus)
  current_status?: PartyStatus;

  @ApiPropertyOptional({ example: 'Carbonated Soft Drinks, Juice Concentrates' })
  @IsOptional()
  @IsString()
  product_range_supplied?: string;

  @ApiPropertyOptional({ enum: PotentialStatus, default: PotentialStatus.UNSELECTED })
  @IsOptional()
  @IsEnum(PotentialStatus)
  potential?: PotentialStatus;

  @ApiPropertyOptional({ example: 'Expanding bottling capacity' })
  @IsOptional()
  @IsString()
  potential_reason?: string;

  @ApiPropertyOptional({ enum: PartyGrade })
  @IsOptional()
  @IsEnum(PartyGrade)
  client_grade?: PartyGrade;

  @ApiPropertyOptional({ example: 'Local importers & Kenya distributors' })
  @IsOptional()
  @IsString()
  currently_buying_from?: string;

  @ApiPropertyOptional({ example: 'Key target client for food ingredients' })
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
  potential_subcategories?: string[];

  @ApiPropertyOptional({ type: [CreateBuyerContactDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateBuyerContactDto)
  contacts?: CreateBuyerContactDto[];
}
