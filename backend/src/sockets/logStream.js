module.exports = (io) => {
  io.on('connection', (socket) => {
    console.log('Socket client connected:', socket.id);
    socket.on('disconnect', () => {
      console.log('Socket client disconnected:', socket.id);
    });
  });
};
