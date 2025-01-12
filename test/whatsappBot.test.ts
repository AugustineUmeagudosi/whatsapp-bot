import { expect } from 'chai';
import * as sinon from 'sinon';
import * as proxyquire from 'proxyquire';
import { Message } from 'whatsapp-web.js';

proxyquire.noCallThru();

describe('WhatsAppBot', () => {
  let bot: any;
  let sandbox: sinon.SinonSandbox;
  let mockClient: {
    on: sinon.SinonStub;
    initialize: sinon.SinonStub;
    destroy: sinon.SinonStub;
    sendMessage: sinon.SinonStub;
  };

  before(() => {
    sandbox = sinon.createSandbox();

    // Mock Client methods
    mockClient = {
      on: sandbox.stub(),
      initialize: sandbox.stub(),
      destroy: sandbox.stub(),
      sendMessage: sandbox.stub(),
    };

    const mockLocalAuth = sandbox.stub();

    const WhatsAppBot = proxyquire.load('../src/botHandler/whatsappBot', {
      'whatsapp-web.js': {
        Client: sandbox.stub().returns(mockClient),
        LocalAuth: mockLocalAuth,
      },
      qrcode: {
        toFile: sandbox.stub().resolves(),
        toString: sandbox.stub().resolves(),
      },
      fs: {
        writeFileSync: sandbox.stub(),
        existsSync: sandbox.stub().returns(false),
      },
      '../services/dbServices': {
        createOrUpdateUser: sandbox.stub().resolves(),
        getUserByWhatsAppId: sandbox.stub().resolves(),
        getFaqAnswer: sandbox.stub().resolves('The weather today is sunny.'),
        logQuery: sandbox.stub().resolves(),
      },
      '../services/germini': {
        queryGenerativeAI: sandbox.stub().resolves('AI generated response'),
      },
    }).WhatsAppBot;

    bot = new WhatsAppBot();
  });

  it('should generate QR code on initialization', async () => {
    const qrCode = 'qrCodeString';
    mockClient.on.withArgs('qr').callsFake((event: string, handler: (arg0: string) => void) => {
      if (event === 'qr') handler(qrCode);
    });

    await bot.initialize();
    expect(mockClient.on.calledWith('qr')).to.be.true;
    expect(mockClient.initialize.called).to.be.true;
  });

  it('should handle new user message', async () => {
    const userId = '123';
    const userName = 'John Doe';
    const message: Message = { from: userId, body: userName } as Message;
  
    mockClient.on.withArgs('message').callsFake((event: string, handler: (arg0: Message) => void) => {
      console.log('Event triggered:', event);
      if (event === 'message') handler(message);
    });
  
    await bot.initialize();
    console.log('User sessions:', bot.userSessions);
    console.log('SendMessage calls:', mockClient.sendMessage.args);
  
    expect(bot.userSessions.get(userId)).to.equal(userName);
    expect(mockClient.sendMessage.calledWith(userId, sinon.match.string)).to.be.true;
  });
  

  it('should handle existing user query with FAQ answer', async () => {
    const userId = '123';
    const query = 'What is the weather today?';
    const message: Message = { from: userId, body: query } as Message;

    bot.userSessions.set(userId, 'John Doe');
    mockClient.on.withArgs('message').callsFake((event: string, handler: (arg0: Message) => void) => {
      if (event === 'message') handler(message);
    });

    await bot.initialize();
    expect(mockClient.sendMessage.calledWith(userId, 'The weather today is sunny.')).to.be.true;
  });

  it('should handle existing user query with AI response', async () => {
    // Arrange
    const userId = '123';
    const query = 'Tell me a joke.';
    const aiResponse = 'Why don’t scientists trust atoms? Because they make up everything!';
    const message: Message = { from: userId, body: query } as Message;

    bot.userSessions.set(userId, 'John Doe');
    sandbox.stub(bot, 'getFaqAnswer').resolves(null);
    sandbox.stub(bot, 'queryGenerativeAI').resolves(aiResponse);

    mockClient.on.withArgs('message').callsFake((event: string, handler: (arg0: Message) => void) => {
      if (event === 'message') handler(message);
    });

    await bot.initialize();
    expect(mockClient.sendMessage.calledWith(userId, aiResponse)).to.be.true;
  });

  it('should handle "exit" command', async () => {
    const userId = '123';
    const message: Message = { from: userId, body: 'exit' } as Message;

    bot.userSessions.set(userId, 'John Doe');
    mockClient.on.withArgs('message').callsFake((event: string, handler: (arg0: Message) => void) => {
      if (event === 'message') handler(message);
    });

    await bot.initialize();
    expect(mockClient.sendMessage.calledWith(userId, 'Your session has been ended. Have a great day!')).to.be.true;
    expect(bot.userSessions.has(userId)).to.be.false;
  });

  it('should handle "reset" command', async () => {
    const userId = '123';
    const message: Message = { from: userId, body: 'reset' } as Message;

    bot.userSessions.set(userId, 'John Doe');
    mockClient.on.withArgs('message').callsFake((event: string, handler: (arg0: Message) => void) => {
      if (event === 'message') handler(message);
    });

    await bot.initialize();
    expect(mockClient.sendMessage.calledWith(userId, "Let's start over. What's your name?")).to.be.true;
    expect(bot.userSessions.get(userId)).to.equal('');
  });
});