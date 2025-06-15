const express = require('express');
const cors = require('cors');
const config = require('./config');
const deviceRoutes = require('./routes/deviceRoutes');
const whatsappService = require('./services/whatsappService');

const app = express();

// Middleware
app.use(cors({
    origin: config.FRONTEND_URL,
    credentials: true
}));
app.use(express.json());

// Routes
app.use('/', deviceRoutes);

// Start server
app.listen(config.PORT, async () => {
    console.log(`Server running on port ${config.PORT}`);
    await whatsappService.reloadSessions();
}); 