import { SetMetadata } from '@nestjs/common';

export interface PermissionRequirement {
  module: string;
  feature?: string;
  action: 'VIEW' | 'CREATE' | 'EDIT' | 'DELETE' | 'EXPORT' | 'IMPORT' | 'APPROVE' | 'PRINT';
}

export const PERMISSIONS_KEY = 'permissions';
export const RequirePermission = (requirement: PermissionRequirement) => SetMetadata(PERMISSIONS_KEY, requirement);
