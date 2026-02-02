import express from 'express';
import cors from 'cors';
import { config } from './config/index.js';
import jdsRouter from './routes/jds.js';
import candidatesRouter from './routes/candidates.js';
import aiRouter from './routes/ai.js';
import dictRouter from './routes/dict.js';

const app = express();

app.use(cors({ origin: config.corsOrigin }));
app.use(express.json());

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api/jds', jdsRouter);
app.use('/api/candidates', candidatesRouter);
app.use('/api/ai', aiRouter);
app.use('/api/dict', dictRouter);

app.listen(config.port, () => {
  console.log(`API Server running at http://localhost:${config.port}`);
});
