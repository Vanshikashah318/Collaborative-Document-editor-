const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');
const Document = require('./models/Document');
require('dotenv').config();
const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

// Middleware
app.use(cors());
app.use(express.json());
console.log(process.env.MONGODB_URI)
// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB connection error:', err));

// Real-time collaboration logic
const docs = {}; // Store Yjs documents temporarily

io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);

  socket.on('join-document', async (docId) => {
    if (!docs[docId]) {
      // Load or create a document from the database
      let doc = await Document.findById(docId) || new Document({ _id: docId, content: '' });
      docs[docId] = doc;
    }

    socket.join(docId);
    socket.emit('load-document', docs[docId].content);

    socket.on('update-document', async (content) => {
      docs[docId].content = content;
      socket.to(docId).emit('document-updated', content);
      await Document.findByIdAndUpdate(docId, { content });
    });

    socket.on('disconnect', () => console.log(`User ${socket.id} disconnected`));
  });
});

// Start the server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
