import { createApp } from './app.js';
import { env } from './config/env.js';
import { hydrateStateFromSupabase } from './lib/management.js';

const app = createApp();

await hydrateStateFromSupabase();

app.listen(env.PORT, () => {
  console.log(`NEXBOOST backend listening on http://localhost:${env.PORT}`);
});
