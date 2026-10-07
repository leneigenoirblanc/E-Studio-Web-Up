import { Router } from 'express';
import type { Request, Response } from 'express';
import crypto from 'crypto';
import { serverStateManager, serverState, AVAILABLE_TEMPLATES } from '../state.ts';
import { broadcastLiveEvent } from '../sse.ts';
import type { DeviceRecord } from '../types.ts';

export const stationRouter = Router();

// 1. Station discovery / Info Ping (GET /api/v2/info)
stationRouter.get('/info', (_req: Request, res: Response) => {
  res.json({
    protocol: 'estudio-pair-v2',
    stationId: serverState.stationConfig.stationId,
    stationName: serverState.stationConfig.stationName,
    storeName: serverState.stationConfig.storeName,
    version: serverState.stationConfig.version,
    status: serverState.stationConfig.status,
    port: serverState.stationConfig.port,
    pendingJobsCount: serverState.printQueue.filter(
      (j) => j.status === 'QUEUED' || j.status === 'PRINTING'
    ).length,
    timestamp: Date.now(),
  });
});

// 2. Handshake & Pairing (POST /api/v2/handshake)
stationRouter.post('/handshake', (req: Request, res: Response) => {
  const { deviceId, deviceName, operatorName, token, pin } = req.body || {};

  // Strict Validation
  if (!deviceId || typeof deviceId !== 'string' || deviceId.trim().length === 0) {
    return res.status(400).json({
      success: false,
      code: 'INVALID_DEVICE_ID',
      error: 'deviceId is required and must be a non-empty string',
    });
  }

  // Token or PIN verification
  const isPinValid = pin && String(pin).trim() === serverState.stationConfig.pin;
  const isTokenValid = token && String(token).trim() === serverState.stationConfig.token;

  if (serverState.stationConfig.pin && !isPinValid && !isTokenValid) {
    console.warn(`[Security] Handshake rejected for device ${deviceId}: invalid credentials`);
    return res.status(401).json({
      success: false,
      code: 'AUTH_FAILED',
      error: 'Code PIN ou jeton de couplage invalide pour cette station',
    });
  }

  // Issue cryptographic session token
  const sessionToken = `sess_${crypto.randomBytes(16).toString('hex')}`;
  const deviceRecord: DeviceRecord = {
    deviceId: deviceId.trim(),
    deviceName: typeof deviceName === 'string' ? deviceName.trim().substring(0, 80) : 'Terminal Mobile',
    operatorName: typeof operatorName === 'string' ? operatorName.trim().substring(0, 80) : 'Opérateur',
    sessionToken,
    registeredAt: Date.now(),
    lastSeen: Date.now(),
    status: 'ACTIVE',
  };

  serverState.registeredDevices[deviceId] = deviceRecord;
  serverStateManager.schedulePersistence();

  broadcastLiveEvent('DEVICE_CONNECTED', {
    deviceId,
    deviceName: deviceRecord.deviceName,
    operatorName: deviceRecord.operatorName,
    time: new Date().toISOString(),
  });

  return res.json({
    status: 'PAIRED',
    stationId: serverState.stationConfig.stationId,
    stationName: serverState.stationConfig.stationName,
    storeName: serverState.stationConfig.storeName,
    sessionToken,
    catalogVersion: serverState.stationConfig.catalogVersion,
    availableTemplates: AVAILABLE_TEMPLATES,
    serverTimestamp: Date.now(),
  });
});

// 3. Update Station Configuration (POST /api/v2/station/config)
stationRouter.post('/station/config', (req: Request, res: Response) => {
  const updates = req.body;
  if (!updates || typeof updates !== 'object') {
    return res.status(400).json({ success: false, error: 'Invalid config updates' });
  }
  serverState.stationConfig = { ...serverState.stationConfig, ...updates };
  serverStateManager.schedulePersistence();
  broadcastLiveEvent('STATION_CONFIG_UPDATED', serverState.stationConfig);
  return res.json({ success: true, config: serverState.stationConfig });
});
