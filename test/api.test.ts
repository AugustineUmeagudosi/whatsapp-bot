import { expect } from 'chai';
import request from 'supertest';
import { app, server, bot } from '../index';

describe('API Tests', () => {
  after(async () => {
    if (bot) {
      await bot.stop();
    }
    server.close();
  });

  it('should respond to GET / with a welcome message', async () => {
    const res = await request(app).get('/');
    expect(res.status).to.equal(200);
    expect(res.text).to.equal('Hello!, Welcome to Chatty!');
  });

  it('should respond to GET /api/ping with a pong message', async () => {
    const res = await request(app).get('/api/ping');
    expect(res.status).to.equal(200);
    expect(res.body).to.have.property('message', 'Pong!');
  });

  it('should respond with a 404 message for non registered routes', async () => {
    const res = await request(app).get('/invalid-route');
    expect(res.status).to.equal(404);
    expect(res.body).to.have.property('message', 'The resource you are looking for was not found!');
  });
});
