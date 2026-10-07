import { Router } from 'express';
import type { Request, Response } from 'express';

export const tursoRouter = Router();

// Turso / LibSQL Pipeline CORS Proxy (POST /api/v2/turso/pipeline)
tursoRouter.post('/turso/pipeline', async (req: Request, res: Response) => {
  const { databaseUrl, authToken, requests } = req.body || {};
  if (!databaseUrl) {
    return res.status(400).json({ error: 'databaseUrl is required' });
  }

  let cleanUrl = String(databaseUrl).trim();
  if (cleanUrl.startsWith('libsql://')) cleanUrl = cleanUrl.replace('libsql://', 'https://');
  if (!cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://')) cleanUrl = `https://${cleanUrl}`;
  cleanUrl = cleanUrl.replace(/\/+$/, '');

  try {
    const upstreamRes = await fetch(`${cleanUrl}/v2/pipeline`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: authToken ? `Bearer ${authToken}` : '',
      },
      body: JSON.stringify({ requests }),
    });

    const data = await upstreamRes.json();
    return res.status(upstreamRes.status).json(data);
  } catch (err: any) {
    return res.status(502).json({ error: `Turso proxy error: ${err.message}` });
  }
});
