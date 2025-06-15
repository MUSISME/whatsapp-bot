# WhatsApp Bot

This project consists of a WhatsApp bot with a separated frontend and backend architecture.

## Project Structure

```
whatsapp-bot/
├── backend/           # Backend server
│   ├── server.js     # Main server file
│   ├── auth_info/    # WhatsApp authentication data
│   └── package.json  # Backend dependencies
│
└── frontend/         # Frontend application
    ├── src/          # Source files
    ├── public/       # Static files
    └── package.json  # Frontend dependencies
```

## Setup Instructions

### Backend Setup

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the server:
   ```bash
   npm start
   ```
   The server will run on port 5000 by default.

### Frontend Setup

1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm start
   ```
   The frontend will run on port 3000 by default.

## Environment Variables

### Backend
- `PORT`: Server port (default: 5000)
- `FRONTEND_URL`: Frontend URL (default: http://localhost:3000)

## Development

- Backend runs on: http://localhost:5000
- Frontend runs on: http://localhost:3000 