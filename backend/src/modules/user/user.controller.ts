import { Controller, Get, Post, Patch, Delete, Body, Param } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { UserService } from './user.service';

@ApiTags('User/Team Management')
@Controller('api/v1/users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get()
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
  create(@Body() body: any) {
    return this.userService.create(body);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a team member details or permissions' })
  update(@Param('id') id: string, @Body() body: any) {
    return this.userService.update(id, body);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a team member' })
  remove(@Param('id') id: string) {
    return this.userService.remove(id);
  }
}
