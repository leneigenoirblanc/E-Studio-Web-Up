import { Router } from 'express';
import type { Request, Response } from 'express';
import { registerSSEClient, unregisterSSEClient } from '../sse.ts';
import { serverState } from '../state.ts';

export const eventsRouter = Router();

// SSE Real-Time Event Stream (GET /api/v2/events)
eventsRouter.get('/events', (req: Request, res: Response) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  registerSSEClient(res);
  res.write(
    `event: CONNECTED\ndata: ${JSON.stringify({
      stationId: serverState.stationConfig.stationId,
      time: Date.now(),
    })}\n\n`
  );

  req.on('close', () => {
    unregisterSSEClient(res);
  });
});
