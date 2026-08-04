import { google } from 'googleapis';

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
    const gmail = createGmailClient();

    // 1. Formatear cabeceras MIME y cuerpo en UTF-8
    const utf8Subject = `=?utf-8?B?${Buffer.from(asunto).toString('base64')}?=`;
    const messageParts = [
      `From: "TT Tournament App Admin" <${process.env.GMAIL_USER}>`,
      `To: ${destinatario}`,
      `Content-Type: text/html; charset=utf-8`,
      `MIME-Version: 1.0`,
      `Subject: ${utf8Subject}`,
      '',
      htmlCuerpo,
    ];
    const message = messageParts.join('\n');

    // 2. Codificar en Base64URL según los requisitos de Gmail REST API
    const encodedMessage = Buffer.from(message)
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    // 3. Envío sobre HTTPS (Puerto 443)
    const response = await gmail.users.messages.send({
      userId: 'me',
      requestBody: {
        raw: encodedMessage,
      },
    });

    console.log('Correo enviado con éxito vía Gmail REST API (HTTPS). ID:', response.data.id);
    return true;
  } catch (error) {
    console.error('Error crítico en Gmail REST API:', error);
    throw error;
  }
};
