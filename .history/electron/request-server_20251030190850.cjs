// electron/request-server.cjs
// Local Network Request Server for NGKs Player

const http = require('http');
const WebSocket = require('ws');
const path = require('path');
const fs = require('fs');
const os = require('os');

class RequestServer {
  constructor(db, mainWindow) {
    this.db = db;
    this.mainWindow = mainWindow;
    this.httpServer = null;
    this.wss = null;
    this.port = 3000;
    this.isRunning = false;
    this.requests = []; // In-memory request queue
    this.feedback = []; // Feedback from audience
    this.tips = []; // Tips from audience
    this.currentTrack = null;
    this.connections = new Set();
  }

  start() {
    if (this.isRunning) {
      console.log('[RequestServer] Already running');
      return { success: false, message: 'Server already running' };
    }

    try {
      // Create HTTP server
      this.httpServer = http.createServer((req, res) => {
        this.handleHttpRequest(req, res);
      });

      // Create WebSocket server
      this.wss = new WebSocket.Server({ server: this.httpServer });
      
      this.wss.on('connection', (ws) => {
        console.log('[RequestServer] New WebSocket connection');
        this.connections.add(ws);

        // Send current state
        ws.send(JSON.stringify({
          type: 'init',
          currentTrack: this.currentTrack,
          requests: this.requests
        }));

        ws.on('message', (message) => {
          this.handleWebSocketMessage(ws, message);
        });

        ws.on('close', () => {
          console.log('[RequestServer] WebSocket connection closed');
          this.connections.delete(ws);
        });

        ws.on('error', (error) => {
          console.error('[RequestServer] WebSocket error:', error);
          this.connections.delete(ws);
        });
      });

      // Start listening
      this.httpServer.listen(this.port, '0.0.0.0', () => {
        this.isRunning = true;
        const localIP = this.getLocalIP();
        console.log(`[RequestServer] Started on http://${localIP}:${this.port}`);
        
        // Notify main window
        if (this.mainWindow && !this.mainWindow.isDestroyed()) {
          this.mainWindow.webContents.send('request-server:started', {
            url: `http://${localIP}:${this.port}`,
            port: this.port
          });
        }
      });

      return { 
        success: true, 
        url: `http://${this.getLocalIP()}:${this.port}`,
        port: this.port
      };
    } catch (error) {
      console.error('[RequestServer] Failed to start:', error);
      return { success: false, message: error.message };
    }
  }

  stop() {
    if (!this.isRunning) {
      return { success: false, message: 'Server not running' };
    }

    try {
      // Close all WebSocket connections
      this.connections.forEach(ws => ws.close());
      this.connections.clear();

      // Close WebSocket server
      if (this.wss) {
        this.wss.close();
      }

      // Close HTTP server
      if (this.httpServer) {
        this.httpServer.close();
      }

      this.isRunning = false;
      console.log('[RequestServer] Stopped');

      // Notify main window
      if (this.mainWindow && !this.mainWindow.isDestroyed()) {
        this.mainWindow.webContents.send('request-server:stopped');
      }

      return { success: true };
    } catch (error) {
      console.error('[RequestServer] Failed to stop:', error);
      return { success: false, message: error.message };
    }
  }

  handleHttpRequest(req, res) {
    const url = req.url;
    console.log(`[RequestServer] HTTP ${req.method} ${url}`);

    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
      res.writeHead(200);
      res.end();
      return;
    }

    // Serve the request page
    if (url === '/' || url === '/index.html') {
      this.serveRequestPage(res);
      return;
    }

    // API: Search tracks
    if (url.startsWith('/api/search')) {
      this.handleSearch(req, res);
      return;
    }

    // API: Get current track
    if (url === '/api/current') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ currentTrack: this.currentTrack }));
      return;
    }

    // API: Get requests
    if (url === '/api/requests') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ requests: this.requests }));
      return;
    }

    // 404
    res.writeHead(404);
    res.end('Not Found');
  }

  handleSearch(req, res) {
    const urlParams = new URL(req.url, `http://localhost:${this.port}`).searchParams;
    const query = urlParams.get('q') || '';

    if (!query || query.length < 2) {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ results: [] }));
      return;
    }

    try {
      // Search in database
      const results = this.db.prepare(`
        SELECT id, title, artist, album, duration, bpm, key
        FROM tracks
        WHERE LOWER(title) LIKE LOWER(?) 
           OR LOWER(artist) LIKE LOWER(?)
           OR LOWER(album) LIKE LOWER(?)
        LIMIT 20
      `).all(`%${query}%`, `%${query}%`, `%${query}%`);

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ results }));
    } catch (error) {
      console.error('[RequestServer] Search error:', error);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Search failed' }));
    }
  }

  handleWebSocketMessage(ws, message) {
    try {
      const data = JSON.parse(message);
      console.log('[RequestServer] WebSocket message:', data.type);

      switch (data.type) {
        case 'request':
          this.handleNewRequest(data.track, data.requester);
          break;
        case 'upvote':
          this.handleUpvote(data.requestId);
          break;
        case 'downvote':
          this.handleDownvote(data.requestId);
          break;
        case 'feedback':
          this.handleFeedback(data.message, data.name);
          break;
        case 'tip':
          this.handleTip(data.amount, data.name, data.message);
          break;
      }
    } catch (error) {
      console.error('[RequestServer] Error handling WebSocket message:', error);
    }
  }

  handleNewRequest(track, requester) {
    const request = {
      id: Date.now().toString(),
      track,
      requester: requester || 'Anonymous',
      votes: 0,
      timestamp: Date.now(),
      status: 'pending' // pending, accepted, rejected, played
    };

    this.requests.push(request);
    console.log('[RequestServer] New request:', request);

    // Broadcast to all clients
    this.broadcast({
      type: 'newRequest',
      request
    });

    // Notify main window
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.webContents.send('request-server:newRequest', request);
    }
  }

  handleUpvote(requestId) {
    console.log('[RequestServer] Upvote received for request:', requestId);
    const request = this.requests.find(r => r.id === requestId);
    if (request && request.status === 'pending') {
      console.log('[RequestServer] Before upvote - votes:', request.votes);
      request.votes++;
      console.log('[RequestServer] After upvote - votes:', request.votes);
      this.sortRequestsByVotes();
      this.broadcastRequests();
      console.log('[RequestServer] Upvote processed and broadcast');
    } else {
      console.warn('[RequestServer] Request not found or not pending:', requestId);
    }
  }

  handleDownvote(requestId) {
    console.log('[RequestServer] Downvote received for request:', requestId);
    const request = this.requests.find(r => r.id === requestId);
    if (request && request.status === 'pending') {
      console.log('[RequestServer] Before downvote - votes:', request.votes);
      request.votes--;
      console.log('[RequestServer] After downvote - votes:', request.votes);
      this.sortRequestsByVotes();
      this.broadcastRequests();
      console.log('[RequestServer] Downvote processed and broadcast');
    } else {
      console.warn('[RequestServer] Request not found or not pending:', requestId);
    }
  }

  sortRequestsByVotes() {
    this.requests.sort((a, b) => {
      if (a.status !== 'pending' && b.status === 'pending') return 1;
      if (a.status === 'pending' && b.status !== 'pending') return -1;
      return b.votes - a.votes;
    });
  }

  updateCurrentTrack(track) {
    this.currentTrack = track;
    this.broadcast({
      type: 'currentTrack',
      track
    });
  }

  acceptRequest(requestId) {
    const request = this.requests.find(r => r.id === requestId);
    if (request) {
      request.status = 'accepted';
      this.broadcastRequests();
      return request.track;
    }
    return null;
  }

  rejectRequest(requestId) {
    const request = this.requests.find(r => r.id === requestId);
    if (request) {
      request.status = 'rejected';
      this.broadcastRequests();
    }
  }
  clearRequests() {
    this.requests = [];
    this.broadcastRequests();
  }

  handleFeedback(message, name) {
    const feedbackItem = {
      id: Date.now().toString(),
      message,
      name: name || 'Anonymous',
      timestamp: Date.now()
    };
    
    this.feedback.push(feedbackItem);
    console.log('[RequestServer] New feedback:', feedbackItem);
    
    // Notify main window
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.webContents.send('request-server:newFeedback', feedbackItem);
    }
  }

  handleTip(amount, name, message) {
    const tipItem = {
      id: Date.now().toString(),
      amount,
      name: name || 'Anonymous',
      message: message || '',
      timestamp: Date.now()
    };
    
    this.tips.push(tipItem);
    console.log('[RequestServer] New tip:', tipItem);
    
    // Notify main window
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.webContents.send('request-server:newTip', tipItem);
    }
  } this.broadcastRequests();
  }

  clearRequests() {
    this.requests = [];
    this.broadcastRequests();
  }

  broadcast(data) {
    const message = JSON.stringify(data);
    this.connections.forEach(ws => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(message);
      }
    });
  }

  broadcastRequests() {
    console.log('[RequestServer] Broadcasting requests update, total:', this.requests.length);
    
    // Broadcast to WebSocket clients
    this.broadcast({
      type: 'requests',
      requests: this.requests
    });
    
    // Notify main window (DJ interface) with full request list
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      console.log('[RequestServer] Sending requestsUpdated to main window');
      this.mainWindow.webContents.send('request-server:requestsUpdated', this.requests);
    } else {
      console.warn('[RequestServer] Main window not available for update');
    }
  }

  serveRequestPage(res) {
    const html = this.generateRequestPageHTML();
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(html);
  }

  getLocalIP() {
    const interfaces = os.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
      for (const iface of interfaces[name]) {
        if (iface.family === 'IPv4' && !iface.internal) {
          return iface.address;
        }
      }
    }
    return 'localhost';
  }

  getStatus() {
    const pendingCount = this.requests.filter(r => r.status === 'pending').length;
    return {
      isRunning: this.isRunning,
      url: this.isRunning ? `http://${this.getLocalIP()}:${this.port}` : null,
      port: this.port,
      connections: this.connections.size,
      requestCount: this.requests.length,
      pendingCount: pendingCount
    };
  }

  generateRequestPageHTML() {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <title>Request a Song - NGKs Player</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
      background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
      color: white;
      min-height: 100vh;
      padding: 20px;
      overflow-x: hidden;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
    }
    .header {
      text-align: center;
      margin-bottom: 30px;
      animation: fadeIn 0.5s ease;
    }
    .logo {
      font-size: 48px;
      margin-bottom: 10px;
    }
    h1 {
      font-size: 28px;
      font-weight: 700;
      margin-bottom: 5px;
    }
    .subtitle {
      font-size: 14px;
      color: rgba(255, 255, 255, 0.6);
    }
    .now-playing {
      background: rgba(0, 255, 136, 0.1);
      border: 2px solid rgba(0, 255, 136, 0.3);
      border-radius: 15px;
      padding: 20px;
      margin-bottom: 30px;
      animation: fadeIn 0.5s ease 0.2s both;
    }
    .now-playing-label {
      font-size: 12px;
      color: #00ff88;
      font-weight: 600;
      letter-spacing: 2px;
      margin-bottom: 10px;
    }
    .now-playing-title {
      font-size: 20px;
      font-weight: 700;
      margin-bottom: 5px;
    }
    .now-playing-artist {
      font-size: 16px;
      color: rgba(255, 255, 255, 0.8);
    }
    .search-box {
      margin-bottom: 20px;
      animation: fadeIn 0.5s ease 0.4s both;
    }
    input[type="text"] {
      width: 100%;
      padding: 15px 20px;
      font-size: 16px;
      background: rgba(255, 255, 255, 0.1);
      border: 2px solid rgba(255, 255, 255, 0.2);
      border-radius: 12px;
      color: white;
      transition: all 0.3s;
    }
    input[type="text"]:focus {
      outline: none;
      border-color: #00ff88;
      box-shadow: 0 0 20px rgba(0, 255, 136, 0.2);
    }
    input[type="text"]::placeholder {
      color: rgba(255, 255, 255, 0.4);
    }
    .results {
      margin-bottom: 30px;
    }
    .result-item {
      background: rgba(255, 255, 255, 0.05);
      border: 2px solid rgba(255, 255, 255, 0.1);
      border-radius: 12px;
      padding: 15px;
      margin-bottom: 10px;
      cursor: pointer;
      transition: all 0.2s;
      animation: slideIn 0.3s ease;
    }
    .result-item:hover {
      background: rgba(255, 255, 255, 0.1);
      border-color: #00ff88;
      transform: translateX(5px);
    }
    .result-title {
      font-size: 16px;
      font-weight: 600;
      margin-bottom: 5px;
    }
    .result-artist {
      font-size: 14px;
      color: rgba(255, 255, 255, 0.7);
    }
    .request-queue {
      animation: fadeIn 0.5s ease 0.6s both;
    }
    .queue-title {
      font-size: 20px;
      font-weight: 700;
      margin-bottom: 15px;
      color: #00ff88;
    }
    .queue-item {
      background: rgba(0, 200, 255, 0.1);
      border: 2px solid rgba(0, 200, 255, 0.3);
      border-radius: 12px;
      padding: 15px;
      margin-bottom: 10px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      animation: slideIn 0.3s ease;
    }
    .queue-info {
      flex: 1;
    }
    .queue-votes {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .vote-btn {
      background: rgba(255, 255, 255, 0.1);
      border: none;
      border-radius: 8px;
      width: 40px;
      height: 40px;
      font-size: 20px;
      cursor: pointer;
      transition: all 0.2s;
    }
    .vote-btn:active {
      transform: scale(0.9);
    }
    .vote-count {
      font-size: 18px;
      font-weight: 700;
      min-width: 30px;
      text-align: center;
    }
    .requester {
      font-size: 12px;
      color: rgba(255, 255, 255, 0.5);
      margin-top: 5px;
    }
    .success-message {
      background: rgba(0, 255, 136, 0.2);
      border: 2px solid #00ff88;
      border-radius: 12px;
      padding: 15px;
      margin-bottom: 20px;
      text-align: center;
      animation: slideIn 0.3s ease;
    }
    .name-input {
      margin-bottom: 20px;
      animation: fadeIn 0.5s ease 0.3s both;
    }
    @keyframes fadeIn {
      from {
        opacity: 0;
        transform: translateY(20px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }
    @keyframes slideIn {
      from {
        opacity: 0;
        transform: translateX(-20px);
      }
      to {
        opacity: 1;
        transform: translateX(0);
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">🎵</div>
      <h1>Request a Song</h1>
      <p class="subtitle">Vote for your favorites!</p>
    </div>

    <div id="nowPlaying" class="now-playing" style="display: none;">
      <div class="now-playing-label">NOW PLAYING</div>
      <div class="now-playing-title" id="currentTitle">-</div>
      <div class="now-playing-artist" id="currentArtist">-</div>
    </div>

    <div id="successMessage" class="success-message" style="display: none;">
      ✨ Request submitted successfully!
    </div>

    <div class="name-input">
      <input type="text" id="requesterName" placeholder="Your name (optional)" maxlength="30">
    </div>

    <div class="search-box">
      <input type="text" id="searchInput" placeholder="🔍 Search for a song..." autocomplete="off">
    </div>

    <div id="results" class="results"></div>

    <div class="request-queue">
      <div class="queue-title">Request Queue</div>
      <div id="queue"></div>
    </div>

    <div style="margin-top: 20px; display: flex; gap: 10px;">
      <button onclick="showFeedbackModal()" style="flex: 1; padding: 12px; background: linear-gradient(145deg, #f39c12, #e67e22); border: none; border-radius: 10px; color: white; font-weight: 600; cursor: pointer;">
        💬 Send Feedback
      </button>
      <button onclick="showTipModal()" style="flex: 1; padding: 12px; background: linear-gradient(145deg, #27ae60, #229954); border: none; border-radius: 10px; color: white; font-weight: 600; cursor: pointer;">
        💰 Leave a Tip
      </button>
    </div>

    <!-- Feedback Modal -->
    <div id="feedbackModal" style="display: none; position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.8); z-index: 1000; padding: 20px;">
      <div style="background: #1a1a2e; border-radius: 15px; padding: 20px; max-width: 500px; margin: 50px auto;">
        <h3 style="margin-top: 0;">Send Feedback to the DJ</h3>
        <textarea id="feedbackMessage" placeholder="Share your thoughts..." style="width: 100%; height: 100px; padding: 10px; background: rgba(255,255,255,0.1); border: 2px solid rgba(255,255,255,0.2); border-radius: 8px; color: white; font-size: 14px; resize: vertical;" maxlength="500"></textarea>
        <div style="margin-top: 15px; display: flex; gap: 10px;">
          <button onclick="sendFeedback()" style="flex: 1; padding: 10px; background: #00ff88; border: none; border-radius: 8px; font-weight: 600; cursor: pointer;">Send</button>
          <button onclick="closeFeedbackModal()" style="flex: 1; padding: 10px; background: rgba(255,255,255,0.1); border: none; border-radius: 8px; color: white; font-weight: 600; cursor: pointer;">Cancel</button>
        </div>
      </div>
    </div>

    <!-- Tip Modal -->
    <div id="tipModal" style="display: none; position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.8); z-index: 1000; padding: 20px;">
      <div style="background: #1a1a2e; border-radius: 15px; padding: 20px; max-width: 500px; margin: 50px auto;">
        <h3 style="margin-top: 0;">Leave a Tip 💰</h3>
        <p style="color: rgba(255,255,255,0.7); font-size: 14px;">Show your appreciation for great music!</p>
        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin: 15px 0;">
          <button onclick="selectTip(5)" class="tip-btn" style="padding: 15px; background: rgba(39, 174, 96, 0.2); border: 2px solid #27ae60; border-radius: 8px; color: white; font-weight: 600; cursor: pointer;">$5</button>
          <button onclick="selectTip(10)" class="tip-btn" style="padding: 15px; background: rgba(39, 174, 96, 0.2); border: 2px solid #27ae60; border-radius: 8px; color: white; font-weight: 600; cursor: pointer;">$10</button>
          <button onclick="selectTip(20)" class="tip-btn" style="padding: 15px; background: rgba(39, 174, 96, 0.2); border: 2px solid #27ae60; border-radius: 8px; color: white; font-weight: 600; cursor: pointer;">$20</button>
        </div>
        <input type="number" id="customTip" placeholder="Custom amount" style="width: 100%; padding: 10px; background: rgba(255,255,255,0.1); border: 2px solid rgba(255,255,255,0.2); border-radius: 8px; color: white; font-size: 14px; margin-top: 10px;" min="1">
        <textarea id="tipMessage" placeholder="Optional message..." style="width: 100%; height: 60px; padding: 10px; background: rgba(255,255,255,0.1); border: 2px solid rgba(255,255,255,0.2); border-radius: 8px; color: white; font-size: 14px; margin-top: 10px; resize: vertical;" maxlength="200"></textarea>
        <div style="margin-top: 15px;">
          <p style="margin-bottom: 10px; font-size: 14px; font-weight: 600;">Payment Method:</p>
          <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; margin-bottom: 15px;">
            <button onclick="selectPaymentMethod('venmo')" class="payment-btn" style="padding: 10px; background: rgba(0, 136, 254, 0.2); border: 2px solid #0088fe; border-radius: 8px; color: white; font-weight: 600; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 5px;">
              Venmo
            </button>
            <button onclick="selectPaymentMethod('cashapp')" class="payment-btn" style="padding: 10px; background: rgba(0, 217, 111, 0.2); border: 2px solid #00d96f; border-radius: 8px; color: white; font-weight: 600; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 5px;">
              Cash App
            </button>
            <button onclick="selectPaymentMethod('paypal')" class="payment-btn" style="padding: 10px; background: rgba(0, 48, 135, 0.2); border: 2px solid #003087; border-radius: 8px; color: white; font-weight: 600; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 5px;">
              PayPal
            </button>
            <button onclick="selectPaymentMethod('zelle')" class="payment-btn" style="padding: 10px; background: rgba(101, 43, 146, 0.2); border: 2px solid #652b92; border-radius: 8px; color: white; font-weight: 600; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 5px;">
              Zelle
            </button>
          </div>
          <div id="paymentInfo" style="display: none; background: rgba(0, 255, 136, 0.1); border: 2px solid #00ff88; border-radius: 8px; padding: 15px; margin-bottom: 15px; text-align: center;">
            <p style="margin: 0; font-weight: 600; margin-bottom: 5px;" id="paymentInstructions"></p>
            <p style="margin: 0; font-size: 18px; font-weight: 700; color: #00ff88;" id="paymentHandle"></p>
            <button onclick="copyPaymentInfo()" style="margin-top: 10px; padding: 8px 15px; background: #00ff88; border: none; border-radius: 6px; color: #0a0a0a; font-weight: 600; cursor: pointer;">📋 Copy</button>
          </div>
        </div>
        <div style="margin-top: 15px; display: flex; gap: 10px;">
          <button onclick="confirmTip()" style="flex: 1; padding: 10px; background: #27ae60; border: none; border-radius: 8px; color: white; font-weight: 600; cursor: pointer;">Confirm Payment Sent</button>
          <button onclick="closeTipModal()" style="flex: 1; padding: 10px; background: rgba(255,255,255,0.1); border: none; border-radius: 8px; color: white; font-weight: 600; cursor: pointer;">Cancel</button>
        </div>
        <p style="margin-top: 15px; font-size: 12px; color: rgba(255,255,255,0.5); text-align: center;">Send payment via your chosen method, then confirm above.</p>
      </div>
    </div>
  </div>

  <script>
    const ws = new WebSocket('ws://' + window.location.host);
    let requests = [];

    ws.onopen = () => {
      console.log('Connected to server');
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      
      switch(data.type) {
        case 'init':
          if (data.currentTrack) updateNowPlaying(data.currentTrack);
          requests = data.requests || [];
          renderQueue();
          break;
        case 'currentTrack':
          updateNowPlaying(data.track);
          break;
        case 'newRequest':
          requests.push(data.request);
          renderQueue();
          break;
        case 'requests':
          requests = data.requests || [];
          renderQueue();
          break;
      }
    };

    function updateNowPlaying(track) {
      if (track) {
        document.getElementById('nowPlaying').style.display = 'block';
        document.getElementById('currentTitle').textContent = track.title || 'Unknown Track';
        document.getElementById('currentArtist').textContent = track.artist || 'Unknown Artist';
      }
    }

    let searchTimeout;
    document.getElementById('searchInput').addEventListener('input', (e) => {
      clearTimeout(searchTimeout);
      const query = e.target.value.trim();
      
      if (query.length < 2) {
        document.getElementById('results').innerHTML = '';
        return;
      }

      searchTimeout = setTimeout(() => {
        fetch('/api/search?q=' + encodeURIComponent(query))
          .then(r => r.json())
          .then(data => {
            renderResults(data.results || []);
          });
      }, 300);
    });

    function renderResults(results) {
      const container = document.getElementById('results');
      
      if (results.length === 0) {
        container.innerHTML = '<div style="text-align: center; color: rgba(255,255,255,0.5); padding: 20px;">No results found</div>';
        return;
      }

      container.innerHTML = results.map(track => \`
        <div class="result-item" onclick="requestSong(\${JSON.stringify(track).replace(/"/g, '&quot;')})">
          <div class="result-title">\${track.title}</div>
          <div class="result-artist">\${track.artist || 'Unknown Artist'}</div>
        </div>
      \`).join('');
    }

    function requestSong(track) {
      const requester = document.getElementById('requesterName').value.trim() || 'Anonymous';
      
      ws.send(JSON.stringify({
        type: 'request',
        track,
        requester
      }));

      document.getElementById('searchInput').value = '';
      document.getElementById('results').innerHTML = '';
      
      const msg = document.getElementById('successMessage');
      msg.style.display = 'block';
      setTimeout(() => { msg.style.display = 'none'; }, 3000);
    }

    function vote(requestId, direction) {
      ws.send(JSON.stringify({
        type: direction === 1 ? 'upvote' : 'downvote',
        requestId
      }));
    }

    function renderQueue() {
      const container = document.getElementById('queue');
      const pending = requests.filter(r => r.status === 'pending');
      
      if (pending.length === 0) {
        container.innerHTML = '<div style="text-align: center; color: rgba(255,255,255,0.5); padding: 20px;">No requests yet</div>';
        return;
      }

      container.innerHTML = pending.map(req => \`
        <div class="queue-item">
          <div class="queue-info">
            <div class="result-title">\${req.track.title}</div>
            <div class="result-artist">\${req.track.artist || 'Unknown Artist'}</div>
            <div class="requester">Requested by \${req.requester}</div>
          </div>
          <div class="queue-votes">
            <button class="vote-btn" onclick="vote('\${req.id}', 1)">👍</button>
            <div class="vote-count">\${req.votes}</div>
            <button class="vote-btn" onclick="vote('\${req.id}', -1)">👎</button>
          </div>
        </div>
      \`).join('');
    }

    // Feedback functions
    function showFeedbackModal() {
      document.getElementById('feedbackModal').style.display = 'block';
    }

    function closeFeedbackModal() {
      document.getElementById('feedbackModal').style.display = 'none';
      document.getElementById('feedbackMessage').value = '';
    }

    function sendFeedback() {
      const message = document.getElementById('feedbackMessage').value.trim();
      if (!message) {
        alert('Please enter a message');
        return;
      }

      const name = document.getElementById('requesterName').value.trim() || 'Anonymous';
      
      ws.send(JSON.stringify({
        type: 'feedback',
        message,
        name
      }));

      closeFeedbackModal();
      alert('Feedback sent! Thank you!');
    }

    // Tip functions
    let selectedTipAmount = 0;
    let selectedPaymentMethod = null;
    
    // Payment info - DJ should configure these
    const paymentInfo = {
      venmo: '@YourVenmoHandle',
      cashapp: '$YourCashAppHandle',
      paypal: 'your-paypal@email.com',
      zelle: 'your-zelle@email.com'
    };

    function showTipModal() {
      document.getElementById('tipModal').style.display = 'block';
      document.getElementById('paymentInfo').style.display = 'none';
      selectedPaymentMethod = null;
    }

    function closeTipModal() {
      document.getElementById('tipModal').style.display = 'none';
      document.getElementById('customTip').value = '';
      document.getElementById('tipMessage').value = '';
      document.getElementById('paymentInfo').style.display = 'none';
      selectedTipAmount = 0;
      selectedPaymentMethod = null;
    }

    function selectTip(amount) {
      selectedTipAmount = amount;
      document.getElementById('customTip').value = amount;
    }

    function selectPaymentMethod(method) {
      selectedPaymentMethod = method;
      const infoDiv = document.getElementById('paymentInfo');
      const instructions = document.getElementById('paymentInstructions');
      const handle = document.getElementById('paymentHandle');
      
      // Update instructions based on method
      const methodNames = {
        venmo: 'Venmo',
        cashapp: 'Cash App',
        paypal: 'PayPal',
        zelle: 'Zelle'
      };
      
      instructions.textContent = \`Send via \${methodNames[method]} to:\`;
      handle.textContent = paymentInfo[method];
      infoDiv.style.display = 'block';
      
      // Highlight selected button
      document.querySelectorAll('.payment-btn').forEach(btn => {
        btn.style.opacity = '0.5';
      });
      event.target.style.opacity = '1';
    }

    function copyPaymentInfo() {
      const handle = document.getElementById('paymentHandle').textContent;
      navigator.clipboard.writeText(handle);
      alert('Payment info copied to clipboard!');
    }

    function confirmTip() {
      const customAmount = parseFloat(document.getElementById('customTip').value);
      const amount = customAmount || selectedTipAmount;
      
      if (!amount || amount < 1) {
        alert('Please select or enter a tip amount');
        return;
      }

      if (!selectedPaymentMethod) {
        alert('Please select a payment method');
        return;
      }

      const name = document.getElementById('requesterName').value.trim() || 'Anonymous';
      const message = document.getElementById('tipMessage').value.trim();

      ws.send(JSON.stringify({
        type: 'tip',
        amount,
        name,
        message,
        paymentMethod: selectedPaymentMethod,
        paymentHandle: paymentInfo[selectedPaymentMethod]
      }));

      closeTipModal();
      alert(\`Thank you for your $\${amount} tip via \${selectedPaymentMethod.charAt(0).toUpperCase() + selectedPaymentMethod.slice(1)}!\`);
    }
  </script>
</body>
</html>`;
  }
}

module.exports = RequestServer;
