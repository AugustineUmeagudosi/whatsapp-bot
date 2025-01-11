import qrcode from 'qrcode';
import { Client, LocalAuth, Message } from 'whatsapp-web.js';
import fs from 'fs';
import prisma from '../../prisma/prismaClient';

const QR_FILE_PATH = './qr-code.json';
const QR_IMAGE_PATH = './qr-code.png';

export class WhatsAppBot {
  private client: Client;
  private qrCodeGenerated: boolean;

  constructor() {
    this.client = new Client({
      authStrategy: new LocalAuth(),
    });
    this.qrCodeGenerated = false;

    this.setupEventHandlers();
  }

  private setupEventHandlers() {
    this.client.on('qr', async (qrCode: string) => {
      if (!this.qrCodeGenerated) {
        try {
          console.log('Scan this QR code with WhatsApp:');

          // Save QR code data to JSON
          fs.writeFileSync(QR_FILE_PATH, JSON.stringify({ qrCode }), 'utf-8');

          // Generate QR code as PNG and terminal string
          await qrcode.toFile(QR_IMAGE_PATH, qrCode, {
            errorCorrectionLevel: 'M',
            scale: 8,
            margin: 4,
            color: {
              dark: '#000000',
              light: '#ffffff',
            },
          });

          const terminalQR = await qrcode.toString(qrCode, { type: 'terminal', small: true });
          console.log(terminalQR); // Outputs a QR code to the terminal

          console.log(`QR code saved to ${QR_FILE_PATH} and ${QR_IMAGE_PATH}`);
          this.qrCodeGenerated = true;
        } catch (error) {
          console.error('Error generating QR code:', error);
        }
      }
    });

    this.client.on('authenticated', () => {
      console.log('Authenticated successfully!');
    });

    this.client.on('auth_failure', (msg: string) => {
      console.error('Authentication failed:', msg);
    });

    this.client.on('ready', () => {
      console.log('WhatsApp bot is ready!');
    });

    this.client.on('disconnected', (reason: string) => {
      console.log('Client was logged out:', reason);
    });

    this.client.on('message', (message: Message) => {
      const userId = parseInt(message.from.replace(/\D/g, ''));
      console.log(`Message received from ${userId}`, message.body);

      if (message.body.toLowerCase() === 'hi') {
        message.reply("Hi! I'm Chaty, your support assistant. What's your name?");
      }
    });

    this.client.on('message_ack', (message: Message, ack: number) => {
      const status = ['MESSAGE SENT', 'MESSAGE DELIVERED', 'MESSAGE READ', 'MESSAGE PLAYED'];
      console.log(`Message "${message.body}" acknowledgment status: ${status[ack] || 'UNKNOWN'}`);
    });
  }

  public initialize() {
    if (fs.existsSync(QR_FILE_PATH)) {
      console.log(`QR code already saved at ${QR_FILE_PATH}. Please use it for reconnection.`);
    } else {
      console.log('No saved QR code found. Generating a new QR code...');
    }
    this.client.initialize();
  }
}
