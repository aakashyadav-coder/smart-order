#!/usr/bin/env node
/**
 * backup.js — PostgreSQL database backup script
 * Fix R12: Automated DB backup using pg_dump
 *
 * Usage:
 *   node scripts/backup.js                    # backup to ./backups/
 *   node scripts/backup.js --out /my/path     # custom directory
 *
 * Add to package.json scripts:
 *   "backup": "node scripts/backup.js"
 *
 * Schedule with cron (daily 2am):
 *   0 2 * * * cd /app && node scripts/backup.js >> /var/log/smart-order-backup.log 2>&1
 */

require("dotenv").config({ path: require("path").join(__dirname, "../.env") });
const { execSync } = require("child_process");
const path = require("path");
const fs   = require("fs");

const args    = process.argv.slice(2);
const outIdx  = args.indexOf("--out");
const outDir  = outIdx !== -1 ? args[outIdx + 1] : path.join(__dirname, "../backups");

// Parse DATABASE_URL → pg_dump compatible parts
const dbUrl   = process.env.DATABASE_URL;
if (!dbUrl) { console.error("❌  DATABASE_URL not set"); process.exit(1); }

// Ensure backup directory exists
fs.mkdirSync(outDir, { recursive: true });

const ts       = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
const filename = `smart_order_backup_${ts}.sql.gz`;
const filepath = path.join(outDir, filename);

console.log(`🗄️  Starting backup → ${filepath}`);

try {
  // pg_dump | gzip — works on Linux/Mac/WSL; on Windows use WSL or pg_dump.exe
  execSync(`pg_dump "${dbUrl}" | gzip > "${filepath}"`, {
    stdio: ["pipe", "pipe", "inherit"],
    shell: true,
  });

  const stats = fs.statSync(filepath);
  const sizeMb = (stats.size / 1024 / 1024).toFixed(2);
  console.log(`✅  Backup complete: ${filename} (${sizeMb} MB)`);

  // Prune: keep only last 7 backups
  const files = fs.readdirSync(outDir)
    .filter(f => f.startsWith("smart_order_backup_") && f.endsWith(".sql.gz"))
    .sort()
    .reverse();

  const toDelete = files.slice(7);
  toDelete.forEach(f => {
    fs.unlinkSync(path.join(outDir, f));
    console.log(`🗑️  Pruned old backup: ${f}`);
  });

} catch (err) {
  console.error("❌  Backup failed:", err.message);
  process.exit(1);
}
