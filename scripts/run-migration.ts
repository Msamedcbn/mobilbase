import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

async function main() {
  const sqlPath = path.join(__dirname, '../supabase/migrations/14_tenant_data_isolation.sql');
  const rawSql = fs.readFileSync(sqlPath, 'utf8');
  console.log('Running migration from', sqlPath);

  // Split SQL file by statements, taking care of DO $$ blocks
  const statements: string[] = [];
  let currentStatement = '';
  let inDollarQuote = false;

  const lines = rawSql.split('\n');
  for (let line of lines) {
    // Strip comments
    const trimmed = line.trim();
    if (trimmed.startsWith('--') || !trimmed) {
      continue;
    }

    currentStatement += line + '\n';

    if (line.includes('$$')) {
      inDollarQuote = !inDollarQuote;
    }

    if (!inDollarQuote && trimmed.endsWith(';')) {
      statements.push(currentStatement.trim());
      currentStatement = '';
    }
  }
  if (currentStatement.trim()) {
    statements.push(currentStatement.trim());
  }

  console.log(`Parsed ${statements.length} SQL statements. Executing...`);

  for (let i = 0; i < statements.length; i++) {
    const stmt = statements[i];
    console.log(`Executing statement [${i + 1}/${statements.length}]:\n${stmt.substring(0, 100)}...`);
    try {
      await prisma.$executeRawUnsafe(stmt);
    } catch (err) {
      console.error(`Error executing statement:\n${stmt}\n`, err);
      throw err;
    }
  }

  console.log('Migration completed successfully!');
}

main()
  .catch((e) => {
    console.error('Migration failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
