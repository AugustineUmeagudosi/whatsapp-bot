import { Client, Message } from 'whatsapp-web.js';
import qr from 'qrcode';
import fs from 'fs';
import prisma from './prisma/prismaClient';

const SESSION_FILE_PATH = './session.json';
const QR_FILE_PATH = './qr-code.json';
const QR_IMAGE_PATH = './qr-code.png';

interface QRData {
  code: string;
  timestamp: number;
  expiresIn: number;
  displayed: boolean; // New field to track if QR has been displayed
}

class WhatsAppBot {
  private client: Client;
  private sessionData: any;
  private qrData: QRData | null = null;
  private readonly QR_VALIDITY_PERIOD = 30 * 24 * 60 * 60 * 1000; // 30 days in milliseconds

  constructor() {
    this.loadQRCode();

    this.client = new Client({
      session: this.sessionData || undefined,
    });

    this.setupEventHandlers();
  }

  private loadQRCode() {
    if (fs.existsSync(QR_FILE_PATH)) {
      this.qrData = JSON.parse(fs.readFileSync(QR_FILE_PATH, 'utf-8'));
      
      if (this.isQRCodeExpired()) {
        this.qrData = null;
        this.cleanupQRFiles();
      }
    }
  }

  private isQRCodeExpired(): boolean {
    if (!this.qrData) return true;
    const now = Date.now();
    return now - this.qrData.timestamp >= this.qrData.expiresIn;
  }

  private cleanupQRFiles() {
    if (fs.existsSync(QR_FILE_PATH)) fs.unlinkSync(QR_FILE_PATH);
    if (fs.existsSync(QR_IMAGE_PATH)) fs.unlinkSync(QR_IMAGE_PATH);
  }

  private async generateTerminalQR(code: string): Promise<string> {
    return new Promise((resolve, reject) => {
      qr.toString(code, { type: 'terminal', small: true }, (err: any, string: string | PromiseLike<string>) => {
        if (err) reject(err);
        resolve(string);
      });
    });
  }

  private async saveQRCode(code: string) {
    this.qrData = {
      code,
      timestamp: Date.now(),
      expiresIn: this.QR_VALIDITY_PERIOD,
      displayed: false // Initialize as not displayed
    };

    // Save QR code data to JSON file
    fs.writeFileSync(QR_FILE_PATH, JSON.stringify(this.qrData), 'utf-8');
    
    try {
      // Generate and save QR code image
      await qr.toFile(QR_IMAGE_PATH, code, {
        errorCorrectionLevel: 'M',
        scale: 8,
        margin: 4,
        color: {
          dark: '#000000',
          light: '#ffffff'
        }
      });
      
      if (!this.qrData.displayed) {
        // Generate and display terminal QR code only if not shown before
        const terminalQR = await this.generateTerminalQR(code);
        console.log('Scan this QR code on WhatsApp to log in:');
        console.log(terminalQR);
        console.log(`QR code also saved as ${QR_IMAGE_PATH}`);
        
        // Mark as displayed and save the updated state
        this.qrData.displayed = true;
        fs.writeFileSync(QR_FILE_PATH, JSON.stringify(this.qrData), 'utf-8');
      }
    } catch (error) {
      console.error('Error generating QR code:', error);
    }
  }

  private setupEventHandlers() {
    this.client.on('qr', async (qr) => {
      if (!this.qrData || this.isQRCodeExpired()) {
        console.log('Generating new QR code...');
        await this.saveQRCode(qr);
      }
    });

    this.client.on('authenticated', (session) => {
      console.log('Authenticated successfully!');
      fs.writeFileSync(SESSION_FILE_PATH, JSON.stringify(session), 'utf-8');
      this.sessionData = session;
    });

    this.client.on('ready', () => {
      console.log('WhatsApp bot is ready!');
    });

    this.client.on('auth_failure', (msg) => {
      console.error('Authentication failed:', msg);
      if (fs.existsSync(SESSION_FILE_PATH)) {
        fs.unlinkSync(SESSION_FILE_PATH);
      }
      this.cleanupQRFiles();
      this.qrData = null;
      console.log('Session and QR files deleted. Restart the app to generate a new QR code.');
    });

    this.client.on('disconnected', (reason) => {
      console.log('Client was logged out:', reason);
      if (fs.existsSync(SESSION_FILE_PATH)) {
        fs.unlinkSync(SESSION_FILE_PATH);
      }
      this.cleanupQRFiles();
      this.qrData = null;
      console.log('Session and QR files deleted. Restart the app to log in again.');
    });

    this.client.on('message', this.handleMessage.bind(this));
  }

  private async handleMessage(message: Message) {
    const userId = parseInt(message.from.replace(/\D/g, ''));

    try {
      let user = await prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        if (message.body.toLowerCase().startsWith('hi') || message.body.toLowerCase().startsWith('hello')) {
          message.reply("Hi! I'm Chaty, your support assistant. What's your name?");
        } else if (message.body.trim()) {
          user = await prisma.user.create({
            data: {
              id: userId,
              name: message.body.trim(),
            },
          });
          message.reply(`Nice to meet you, ${user.name}! How can I assist you today?`);
        } else {
          message.reply("I didn't catch that. Could you tell me your name?");
        }
      } else {
        message.reply(`Hello again, ${user.name}! How can I assist you today?`);
      }
    } catch (error) {
      console.error('Error handling message:', error);
      message.reply('Oops! Something went wrong. Please try again later.');
    }
  }

  public initialize() {
    this.client.initialize();
  }
}

const bot = new WhatsAppBot();
bot.initialize();