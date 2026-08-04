// src/utils/emailTemplates.ts

// 1. EL FRAME REUTILIZABLE (Layout)
const baseTemplate = (contentHtml: string) => {
  return `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <style>
        /* Aquí podemos poner algo de CSS básico que Gmail sí acepta */
        body { font-family: 'Helvetica Neue', Arial, sans-serif; background-color: #f4f4f5; margin: 0; padding: 20px; }
        .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
        .header { background-color: #111827; color: #ffffff; text-align: center; padding: 20px; }
        .header img { max-width: 100%; height: auto; display: block; }
        .content { padding: 30px; color: #374151; line-height: 1.6; }
        .footer { background-color: #f3f4f6; color: #9ca3af; text-align: center; padding: 15px; font-size: 12px; }
        .btn { display: inline-block; padding: 12px 24px; background-color: #3b82f6; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: bold; margin-top: 20px; }
      </style>
    </head>
    <body>
      <div class="container">
        <!-- CABECERA -->
        <div class="header">
        <img src="${process.env.API_URL}/assets/images/icon.png">
          <!-- Aquí incrustaremos tu imagen -->
          <h2>TT Tournament App</h2>
        </div>

        <!-- CUERPO DINÁMICO (Aquí se inyecta lo que cambie) -->
        <div class="content">
          ${contentHtml}
        </div>

        <!-- PIE DE PÁGINA REUTILIZABLE -->
        <div class="footer">
          <p>© 2024 TT Tournament App. Todos los derechos reservados.</p>
        </div>
      </div>
    </body>
    </html>
  `;
};

export const templateRegistro = (nombre: string, link: string) => {
  const contenidoEspecifico = `
    <h1 style="color: #111827;">¡Bienvenido/a a la pista, ${nombre}! 🏓</h1>
    <p>Estamos emocionados de tenerte en nuestra comunidad. Prepárate para competir, mejorar tu nivel y disfrutar de los mejores torneos de tenis de mesa.</p>
    <p>Tu cuenta ha sido creada con éxito.</p> 
    <p>Para poder confirmar tu email, dale al link y podras entrar en tu cuenta, buscar clubs y torneos abiertos</p>
    <a href="${process.env.API_URL}/api/auth/verify/${link}">Verificar mi cuenta</a>.
    <div style="text-align: center;">
      <a href="${process.env.CLIENT_URL}/login" class="btn">Empezar a jugar</a>
    </div>
  `;

  return baseTemplate(contenidoEspecifico);
};

export const templateInscripcionTorneo = (nombre: string, torneo: any) => {
  const contenidoEspecifico = `
    <h1 style="color: #111827;">¡Te has inscrito al torneo ${torneo.name}, ${nombre}! 🏓</h1>
    <p>Tu inscripcion al torneo llegara al admin del club.</p>
    <p>El torneo empezara el dia ${torneo.dateStart}.</p> 
    <p>¡Guarda la fecha en tu calendario!</p>
    <div style="text-align: center;">
      <a href="${process.env.CLIENT_URL}/login" class="btn">Empezar a jugar</a>
    </div>
  `;

  return baseTemplate(contenidoEspecifico);
};

export const templateRecordatorioTorneo = (nombre: string, torneo: any) => {
  const contenidoEspecifico = `
   <h1 style="color: #111827;">¡El torneo ${torneo.name} es mañana, ${nombre}! 🏓</h1>
    <p>Este es un recordatorio de que mañana empieza el torneo.</p>
    <p>¡Prepara tu raqueta y tus zapatillas, el dia ha llegado!.</p> 
    <div style="text-align: center;">
      <a href="${process.env.CLIENT_URL}/login" class="btn">Empezar a jugar</a>
    </div>
  `;

  return baseTemplate(contenidoEspecifico);
};

export const templateAceptacionClub = (nombre: string, club: any) => {
  const contenidoEspecifico = `
     <h1 style="color: #111827;">¡Bienvenido/a al club ${club.name}, ${nombre}! 🏓</h1>
    <p>Tu solicitud ha sido aprobada por el admin del club.</p>
    <p>Podras ver los torneos y ligas internas creadas de este club, asi como los partidos y estadisticas.</p>
    <p>¡Bienvenido!</p>
    <div style="text-align: center;">
      <a href="${process.env.CLIENT_URL}/login" class="btn">Empezar a jugar</a>
    </div>
  `;

  return baseTemplate(contenidoEspecifico);
};
