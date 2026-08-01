import { IsArray, IsBoolean, IsOptional, IsUUID, ArrayNotEmpty } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Shared request shape for every "Delete Selected" bulk-delete endpoint
 * (Suppliers, Buyers, Inquiry Consignments).
 *
 * Two-step flow the frontend drives:
 *   1. POST with { ids } only. Records that satisfy the module's delete
 *      rule are deleted; anything that doesn't is returned in `blocked`
 *      (not deleted).
 *   2. If the person chooses to override some/all of the blocked
 *      records via the "Skip / Force Delete" popup, POST again with
 *      { ids, force: true, forceIds: [...] } where forceIds is exactly
 *      the subset they confirmed. Ids not in forceIds still go through
 *      the normal rule check even on this second call.
 */
export class BulkDeleteDto {
  @ApiProperty({ type: [String], description: 'IDs selected for bulk deletion.' })
  @IsArray()
  @ArrayNotEmpty()
  @IsUUID('all', { each: true })
  ids: string[];

  @ApiPropertyOptional({ description: 'When true, ids listed in forceIds bypass the delete rule.' })
  @IsOptional()
  @IsBoolean()
  force?: boolean;

  @ApiPropertyOptional({ type: [String], description: 'Subset of ids the user explicitly confirmed to force-delete despite failing the rule.' })
  @IsOptional()
  @IsArray()
  @IsUUID('all', { each: true })
  forceIds?: string[];
}

export interface BulkDeleteResult {
  deleted: { id: string; name: string }[];
  blocked: { id: string; name: string; reasons: string[] }[];
  notFound: string[];
}
