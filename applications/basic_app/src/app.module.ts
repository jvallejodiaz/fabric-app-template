import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { Connection } from './blockchain.provider';

@Module({
  imports: [],
  controllers: [AppController],
  providers: [AppService, Connection],
})
export class AppModule {}
