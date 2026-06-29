// src/utils/sessionManager.js
const fs = require('fs-extra');
const path = require('path');

class SessionManager {
  constructor() {
    this.sessionsPath = path.join(process.cwd(), 'sessions');
    this.ensureSessionsDirectory();
  }

  // Ensure the sessions directory exists
  ensureSessionsDirectory() {
    if (!fs.existsSync(this.sessionsPath)) {
      fs.mkdirSync(this.sessionsPath, { recursive: true });
      console.log('📁 Sessions directory created');
    }
  }

  // Get the session folder path for a specific user
  getUserSessionPath(userId) {
    return path.join(this.sessionsPath, `user_${userId}`);
  }

  // Check if a user has an existing session
  userHasSession(userId) {
    const sessionPath = this.getUserSessionPath(userId);
    return fs.existsSync(sessionPath);
  }

  // Delete a user's session (for logout/disconnect)
  async deleteUserSession(userId) {
    const sessionPath = this.getUserSessionPath(userId);
    if (fs.existsSync(sessionPath)) {
      await fs.remove(sessionPath);
      console.log(`🗑️ Session deleted for user ${userId}`);
      return true;
    }
    return false;
  }

  // Get all active user sessions
  getActiveUsers() {
    if (!fs.existsSync(this.sessionsPath)) {
      return [];
    }
    
    const folders = fs.readdirSync(this.sessionsPath);
    return folders
      .filter(folder => folder.startsWith('user_'))
      .map(folder => {
        const userId = folder.replace('user_', '');
        return {
          userId,
          sessionPath: path.join(this.sessionsPath, folder),
          exists: true
        };
      });
  }

  // Get session stats
  getSessionStats() {
    const users = this.getActiveUsers();
    return {
      totalUsers: users.length,
      users: users.map(u => u.userId),
      sessionsPath: this.sessionsPath
    };
  }

  // Clean up old/inactive sessions (optional)
  async cleanupOldSessions(maxAgeDays = 30) {
    // This would require checking last activity time
    // You could store a metadata file in each session folder
    console.log('🧹 Session cleanup not implemented yet');
  }
}

module.exports = new SessionManager();
