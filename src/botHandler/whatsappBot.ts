import { Client, LocalAuth, Message } from 'whatsapp-web.js';
import qrcode from 'qrcode';
import fs from 'fs';
import path from 'path';

const QR_FILE_PATH = './qr-code.json';
const QR_IMAGE_PATH = './qr-code.png';
const AUTH_DIRECTORY = './.wwebjs_auth'; // Directory for LocalAuth session

export class WhatsAppBot {
  private client: Client;
  private qrCodeGenerated: boolean;
  private userSessions: Map<string, string>;
  private isReinitializing: boolean;

  constructor() {
    const authStrategy = new LocalAuth({ dataPath: AUTH_DIRECTORY });

    const originalLogout = authStrategy.logout.bind(authStrategy);
    authStrategy.logout = async () => {
      try {
        await originalLogout();
      } catch (err: any) {
        if (err.code === 'ENOTEMPTY') {
          console.warn('Directory not empty, forcing cleanup...');
          fs.rmSync(AUTH_DIRECTORY, { recursive: true, force: true });
        } else {
          throw err;
        }
      }
    };

    const clientOptions: any = {
      authStrategy,
      dataPath: './session',
      puppeteer: {
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-extensions',
          '--disable-gpu',
        ],
      }
    };
    this.client = new Client(clientOptions);

    this.qrCodeGenerated = false;
    this.userSessions = new Map();
    this.isReinitializing = false;

    this.setupEventHandlers();
  }

  private setupEventHandlers() {
    this.client.on('qr', async (qrCode: string) => {
      if (!this.qrCodeGenerated) {
        try {
          console.log('Scan this QR code with WhatsApp:');
          fs.writeFileSync(QR_FILE_PATH, JSON.stringify({ qrCode }), 'utf-8');
          await qrcode.toFile(QR_IMAGE_PATH, qrCode, {
            errorCorrectionLevel: 'M',
            scale: 8,
            margin: 4,
            color: { dark: '#000000', light: '#ffffff' },
          });
          const terminalQR = await qrcode.toString(qrCode, { type: 'terminal', small: true });
          console.log(terminalQR);
          console.log(`QR code saved to ${QR_FILE_PATH} and ${QR_IMAGE_PATH}`);
          this.qrCodeGenerated = true;
        } catch (error) {
          console.error('Error generating QR code:', error);
        }
      }
    });

    this.client.on('ready', () => {
      console.log('WhatsApp bot is ready!');
    });

    this.client.on('auth_failure', (msg: string) => {
      console.error('Authentication failed:', msg);
    });

    this.client.on('disconnected', async (reason: string) => {
      console.log('Client was logged out:', reason);

      if (this.isReinitializing) {
        console.warn('Reinitialization already in progress. Skipping...');
        return;
      }

      this.isReinitializing = true;

      try {
        console.log('Reinitializing client...');
        this.qrCodeGenerated = false;
        this.userSessions.clear();
        await this.client.destroy(); // Cleanup before reinitializing
        this.client.initialize();
      } catch (error) {
        console.error('Error during reinitialization:', error);
      } finally {
        this.isReinitializing = false;
      }
    });

    this.client.on('message', async (message: Message) => {
      const userId = message.from;
      if (!userId) return console.log(`Invalid userId: ${userId}`);

      console.log(`Message received from ${userId}:`, message.body);

      if (!this.userSessions.has(userId)) {
        this.userSessions.set(userId, '');
        await message.reply("Hi! I'm Chaty, your support assistant. What's your name?");
        return;
      }

      const userName = this.userSessions.get(userId);

      if (!userName) {
        this.userSessions.set(userId, message.body);
        await message.reply(`Nice to meet you, ${message.body}! How can I assist you today?`);
        return;
      }

      const query = message.body.toLowerCase();

      if (query === 'help') {
        await message.reply("Type 'exit' to end the session and 'reset' to reset the session.");
        return;
      }

      if (query === 'exit') {
        this.userSessions.delete(userId);
        await message.reply('Your session has been ended. Have a great day!');
        return;
      }

      if (query === 'reset') {
        this.userSessions.set(userId, '');
        await message.reply("Let's start over. What's your name?");
        return;
      }

      const response = `You said: "${query}". (This is a placeholder response.)`;
      await message.reply(response);
    });

    this.client.on('message_ack', (message: Message, ack: number) => {
      const status = ['MESSAGE SENT', 'MESSAGE DELIVERED', 'MESSAGE READ', 'MESSAGE PLAYED'];
      console.log(`Message "${message.body}" acknowledgment status: ${status[ack] || 'UNKNOWN'}`);
    });
  }

  public initialize() {
    this.client.initialize();
  }

  public async stop() {
    try {
      await this.client.destroy();
      console.log('WhatsApp bot stopped');
    } catch (err) {
      console.error('Error stopping WhatsApp bot:', err);
    }
  }
}
