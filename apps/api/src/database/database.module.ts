import { Module } from '@nestjs/common';
import { createDatabase } from '@agendoxa/database';

export const DATABASE_CONNECTION = 'DATABASE_CONNECTION';

@Module({
  providers: [
    {
      provide: DATABASE_CONNECTION,
      useFactory: () => {
        const connection = createDatabase(process.env.DATABASE_URL ?? '');
        return {
          ...connection,
          onApplicationShutdown: () => connection.close(),
        };
      },
    },
  ],
  exports: [DATABASE_CONNECTION],
})
export class DatabaseModule {}
