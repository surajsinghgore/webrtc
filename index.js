const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const { v4: uuidv4 } = require('uuid');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// Serve static files
app.use(express.static('public'));

// Handle HTTP requests
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/index.html');
});

io.on('connection', (socket) => {
  console.log('a user connected');

  // Handle offer
  socket.on('offer', (data) => {
    socket.broadcast.emit('offer', data);
  });

  // Handle answer
  socket.on('answer', (data) => {
    socket.broadcast.emit('answer', data);
  });

  // Handle ICE candidates
  socket.on('ice-candidate', (data) => {
    socket.broadcast.emit('ice-candidate', data);
  });

  // Handle chat messages
  socket.on('chat-message', (message) => {
    io.emit('chat-message', message); // Broadcast to all connected clients
  });

  // Handle disconnection
  socket.on('disconnect', () => {
    console.log('user disconnected');
  });
});

server.listen(3000, () => {
  console.log('listening on *:3000');
});
