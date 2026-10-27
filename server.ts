import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

  app.use(express.json());

  // In-memory latest telemetry storage and SSE clients
  let latestTelemetry: any = null;
  const sseClients: Array<{ id: number; res: express.Response }> = [];
  let clientIdCounter = 0;

  // Endpoint for ESP32 / Arduino / Wi-Fi modules to POST real-time data
  app.post('/api/telemetry', (req, res) => {
    const data = req.body;
    if (!data) {
      return res.status(400).json({ error: 'Empty payload' });
    }

    const timestamp = data.timestamp ? new Date(data.timestamp).getTime() : Date.now();
    latestTelemetry = {
      ...data,
      serverReceivedAt: Date.now(),
      timestamp: isNaN(timestamp) ? Date.now() : timestamp,
    };

    // Broadcast to connected SSE browser clients
    const eventData = `data: ${JSON.stringify(latestTelemetry)}\n\n`;
    for (const client of sseClients) {
      try {
        client.res.write(eventData);
      } catch (err) {
        // Ignored, client will be cleaned up on close
      }
    }

    return res.status(200).json({ success: true, received: latestTelemetry });
  });

  // Endpoint to fetch latest telemetry
  app.get('/api/telemetry/latest', (req, res) => {
    return res.json({ latest: latestTelemetry });
  });

  // Server-Sent Events (SSE) stream for browsers
  app.get('/api/telemetry/stream', (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders?.();

    const clientId = ++clientIdCounter;
    sseClients.push({ id: clientId, res });

    // Send initial handshake
    res.write(`data: ${JSON.stringify({ type: 'connected', serverTime: Date.now() })}\n\n`);

    if (latestTelemetry) {
      res.write(`data: ${JSON.stringify(latestTelemetry)}\n\n`);
    }

    req.on('close', () => {
      const idx = sseClients.findIndex(c => c.id === clientId);
      if (idx !== -1) {
        sseClients.splice(idx, 1);
      }
    });
  });

  // Health check
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'ok',
      sseClientCount: sseClients.length,
      hasReceivedTelemetry: !!latestTelemetry,
    });
  });

  // Vite development server middleware
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // Production static serving
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`RailUrja Server running at http://0.0.0.0:${PORT}`);
  });
}

startServer().catch(err => {
  console.error('Failed to start RailUrja server:', err);
});
