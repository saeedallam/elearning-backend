import { Controller, Get, Param, Patch, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthenticatedRequest } from '../../common/types/authenticated-request';
import { NotificationsService } from './notifications.service';
@ApiTags('notifications')
@ApiBearerAuth()
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly service: NotificationsService) {}
  @Get() list(@Req() req: AuthenticatedRequest) { return this.service.list(req.user.id); }
  @Patch(':id/read') read(@Req() req: AuthenticatedRequest, @Param('id') id: string) { return this.service.markRead(req.user.id, id); }
}
