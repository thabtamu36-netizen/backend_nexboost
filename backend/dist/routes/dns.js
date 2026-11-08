import { Router } from 'express';
import axios from 'axios';
import { env } from '../config/env.js';
export const dohRouter = Router();
dohRouter.get('/health', async (_req, res) => {
    try {
        const response = await axios.get(env.DOH_UPSTREAM_URL, {
            headers: {
                accept: 'application/dns-json'
            },
            timeout: 8000
        });
        res.json({
            ok: true,
            upstream: env.DOH_UPSTREAM_URL,
            statusCode: response.status,
            latencyMs: response.headers['x-response-time'] ?? null
        });
    }
    catch (error) {
        res.status(503).json({
            ok: false,
            upstream: env.DOH_UPSTREAM_URL,
            error: error instanceof Error ? error.message : 'DNS upstream unavailable'
        });
    }
});
dohRouter.get('/resolver', (_req, res) => {
    res.json({
        service: 'DNS-over-HTTPS',
        hostname: env.DOH_HOSTNAME ?? 'dns.nexbooster.local',
        upstream: env.DOH_UPSTREAM_URL,
        note: 'This endpoint is a standards-based DoH-ready service. DNS is not a guaranteed ping reducer and does not route all game traffic.'
    });
});
