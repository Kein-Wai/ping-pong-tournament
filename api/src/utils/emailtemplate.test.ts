import { describe, it, expect } from 'vitest';
import {
  templateInscripcionTorneo,
  templateRecordatorioTorneo,
  templateAceptacionClub,
  templateRecordatorioEvento,
  templateCambioFechaEvento,
  templateCuentaCreada,
  templateRegistro,
  templateResetPassword,
} from './emailtemplate';

const PAYLOAD = '<script>alert(1)</script>';
const ESCAPED = '&lt;script&gt;alert(1)&lt;/script&gt;';

// Los nombres de torneos, clubes y eventos los escriben los usuarios y acaban en el HTML de un
// correo que reciben otros: sin escapar, un nombre con etiquetas inyecta contenido en el mensaje.
describe('plantillas de correo: los datos de usuario se escapan', () => {
  it.each([
    ['inscripción a torneo (nombre del torneo)', () => templateInscripcionTorneo('Ana', { name: PAYLOAD, dateStart: new Date('2026-11-20T10:00:00Z') })],
    ['inscripción a torneo (nombre del jugador)', () => templateInscripcionTorneo(PAYLOAD, { name: 'Open', dateStart: new Date('2026-11-20T10:00:00Z') })],
    ['recordatorio de torneo', () => templateRecordatorioTorneo('Ana', { name: PAYLOAD })],
    ['aceptación en un club', () => templateAceptacionClub('Ana', { name: PAYLOAD })],
    ['recordatorio de evento (nombre)', () => templateRecordatorioEvento('Ana', { name: PAYLOAD, date: new Date(), location: null })],
    ['recordatorio de evento (lugar)', () => templateRecordatorioEvento('Ana', { name: 'Cena', date: new Date(), location: PAYLOAD })],
    ['cambio de fecha de evento', () => templateCambioFechaEvento('Ana', { name: PAYLOAD, date: new Date(), endDate: null })],
    ['cuenta creada (nombre)', () => templateCuentaCreada(PAYLOAD, 'ana@test.com', 'Clave1!')],
    ['registro (nombre)', () => templateRegistro(PAYLOAD, 'tok')],
    ['recuperación de contraseña (nombre)', () => templateResetPassword(PAYLOAD, 'tok')],
  ])('%s', (_name, render) => {
    const html = render();

    expect(html).not.toContain(PAYLOAD);
    expect(html).toContain(ESCAPED);
  });

  it('una contraseña temporal con símbolos se muestra tal cual la escribirá el usuario', () => {
    const html = templateCuentaCreada('Ana', 'ana@test.com', 'a&b<c');

    expect(html).toContain('a&amp;b&lt;c');
  });

  it('un cambio de fecha con fecha de fin la incluye', () => {
    const html = templateCambioFechaEvento('Ana', { name: 'Cena', date: new Date('2026-11-20T10:00:00Z'), endDate: new Date('2026-11-20T12:00:00Z') });

    expect(html).toContain('Hasta:');
  });
});
