const express = require('express');
const cors = require('cors');
const { FRONTEND_URL, PORT } = require('./config');
const deviceRoutes = require('./routes/deviceRoutes');
const whatsappService = require('./services/whatsappService');

const app = express();

// Middleware
app.use(cors({
    origin: FRONTEND_URL,
    credentials: true
}));
app.use(express.json());

// Routes
app.use('/', deviceRoutes);

// Start server
app.listen(PORT, async () => {
    console.log(`Server running on port ${PORT}`);
    await whatsappService.reloadSessions();
}); 