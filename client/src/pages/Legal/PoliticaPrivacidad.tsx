import { Container, Title, Text, Stack, Paper, Button } from '@mantine/core';
import { IconArrowLeft } from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';

export const PoliticaPrivacidad = () => {
  const navigate = useNavigate();

  return (
    <Container size="md" py="xl">
      <Button
        variant="subtle"
        leftSection={<IconArrowLeft size={16} />}
        onClick={() => navigate(-1)}
        mb="md"
      >
        Volver
      </Button>

      <Paper withBorder p="xl" radius="md" shadow="sm">
        <Stack gap="md">
          <Title order={1}>Política de Privacidad y Protección de Datos</Title>
          <Text size="sm" c="dimmed">
            Última actualización: {new Date().toLocaleDateString('es-ES')}
          </Text>

          <Title order={3} mt="md">
            1. Responsable del Tratamiento
          </Title>
          <Text size="sm">
            Los datos personales recabados a través de esta plataforma (en adelante, la
            "Aplicación") serán tratados por los administradores del club deportivo correspondiente
            (ej. CTM Costa Azahar) que utilicen el software para la gestión de su entidad.
          </Text>

          <Title order={3} mt="md">
            2. Finalidad y Legitimación
          </Title>
          <Text size="sm">
            La recogida y tratamiento de los datos personales (Nombre, Apellidos, Correo Electrónico
            y Fecha de Nacimiento) tiene como única finalidad la gestión deportiva, organización de
            torneos, cálculo de clasificaciones (ELO) y comunicaciones estrictamente relacionadas
            con la actividad del club.
            <br />
            <br />
            La base legal para el tratamiento es el <strong>consentimiento explícito</strong> del
            usuario al registrarse o el consentimiento recabado por el club al dar de alta al
            jugador de forma manual.
          </Text>

          <Title order={3} mt="md">
            3. Datos de Menores de Edad
          </Title>
          <Text size="sm">
            De conformidad con la normativa española (LOPDGDD), el tratamiento de los datos
            personales de <strong>menores de 14 años</strong> requiere el consentimiento de sus
            padres o tutores legales. Al aceptar esta política, el usuario declara ser mayor de 14
            años o, en su defecto, contar con la autorización expresa y demostrable de su padre,
            madre o tutor legal.
          </Text>

          <Title order={3} mt="md">
            4. Almacenamiento y Proveedores (Encargados de Tratamiento)
          </Title>
          <Text size="sm">
            Para prestar el servicio, la Aplicación utiliza infraestructura en la nube proporcionada
            por terceros que cumplen con los estándares de seguridad del RGPD:
            <ul>
              <li>
                <strong>Base de datos:</strong> Alojada en Supabase (AWS), en servidores ubicados
                dentro de la Unión Europea (Frankfurt, Alemania).
              </li>
              <li>
                <strong>Alojamiento Backend/Frontend:</strong> Render Inc., bajo acuerdos de nivel
                de servicio que garantizan la confidencialidad de la información.
              </li>
            </ul>
            Tus datos no serán vendidos, cedidos ni transferidos a terceros con fines comerciales o
            publicitarios.
          </Text>

          <Title order={3} mt="md">
            5. Derechos del Usuario (Derechos ARCO)
          </Title>
          <Text size="sm">
            En cualquier momento, tienes derecho a solicitar el{' '}
            <strong>Acceso, Rectificación, Supresión (Olvido) o Portabilidad</strong> de tus datos.
            <br />
            Puedes ejercer estos derechos comunicándoselo directamente a los entrenadores o
            administradores de tu club, o eliminando tu cuenta a través de los canales
            proporcionados en la Aplicación. El borrado de la cuenta implicará la disociación
            inmediata de tus datos personales del historial de partidos.
          </Text>
        </Stack>
      </Paper>
    </Container>
  );
};
