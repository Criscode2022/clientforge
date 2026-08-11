import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ServeStaticModule } from '@nestjs/serve-static';
import { existsSync } from 'fs';
import { join } from 'path';
import { AuthModule } from './auth/auth.module';
import { ClientsModule } from './clients/clients.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { DatabaseModule } from './database/database.module';
import { ExpensesModule } from './expenses/expenses.module';
import { HealthController } from './health.controller';
import { InvoicesModule } from './invoices/invoices.module';
import { ProjectsModule } from './projects/projects.module';

const webDistCandidates = [
  join(__dirname, '..', '..', 'web', 'dist', 'web', 'browser'),
  join(__dirname, '..', '..', 'web', 'dist', 'web'),
  join(process.cwd(), '..', 'web', 'dist', 'web', 'browser'),
  join(process.cwd(), 'public'),
];

export const webRoot = webDistCandidates.find((p) => existsSync(join(p, 'index.html'))) || null;

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    DatabaseModule,
    AuthModule,
    ClientsModule,
    ProjectsModule,
    InvoicesModule,
    ExpensesModule,
    DashboardModule,
    ...(webRoot
      ? [
          ServeStaticModule.forRoot({
            rootPath: webRoot,
            exclude: ['/api/(.*)', '/api'],
          }),
        ]
      : []),
  ],
  controllers: [HealthController],
})
export class AppModule {}
