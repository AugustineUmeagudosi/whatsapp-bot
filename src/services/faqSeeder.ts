import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function seedFAQs() {
  const faqs = [
    {
      question: 'What is your return policy?',
      answer: 'Our return policy is 8 - 10 business days from the day of purchase.',
    },
    {
      question: 'What are your business hours?',
      answer: 'I am online 24/7.',
    },
  ];

  try {
    // Check if FAQs already exist
    const existingFAQs = await prisma.fAQ.findMany();
    
    if (existingFAQs.length > 0) {
      console.log('FAQs already exist in the database. No new records were added.');
      return;
    }

    // Seed the FAQs
    console.log('Seeding FAQs...');
    for (const faq of faqs) {
      await prisma.fAQ.create({ data: faq });
    }

    console.log('FAQs seeded successfully!');
  } catch (error) {
    console.error('Error seeding FAQs:', error);
  } finally {
    await prisma.$disconnect();
  }
}
