import { Controller, Get, Post, Patch, Delete, Body, Param, Query, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery, ApiBearerAuth } from '@nestjs/swagger';
import { UserService } from './user.service';
import { RequirePermission } from '../../core/decorators/permissions.decorator';

/**
 * Team Member management. All routes require authentication (JwtAuthGuard is
 * global) and are additionally gated by the 'team' module permission so that
 * only Admins/Super Admins and employees explicitly granted access to the
 * Team module can view, edit, or delete team members. Employees never get
 * ADMIN/SUPER_ADMIN role, so day-to-day account listing never leaks to
 * unauthorized users — see PermissionsGuard, which lets ADMIN/SUPER_ADMIN
 * bypass these checks and enforces them for everyone else.
 */
@ApiTags('User/Team Management')
@ApiBearerAuth()
@Controller('api/v1/users')
export class UserController {
  constructor(private readonly userService: UserService) { }

  @Get()
  @RequirePermission({ module: 'team', action: 'VIEW' })
  @ApiOperation({ summary: 'List all team members (passwords are never included in the response)' })
  findAll() {
    return this.userService.findAll();
  }

  @Get(':id')
  @RequirePermission({ module: 'team', action: 'VIEW' })
  @ApiOperation({ summary: 'Get team member by ID' })
  findOne(@Param('id') id: string) {
    return this.userService.findOne(id);
  }

  @Post()
  @RequirePermission({ module: 'team', action: 'EDIT' })
  @ApiOperation({ summary: 'Create a new team member' })
  create(@Body() body: any, @Req() req: any) {
    return this.userService.create(body, req?.user);
  }

  @Patch(':id')
  @RequirePermission({ module: 'team', action: 'EDIT' })
  @ApiOperation({ summary: 'Update a team member details or permissions' })
  update(@Param('id') id: string, @Body() body: any, @Req() req: any) {
    return this.userService.update(id, body, req?.user);
  }

  @Get(':id/owned-data-summary')
  @RequirePermission({ module: 'team', action: 'DELETE' })
  @ApiOperation({
    summary:
      'Preview the data a user owns (Suppliers/Buyers/Products/Inquiries) and list eligible transfer-target users, BEFORE deleting the account',
  })
  getOwnedDataSummary(@Param('id') id: string) {
    return this.userService.getOwnedDataSummary(id);
  }

  @Delete(':id')
  @RequirePermission({ module: 'team', action: 'DELETE' })
  @ApiOperation({ summary: 'Delete a team member with mandatory data ownership transfer' })
  @ApiQuery({ name: 'targetUserId', required: true, description: 'ID of target user to receive transferred records' })
  remove(@Param('id') id: string, @Query('targetUserId') targetUserId: string, @Req() req: any) {
    return this.userService.remove(id, targetUserId, req?.user);
  }
}