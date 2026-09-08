import 'dotenv/config';
import { createApp } from './app';
import { prisma } from './prisma';

const port = Number(process.env.PORT ?? 4000);
const app = createApp();

const server = app.listen(port, () => {
  console.log(`[ajaia-docs] API listening on http://localhost:${port}`);
  console.log(`[ajaia-docs] Allowed client origin(s): ${process.env.CLIENT_URL ?? 'http://localhost:5173'}`);
});

const shutdown = async (signal: string) => {
  console.log(`\n[ajaia-docs] ${signal} received, shutting down.`);
  server.close();
  await prisma.$disconnect();
  process.exit(0);
};

process.on('SIGINT', () => void shutdown('SIGINT'));
process.on('SIGTERM', () => void shutdown('SIGTERM'));
