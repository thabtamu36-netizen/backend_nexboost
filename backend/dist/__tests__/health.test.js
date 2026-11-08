import { afterEach, describe, expect, it } from 'vitest';
import { createApp } from '../app.js';
const servers = [];
afterEach(() => {
    for (const server of servers) {
        server.close();
    }
    servers.length = 0;
});
describe('backend health service', () => {
    it('returns a healthy response from the API root', async () => {
        const app = createApp();
        const server = app.listen(0);
        servers.push(server);
        const port = server.address().port;
        const response = await fetch(`http://127.0.0.1:${port}/api/health`);
        const payload = await response.json();
        expect(response.status).toBe(200);
        expect(payload.service).toBe('nexbooster-backend');
        expect(payload.environment).toBeDefined();
    });
});
