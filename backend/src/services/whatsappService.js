const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const qrcode = require('qrcode');
const path = require('path');
const fs = require('fs');
const config = require('../config');
const { formatDateTime } = require('../utils/dateTime');
const gasService = require('./gasService');

class WhatsAppService {
    constructor() {
        this.sessions = new Map(); // phoneNumber => { sock, state, saveCreds, qr, isConnected }
    }

    async startSession(phoneNumber) {
        if (this.sessions.has(phoneNumber)) {
            console.log(`Session for ${phoneNumber} already exists`);
            return;
        }

        const { state, saveCreds } = await useMultiFileAuthState(
            path.join(config.AUTH_INFO_PATH, phoneNumber)
        );
        const sock = makeWASocket({ auth: state, printQRInTerminal: false });

        this.sessions.set(phoneNumber, { sock, state, saveCreds, qr: null, isConnected: false });

        this.setupEventHandlers(sock, phoneNumber, saveCreds);
    }

    setupEventHandlers(sock, phoneNumber, saveCreds) {
        sock.ev.on('creds.update', saveCreds);

        sock.ev.on('connection.update', (update) => {
            const { connection, lastDisconnect, qr } = update;

            if (qr) {
                qrcode.toDataURL(qr, (err, url) => {
                    if (err) {
                        console.error('Error generating QR code', err);
                        return;
                    }
                    const session = this.sessions.get(phoneNumber);
                    if (session) session.qr = url;
                });
            }

            if (connection === 'open') {
                console.log(`✅ WhatsApp connected for ${phoneNumber}`);
                const session = this.sessions.get(phoneNumber);
                if (session) session.isConnected = true;
            }

            if (connection === 'close') {
                this.handleConnectionClose(phoneNumber, lastDisconnect);
            }
        });

        sock.ev.on('messages.upsert', async ({ messages, type }) => {
            if (type !== 'notify') return;
            await this.handleMessages(sock, messages, phoneNumber);
        });
    }

    async handleConnectionClose(phoneNumber, lastDisconnect) {
        console.log(`Connection closed for ${phoneNumber}`);
        const reason = lastDisconnect?.error?.output?.statusCode;

        if (reason !== DisconnectReason.loggedOut) {
            console.log('Reconnecting...');
            this.sessions.delete(phoneNumber);
            await this.startSession(phoneNumber);
        } else {
            console.log(`Logged out from ${phoneNumber}. Session removed.`);
            this.sessions.delete(phoneNumber);
            await this.deleteAuthFolder(phoneNumber);
        }
    }

    async deleteAuthFolder(phoneNumber) {
        const authInfoPath = path.join(config.AUTH_INFO_PATH, phoneNumber);
        if (fs.existsSync(authInfoPath)) {
            try {
                await fs.promises.rm(authInfoPath, { recursive: true, force: true });
                console.log(`Deleted auth_info folder for ${phoneNumber}.`);
            } catch (err) {
                console.error(`Failed to delete auth_info folder for ${phoneNumber}:`, err);
            }
        } else {
            console.log(`No auth_info folder found for ${phoneNumber}.`);
        }
    }

    async handleMessages(sock, messages, phoneNumber) {
        const authState = this.sessions.get(phoneNumber)?.state?.creds;
        const ownJid = authState?.me?.id || '';

        for (const msg of messages) {
            if (!msg.message) continue;

            const from = msg.key.remoteJid;
            if (from === 'status@broadcast' || from.endsWith('@newsletter')) {
                console.log('Excluded message from status@broadcast or newsletter');
                continue;
            }

            const messageType = Object.keys(msg.message)[0];
            if (messageType === 'reactionMessage') {
                const reaction = msg.message.reactionMessage;
                console.log(`Reaction received: ${reaction.emoji} for message ID: ${reaction.key?.id}`);
                continue;
            }

            const messageInfo = this.formatMessageInfo(msg, ownJid, from);
            if (messageInfo.message) {
                console.log('Message Info JSON:', JSON.stringify(messageInfo, null, 2));
                await gasService.sendMessage(messageInfo);
            }
        }
    }

    formatMessageInfo(msg, ownJid, from) {
        const senderJid = msg.key.participant || msg.key.remoteJid;
        const fromMe = msg.key.fromMe;
        const senderPhone = fromMe
            ? ownJid.split('@')[0].split(':')[0]
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

        const messageInfo = {
            messageId,
            sender: senderPhone,
            senderName,
            receiver: from,
            message,
            datetime,
            isGroup,
            groupName: null,
            fromMe,
        };

        const contextInfo = msg.message.extendedTextMessage?.contextInfo;
        if (contextInfo && contextInfo.quotedMessage) {
            messageInfo.replyDetails = this.formatReplyDetails(contextInfo);
        }

        return messageInfo;
    }

    formatReplyDetails(contextInfo) {
        const repliedMessage = contextInfo.quotedMessage;
        const originalMessageId = contextInfo.stanzaId;
        const originalSender = contextInfo.participant.split('@')[0];
        const repliedText =
            repliedMessage.conversation ||
            repliedMessage.extendedTextMessage?.text ||
            'No text content';

        return {
            originalMessageId,
            originalSender,
            repliedMessage: repliedText,
        };
    }

    async reloadSessions() {
        if (!fs.existsSync(config.AUTH_INFO_PATH)) {
            console.log('No auth_info directory found. No sessions to reload.');
            return;
        }

        const sessionFolders = fs.readdirSync(config.AUTH_INFO_PATH);
        for (const folder of sessionFolders) {
            const fullPath = path.join(config.AUTH_INFO_PATH, folder);

            if (fs.lstatSync(fullPath).isDirectory()) {
                const phoneNumber = folder;
                console.log(`Reloading session for ${phoneNumber}...`);
                try {
                    await this.startSession(phoneNumber);
                } catch (err) {
                    console.error(`Failed to reload session for ${phoneNumber}:`, err.message);
                }
            }
        }
    }

    getSession(phoneNumber) {
        return this.sessions.get(phoneNumber);
    }

    deleteSession(phoneNumber) {
        const session = this.sessions.get(phoneNumber);
        if (session) {
            session.sock.logout();
            this.sessions.delete(phoneNumber);
        }
    }

    getAllSessions() {
        return Array.from(this.sessions.entries()).map(([phoneNumber, session]) => ({
            phoneNumber,
            isConnected: session.isConnected,
        }));
    }
}

module.exports = new WhatsAppService(); 