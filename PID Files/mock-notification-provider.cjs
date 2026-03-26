const http = require('http');
const fs = require('fs');
const path = require('path');

const port = Number(process.env.MOCK_PROVIDER_PORT || 5055);
const repoRoot = path.resolve(__dirname, '..');
const logPath = path.join(repoRoot, 'qa-artifacts', 'mock-provider-requests.jsonl');

fs.mkdirSync(path.dirname(logPath), { recursive: true });

const server = http.createServer((req, res) => {
    const chunks = [];
    req.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
    req.on('end', () => {
        const body = Buffer.concat(chunks).toString('utf8');
        const entry = {
            timestamp: new Date().toISOString(),
            method: req.method,
            rawUrl: req.url,
            headers: req.headers,
            body,
        };
        fs.appendFileSync(logPath, `${JSON.stringify(entry)}\n`);

        const shouldFail = String(req.url || '').startsWith('/fail');
        const payload = String(req.url || '') === '/health'
            ? { ok: true, status: 'healthy' }
            : shouldFail
                ? { ok: false, error: 'mock provider forced failure' }
                : { ok: true, messageId: `mock-${Date.now()}` };

        res.writeHead(shouldFail ? 500 : 200, { 'content-type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify(payload));
    });
});

server.listen(port, '127.0.0.1', () => {
    console.log(`[mock-provider] listening on http://127.0.0.1:${port}`);
});
