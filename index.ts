import express, { Request, Response } from 'express';
import helmet from 'helmet';
import { WhatsAppBot } from './src/botHandler/whatsappBot';

const bot = new WhatsAppBot();
bot.initialize();

const app = express();
app.use(express.json());
app.use(helmet);

// Basic routes
app.get('/', (req: Request, res: Response) => {
  res.send('Hello!, Welcome to Chatty!');
});

app.get('/api/ping', (req: Request, res: Response) => {
  res.json({ message: 'Pong!' });
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
