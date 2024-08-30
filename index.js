const express = require('express');
const http = require('http');
const socketIo = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

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

  // Handle disconnection
  socket.on('disconnect', () => {
    console.log('user disconnected');
  });
});

server.listen(3000, () => {
  console.log('listening on *:3000');
});
