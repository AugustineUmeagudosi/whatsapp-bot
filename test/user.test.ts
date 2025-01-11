import { expect } from 'chai';
import prisma from '../src/prismaClient';

describe('Prisma User model', () => {
  before(async () => {
    // Clear database before tests
    await prisma.user.deleteMany();
  });

  after(async () => {
    // Disconnect the Prisma client after tests
    await prisma.$disconnect();
  });

  it('should create a new user', async () => {
    const user = await prisma.user.create({
      data: {
        email: 'test@example.com',
        name: 'Test User',
      },
    });
    expect(user).to.have.property('id');
    expect(user.email).to.equal('test@example.com');
  });

  it('should retrieve a user by email', async () => {
    const user = await prisma.user.findUnique({
      where: { email: 'test@example.com' },
    });
    expect(user).to.not.be.null;
    expect(user?.email).to.equal('test@example.com');
  });
});
