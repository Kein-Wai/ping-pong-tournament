import { Avatar, Center, Group, Modal, Paper, ScrollArea, Stack, Text } from '@mantine/core';

import type { User } from '../../types/api';
import { getPlayerAvatar } from '../../utils/avatar';

interface AttendeesModalProps {
  opened: boolean;
  attendees: User[];
  onClose: () => void;
}

/** Modal «Jugadores que asistieron» a una sesión pasada. */
export const AttendeesModal = ({ opened, attendees, onClose }: AttendeesModalProps) => (
  <Modal
    opened={opened}
    onClose={onClose}
    title={
      <Text size="lg" fw={700}>
        Jugadores que asistieron
      </Text>
    }
    centered
  >
    <ScrollArea h={300} offsetScrollbars>
      <Stack gap="sm">
        {attendees.length === 0 ? (
          <Center py="xl">
            <Text c="dimmed">No hay registros de asistencia.</Text>
          </Center>
        ) : (
          attendees.map((p) => (
            <Paper key={p.id} withBorder p="xs" radius="md">
              <Group wrap="nowrap">
                <Avatar src={getPlayerAvatar(p.name, p.avatarUrl)} radius="xl" size="sm" />
                <Text size="sm" fw={600}>
                  {p.name} {p.surname}
                </Text>
              </Group>
            </Paper>
          ))
        )}
      </Stack>
    </ScrollArea>
  </Modal>
);
