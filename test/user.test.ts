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
        phone: '+2347382',
        name: 'Test User',
      },
    });
    expect(user).to.have.property('id');
    expect(user.phone).to.equal('+2347382');
  });

  it('should retrieve a user by phone', async () => {
    const user = await prisma.user.findUnique({
      where: { phone: '+2347382' },
    });
    expect(user).to.not.be.null;
    expect(user?.phone).to.equal('+2347382');
  });
});
