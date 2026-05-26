module.exports = (io) => {
  io.on('connection', (socket) => {
    const userId = socket.handshake.auth.token;
    if (userId) {
      socket.join(userId);
      console.log(`User ${userId} connected to socket`);
    }
    socket.on('disconnect', () => {
      console.log('Client disconnected');
    });
  });
};