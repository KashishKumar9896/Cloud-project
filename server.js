import express from 'express';
import { WebSocketServer } from 'ws';
import { createServer } from 'http';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs/promises';
import { existsSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server });

const PORT = process.env.PORT || 3000;
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
        const chatMessage = {
          id: Date.now(),
          username: message.username || 'Anonymous',
          text: message.text,
          timestamp: new Date().toISOString(),
          avatar: message.avatar || '👤'
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

app.post('/api/messages', async (req, res) => {
  const { username, text, avatar } = req.body;

  if (!text || text.trim() === '') {
    return res.status(400).json({ error: 'Message cannot be empty' });
  }

  const message = {
    id: Date.now(),
    username: username || 'Anonymous',
    text,
    timestamp: new Date().toISOString(),
    avatar: avatar || '👤'
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
server.listen(PORT, () => {
  console.log(`Chat server running on http://localhost:${PORT}`);
});
