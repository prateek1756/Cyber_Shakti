/**
 * Database Migration Runner
 * 
 * Handles automatic database schema initialization and migrations
 * for Railway deployment
 */

import { readFile } from 'fs/promises';
import { join } from 'path';
import { getPool } from './connection';

/**
 * Check if database tables exist
 * 
 * @returns true if tables exist, false if database is empty
 */
async function tablesExist(): Promise<boolean> {
  try {
    const pool = getPool();
    const [tables] = await pool.query('SHOW TABLES');
    return Array.isArray(tables) && tables.length > 0;
  } catch (error) {
    console.error('[Migration] Error checking tables:', error);
    return false;
  }
}

/**
 * Execute SQL schema file
 * 
 * @param schemaPath - Path to schema.sql file
 */
async function executeSchema(schemaPath: string): Promise<void> {
  const pool = getPool();
  const schema = await readFile(schemaPath, 'utf-8');
  
  // Split by semicolons and execute each statement
  // Filter out empty statements and comments
  const statements = schema
    .split(';')
    .map(stmt => stmt.trim())
    .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));
  
  for (const statement of statements) {
    try {
      await pool.query(statement);
    } catch (error) {
      // Log error but continue with other statements
      console.error('[Migration] Error executing statement:', error);
      console.error('[Migration] Statement:', statement.substring(0, 100) + '...');
    }
  }
}

/**
 * Run database migrations
 * 
 * This function:
 * 1. Checks if tables exist in the database
 * 2. If no tables exist, executes the initial schema from database/schema.sql
 * 3. Logs migration status
 * 4. Handles errors gracefully without blocking server startup
 * 
 * @returns Promise that resolves when migration check is complete
 */
export async function runMigrations(): Promise<void> {
  console.log('[Migration] Checking database schema...');
  
  try {
    const exists = await tablesExist();
    
    if (!exists) {
      console.log('[Migration] No tables found, running initial schema migration...');
      
      // Try to find schema.sql in multiple possible locations
      const possiblePaths = [
        join(process.cwd(), 'database', 'schema.sql'),
        join(__dirname, '..', '..', 'database', 'schema.sql'),
        join(__dirname, '../../database/schema.sql'),
      ];
      
      let schemaPath: string | null = null;
      for (const path of possiblePaths) {
        try {
          await readFile(path, 'utf-8');
          schemaPath = path;
          break;
        } catch {
          continue;
        }
      }
      
      if (!schemaPath) {
        console.warn('[Migration] ⚠️  Could not find database/schema.sql');
        console.warn('[Migration] Database may not be initialized');
        console.warn('[Migration] Service will continue, but features may not work');
        return;
      }
      
      console.log(`[Migration] Found schema at: ${schemaPath}`);
      await executeSchema(schemaPath);
      console.log('[Migration] ✓ Schema migration complete');
    } else {
      console.log('[Migration] ✓ Database schema already exists, skipping migration');
    }
  } catch (error) {
    console.error('[Migration] ❌ Migration failed:', error);
    console.error('[Migration] Service will continue, but database may not be initialized');
    console.error('[Migration] Please check database connection and schema file');
  }
}

/**
 * Create schema_migrations tracking table
 * 
 * This table tracks which migrations have been applied
 * to support incremental schema updates in the future
 */
export async function createMigrationsTable(): Promise<void> {
  try {
    const pool = getPool();
    await pool.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        id INT AUTO_INCREMENT PRIMARY KEY,
        version VARCHAR(255) UNIQUE NOT NULL,
        applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_version (version)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    console.log('[Migration] ✓ schema_migrations table ready');
  } catch (error) {
    console.error('[Migration] Error creating schema_migrations table:', error);
  }
}
