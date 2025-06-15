const express = require('express');
const cors = require('cors');
const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const qrcode = require('qrcode');
const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');

// Constants
const GAS_WEBAPP_URL = 'https://script.google.com/macros/s/AKfycbzgpa00-3FTV3F6OPgWkIUg2hqh39bz8vcllDWKA6lzc-ott3mqkv1du8-lO0ncWa4/exec';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

const app = express();
app.use(cors({
    origin: FRONTEND_URL,
    credentials: true
}));
app.use(express.json());

const sessions = new Map(); // phoneNumber => { sock, state, saveCreds, qr, isConnected }

// Send message data to Google Apps Script
async function sendMessageToGAS(messageInfo) {
    try {
        const res = await fetch(GAS_WEBAPP_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(messageInfo),
        });
        const json = await res.json();
        if (json.status !== 'success') {
            console.error('Failed to send message to GAS:', json.message);
        }
    } catch (err) {
        console.error('Error sending to GAS:', err);
    }
}

// Format date and time
function formatDateTime(date) {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const hour = date.getHours().toString().padStart(2, '0');
    const minute = date.getMinutes().toString().padStart(2, '0');
    const second = date.getSeconds().toString().padStart(2, '0');
    return `${year}-${month}-${day} ${hour}:${minute}:${second}`;
}

// Start a new session for a phone number
async function startSession(phoneNumber) {
    if (sessions.has(phoneNumber)) {
        console.log(`Session for ${phoneNumber} already exists`);
        return;
    }

    const { state, saveCreds } = await useMultiFileAuthState(path.join(__dirname, 'auth_info', phoneNumber));
    const sock = makeWASocket({ auth: state, printQRInTerminal: false });

    sessions.set(phoneNumber, { sock, state, saveCreds, qr: null, isConnected: false });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect, qr } = update;

        if (qr) {
            qrcode.toDataURL(qr, (err, url) => {
                if (err) {
                    console.error('Error generating QR code', err);
                    return;
                }
                const session = sessions.get(phoneNumber);
                if (session) session.qr = url;
            });
        }

        if (connection === 'open') {
            console.log(`✅ WhatsApp connected for ${phoneNumber}`);
            const session = sessions.get(phoneNumber);
            if (session) session.isConnected = true;
        }

        if (connection === 'close') {
            console.log(`Connection closed for ${phoneNumber}`);
            const reason = lastDisconnect?.error?.output?.statusCode;

            if (reason !== DisconnectReason.loggedOut) {
                console.log('Reconnecting...');
                sessions.delete(phoneNumber);
                startSession(phoneNumber);
            } else {
                console.log(`Logged out from ${phoneNumber}. Session removed.`);
                sessions.delete(phoneNumber);

                // Define the path to the auth_info folder for the phone number
                const authInfoPath = path.join(__dirname, 'auth_info', phoneNumber);

                // Check if the folder exists
                if (fs.existsSync(authInfoPath)) {
                    // Delete the folder and its contents
                    fs.rm(authInfoPath, { recursive: true, force: true }, (err) => {
                        if (err) {
                            console.error(`Failed to delete auth_info folder for ${phoneNumber}:`, err);
                        } else {
                            console.log(`Deleted auth_info folder for ${phoneNumber}.`);
                        }
                    });
                } else {
                    console.log(`No auth_info folder found for ${phoneNumber}.`);
                }
            }
        }
    });

    sock.ev.on('messages.upsert', async ({ messages, type }) => {
        if (type !== 'notify') return;

        const authState = sessions.get(phoneNumber)?.state?.creds;
        const ownJid = authState?.me?.id || ''; // Dynamically get your phone number's JID

        for (const msg of messages) {
            if (!msg.message) continue;

            const from = msg.key.remoteJid;

            // Exclude status and newsletter messages
            if (from === 'status@broadcast' || from.endsWith('@newsletter')) {
                console.log('Excluded message from status@broadcast or newsletter');
                continue;
            }

            const messageType = Object.keys(msg.message)[0]; // Get the type of the message
            if (messageType === 'reactionMessage') {
                const reaction = msg.message.reactionMessage;
                console.log(`Reaction received: ${reaction.emoji} for message ID: ${reaction.key?.id}`);
                continue;
            }

            const senderJid = msg.key.participant || msg.key.remoteJid;
            const fromMe = msg.key.fromMe;
            const senderPhone = fromMe
                ? ownJid.split('@')[0].split(':')[0] // Extract the phone number from ownJid and remove any suffix after `:`
                : senderJid.split('@')[0];
            const senderName = msg.pushName || 'Unknown';
            const messageId = msg.key.id;
            const message =
                msg.message.conversation ||
                msg.message.extendedTextMessage?.text ||
                msg.message?.imageMessage?.caption ||
                msg.message?.videoMessage?.caption ||
                msg.message?.documentMessage?.caption;
            const timestamp = msg.messageTimestamp;
            const date = new Date(timestamp * 1000);
            const datetime = formatDateTime(date);
            const isGroup = from.endsWith('@g.us');

            let groupName = null;

            if (isGroup) {
                try {
                    const groupMetadata = await sock.groupMetadata(from);
                    groupName = groupMetadata.subject;
                } catch (err) {
                    console.error('Failed to get group metadata:', err);
                }
            }

            const messageInfo = {
                messageId,
                sender: senderPhone,
                senderName,
                receiver: from,
                message,
                datetime,
                isGroup,
                groupName,
                fromMe,
            };

            const contextInfo = msg.message.extendedTextMessage?.contextInfo;
            if (contextInfo && contextInfo.quotedMessage) {
                const repliedMessage = contextInfo.quotedMessage;
                const originalMessageId = contextInfo.stanzaId;
                const originalSender = contextInfo.participant.split('@')[0];
                const repliedText =
                    repliedMessage.conversation ||
                    repliedMessage.extendedTextMessage?.text ||
                    'No text content';

                messageInfo.replyDetails = {
                    originalMessageId,
                    originalSender,
                    repliedMessage: repliedText,
                };
            }

            if (message) {
                console.log('Message Info JSON:', JSON.stringify(messageInfo, null, 2));
                await sendMessageToGAS(messageInfo);
            }
        }
    });

}

// Reload existing sessions
async function reloadSessions() {
    const authPath = path.join(__dirname, 'auth_info');
    if (!fs.existsSync(authPath)) {
        console.log('No auth_info directory found. No sessions to reload.');
        return;
    }

    const sessionFolders = fs.readdirSync(authPath);
    for (const folder of sessionFolders) {
        const fullPath = path.join(authPath, folder);

        if (fs.lstatSync(fullPath).isDirectory()) {
            const phoneNumber = folder;
            console.log(`Reloading session for ${phoneNumber}...`);
            try {
                await startSession(phoneNumber);
            } catch (err) {
                console.error(`Failed to reload session for ${phoneNumber}:`, err.message);
            }
        }
    }
}

// API: Add a phone number and return QR
app.post('/add-phone', async (req, res) => {
    const { phoneNumber } = req.body;
    if (!phoneNumber) return res.status(400).json({ message: 'Phone number is required' });
    if (sessions.has(phoneNumber)) return res.status(400).json({ message: 'Phone already registered' });

    try {
        await startSession(phoneNumber);

        const qr = await new Promise((resolve, reject) => {
            let attempts = 0;
            const interval = setInterval(() => {
                attempts++;
                const session = sessions.get(phoneNumber);
                if (session?.qr) {
                    clearInterval(interval);
                    resolve(session.qr);
                } else if (attempts > 20) {
                    clearInterval(interval);
                    reject(new Error('QR code timeout'));
                }
            }, 500);
        });

        res.json({ qr });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Failed to start session', error: err.message });
    }
});

// API: Delete a session
app.delete('/delete-phone/:phone', (req, res) => {
    const phone = req.params.phone;
    const session = sessions.get(phone);
    if (!session) return res.status(404).json({ message: 'Phone not found' });

    try {
        session.sock.logout();
        sessions.delete(phone);
        res.json({ message: 'Deleted and logged out' });
    } catch (err) {
        res.status(500).json({ message: 'Failed to delete session', error: err.message });
    }
});

// API: Get QR for a session
app.get('/get-qr/:phone', (req, res) => {
    const phone = req.params.phone;
    const session = sessions.get(phone);
    if (!session) return res.status(404).json({ message: 'Phone not found' });
    if (!session.qr) return res.status(404).json({ message: 'QR code not available yet' });

    res.json({ qr: session.qr });
});

// API: Get all registered devices
app.get('/get-registered-devices', (req, res) => {
    const devices = Array.from(sessions.entries()).map(([phoneNumber, session]) => ({
        phoneNumber,
        isConnected: session.isConnected,
    }));

    res.json(devices);
});

// Add a health check endpoint
app.get('/health', (req, res) => {
    res.json({ status: 'ok' });
});

// Start the server
const PORT = process.env.PORT || 5000;
app.listen(PORT, async () => {
    console.log(`Server running on port ${PORT}`);
    await reloadSessions();
});
