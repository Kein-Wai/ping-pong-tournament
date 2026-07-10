import express from 'express';

const app = express();
const PORT = 3000;

app.get('/', (req, res) => {
  res.send('¡API funcionando correctamente!');
});

app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
