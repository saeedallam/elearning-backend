import { Body, Controller, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshDto } from './dto/refresh.dto';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly service: AuthService) {}
  @Public() @Post('register') register(@Body() dto: RegisterDto) { return this.service.register(dto); }
  @Public() @Post('login') login(@Body() dto: LoginDto) { return this.service.login(dto); }
  @Public() @Post('refresh') refresh(@Body() dto: RefreshDto) { return this.service.refresh(dto.refreshToken); }
  @Public() @Post('logout') logout(@Body() dto: RefreshDto) { return this.service.logout(dto.refreshToken); }
}
