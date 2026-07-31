import { Controller, Get, Post, Patch, Delete, Body, Param, Query, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { UserService } from './user.service';
import { Public } from '../../core/decorators/public.decorator';

@ApiTags('User/Team Management')
@Controller('api/v1/users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get()
  @Public()
  @ApiOperation({ summary: 'List all team members' })
  findAll() {
    return this.userService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get team member by ID' })
  findOne(@Param('id') id: string) {
    return this.userService.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new team member' })
  create(@Body() body: any, @Req() req: any) {
    return this.userService.create(body, req?.user);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a team member details or permissions' })
  update(@Param('id') id: string, @Body() body: any, @Req() req: any) {
    return this.userService.update(id, body, req?.user);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a team member with mandatory data ownership transfer' })
  @ApiQuery({ name: 'targetUserId', required: true, description: 'ID of target user to receive transferred records' })
  remove(@Param('id') id: string, @Query('targetUserId') targetUserId: string, @Req() req: any) {
    return this.userService.remove(id, targetUserId, req?.user);
  }
}
