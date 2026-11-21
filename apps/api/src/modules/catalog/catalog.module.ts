import { Module } from '@nestjs/common';
import type { DatabaseConnection } from '@agendoxa/database';
import {
  DATABASE_CONNECTION,
  DatabaseModule,
} from '../../database/database.module.js';
import { TenantsModule } from '../tenants/index.js';
import { PublicServicesController } from './adapters/in/http/public-services.controller.js';
import { DrizzleServiceCatalogRepository } from './adapters/out/persistence/drizzle-service-catalog-repository.js';
import {
  SERVICE_CATALOG_REPOSITORY,
  type ServiceCatalogRepository,
} from './application/ports/service-catalog-repository.js';
import { ListActiveServices } from './application/use-cases/list-active-services.js';

// Composition root of `catalog`: the only place that knows which adapter
// implements each port. Use cases stay free of Nest decorators.
@Module({
  imports: [DatabaseModule, TenantsModule],
  controllers: [PublicServicesController],
  providers: [
    {
      provide: SERVICE_CATALOG_REPOSITORY,
      useFactory: (connection: DatabaseConnection) =>
        new DrizzleServiceCatalogRepository(connection.db),
      inject: [DATABASE_CONNECTION],
    },
    {
      provide: ListActiveServices,
      useFactory: (services: ServiceCatalogRepository) =>
        new ListActiveServices(services),
      inject: [SERVICE_CATALOG_REPOSITORY],
    },
  ],
})
export class CatalogModule {}
