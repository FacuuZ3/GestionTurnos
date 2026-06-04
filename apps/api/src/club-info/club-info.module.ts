import { Module } from '@nestjs/common';
import { ClubInfoController } from './club-info.controller';
import { ClubInfoService } from './club-info.service';

@Module({
  controllers: [ClubInfoController],
  providers: [ClubInfoService],
  exports: [ClubInfoService],
})
export class ClubInfoModule {}
