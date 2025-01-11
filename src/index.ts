import express from 'express';
import prisma from './prismaClient';

const app = express();
app.use(express.json());

// API to create a new user
app.post('/users', async (req, res) => {
  const { phone, name } = req.body;

  if (!phone) {
    return res.status(400).json({ error: 'phone is required' });
  }

  try {
    const newUser = await prisma.user.create({
      data: { phone, name },
    });
    res.status(201).json(newUser);
  } catch (error: any) {
    if (error.code === 'P2002') {
      res.status(409).json({ error: 'phone already exists' });
    } else {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});