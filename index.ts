import express, { Request, Response } from 'express';
import helmet from 'helmet';
import { WhatsAppBot } from './src/botHandler/whatsappBot';

const app = express();
app.use(express.json());
app.use(helmet());

// Basic routes
app.get('/', (req: Request, res: Response) => {
  res.send('Hello!, Welcome to Chatty!');
});

app.get('/api/ping', (req: Request, res: Response) => {
  res.json({ message: 'Pong!' });
});

app.use('*', (req: Request, res: Response) => {
  res.status(404).json({ message: 'The resource you are looking for was not found!' });
});

let bot: WhatsAppBot | null = null;

if (process.env.NODE_ENV !== 'test') {
  bot = new WhatsAppBot();
  bot.initialize();
}

const server = app.listen(process.env.PORT || 3000, () => {
  console.log(`Server is running on http://localhost:${process.env.PORT || 3000}`);
});

export { app, server, bot };
