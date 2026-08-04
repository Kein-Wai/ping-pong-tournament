import express from 'express';
import apiRoutes from './routes';
import { setupSwagger } from './swagger';
import cors from 'cors';

export const app = express();
const PORT = process.env.PORT || 3000;

app.use(
  cors({
    origin: [
      'http://localhost:5173',
      'https://tt-app-5mdc.onrender.com',
      'http://localhost',
      'capacitor://localhost',
    ], // La URL de tu Frontend Vite
    credentials: true,
  }),
);

app.use(express.json());
app.use(express.static('public'));
app.use(
  '/.well-known',
  express.static('public/.well-known', {
    setHeaders: (res, path) => {
      if (path.endsWith('apple-app-site-association')) {
        res.setHeader('Content-Type', 'application/json');
      }
    },
  }),
);

app.use('/api', apiRoutes);

setupSwagger(app);

app.get('/', (req, res) => {
  res.send('¡API funcionando correctamente!');
});

if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
  });
}
