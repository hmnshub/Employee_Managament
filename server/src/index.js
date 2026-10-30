import { loadConfig } from './config/index.js';
import { createRepository } from './repositories/db.js';
import { createApp } from './app.js';
import { logger } from './utils/logger.js';

async function startServer() {
  try {
    const config = loadConfig(process.env);
    const repo = await createRepository(config);
    const app = createApp({ config, repo });

    const server = app.listen(config.port, () => {
      logger.info(`Employee Self-Service Portal API listening on http://localhost:${config.port}`, {
        nodeEnv: config.nodeEnv,
        clientOrigin: config.clientOrigin,
        docsUrl: !config.isProd ? `http://localhost:${config.port}/api/docs` : undefined
      });
    });

    const shutdown = (signal) => {
      logger.info(`Received ${signal}, shutting down gracefully...`);
      server.close(() => {
        process.exit(0);
      });
    };

    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));
  } catch (err) {
    if (err.code === 'CONFIG_VALIDATION_ERROR') {
      process.stderr.write(`${err.message}\n`);
      process.exit(1);
    }
    logger.error('Fatal error during server startup', { errorMessage: err.message });
    process.exit(1);
  }
}

startServer();
