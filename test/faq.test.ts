import { expect } from 'chai';
import prisma from '../prisma/prismaClient';

describe('FAQ Database Tests', () => {
  before(async () => {
    await prisma.fAQ.create({
      data: { question: 'What is your return policy?', answer: 'You can return within 30 days.' },
    });
  });

  after(async () => {
    await prisma.fAQ.deleteMany();
  });

  it('should retrieve FAQs', async () => {
    const faqs = await prisma.fAQ.findMany();
    expect(faqs).to.have.lengthOf(1);
  });
});
