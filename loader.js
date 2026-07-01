// loader.js - Silent DJ Bot Loader
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import cp from 'child_process';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('');
console.log('🎵  S I L E N T   D J   B O T');
console.log('═════════════════════════════════');
console.log('📦 Loader v2.0');
console.log('');

// ===== 1. PATCH NPM =====
// Forces --ignore-scripts on every npm install
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
    if (!fs.existsSync(pkgPath)) {
      console.log('⚠️ Baileys not found, skipping fix');
      return;
    }
    
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
    let changed = false;
    
    // Fix exports for Node v25
    if (pkg.exports && typeof pkg.exports === 'object') {
      for (const [key, val] of Object.entries(pkg.exports)) {
        if (val && typeof val === 'object' && val.import && !val.default) {
          pkg.exports[key] = { ...val, default: val.import };
          changed = true;
        }
      }
    }
    
    // Ensure main field points to a real file
    if (!pkg.main || !fs.existsSync(path.join(process.cwd(), 'node_modules', '@whiskeysockets', 'baileys', pkg.main.replace(/^\.\//, '')))) {
      const candidates = ['lib/index.js', 'src/index.js', 'index.js'];
      for (const c of candidates) {
        if (fs.existsSync(path.join(process.cwd(), 'node_modules', '@whiskeysockets', 'baileys', c))) {
          pkg.main = './' + c;
          changed = true;
          break;
        }
      }
    }
    
    if (changed) {
      fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2));
      console.log('✅ Fixed Baileys package.json');
    } else {
      console.log('✅ Baileys already fixed');
    }
  } catch (error) {
    console.log('⚠️ Could not fix Baileys:', error.message);
  }
}

// ===== 3. SESSION BACKUP & RESTORE =====
const SESSION_DIR = path.join(process.cwd(), 'sessions');
const BACKUP_DIR = path.join(process.cwd(), '.session_backup');

function backupSessions() {
  if (!fs.existsSync(SESSION_DIR)) return;
  
  try {
    if (!fs.existsSync(BACKUP_DIR)) {
      fs.mkdirSync(BACKUP_DIR, { recursive: true });
    }
    // Copy sessions to backup
    execSync(`cp -r ${SESSION_DIR}/* ${BACKUP_DIR}/ 2>/dev/null || true`);
    console.log('💾 Sessions backed up');
  } catch (_) {}
}

function restoreSessions() {
  if (!fs.existsSync(BACKUP_DIR)) return;
  
  try {
    if (!fs.existsSync(SESSION_DIR)) {
      fs.mkdirSync(SESSION_DIR, { recursive: true });
    }
    execSync(`cp -r ${BACKUP_DIR}/* ${SESSION_DIR}/ 2>/dev/null || true`);
    console.log('♻️ Sessions restored from backup');
  } catch (_) {}
}

// ===== 4. LOAD ENVIRONMENT =====
function loadEnv() {
  try {
    const envPath = path.join(process.cwd(), '.env');
    if (fs.existsSync(envPath)) {
      const envContent = fs.readFileSync(envPath, 'utf8');
      envContent.split('\n').forEach(line => {
        const match = line.match(/^([^=]+)=(.*)$/);
        if (match) {
          const key = match[1].trim();
          const value = match[2].trim();
          if (!process.env[key]) {
            process.env[key] = value;
          }
        }
      });
      console.log('📄 Environment loaded');
    }
  } catch (_) {}
}

// ===== 5. CHECK REQUIRED VARIABLES =====
function checkEnv() {
  const required = ['TELEGRAM_BOT_TOKEN'];
  const missing = required.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    console.log(`⚠️ Missing environment variables: ${missing.join(', ')}`);
    console.log('📝 Add them in Railway dashboard or .env file');
    return false;
  }
  
  console.log('✅ All required environment variables set');
  return true;
}

// ===== 6. START BOT =====
async function startBot() {
  console.log('');
  console.log('🚀 Starting Silent DJ Bot...');
  console.log('═════════════════════════════════');
  
  // Restore sessions
  restoreSessions();
  
  // Fix Baileys
  fixBaileys();
  
  // Load .env
  loadEnv();
  
  // Check environment
  const envOk = checkEnv();
  if (!envOk) {
    console.log('⚠️ Bot will continue but some features may not work');
  }
  
  // Backup sessions every 30 seconds
  setInterval(backupSessions, 30000).unref();
  
  // Import and run the bot
  try {
    const botPath = path.join(process.cwd(), 'index.js');
    if (!fs.existsSync(botPath)) {
      console.log('❌ index.js not found!');
      process.exit(1);
    }
    
    await import(botPath);
  } catch (error) {
    console.error('❌ Bot failed to start:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// ===== 7. GRACEFUL SHUTDOWN =====
process.on('SIGTERM', () => {
  console.log('🛑 Shutting down gracefully...');
  backupSessions();
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('🛑 Shutting down gracefully...');
  backupSessions();
  process.exit(0);
});

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  console.error('💥 Uncaught Exception:', error);
  backupSessions();
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('💥 Unhandled Rejection:', reason);
});

// ===== START =====
startBot();
