import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  service: 'gmail', // Nodemailer ya conoce la configuración interna de Gmail
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_PW,
  },
});

export const enviarCorreoGenerico = async (destinatario: string, asunto: string, texto: string) => {
  try {
    const info = await transporter.sendMail({
      from: `TT Tournament App Admin`,
      to: destinatario,
      subject: asunto,
      text: 'TEXTO EN CASO DE NO FUNCIONAR HTML',
      html: texto,
    });

    console.log('Correo enviado con éxito. ID:', info.messageId);
    return true;
  } catch (error) {
    console.error('Error en el servicio de correo:', error);
    throw error;
  }
};
