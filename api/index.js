import { loadConfig } from '../server/src/config/index.js';
import { createRepository } from '../server/src/repositories/db.js';
import { createApp } from '../server/src/app.js';

let appInstance = null;
let initError = null;

async function getApp() {
  if (initError) throw initError;
  if (!appInstance) {
    try {
      const config = loadConfig(process.env);
      const repo = await createRepository(config);
      appInstance = createApp({ config, repo });
    } catch (err) {
      initError = err;
      throw err;
    }
  }
  return appInstance;
}

export default async function handler(req, res) {
  try {
    if (req.url && !req.url.startsWith('/api')) {
      req.url = `/api${req.url}`;
    }
    const app = await getApp();
    return app(req, res);
  } catch (err) {
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    res.end(
      JSON.stringify({
        error: {
          code: err.code || 'SERVER_INIT_ERROR',
          message: err.message || 'Server failed to initialize on Vercel'
        }
      })
    );
  }
}
