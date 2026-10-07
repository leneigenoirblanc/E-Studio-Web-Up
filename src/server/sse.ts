import type { Response } from 'express';

const liveClients: Response[] = [];

export function registerSSEClient(res: Response) {
  liveClients.push(res);
}

export function unregisterSSEClient(res: Response) {
  const idx = liveClients.indexOf(res);
  if (idx !== -1) {
    liveClients.splice(idx, 1);
  }
}

export function broadcastLiveEvent(eventType: string, data: any) {
  const payload = `event: ${eventType}\ndata: ${JSON.stringify(data)}\n\n`;
  liveClients.forEach((res) => {
    try {
      res.write(payload);
    } catch {}
  });
}
