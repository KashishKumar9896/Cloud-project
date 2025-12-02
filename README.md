# WebSocket Chat Application

A real-time chat application built with Node.js, Express, WebSockets, and JSON file storage.

## Features

- ✅ Real-time messaging using WebSocket
- ✅ Message persistence in JSON file
- ✅ User customization (username and avatar emoji)
- ✅ Automatic message history loading
- ✅ REST API endpoints for messages
- ✅ Responsive UI design
- ✅ localStorage for user preferences
- ✅ Clean chat functionality

## Installation

1. Install dependencies:
```bash
npm install
```

## Running the Application

### Development Mode
```bash
npm run dev
```

### Production Mode
```bash
npm start
```

The application will start on `http://localhost:3000`

## Project Structure

```
├── server.js           # Express server with WebSocket support
├── public/
│   └── index.html      # Chat UI and client-side code
├── messages.json       # Stored messages (auto-created)
├── package.json        # Dependencies and scripts
└── README.md          # This file
```

## API Endpoints

### Get All Messages
```
GET /api/messages
```

### Send a Message
```
POST /api/messages
Content-Type: application/json

{
  "username": "John",
  "text": "Hello, everyone!",
  "avatar": "👤"
}
```

### Clear All Messages
```
DELETE /api/messages
```

## WebSocket Events

### Client to Server
```json
{
  "type": "chat",
  "username": "John",
  "text": "Message content",
  "avatar": "👤"
}
```

### Server to Client
```json
{
  "type": "message",
  "data": {
    "id": 1234567890,
    "username": "John",
    "text": "Message content",
    "timestamp": "2024-01-01T12:00:00.000Z",
    "avatar": "👤"
  }
}
```

Or message history:
```json
{
  "type": "history",
  "messages": [...]
}
```

## Usage

1. Open the application in your browser
2. Enter your name and choose an avatar emoji (optional)
3. Type your message and press **Send** or **Shift+Enter**
4. All messages are stored in `messages.json`
5. Use **Clear Chat** to remove all messages

## Technologies Used

- **Express.js** - Web server framework
- **ws** - WebSocket library
- **Node.js** - JavaScript runtime
- **JSON** - Message storage format

## Configuration

You can customize the port by setting the `PORT` environment variable:
```bash
PORT=8080 npm start
```

## AWS Cloud Deployment

This application can be deployed on AWS Cloud using several services:

### Option 1: EC2 Instance
1. Launch an EC2 instance (Amazon Linux 2 or Ubuntu)
2. SSH into the instance
3. Install Node.js and npm
4. Clone the project and install dependencies
5. Use PM2 or systemd to run the server as a service
6. Configure security groups to allow inbound traffic on port 3000

### Option 2: Elastic Beanstalk
1. Create an Elastic Beanstalk environment with Node.js platform
2. Deploy the application using the Elastic Beanstalk CLI
3. Configure environment variables (PORT, etc.)
4. Application auto-scales based on demand

### Option 3: ECS with Docker
1. Containerize the application with Docker
2. Push image to Amazon ECR (Elastic Container Registry)
3. Create an ECS cluster and task definition
4. Deploy using ECS with load balancing

### AWS Services Integration
- **S3**: Store backups of `messages.json`
- **DynamoDB**: Optionally replace JSON file storage with DynamoDB
- **RDS**: Use for message storage if scaling to production
- **CloudWatch**: Monitor application logs and metrics
- **Route 53**: DNS management for custom domain
- **CloudFront**: CDN for static assets

### Environment Setup for AWS
```bash
# Set environment variable for production
export NODE_ENV=production
export PORT=80

# Or in your AWS environment
PORT=80 npm start
```

### Docker Deployment Example
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --production
COPY . .
EXPOSE 3000
CMD ["npm", "start"]
```

## Notes

- Messages are automatically persisted to `messages.json`
- User preferences (name and avatar) are saved in browser localStorage
- All connections receive message history on connect
- Messages are broadcast to all connected clients in real-time
- For AWS deployment, consider using managed services for scalability and reliability
