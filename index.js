const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const { v4: uuidv4 } = require('uuid'); // To generate unique room IDs

const app = express();
const server = http.createServer(app);
const io = socketIo(server);


app.get('/', (req, res) => {
  res.sendFile(__dirname + '/index.html');
});

// Generate and store room information
const rooms = {};

io.on('connection', (socket) => {
  console.log('a user connected');

  // Create a new room
  socket.on('create-room', () => {
    const roomId = uuidv4();
    rooms[roomId] = { presenter: socket.id, viewers: [] };
    socket.join(roomId);
    socket.emit('room-created', roomId);
    console.log(`Room created with ID: ${roomId}`);
  });

  // Join an existing room
  socket.on('join-room', (roomId) => {
    if (rooms[roomId]) {
      rooms[roomId].viewers.push(socket.id);
      socket.join(roomId);
      io.to(roomId).emit('new-viewer');
    }
  });

  // Handle offer
  socket.on('offer', (data) => {
    const room = Object.values(rooms).find(r => r.presenter === socket.id);
    if (room) {
      socket.to(room.presenter).emit('offer', data);
    }
  });

  // Handle answer
  socket.on('answer', (data) => {
    const room = Object.values(rooms).find(r => r.presenter === socket.id);
    if (room) {
      socket.to(room.presenter).emit('answer', data);
    }
  });

  // Handle ICE candidates
  socket.on('ice-candidate', (data) => {
    const room = Object.values(rooms).find(r => r.presenter === socket.id);
    if (room) {
      socket.to(room.presenter).emit('ice-candidate', data);
    }
  });

  // Handle chat messages
  socket.on('chat-message', (message) => {
    io.emit('chat-message', message); // Broadcast to all connected clients
  });

  // Handle disconnection
  socket.on('disconnect', () => {
    console.log('user disconnected');
    // Remove user from rooms
    Object.values(rooms).forEach(room => {
      if (room.presenter === socket.id) {
        // Remove room
        io.to(room.presenter).emit('room-closed');
        delete rooms[room.roomId];
      } else {
        // Remove viewer
        room.viewers = room.viewers.filter(id => id !== socket.id);
        if (room.viewers.length === 0) {
          io.to(room.presenter).emit('room-closed');
          delete rooms[room.roomId];
        }
      }
    });
  });
});

server.listen(3000, () => {
  console.log('listening on *:3000');
});
