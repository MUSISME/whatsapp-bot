const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const qrcode = require('qrcode-terminal');
const fetch = require('node-fetch');

const GAS_WEBAPP_URL = 'https://script.google.com/macros/s/AKfycbzSerl9T3Vb6pdv58fgMdDskvGyauUyKHV4fmnen5tnvvh_1n0kRzUKId5yToUv_WIF1g/exec';

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

async function start() {
  const { state, saveCreds } = await useMultiFileAuthState('auth_info');
  
  const sock = makeWASocket({
    auth: state,
    printQRInTerminal: true,
  });

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect, qr } = update;
    if (qr) {
      qrcode.generate(qr, { small: true });
      console.log('Scan this QR code with your WhatsApp');
    }
    if (connection === 'close') {
      const reason = (lastDisconnect?.error)?.output?.statusCode;
      console.log('Connection closed, reason:', reason);
      if (reason !== DisconnectReason.loggedOut) {
        console.log('Reconnecting...');
        start();
      } else {
        console.log('Logged out, please delete auth_info and scan QR again.');
      }
    }
    if (connection === 'open') {
      console.log('✅ WhatsApp connected!');
    }
  });

  sock.ev.on('messages.upsert', async ({ messages, type }) => {
      if (type !== 'notify') return;

      for (const msg of messages) {
        if (!msg.message) continue;
        console.log(msg);
        

        const from = msg.key.remoteJid; // Group or sender JID

        // Exclude messages from 'status@broadcast'
        if (from === 'status@broadcast') {
          console.log('Excluded message from status@broadcast');
          continue;
        }
        
        const senderJid = msg.key.participant || msg.key.remoteJid; // Sender JID
        const fromMe = msg.key.fromMe; // Sender JID
        const senderPhone = senderJid.split('@')[0]; // Sender phone number
        const messageId = msg.key.id; // Message ID
        const message = msg.message.conversation || 
                        msg.message.extendedTextMessage?.text ||
                        (msg.message?.imageMessage?.caption) ||
                        (msg.message?.videoMessage?.caption) ||
                        (msg.message?.documentMessage?.caption);
        const timestamp = msg.messageTimestamp; // Message timestamp        
        const date = new Date(timestamp * 1000);
        const datetime = formatDateTime(date);
        const isGroup = from.endsWith('@g.us'); // Check if it's a group message

        // Construct a JSON object for the message
        const messageInfo = {
            messageId,
            sender: senderPhone,
            receiver: from, // Group or sender JID
            message,
            datetime,
            isGroup,
            fromMe,
        };

        // Check if the message is a reply
        const contextInfo = msg.message.extendedTextMessage?.contextInfo;

        if (contextInfo && contextInfo.quotedMessage) {
            const repliedMessage = contextInfo.quotedMessage;
            const originalMessageId = contextInfo.stanzaId;
            const originalSender = contextInfo.participant.split('@')[0];
            const repliedText = repliedMessage.conversation || 
                                repliedMessage.extendedTextMessage?.text || 
                                "No text content";

            // Add reply details to the JSON object
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

function formatDateTime(date) {
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, '0'); 
  const day = date.getDate().toString().padStart(2, '0');
  const hour = date.getHours().toString().padStart(2, '0');  // 24-hour format
  const minute = date.getMinutes().toString().padStart(2, '0');
  const second = date.getSeconds().toString().padStart(2, '0');

  return `${year}-${month}-${day} ${hour}:${minute}:${second}`;
}

start();
