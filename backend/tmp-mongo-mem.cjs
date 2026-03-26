const { MongoMemoryServer } = require('mongodb-memory-server');

(async () => {
  const server = await MongoMemoryServer.create({
    instance: {
      ip: '127.0.0.1',
      port: 27017,
      dbName: 'campusway'
    }
  });
  console.log('[mongomem] started', server.getUri());
  setInterval(() => {}, 1 << 30);
  const shutdown = async () => {
    try { await server.stop(); } catch {}
    process.exit(0);
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
})();