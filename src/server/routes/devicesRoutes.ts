import { Router } from 'express';
import type { Request, Response } from 'express';
import { serverState } from '../state.ts';

export const devicesRouter = Router();

// Get registered devices (GET /api/v2/devices)
devicesRouter.get('/devices', (_req: Request, res: Response) => {
  res.json({
    devices: Object.values(serverState.registeredDevices),
    count: Object.keys(serverState.registeredDevices).length,
  });
});

// Get live print jobs status (GET /api/v2/print-jobs)
devicesRouter.get('/print-jobs', (_req: Request, res: Response) => {
  res.json({
    jobs: serverState.printQueue,
  });
});
