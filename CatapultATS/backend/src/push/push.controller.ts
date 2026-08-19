import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PushService } from './push.service';
import { SubscribePushDto, UnsubscribePushDto } from './dto/subscribe-push.dto';

@Controller('push')
export class PushController {
  constructor(private pushService: PushService) {}

  // Public — the frontend needs this to construct a subscription even
  // before it knows whether it'll succeed.
  @Get('vapid-public-key')
  getPublicKey() {
    return { publicKey: this.pushService.getPublicKey() };
  }

  @UseGuards(JwtAuthGuard)
  @Post('subscribe')
  subscribe(@Body() dto: SubscribePushDto, @Req() req: any) {
    return this.pushService.subscribe(req.user.id, dto.endpoint, dto.keys.p256dh, dto.keys.auth);
  }

  @UseGuards(JwtAuthGuard)
  @Post('unsubscribe')
  unsubscribe(@Body() dto: UnsubscribePushDto) {
    return this.pushService.unsubscribe(dto.endpoint);
  }
}
