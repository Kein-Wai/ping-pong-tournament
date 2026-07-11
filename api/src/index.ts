import express from 'express';
import apiRoutes from './routes';
import { setupSwagger } from './swagger';

export const app = express();
const PORT = 3000;

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
