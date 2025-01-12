import qrcode from 'qrcode';
import { Client, LocalAuth, Message } from 'whatsapp-web.js';
import fs from 'fs';
import {
  createOrUpdateUser,
  getUserByWhatsAppId,
  getFaqAnswer,
  logQuery,
} from '../services/dbServices';
import { queryGenerativeAI } from '../services/germini';
  
const QR_FILE_PATH = './qr-code.json';
const QR_IMAGE_PATH = './qr-code.png';

export class WhatsAppBot {
  private client: Client;
  private qrCodeGenerated: boolean;
  private userSessions: Map<string, string>;

  constructor() {
    const clientOptions: any = {
      authStrategy: new LocalAuth(),
      dataPath: './session',
    };
    
    if (process.env.NODE_ENV === 'production') {
      clientOptions.puppeteer = {
        executablePath: '/usr/bin/chromium-browser',
        userDataDir: '/home/ubuntu/puppeteer_profile',
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-extensions',
          '--disable-gpu',
        ],
      };
    }    

    this.client = new Client(clientOptions);
    this.qrCodeGenerated = false;
    this.userSessions = new Map();

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

    this.client.on('message', async (message: Message) => {
      const userId = message.from;
      if(!userId) return console.log(`Invalid userId: ${userId}`);

      console.log(`Message received from ${userId}:`, message.body);

      if (!this.userSessions.has(userId)) {
        this.userSessions.set(userId, '');
        await message.reply("Hi! I'm Chaty, your support assistant. What's your name?");
        return;
      }

      const userName = this.userSessions.get(userId);

      if (!userName) {
        this.userSessions.set(userId, message.body);
        await createOrUpdateUser(userId, message.body);
        await message.reply(`Nice to meet you, ${message.body}! How can I assist you today? you can type 'help' to see a list of commands`);
        return;
      }

      const query = message.body.toLowerCase();

      if (query === 'help') {
        await message.reply("type: 'exit' to end the session and 'reset' to reset the session");
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

      const faqAnswer = await getFaqAnswer(query);
      let aiResponse = 'AI generated response';
      if (faqAnswer) {
        await message.reply(faqAnswer);
      } else {
        aiResponse = process.env.NODE_ENV === 'test' ? 'AI generated response' : await queryGenerativeAI(query);
        await message.reply(aiResponse);
      }

      const user = await getUserByWhatsAppId(userId);
      if (user) {
        await logQuery(user.id, query, faqAnswer || aiResponse);
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

  public async stop() {
    try {
      await this.client.destroy();
      console.log('WhatsApp bot stopped');
    } catch (err) {
      console.error('Error stopping WhatsApp bot:', err);
    }
  }
}
