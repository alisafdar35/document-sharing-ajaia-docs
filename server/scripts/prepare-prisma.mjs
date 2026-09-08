#!/usr/bin/env node
/**
 * Keeps the Prisma datasource provider in sync with DATABASE_URL and makes sure
 * a .env file exists for local development.
 *
 *   file:./dev.db                -> sqlite
 *   postgres://... / postgresql  -> postgresql
 *
 * Usage:
 *   node scripts/prepare-prisma.mjs                  # derive from DATABASE_URL
 *   node scripts/prepare-prisma.mjs --provider sqlite
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const serverDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const envPath = path.join(serverDir, '.env');
const envExamplePath = path.join(serverDir, '.env.example');
const schemaPath = path.join(serverDir, 'prisma', 'schema.prisma');

// 1. Make local development frictionless: create .env from .env.example.
//    Skipped when DATABASE_URL already comes from the environment (Render,
//    Railway, Vercel, CI), where writing a SQLite default would be misleading.
if (!process.env.DATABASE_URL && !fs.existsSync(envPath) && fs.existsSync(envExamplePath)) {
  fs.copyFileSync(envExamplePath, envPath);
  console.log('[prepare-prisma] created server/.env from .env.example');
}

// 2. Resolve DATABASE_URL (real environment wins over the .env file).
function readEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return {};
  const out = {};
  for (const rawLine of fs.readFileSync(filePath, 'utf8').split('\n')) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq === -1) continue;
    out[line.slice(0, eq).trim()] = line
      .slice(eq + 1)
      .trim()
      .replace(/^["']|["']$/g, '');
  }
  return out;
}

const flagIndex = process.argv.indexOf('--provider');
const forcedProvider = flagIndex !== -1 ? process.argv[flagIndex + 1] : null;
const databaseUrl = process.env.DATABASE_URL || readEnvFile(envPath).DATABASE_URL || '';

let provider = forcedProvider;
if (!provider) {
  if (/^postgres(ql)?:\/\//i.test(databaseUrl)) provider = 'postgresql';
  else if (databaseUrl.startsWith('file:') || databaseUrl === '') provider = 'sqlite';
  else {
    console.error(`[prepare-prisma] Unsupported DATABASE_URL: "${databaseUrl}".`);
    console.error('[prepare-prisma] Use a file: URL (SQLite) or a postgres:// URL (PostgreSQL).');
    process.exit(1);
  }
}

if (!['sqlite', 'postgresql'].includes(provider)) {
  console.error(`[prepare-prisma] Unknown provider "${provider}".`);
  process.exit(1);
}

// 3. Patch the schema only when the provider actually changed.
const schema = fs.readFileSync(schemaPath, 'utf8');
const current = schema.match(/provider\s*=\s*"(sqlite|postgresql)"/);
if (current && current[1] === provider) {
  console.log(`[prepare-prisma] provider already "${provider}"`);
} else {
  fs.writeFileSync(
    schemaPath,
    schema.replace(/(datasource db \{[^}]*?provider\s*=\s*)"[^"]*"/s, `$1"${provider}"`),
    'utf8'
  );
  console.log(`[prepare-prisma] datasource provider set to "${provider}"`);
}
