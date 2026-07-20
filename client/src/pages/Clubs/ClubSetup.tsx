import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Card,
  Title,
  Text,
  TextInput,
  Button,
  Stack,
  Center,
  ThemeIcon,
  Group,
  Container,
} from '@mantine/core';
import { IconBuildingCommunity, IconRocket } from '@tabler/icons-react';
import { api } from '../../api/axios';
import { ENDPOINTS } from '../../api/endpoints';
import { useAuthStore } from '../../store/authStore';
import { Autocomplete } from '@mantine/core';
import { LOCALIZACIONES_ESPANA } from '../../constants/localizaciones';

export const ClubSetup = () => {
  const navigate = useNavigate();
  const { updateUserFields } = useAuthStore();

  const [loading, setLoading] = useState(false);
  const [name, setName] = useState('');
  const [city, setCity] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await api.post(ENDPOINTS.CLUBS.BASE, { name, city });

      if (response.data.success) {
        updateUserFields({
          clubId: response.data.data.id,
          clubStatus: 'Aprobado',
        });

        navigate('/');
      }
    } catch (error) {
      console.error('Error al registrar la sede:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Center style={{ height: '100vh', backgroundColor: 'var(--mantine-color-gray-0)' }}>
      <Container size="xs" w="100%" maw={450}>
        <Card shadow="xl" padding="xl" radius="md" withBorder>
          <Stack gap="md" align="center" ta="center">
            <ThemeIcon size={60} radius="xl" color="orange" variant="light">
              <IconBuildingCommunity size={34} />
            </ThemeIcon>

            <Title order={2}>Configura tu Sede</Title>
            <Text c="dimmed" size="sm">
              ¡Bienvenido! Has registrado una cuenta de administración. Para comenzar a operar,
              necesitamos los datos de tu club. Esta información será validada por el administrador
              de la aplicacion.
            </Text>

            <form onSubmit={handleSubmit} style={{ width: '100%', marginTop: '1rem' }}>
              <Stack gap="md">
                <TextInput
                  label="Nombre Oficial del Club"
                  placeholder="Ej. Club de Tenis de Mesa Madrid"
                  required
                  value={name}
                  onChange={(e) => setName(e.currentTarget.value)}
                />

                <Autocomplete
                  label="Ciudad base"
                  placeholder="Ej. Onda, Vila-real, Castellón..."
                  required
                  value={city}
                  onChange={setCity}
                  data={LOCALIZACIONES_ESPANA} // 👈 En el futuro, esto se sustituye por una llamada a una API
                  limit={5}
                  maxDropdownHeight={200}
                />

                <Button
                  type="submit"
                  color="orange"
                  size="md"
                  fullWidth
                  mt="sm"
                  loading={loading}
                  leftSection={<IconRocket size={18} />}
                >
                  Registrar Club
                </Button>
              </Stack>
            </form>
          </Stack>
        </Card>
      </Container>
    </Center>
  );
};
