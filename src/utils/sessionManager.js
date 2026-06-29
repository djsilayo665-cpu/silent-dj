// src/utils/sessionManager.js
const fs = require('fs-extra');
const path = require('path');

class SessionManager {
  constructor() {
    this.basePath = path.join(process.cwd(), 'sessions');
    this.ensureSessionsDirectory();
    this.sessions = new Map(); // Cache for active sessions
  }

  // Ensure the sessions directory exists
  ensureSessionsDirectory() {
    if (!fs.existsSync(this.basePath)) {
      fs.mkdirSync(this.basePath, { recursive: true });
      console.log('📁 Sessions directory created at:', this.basePath);
    } else {
      console.log('📁 Sessions directory found at:', this.basePath);
    }
  }

  // Get the session folder path for a specific user
  getUserSessionPath(userId) {
    return path.join(this.basePath, `user_${userId}`);
  }

  // Check if a user has an existing session
  userHasSession(userId) {
    const sessionPath = this.getUserSessionPath(userId);
    return fs.existsSync(sessionPath);
  }

  // Get session folder for a user
  async getUserSession(userId) {
    const sessionPath = this.getUserSessionPath(userId);
    
    // Create if it doesn't exist
    if (!fs.existsSync(sessionPath)) {
      await fs.mkdir(sessionPath, { recursive: true });
      console.log(`📁 Session folder created for user ${userId}`);
    }
    
    return sessionPath;
  }

  // Create a new session for a user
  async createSession(userId) {
    const sessionPath = this.getUserSessionPath(userId);
    
    // Remove existing session if any
    if (fs.existsSync(sessionPath)) {
      await fs.remove(sessionPath);
      console.log(`🗑️ Old session removed for user ${userId}`);
    }
    
    // Create new session folder
    await fs.mkdir(sessionPath, { recursive: true });
    
    // Create a metadata file
    const metadata = {
      userId: userId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      status: 'pending' // pending, connected, disconnected
    };
    
    await fs.writeJSON(path.join(sessionPath, 'metadata.json'), metadata);
    console.log(`✅ New session created for user ${userId}`);
    
    return sessionPath;
  }

  // Delete a user's session
  async deleteUserSession(userId) {
    const sessionPath = this.getUserSessionPath(userId);
    if (fs.existsSync(sessionPath)) {
      await fs.remove(sessionPath);
      console.log(`🗑️ Session deleted for user ${userId}`);
      return true;
    }
    console.log(`⚠️ No session found for user ${userId}`);
    return false;
  }

  // Update session metadata
  async updateSessionMetadata(userId, updates) {
    const sessionPath = this.getUserSessionPath(userId);
    const metadataPath = path.join(sessionPath, 'metadata.json');
    
    if (!fs.existsSync(metadataPath)) {
      return false;
    }
    
    try {
      const metadata = await fs.readJSON(metadataPath);
      const updated = {
        ...metadata,
        ...updates,
        updatedAt: new Date().toISOString()
      };
      await fs.writeJSON(metadataPath, updated);
      return true;
    } catch (error) {
      console.error('Error updating session metadata:', error);
      return false;
    }
  }

  // Get session metadata
  async getSessionMetadata(userId) {
    const sessionPath = this.getUserSessionPath(userId);
    const metadataPath = path.join(sessionPath, 'metadata.json');
    
    if (!fs.existsSync(metadataPath)) {
      return null;
    }
    
    try {
      return await fs.readJSON(metadataPath);
    } catch (error) {
      console.error('Error reading session metadata:', error);
      return null;
    }
  }

  // Get all active user sessions
  getActiveUsers() {
    if (!fs.existsSync(this.basePath)) {
      return [];
    }
    
    const folders = fs.readdirSync(this.basePath);
    const users = [];
    
    for (const folder of folders) {
      if (folder.startsWith('user_')) {
        const userId = folder.replace('user_', '');
        const sessionPath = path.join(this.basePath, folder);
        const metadataPath = path.join(sessionPath, 'metadata.json');
        
        let metadata = null;
        if (fs.existsSync(metadataPath)) {
          try {
            metadata = fs.readJSONSync(metadataPath);
          } catch (e) {
            // Invalid JSON
          }
        }
        
        users.push({
          userId,
          sessionPath,
          metadata,
          exists: true
        });
      }
    }
    
    return users;
  }

  // Get session statistics
  getSessionStats() {
    const users = this.getActiveUsers();
    const total = users.length;
    const pending = users.filter(u => u.metadata?.status === 'pending').length;
    const connected = users.filter(u => u.metadata?.status === 'connected').length;
    const disconnected = users.filter(u => u.metadata?.status === 'disconnected').length;
    
    return {
      totalUsers: total,
      connected: connected,
      pending: pending,
      disconnected: disconnected,
      users: users.map(u => u.userId),
      sessionsPath: this.basePath
    };
  }

  // Get session file contents (for debugging)
  async getSessionFiles(userId) {
    const sessionPath = this.getUserSessionPath(userId);
    if (!fs.existsSync(sessionPath)) {
      return null;
    }
    
    try {
      const files = await fs.readdir(sessionPath);
      const fileContents = {};
      
      for (const file of files) {
        if (file !== 'metadata.json') {
          const filePath = path.join(sessionPath, file);
          try {
            const content = await fs.readFile(filePath, 'utf-8');
            fileContents[file] = content.length > 100 ? 
              content.substring(0, 100) + '... (truncated)' : 
              content;
          } catch (e) {
            fileContents[file] = 'Error reading file';
          }
        }
      }
      
      return fileContents;
    } catch (error) {
      console.error('Error reading session files:', error);
      return null;
    }
  }

  // Clean up old sessions (optional)
  async cleanupOldSessions(maxAgeDays = 30) {
    const users = this.getActiveUsers();
    const now = Date.now();
    const maxAge = maxAgeDays * 24 * 60 * 60 * 1000;
    let cleaned = 0;
    
    for (const user of users) {
      if (user.metadata?.updatedAt) {
        const lastUpdate = new Date(user.metadata.updatedAt).getTime();
        if (now - lastUpdate > maxAge) {
          await this.deleteUserSession(user.userId);
          cleaned++;
        }
      }
    }
    
    console.log(`🧹 Cleaned up ${cleaned} old sessions`);
    return cleaned;
  }

  // Export session data (for backup)
  async exportSession(userId) {
    const sessionPath = this.getUserSessionPath(userId);
    if (!fs.existsSync(sessionPath)) {
      return null;
    }
    
    try {
      const files = await fs.readdir(sessionPath);
      const data = {};
      
      for (const file of files) {
        const filePath = path.join(sessionPath, file);
        if (file !== 'metadata.json') {
          data[file] = await fs.readFile(filePath, 'utf-8');
        } else {
          data[file] = await fs.readJSON(filePath);
        }
      }
      
      return data;
    } catch (error) {
      console.error('Error exporting session:', error);
      return null;
    }
  }

  // Import session data (for restore)
  async importSession(userId, data) {
    try {
      const sessionPath = await this.createSession(userId);
      
      for (const [filename, content] of Object.entries(data)) {
        if (filename === 'metadata.json') {
          await fs.writeJSON(path.join(sessionPath, filename), content);
        } else {
          await fs.writeFile(path.join(sessionPath, filename), content);
        }
      }
      
      console.log(`✅ Session imported for user ${userId}`);
      return true;
    } catch (error) {
      console.error('Error importing session:', error);
      return false;
    }
  }
}

// Export a singleton instance
module.exports = new SessionManager();
