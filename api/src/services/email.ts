import { google } from 'googleapis';
import nodemailer from 'nodemailer';

const OAuth2 = google.auth.OAuth2;

const createGmailClient = () => {
  const oauth2Client = new OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    'https://developers.google.com/oauthplayground',
  );

  oauth2Client.setCredentials({
    refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
  });

  return google.gmail({ version: 'v1', auth: oauth2Client });
};

export const enviarCorreoGenerico = async (
  destinatario: string,
  asunto: string,
  htmlCuerpo: string,
) => {
  try {
    // 1. Crear el mensaje MIME RFC 2822
    const transporter = nodemailer.createTransport({
      streamTransport: true,
      newline: 'windows',
    });

    const mailInfo = await transporter.sendMail({
      from: `"PingPong Tournaments" <${process.env.GMAIL_USER}>`,
      to: destinatario,
      subject: asunto,
      html: htmlCuerpo,
    });

    // 2. Extraer el Buffer con discriminación de tipos para TypeScript
    let rawBuffer: Buffer;

    if (Buffer.isBuffer(mailInfo.message)) {
      rawBuffer = mailInfo.message;
    } else {
      const stream = mailInfo.message;
      rawBuffer = await new Promise<Buffer>((resolve, reject) => {
        const chunks: Buffer[] = [];
        stream.on('data', (chunk: Buffer) => chunks.push(chunk));
        stream.on('end', () => resolve(Buffer.concat(chunks)));
        stream.on('error', reject);
      });
    }

    // 3. Codificar a Base64URL
    const encodedMessage = rawBuffer
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    // 4. Enviar a través de la API REST de Gmail (HTTPS)
    const gmail = createGmailClient();
    const response = await gmail.users.messages.send({
      userId: 'me',
      requestBody: {
        raw: encodedMessage,
      },
    });

    console.log('Correo entregado con éxito a Gmail. ID:', response.data.id);
    return true;
  } catch (error) {
    console.error('Error enviando correo:', error);
    throw error;
  }
};
