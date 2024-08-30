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

// Store rooms and their participants
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

  // Handle offer from presenter
  socket.on('offer', (data) => {
    const room = rooms[data.roomId];
    if (room) {
      socket.to(data.roomId).emit('offer', data.offer); // Correctly broadcast the offer to all viewers in the room except the presenter
    }
  });

  // Handle answer from viewer
  socket.on('answer', (data) => {
    const room = rooms[data.roomId];
    if (room) {
      socket.to(room.presenter).emit('answer', data.answer);
    }
  });

  // Handle ICE candidates
  socket.on('ice-candidate', (data) => {
    const room = rooms[data.roomId];
    if (room) {
      socket.to(data.target).emit('ice-candidate', data.candidate); // Send ICE candidate to the appropriate peer
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
    Object.entries(rooms).forEach(([roomId, room]) => {
      if (room.presenter === socket.id) {
        // Close room if the presenter disconnects
        io.to(roomId).emit('room-closed');
        delete rooms[roomId];
      } else {
        // Remove viewer
        room.viewers = room.viewers.filter(id => id !== socket.id);
        if (room.viewers.length === 0) {
          io.to(room.presenter).emit('room-closed');
        }
      }
    });
  });
});

server.listen(3000, () => {
  console.log('listening on *:3000');
});
