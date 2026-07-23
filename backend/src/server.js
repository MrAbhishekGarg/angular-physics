import app from './app.js';
import { env } from './config/env.js';
import { connectDB } from './config/db.js';

async function start() {
  await connectDB();
  app.listen(env.port, () => {
    console.log(`[server] Angular Physics API running on port ${env.port} (${env.nodeEnv})`);
  });
}

start();
