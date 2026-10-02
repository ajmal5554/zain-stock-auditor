import "dotenv/config";
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL!);

async function setupTables() {
  console.log('Creating Brand and StoreSetting tables in Neon PostgreSQL...');

  await sql`
    CREATE TABLE IF NOT EXISTS "Brand" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "name" TEXT NOT NULL UNIQUE,
      "categories" TEXT[] NOT NULL DEFAULT '{}',
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS "StoreSetting" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "key" TEXT NOT NULL UNIQUE,
      "value" JSONB NOT NULL,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `;

  console.log('Tables created successfully!');
  const tables = await sql`
    SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name;
  `;
  console.log('All tables in public schema:', tables.map(t => t.table_name));
}

setupTables().catch(console.error);
