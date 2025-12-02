import Database from 'better-sqlite3';
import path from 'path';

export interface DatabaseConfig {
  type: 'sqlite' | 'postgres' | 'mysql';
  connection: {
    filename?: string;
    host?: string;
    port?: number;
    database?: string;
    username?: string;
    password?: string;
  };
  options?: {
    readonly?: boolean;
    fileMustExist?: boolean;
    timeout?: number;
    verbose?: boolean;
  };
}

const getDatabaseConfig = (): DatabaseConfig => {
  const env = process.env.NODE_ENV || 'development';
  
  // Default configuration
  const defaultConfig: DatabaseConfig = {
    type: 'sqlite',
    connection: {
      filename: path.join(process.cwd(), 'data', 'classroom.db'),
    },
    options: {
      readonly: false,
      fileMustExist: false,
      timeout: 5000,
      verbose: env === 'development',
    },
  };

  // Override with environment variables if available
  if (process.env.DB_TYPE) {
    defaultConfig.type = process.env.DB_TYPE as DatabaseConfig['type'];
  }

  if (process.env.DB_SQLITE_PATH) {
    defaultConfig.connection.filename = process.env.DB_SQLITE_PATH;
  }

  // PostgreSQL configuration (if needed in future)
  if (process.env.DB_HOST && process.env.DB_NAME) {
    defaultConfig.type = 'postgres';
    defaultConfig.connection = {
      host: process.env.DB_HOST,
      port: parseInt(process.env.DB_PORT || '5432'),
      database: process.env.DB_NAME,
      username: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
    };
  }

  return defaultConfig;
};

export const databaseConfig = getDatabaseConfig();

export function createDatabaseConnection(): Database.Database {
  const config = getDatabaseConfig();
  
  if (config.type === 'sqlite') {
    // Ensure data directory exists
    const dbPath = config.connection.filename!;
    const dbDir = path.dirname(dbPath);
    const fs = require('fs');
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }

    const db = new Database(dbPath, {
      readonly: config.options?.readonly || false,
      fileMustExist: config.options?.fileMustExist || false,
      timeout: config.options?.timeout || 5000,
      verbose: config.options?.verbose ? console.log : undefined,
    });

    // Enable foreign keys
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
    
    return db;
  }

  throw new Error(`Database type ${config.type} not yet implemented`);
}

export default databaseConfig;