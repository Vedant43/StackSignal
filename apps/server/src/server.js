import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import clientRouter from './routes/auth/client.auth.js';
import feedbackRouter from './routes/feedback.js';
import { errorHandler } from './utils/errorHandler.js';
dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

app.use(express.json());

const corsOptions = {
  origin: ['http://localhost:3000', 'http://localhost:4000', process.env.WIDGET_URL, process.env.CLIENT_URL],
  credentials: true
};

app.use(cors(corsOptions));

app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`);
  next();
});

app.use('/api/v1/auth/client', clientRouter);
app.use('/api/v1/bug', feedbackRouter);
// app.use('/api/v1/auth/user', userRouter);

app.use(errorHandler);

// if (process.env.NODE_ENV !== 'production') {
//   app.listen(PORT, () => {
//     console.log(`Backend listening on http://localhost:${PORT}`);
//   });
// }

export default app;