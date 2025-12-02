export interface ServerConfig {
  port: number;
  host: string;
  environment: 'development' | 'production' | 'test';
  cors: {
    enabled: boolean;
    origin: string | string[];
    credentials: boolean;
  };
  uploads: {
    directory: string;
    maxFileSize: number;
    allowedTypes: string[];
  };
  jwt: {
    secret: string;
    expiresIn: string;
  };
  logging: {
    level: 'debug' | 'info' | 'warn' | 'error';
    enabled: boolean;
  };
}

const getServerConfig = (): ServerConfig => {
  const env = process.env.NODE_ENV || 'development';
  
  const config: ServerConfig = {
    port: parseInt(process.env.PORT || '5000'),
    host: process.env.HOST || (process.platform === 'win32' ? 'localhost' : '0.0.0.0'),
    environment: env as ServerConfig['environment'],
    
    cors: {
      enabled: true,
      origin: process.env.CORS_ORIGIN?.split(',') || [
        'http://localhost:3000',
        'http://localhost:5173',
        'http://127.0.0.1:3000',
        'http://127.0.0.1:5173',
      ],
      credentials: true,
    },

    uploads: {
      directory: process.env.UPLOADS_DIR || path.join(process.cwd(), 'uploads'),
      maxFileSize: parseInt(process.env.MAX_FILE_SIZE || '10485760'), // 10MB
      allowedTypes: process.env.ALLOWED_FILE_TYPES?.split(',') || [
        'image/jpeg',
        'image/jpg', 
        'image/png',
        'image/gif',
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'text/plain',
        'application/zip',
      ],
    },

    jwt: {
      secret: process.env.JWT_SECRET || 'classroom-management-secret-key',
      expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    },

    logging: {
      level: (process.env.LOG_LEVEL as ServerConfig['logging']['level']) || (env === 'development' ? 'debug' : 'info'),
      enabled: process.env.LOG_ENABLED !== 'false',
    },
  };

  return config;
};

import path from 'path';

export const serverConfig = getServerConfig();

export default serverConfig;