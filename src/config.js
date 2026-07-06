import { config } from 'dotenv';
import { resolve } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, '..', '.env') });

export default {
  targetDb: process.env.TARGET_DB || '',
  configDbPath: process.env.CONFIG_DB_PATH || './mystery.db',
  sessionSecret: process.env.SESSION_SECRET || 'dev-secret-change-me',
  port: parseInt(process.env.PORT || '3000', 10),
  https: process.env.HTTPS === 'true',
  nodeEnv: process.env.NODE_ENV || 'development',
  basePath: process.env.BASE_PATH || '',
};
