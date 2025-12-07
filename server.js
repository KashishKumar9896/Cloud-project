import express from 'express';
import { WebSocketServer } from 'ws';
import { createServer } from 'http';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs/promises';
import { existsSync } from 'fs';
import os from 'os';
import dotenv from 'dotenv';
import { detectInappropriateContent, censorText } from './contentFilter.js';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server });

const PORT = process.env.PORT || 3000;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const MESSAGES_FILE = join(__dirname, 'messages.json');

// Middleware
app.use(express.static('public'));
app.use(express.json());

// Load messages from file
async function loadMessages() {
  try {
    if (existsSync(MESSAGES_FILE)) {
      const data = await fs.readFile(MESSAGES_FILE, 'utf-8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.error('Error loading messages:', error);
  }
  return [];
}

// Save messages to file
async function saveMessages(messages) {
  try {
    await fs.writeFile(MESSAGES_FILE, JSON.stringify(messages, null, 2));
  } catch (error) {
    console.error('Error saving messages:', error);
  }
}

// Store active connections and messages in memory
let messages = [];
const clients = new Set();

// Initialize messages on startup
messages = await loadMessages();

// WebSocket connection handler
wss.on('connection', (ws) => {
  console.log('New client connected');
  clients.add(ws);

  // Send existing messages to new client
  ws.send(JSON.stringify({
    type: 'history',
    messages: messages
  }));

  // Handle incoming messages
  ws.on('message', async (data) => {
    try {
      const message = JSON.parse(data);

      if (message.type === 'chat') {
        // Detect inappropriate content using Gemini API and local filter
        const filterResult = await detectInappropriateContent(message.text, GEMINI_API_KEY);

        const chatMessage = {
          id: Date.now(),
          username: message.username || 'Anonymous',
          text: filterResult.censoredText, // Use censored text
          timestamp: new Date().toISOString(),
          avatar: message.avatar || '👤',
          filtered: filterResult.isInappropriate, // Flag if content was filtered
          filterReason: filterResult.isInappropriate ? filterResult.reason : null
        };

        messages.push(chatMessage);
        await saveMessages(messages);

        // Broadcast to all connected clients
        const response = JSON.stringify({
          type: 'message',
          data: chatMessage
        });

        clients.forEach((client) => {
          if (client.readyState === 1) {
            client.send(response);
          }
        });
      }
    } catch (error) {
      console.error('Error processing message:', error);
    }
  });

  // Handle client disconnect
  ws.on('close', () => {
    clients.delete(ws);
    console.log('Client disconnected');
  });

  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
  });
});

// REST API endpoints
app.get('/api/messages', (req, res) => {
  res.json(messages);
});

// Debug endpoint: return network interfaces for remote inspection
app.get('/__interfaces', (req, res) => {
  try {
    res.json(os.networkInterfaces());
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

app.post('/api/messages', async (req, res) => {
  const { username, text, avatar } = req.body;

  if (!text || text.trim() === '') {
    return res.status(400).json({ error: 'Message cannot be empty' });
  }

  // Filter content using Gemini API
  const filterResult = await detectInappropriateContent(text, GEMINI_API_KEY);

  const message = {
    id: Date.now(),
    username: username || 'Anonymous',
    text: filterResult.censoredText,
    timestamp: new Date().toISOString(),
    avatar: avatar || '👤',
    filtered: filterResult.isInappropriate,
    filterReason: filterResult.isInappropriate ? filterResult.reason : null
  };

  messages.push(message);
  await saveMessages(messages);

  // Broadcast via WebSocket
  const response = JSON.stringify({
    type: 'message',
    data: message
  });

  clients.forEach((client) => {
    if (client.readyState === 1) {
      client.send(response);
    }
  });

  res.status(201).json(message);
});

app.delete('/api/messages', async (req, res) => {
  messages = [];
  await saveMessages(messages);
  res.json({ message: 'All messages cleared' });
});

// Serve static files
app.get('/', (req, res) => {
  res.sendFile(join(__dirname, 'public', 'index.html'));
});

// Start server
server.listen(PORT, '0.0.0.0', () => {
  // Print all network interfaces (family, address, internal) to help debugging
  const nets = os.networkInterfaces();
  const externalIPv4 = [];

  console.log(`Chat server listening on port ${PORT} (bound to 0.0.0.0)`);
  console.log('Network interfaces:');
  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      const family = typeof net.family === 'string' ? net.family : (net.family === 4 ? 'IPv4' : 'IPv6');
      console.log(` - ${name}: ${family} ${net.address} ${net.internal ? '(internal)' : ''}`);
      if (family === 'IPv4' && !net.internal) externalIPv4.push(net.address);
    }
  }

  if (externalIPv4.length) {
    externalIPv4.forEach((ip) => console.log(`Accessible at http://${ip}:${PORT}`));
  } else {
    console.log('No external IPv4 addresses detected. If you are on a cloud VM, check cloud provider public/private IP and security groups/firewall.');
    console.log(`Try locally: http://localhost:${PORT}`);
  }
});
