import { Module } from '@nestjs/common';
import { MobileController } from './mobile.controller';
import { MobileService } from './mobile.service';
import { RankingsModule } from '../rankings/rankings.module';

@Module({
  imports: [RankingsModule],
  controllers: [MobileController],
  providers: [MobileService],
})
export class MobileModule {}
