import { Module } from '@nestjs/common';
import type { DatabaseConnection } from '@agendoxa/database';
import {
  DATABASE_CONNECTION,
  DatabaseModule,
} from '../../database/database.module.js';
import { DrizzlePublicTenantLookup } from './adapters/out/persistence/drizzle-public-tenant-lookup.js';
import { PUBLIC_TENANT_LOOKUP } from './contracts/public-tenant-lookup.js';

@Module({
  imports: [DatabaseModule],
  providers: [
    {
      provide: PUBLIC_TENANT_LOOKUP,
      useFactory: (connection: DatabaseConnection) =>
        new DrizzlePublicTenantLookup(connection.db),
      inject: [DATABASE_CONNECTION],
    },
  ],
  exports: [PUBLIC_TENANT_LOOKUP],
})
export class TenantsModule {}
