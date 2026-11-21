import { Module } from '@nestjs/common';
import { AppController } from './app.controller.js';
import { DatabaseModule } from './database/database.module.js';
import { CatalogModule } from './modules/catalog/index.js';

@Module({
  imports: [DatabaseModule, CatalogModule],
  controllers: [AppController],
})
export class AppModule {}
