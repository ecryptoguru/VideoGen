import { PrismaClient } from '@prisma/client';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import { PrismaPg } from '@prisma/adapter-pg';

let prisma: PrismaClient;

if (process.env.DATABASE_URL?.startsWith('postgresql')) {
  // Use PostgreSQL adapter for production (Supabase)
  const adapter = new PrismaPg({
    connectionString: process.env.DATABASE_URL,
  });
  prisma = new PrismaClient({ adapter });
} else {
  // Use SQLite adapter for local development
  const adapter = new PrismaBetterSqlite3({
    url: process.env.DATABASE_URL || 'file:./data/video-gen.db',
  });
  prisma = new PrismaClient({ adapter });
}

export { prisma };
