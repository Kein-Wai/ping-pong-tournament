import { Anchor, Button, Center, Divider, Text } from '@mantine/core';
import { GoogleLogin, type CredentialResponse } from '@react-oauth/google';
import { IconBrandGoogle } from '@tabler/icons-react';
import { Capacitor } from '@capacitor/core';

interface GoogleSectionProps {
  loading: boolean;
  onNativeLogin: () => void;
  onWebSuccess: (credentialResponse: CredentialResponse) => void;
  onWebError: () => void;
  onOpenPrivacy: () => void;
}

export const GoogleSection = ({
  loading,
  onNativeLogin,
  onWebSuccess,
  onWebError,
  onOpenPrivacy,
}: GoogleSectionProps) => (
  <>
    {/* 4. RENDERIZADO CONDICIONAL DE GOOGLE LOGIN */}
    <Divider label="O continuar con" labelPosition="center" my="lg" />
    <Text size="xs" c="dimmed" ta="center" mb="sm" px="sm">
      Al iniciar sesión o registrarte con Google, confirmas ser mayor de 14 años y aceptas nuestra{' '}
      <Anchor onClick={onOpenPrivacy} c="cyan">
        Política de Privacidad
      </Anchor>
      .
    </Text>
    <Center>
      {Capacitor.isNativePlatform() ? (
        /* Botón nativo para iOS y Android */
        <Button
          variant="default"
          fullWidth
          leftSection={<IconBrandGoogle size={18} />}
          onClick={onNativeLogin}
          loading={loading}
          style={{
            backgroundColor: '#ffffff',
            color: '#000000',
            borderColor: '#dadce0',
          }}
        >
          Continuar con Google
        </Button>
      ) : (
        /* Componente oficial de Google para Web */
        <GoogleLogin onSuccess={onWebSuccess} onError={onWebError} useOneTap={false} />
      )}
    </Center>
  </>
);
