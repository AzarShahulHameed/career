import { IsString, IsNotEmpty, IsUrl, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class PushKeysDto {
  @IsString() @IsNotEmpty()
  p256dh: string;

  @IsString() @IsNotEmpty()
  auth: string;
}

export class SubscribePushDto {
  @IsUrl({ require_tld: false }) // push endpoints are often on non-TLD hosts (e.g. localhost during dev)
  endpoint: string;

  @ValidateNested() @Type(() => PushKeysDto)
  keys: PushKeysDto;
}

export class UnsubscribePushDto {
  @IsString() @IsNotEmpty()
  endpoint: string;
}
