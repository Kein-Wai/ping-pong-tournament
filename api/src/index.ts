import express from 'express';
import apiRoutes from './routes';
import { setupSwagger } from './swagger/index';
import cors from 'cors';
import helmet from 'helmet';
import dns from 'dns';
import prisma from './db';
import { ensureCurrentSeason } from './utils/season';
import { assertRequiredEnv, REQUIRED_ENV_VARS } from './config';
import { errorHandler } from './http/error-handler';
import { apiLimiter } from './middleware/rate-limit';

dns.setDefaultResultOrder('ipv4first');
export const app = express();
const PORT = process.env.PORT || 3000;

// La API vive detrás del proxy del hosting: sin esto todas las peticiones parecerían venir de su IP
// y los limitadores por IP bloquearían a todos a la vez.
app.set('trust proxy', 1);

// Swagger UI necesita scripts en línea que la política de helmet bloquea: se monta antes que él.
setupSwagger(app);

app.use(
  helmet({
    // Los iconos de los correos se cargan desde el cliente de correo, otro origen.
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  }),
);

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

app.use('/api', apiLimiter, apiRoutes);

app.get('/', (req, res) => {
  res.send('¡API funcionando correctamente!');
});

// Middleware central de errores: debe montarse DESPUES de las rutas para que
// capture los errores que propagan los handlers asincronos.
app.use(errorHandler);

if (process.env.NODE_ENV !== 'test') {
  // Fail-fast: sin estos secretos la aplicación no debe arrancar.
  assertRequiredEnv(process.env, [...REQUIRED_ENV_VARS]);

  const bootstrap = async () => {
    // La temporada vigente se inicializa UNA SOLA VEZ, al arrancar. A partir de
    // aquí el resto de la app solo la lee (resolveCurrentSeason).
    try {
      await ensureCurrentSeason(prisma);
    } catch (error) {
      console.error('No se pudo inicializar la temporada vigente:', error);
    }

    app.listen(PORT, () => {
      console.info(`Servidor corriendo en http://localhost:${PORT}`);
    });
  };

  void bootstrap();
}
