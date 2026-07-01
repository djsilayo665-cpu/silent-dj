// loader.js - Silent DJ Bot Loader
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import cp from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🎵 Silent DJ Bot Loader v2.0');
console.log('─────────────────────────────');

// ===== 1. PATCH NPM =====
const _origSpawn = cp.spawn.bind(cp);
cp.spawn = function (cmd, args, opts) {
  if (
    (cmd === 'npm' || cmd === 'npm.cmd') &&
    Array.isArray(args) &&
    args.includes('install') &&
    !args.includes('--ignore-scripts')
  ) {
    args = [...args, '--ignore-scripts'];
    console.log('🔧 npm install --ignore-scripts applied');
  }
  return _origSpawn(cmd, args, opts);
};

// ===== 2. FIX BAILEYS =====
function fixBaileys() {
  try {
    const pkgPath = path.join(process.cwd(), 'node_modules', '@whiskeysockets', 'baileys', 'package.json');
    if (!fs.existsSync(pkgPath)) return;
    
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
    let changed = false;
    
    // Fix exports
    if (pkg.exports && typeof pkg.exports === 'object') {
      for (const [key, val] of Object.entries(pkg.exports)) {
        if (val && typeof val === 'object' && val.import && !val.default) {
          pkg.exports[key] = { ...val, default: val.import };
          changed = true;
        }
      }
    }
    
    if (changed) {
      fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2));
      console.log('🔧 Fixed Baileys package.json');
    }
  } catch (_) {}
}

// ===== 3. BACKUP SESSIONS =====
function backupSessions() {
  const sessionDir = path.join(process.cwd(), 'sessions');
  const backupDir = path.join(process.cwd(), '.session_backup');
  
  if (!fs.existsSync(sessionDir)) return;
  
  try {
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }
    // Copy sessions to backup
    cp.execSync(`cp -r ${sessionDir}/* ${backupDir}/ 2>/dev/null || true`);
    console.log('💾 Sessions backed up');
  } catch (_) {}
}

// ===== 4. RESTORE SESSIONS =====
function restoreSessions() {
  const sessionDir = path.join(process.cwd(), 'sessions');
  const backupDir = path.join(process.cwd(), '.session_backup');
  
  if (!fs.existsSync(backupDir)) return;
  if (!fs.existsSync(sessionDir)) {
    fs.mkdirSync(sessionDir, { recursive: true });
  }
  
  try {
    cp.execSync(`cp -r ${backupDir}/* ${sessionDir}/ 2>/dev/null || true`);
    console.log('♻️ Sessions restored');
  } catch (_) {}
}

// ===== 5. RUN SILENT DJ =====
async function startBot() {
  console.log('🚀 Starting Silent DJ Bot...');
  
  // Restore sessions
  restoreSessions();
  
  // Fix Baileys
  fixBaileys();
  
  // Backup sessions every 30 seconds
  setInterval(backupSessions, 30000).unref();
  
  // Import the actual bot
  const botPath = path.join(__dirname, 'silent-dj.js');
  if (fs.existsSync(botPath)) {
    await import(botPath);
  } else {
    console.log('❌ silent-dj.js not found!');
  }
}

startBot().catch(err => {
  console.error('❌ Bot error:', err);
});
