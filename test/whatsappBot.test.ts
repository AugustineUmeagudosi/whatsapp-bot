import { expect } from 'chai';
import { Message } from 'whatsapp-web.js';

class MockClient {
  private events: Record<string, Function> = {};

  on(event: string, handler: Function) {
    this.events[event] = handler;
  }

  emit(event: string, ...args: any[]) {
    if (this.events[event]) {
      this.events[event](...args);
    }
  }

  initialize() {
    return Promise.resolve();
  }

  destroy() {
    return Promise.resolve();
  }
}

describe('WhatsAppBot', () => {
  let bot: any;
  let mockClient: MockClient;

  beforeEach(() => {
    mockClient = new MockClient();

    const mockLocalAuth = () => {};

    const WhatsAppBot = require('../src/botHandler/whatsappBot').WhatsAppBot;

    bot = new WhatsAppBot(mockClient, mockLocalAuth);
  });

  it('should generate QR code on initialization', async () => {
    const qrCode = 'qrCodeString';

    mockClient.on('qr', (code: string) => {
      expect(code).to.equal(qrCode);
    });

    await bot.initialize();
    mockClient.emit('qr', qrCode);
  });

  it('should handle existing user query with FAQ answer', async () => {
    const userId = '123';
    const query = 'What is the weather today?';
    const message: Message = {
      from: userId,
      body: query,
      reply: async (response: string) => {
        expect(response).to.equal('The weather today is sunny.');
      },
    } as unknown as Message;

    bot.userSessions.set(userId, 'John Doe');

    await bot.initialize();
    mockClient.emit('message', message);
  });

  it('should handle existing user query with AI response', async () => {
    const userId = '123';
    const query = 'Tell me a joke.';
    const aiResponse = 'Why don’t scientists trust atoms? Because they make up everything!';
    const message: Message = {
      from: userId,
      body: query,
      reply: async (response: string) => {
        expect(response).to.equal(aiResponse);
      },
    } as unknown as Message;

    bot.userSessions.set(userId, 'John Doe');
    bot.getFaqAnswer = async () => null;
    bot.queryGenerativeAI = async () => aiResponse;

    await bot.initialize();
    mockClient.emit('message', message);
  });
});