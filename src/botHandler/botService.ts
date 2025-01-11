import prisma from '../../prisma/prismaClient';

export async function createOrUpdateUser(whatsappId: string, name: string) {
  try {
    await prisma.user.upsert({
      where: { phone: whatsappId.replace(/\D/g, '') },
      update: { name },
      create: {
        phone: whatsappId.replace(/\D/g, ''),
        name,
      },
    });
  } catch (error) {
    console.error('Error creating/updating user:', error);
  }
}

export async function getUserByWhatsAppId(whatsappId: string) {
  try {
    return await prisma.user.findUnique({
      where: { phone: whatsappId.replace(/\D/g, '') },
    });
  } catch (error) {
    console.error('Error fetching user:', error);
    return null;
  }
}

export async function getFaqAnswer(query: string): Promise<string | null> {
  try {
    const faq = await prisma.fAQ.findFirst({
      where: { question: { contains: query, mode: 'insensitive' } },
    });
    return faq?.answer || null;
  } catch (error) {
    console.error('Error fetching FAQ from database:', error);
    return null;
  }
}

export async function logQuery(userId: number, query: string, response: string) {
  try {
    await prisma.queryLog.create({
      data: {
        userId,
        question: query,
        answer: response,
      },
    });
  } catch (error) {
    console.error('Error logging query to database:', error);
  }
}
