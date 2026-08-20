import { Body, Controller, Get, Param, Patch, Post, Query, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { Roles } from '../../common/decorators/roles.decorator';
import { AuthenticatedRequest } from '../../common/types/authenticated-request';
import { UsersService } from './users.service';
import { UpdateProfileDto } from './dto/update-profile.dto';

@ApiTags('users') @ApiBearerAuth() @Controller('users')
export class UsersController {
  constructor(private readonly service: UsersService) {}
  @Get('me') me(@Req() req: AuthenticatedRequest) { return this.service.me(req.user.id); }
  @Patch('me') update(@Req() req: AuthenticatedRequest, @Body() dto: UpdateProfileDto) { return this.service.update(req.user.id, dto); }
  @Post('me/password') password(@Req() req: AuthenticatedRequest, @Body() body: { currentPassword: string; newPassword: string }) { return this.service.changePassword(req.user.id, body.currentPassword, body.newPassword); }
  @Roles(Role.ADMIN) @Get('admin/list') adminList(@Query('page') page?: number, @Query('limit') limit?: number) { return this.service.adminList(page, limit); }
  @Roles(Role.ADMIN) @Patch(':id/active') toggle(@Param('id') id:string, @Body('isActive') isActive:boolean) { return this.service.toggleActive(id, isActive); }
}
