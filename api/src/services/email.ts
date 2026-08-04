import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    type: 'OAuth2',
    user: process.env.GMAIL_USER,
    clientId: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    refreshToken: process.env.GOOGLE_REFRESH_TOKEN,
  },
});

export const enviarCorreoGenerico = async (destinatario: string, asunto: string, texto: string) => {
  try {
    const info = await transporter.sendMail({
      from: `TT Tournament App Admin`,
      to: destinatario,
      subject: asunto,
      html: texto,
    });

    console.log('Correo enviado con éxito. ID:', info.messageId);
    return true;
  } catch (error) {
    console.error('Error en el servicio de correo:', error);
    throw error;
  }
};
