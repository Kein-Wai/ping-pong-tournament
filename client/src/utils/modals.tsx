import React from 'react';
import { openConfirmModal } from '@mantine/modals';
import { Text, Stack, Paper, Group, ThemeIcon } from '@mantine/core';

interface AppConfirmModalProps {
  title: string;
  icon: React.ReactNode;
  color?: string;
  description: string;
  highlightText: string;
  warningText?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void | Promise<void>;
}

export const openAppConfirmModal = ({
  title,
  icon,
  color = 'blue',
  description,
  highlightText,
  warningText,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  onConfirm,
}: AppConfirmModalProps) => {
  openConfirmModal({
    title: (
      <Group gap="xs">
        <ThemeIcon size="md" radius="md" color={color} variant="light">
          {icon}
        </ThemeIcon>
        <Text fw={700} size="md">
          {title}
        </Text>
      </Group>
    ),
    centered: true,
    radius: 'md',
    shadow: 'xl',
    overlayProps: {
      backgroundOpacity: 0.6,
      blur: 4, // El blur premium globalizado
    },
    withCloseButton: false,
    children: (
      <Stack gap="xs" py="md">
        <Text size="sm" c="dimmed">
          {description}
        </Text>
        <Paper
          withBorder
          p="sm"
          radius="sm"
          style={{ backgroundColor: `var(--mantine-color-${color}-light)` }}
        >
          <Text fw={700} size="md" c={`${color}.9`} ta="center">
            {highlightText}
          </Text>
        </Paper>
        {warningText && (
          <Text size="xs" c="dimmed" mt="xs">
            ⚠️ {warningText}
          </Text>
        )}
      </Stack>
    ),
    labels: { confirm: confirmLabel, cancel: cancelLabel },
    confirmProps: { color, radius: 'sm' },
    cancelProps: { variant: 'subtle', color: 'gray', radius: 'sm' },
    onConfirm,
  });
};
