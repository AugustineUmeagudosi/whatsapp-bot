import qrcode from 'qrcode';
import { Client, LocalAuth, Message } from 'whatsapp-web.js';

export class WhatsAppBot {
  private client: Client;

  constructor() {
    this.client = new Client({
      authStrategy: new LocalAuth(),
    });

    this.setupEventHandlers();
  }

  private setupEventHandlers() {
    this.client.on('qr', async (qrCode: string) => {
      try {
        console.log('Scan this QR code with WhatsApp:');
        const terminalQR = await qrcode.toString(qrCode, { type: 'terminal', small: true });
        console.log(terminalQR); // Outputs a QR code to the terminal
      } catch (error) {
        console.error('Error generating QR code:', error);
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
      console.log('Message received:', message.body);
      if (message.body.toLowerCase() === 'hi') {
        message.reply('Hello! How can I assist you today?');
      }
    });

    this.client.on('message_ack', (message: Message, ack: number) => {
      const status = ['MESSAGE SENT', 'MESSAGE DELIVERED', 'MESSAGE READ', 'MESSAGE PLAYED'];
      console.log(`Message "${message.body}" acknowledgment status: ${status[ack] || 'UNKNOWN'}`);
    });
  }

  public initialize() {
    this.client.initialize();
  }
}
