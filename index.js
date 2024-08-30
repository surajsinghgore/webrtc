const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const { v4: uuidv4 } = require('uuid');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/index.html');
});

const rooms = {};

io.on('connection', (socket) => {
  console.log('a user connected');

  socket.on('create-room', () => {
    const roomId = uuidv4();
    rooms[roomId] = { presenter: socket.id, viewers: [] };
    socket.join(roomId);
    socket.emit('room-created', roomId);
    console.log(`Room created with ID: ${roomId}`);
  });

  socket.on('join-room', (roomId) => {
    if (rooms[roomId]) {
      rooms[roomId].viewers.push(socket.id);
      socket.join(roomId);
      io.to(roomId).emit('new-viewer');
    }
  });

  socket.on('offer', (data) => {
    const room = rooms[data.roomId];
    if (room) {
      socket.to(data.roomId).emit('offer', data.offer);
    }
  });

  socket.on('answer', (data) => {
    const room = rooms[data.roomId];
    if (room) {
      socket.to(room.presenter).emit('answer', data.answer);
    }
  });

  socket.on('ice-candidate', (data) => {
    const room = rooms[data.roomId];
    if (room) {
      socket.to(data.target).emit('ice-candidate', data.candidate);
    }
  });

  socket.on('chat-message', (message) => {
    io.emit('chat-message', message);
  });

  socket.on('disconnect', () => {
    console.log('user disconnected');
    Object.entries(rooms).forEach(([roomId, room]) => {
      if (room.presenter === socket.id) {
        io.to(roomId).emit('room-closed');
        delete rooms[roomId];
      } else {
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
