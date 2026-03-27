// ══════════════════════════════════
// STRIDE — CORS Proxy Server
// Sits between your browser and n8n
// to handle CORS headers.
//
// Run with: node proxy.js
// Runs on:  http://localhost:3000
// ══════════════════════════════════

const http = require('http');
const https = require('https');
const url = require('url');

const PORT = 3000;

// ── Your n8n webhook URL ──
// Change this to your Railway webhook URL
const N8N_WEBHOOK_URL = 'https://webhook-production-66bb.up.railway.app/webhook/stride-plan';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json'
};

const server = http.createServer((req, res) => {

  // ── Handle preflight OPTIONS ──
  if (req.method === 'OPTIONS') {
    res.writeHead(200, CORS_HEADERS);
    res.end();
    return;
  }

  // ── Only allow POST ──
  if (req.method !== 'POST') {
    res.writeHead(405, CORS_HEADERS);
    res.end(JSON.stringify({ error: 'Method not allowed' }));
    return;
  }

  // ── Collect request body ──
  let body = '';
  req.on('data', chunk => { body += chunk.toString(); });

  req.on('end', () => {
    console.log(`\n→ Forwarding request to n8n...`);

    const target = new url.URL(N8N_WEBHOOK_URL);

    const options = {
      hostname: target.hostname,
      port: target.port || 443,
      path: target.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body)
      }
    };

    // ── Forward to n8n ──
    const proxyReq = https.request(options, (proxyRes) => {
      let responseBody = '';
      proxyRes.on('data', chunk => { responseBody += chunk.toString(); });

      proxyRes.on('end', () => {
        console.log(`← n8n responded: ${proxyRes.statusCode}`);
        res.writeHead(proxyRes.statusCode, CORS_HEADERS);
        res.end(responseBody);
      });
    });

    proxyReq.on('error', (err) => {
      console.error('Proxy error:', err.message);
      res.writeHead(502, CORS_HEADERS);
      res.end(JSON.stringify({ error: 'Failed to reach n8n: ' + err.message }));
    });

    proxyReq.write(body);
    proxyReq.end();
  });
});

server.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════╗
║   STRIDE Proxy running on :${PORT}    ║
╚════════════════════════════════════╝
Forwarding requests to:
${N8N_WEBHOOK_URL}

In STRIDE, set your webhook URL to:
http://localhost:${PORT}

Press Ctrl+C to stop.
  `);
});
