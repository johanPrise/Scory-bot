import { Module } from '@nestjs/common';
import { MigrationReportService } from './migration-report.service';

@Module({
  providers: [MigrationReportService],
  exports: [MigrationReportService],
})
export class MigrationModule {}
