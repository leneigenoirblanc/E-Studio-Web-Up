import { Router } from 'express';
import type { Request, Response } from 'express';
import os from 'os';
import net from 'net';
import dgram from 'dgram';

export const printerDiscoveryRouter = Router();

export interface DiscoveredPrinterDTO {
  id: string;
  name: string;
  address: string;
  port: number;
  protocol: 'mDNS / Bonjour' | 'IPP' | 'RAW 9100' | 'LPR' | 'HTTP WebAdmin' | 'System Driver';
  manufacturer?: string;
  model?: string;
  suggestedModelId?: string;
  macAddress?: string;
  txtRecords?: Record<string, string>;
  discoveredAt: number;
  latencyMs?: number;
  status: 'ONLINE' | 'OFFLINE' | 'UNVERIFIED';
  details?: string;
}

// Helper to map detected strings to canonical preset IDs
export function matchPresetModel(manufacturerStr?: string, modelStr?: string, allText?: string): string {
  const text = `${manufacturerStr || ''} ${modelStr || ''} ${allText || ''}`.toLowerCase();
  
  if (text.includes('zebra') || text.includes('zd421') || text.includes('zd420') || text.includes('gk420') || text.includes('zt411') || text.includes('zpl')) {
    if (text.includes('zt411') || text.includes('industrial')) return 'model-zebra-zt411';
    return 'model-zebra-zd421';
  }
  if (text.includes('brother') || text.includes('ql-820') || text.includes('ql-800') || text.includes('ql-1110') || text.includes('ql')) {
    if (text.includes('ql-1110')) return 'model-brother-ql1110';
    return 'model-brother-ql820';
  }
  if (text.includes('tsc') || text.includes('ttp-244') || text.includes('tspl') || text.includes('te200')) {
    return 'model-tsc-ttp244';
  }
  if (text.includes('epson') || text.includes('colorworks') || text.includes('c3500') || text.includes('tm-c3500')) {
    return 'model-epson-c3500';
  }
  if (text.includes('tm-t88') || text.includes('pos') || text.includes('receipt') || text.includes('esc/pos') || text.includes('ticket')) {
    return 'model-epson-tmt88';
  }
  if (text.includes('dymo') || text.includes('labelwriter') || text.includes('450') || text.includes('550')) {
    return 'model-dymo-lw450';
  }
  if (text.includes('bizerba') || text.includes('mettler') || text.includes('scale') || text.includes('balance')) {
    return 'model-bizerba-sc2';
  }
  if (text.includes('laser') || text.includes('office') || text.includes('hp') || text.includes('canon') || text.includes('xerox') || text.includes('pdf')) {
    return 'model-system-office';
  }
  return 'model-generic-thermal';
}

// Fast TCP port checker helper
function checkPort(host: string, port: number, timeoutMs = 1200): Promise<{ open: boolean; latency: number; banner?: string }> {
  return new Promise((resolve) => {
    const start = Date.now();
    const socket = new net.Socket();
    let banner = '';

    socket.setTimeout(timeoutMs);

    socket.on('connect', () => {
      const latency = Date.now() - start;
      // Send a quick harmless newline to check if printer returns status banner
      try {
        socket.write('~HQES\n\n');
      } catch {
        // ignore
      }
      setTimeout(() => {
        socket.destroy();
        resolve({ open: true, latency, banner });
      }, 100);
    });

    socket.on('data', (data) => {
      banner += data.toString('utf8');
    });

    socket.on('timeout', () => {
      socket.destroy();
      resolve({ open: false, latency: timeoutMs });
    });

    socket.on('error', () => {
      socket.destroy();
      resolve({ open: false, latency: timeoutMs });
    });

    try {
      socket.connect(port, host);
    } catch {
      resolve({ open: false, latency: timeoutMs });
    }
  });
}

// GET /api/v2/printers/discover
// Run active mDNS / Bonjour query + local subnet printer probe
printerDiscoveryRouter.get('/printers/discover', async (req: Request, res: Response) => {
  const discovered: DiscoveredPrinterDTO[] = [];
  const interfaces = os.networkInterfaces();
  const subnetsToScan: string[] = [];

  // 1. Gather local IPv4 subnets
  for (const name of Object.keys(interfaces)) {
    const ifaceList = interfaces[name];
    if (!ifaceList) continue;
    for (const iface of ifaceList) {
      if (iface.family === 'IPv4' && !iface.internal) {
        const parts = iface.address.split('.');
        if (parts.length === 4) {
          const subnetPrefix = `${parts[0]}.${parts[1]}.${parts[2]}`;
          if (!subnetsToScan.includes(subnetPrefix)) {
            subnetsToScan.push(subnetPrefix);
          }
        }
      }
    }
  }

  // 2. Perform mDNS multicast query for Bonjour printer services (_ipp._tcp, _printer._tcp, _pdl-datastream._tcp)
  try {
    const mdnsSocket = dgram.createSocket({ type: 'udp4', reuseAddr: true });
    
    // DNS packet query for _printer._tcp.local and _ipp._tcp.local (Bonjour)
    const mDnsQueryBuffer = Buffer.from([
      0x00, 0x00, // Transaction ID
      0x00, 0x00, // Flags standard query
      0x00, 0x02, // Questions: 2
      0x00, 0x00, // Answer RRs
      0x00, 0x00, // Authority RRs
      0x00, 0x00, // Additional RRs
      // Q1: _printer._tcp.local
      0x08, 0x5f, 0x70, 0x72, 0x69, 0x6e, 0x74, 0x65, 0x72, 0x04, 0x5f, 0x74, 0x63, 0x70, 0x05, 0x6c, 0x6f, 0x63, 0x61, 0x6c, 0x00,
      0x00, 0x0c, // Type PTR
      0x00, 0x01, // Class IN
      // Q2: _ipp._tcp.local
      0x04, 0x5f, 0x69, 0x70, 0x70, 0x04, 0x5f, 0x74, 0x63, 0x70, 0x05, 0x6c, 0x6f, 0x63, 0x61, 0x6c, 0x00,
      0x00, 0x0c, // Type PTR
      0x00, 0x01, // Class IN
    ]);

    mdnsSocket.on('message', (msg, rinfo) => {
      try {
        const rawString = msg.toString('latin1');
        let printerName = `Imprimante Bonjour (${rinfo.address})`;
        let mfg = '';
        let mdl = '';

        // Extract TXT records or names in mDNS response
        if (rawString.includes('Zebra') || rawString.includes('ZD') || rawString.includes('ZT')) {
          mfg = 'Zebra';
          mdl = rawString.includes('ZD421') ? 'ZD421' : 'Zebra Network Printer';
          printerName = `Zebra ${mdl} (${rinfo.address})`;
        } else if (rawString.includes('Brother') || rawString.includes('QL')) {
          mfg = 'Brother';
          mdl = 'QL-Series';
          printerName = `Brother QL (${rinfo.address})`;
        } else if (rawString.includes('EPSON') || rawString.includes('TM-') || rawString.includes('C3500')) {
          mfg = 'EPSON';
          mdl = 'ColorWorks / TM';
          printerName = `EPSON (${rinfo.address})`;
        } else if (rawString.includes('TSC')) {
          mfg = 'TSC';
          mdl = 'Thermal Printer';
          printerName = `TSC (${rinfo.address})`;
        }

        const id = `mdns-${rinfo.address.replace(/\./g, '-')}`;
        if (!discovered.some((d) => d.id === id || d.address === rinfo.address)) {
          discovered.push({
            id,
            name: printerName,
            address: rinfo.address,
            port: 9100,
            protocol: 'mDNS / Bonjour',
            manufacturer: mfg || undefined,
            model: mdl || undefined,
            suggestedModelId: matchPresetModel(mfg, mdl, rawString),
            discoveredAt: Date.now(),
            status: 'ONLINE',
            details: `Découvert via mDNS/Bonjour Multicast sur ${rinfo.address}`,
          });
        }
      } catch {
        // ignore packet parsing errors
      }
    });

    mdnsSocket.bind(0, () => {
      try {
        mdnsSocket.addMembership('224.0.0.251');
      } catch {
        // ignore if not supported in container
      }
      mdnsSocket.send(mDnsQueryBuffer, 0, mDnsQueryBuffer.length, 5353, '224.0.0.251');
    });

    // Let mDNS listen for 800ms
    await new Promise((r) => setTimeout(r, 800));
    try {
      mdnsSocket.close();
    } catch {
      // ignore
    }
  } catch (err) {
    console.warn('[Discovery] mDNS scan exception:', err);
  }

  // 3. Scan targeted common gateway & local addresses on standard printer RAW (9100) & IPP (631)
  const targetsToCheck: string[] = ['127.0.0.1', 'localhost'];
  for (const prefix of subnetsToScan) {
    targetsToCheck.push(`${prefix}.1`);
    targetsToCheck.push(`${prefix}.100`);
    targetsToCheck.push(`${prefix}.200`);
    targetsToCheck.push(`${prefix}.50`);
    targetsToCheck.push(`${prefix}.25`);
  }

  // Probe ports concurrently
  await Promise.all(
    targetsToCheck.map(async (ip) => {
      // Check 9100 (RAW)
      const rawRes = await checkPort(ip, 9100, 350);
      if (rawRes.open) {
        const id = `raw-${ip.replace(/\./g, '-')}-9100`;
        if (!discovered.some((d) => d.address === ip && d.port === 9100)) {
          discovered.push({
            id,
            name: `Imprimante RAW Direct (${ip}:9100)`,
            address: ip,
            port: 9100,
            protocol: 'RAW 9100',
            suggestedModelId: matchPresetModel('', '', rawRes.banner),
            discoveredAt: Date.now(),
            latencyMs: rawRes.latency,
            status: 'ONLINE',
            details: `Port RAW 9100 ouvert · Latence : ${rawRes.latency}ms`,
          });
        }
      }

      // Check 631 (IPP)
      const ippRes = await checkPort(ip, 631, 350);
      if (ippRes.open) {
        const id = `ipp-${ip.replace(/\./g, '-')}-631`;
        if (!discovered.some((d) => d.address === ip && d.port === 631)) {
          discovered.push({
            id,
            name: `Serveur d'impression IPP (${ip}:631)`,
            address: ip,
            port: 631,
            protocol: 'IPP',
            suggestedModelId: matchPresetModel('CUPS', 'Office', ''),
            discoveredAt: Date.now(),
            latencyMs: ippRes.latency,
            status: 'ONLINE',
            details: `Protocole IPP/CUPS actif · Latence : ${ippRes.latency}ms`,
          });
        }
      }
    })
  );

  return res.json({
    success: true,
    scannedSubnets: subnetsToScan,
    count: discovered.length,
    printers: discovered,
    timestamp: Date.now(),
  });
});

// POST /api/v2/printers/probe
// Probe specific IP/hostname and port (restricted to legitimate printer ports to prevent SSRF)
const ALLOWED_PRINTER_PORTS = new Set([9100, 631, 515, 80, 443, 8080]);
const FORBIDDEN_HOSTS = new Set(['169.254.169.254', 'metadata.google.internal', 'instance-data']);

printerDiscoveryRouter.post('/printers/probe', async (req: Request, res: Response) => {
  const { address, port = 9100 } = req.body || {};
  if (!address || typeof address !== 'string') {
    return res.status(400).json({ error: 'Valid IP address or hostname is required' });
  }

  const cleanAddr = address.trim().toLowerCase();
  if (FORBIDDEN_HOSTS.has(cleanAddr) || cleanAddr.startsWith('169.254.')) {
    return res.status(403).json({ error: 'Probing cloud metadata or link-local endpoints is forbidden' });
  }

  const targetPort = Number(port) || 9100;
  if (!ALLOWED_PRINTER_PORTS.has(targetPort)) {
    return res.status(400).json({
      error: `Port ${targetPort} not permitted. Allowed printer ports: ${Array.from(ALLOWED_PRINTER_PORTS).join(', ')}`,
    });
  }

  const result = await checkPort(cleanAddr, targetPort, 2500);
  const suggestedModelId = matchPresetModel('', '', result.banner);

  return res.json({
    success: true,
    address: cleanAddr,
    port: targetPort,
    isReachable: result.open,
    latencyMs: result.latency,
    banner: result.banner,
    suggestedModelId,
    status: result.open ? 'ONLINE' : 'OFFLINE',
  });
});
