import { ActionIcon, Badge, Button, Card, Center, Group, SimpleGrid, Text, Title } from '@mantine/core';
import { IconClipboardList, IconTrash } from '@tabler/icons-react';
import { formatDate } from '../../utils/dates';
import type { PlayerTraining } from '../../types/api';

/**
 * Historial de macrociclos de un jugador: una tarjeta por plan de entrenamiento y,
 * para los administradores, crear y borrar planes.
 *
 * Migration: extracción de la tarjeta de macrociclos de JugadorPerfil.
 */
export interface TrainingPlansCardProps {
  plans: PlayerTraining[];
  isAdmin: boolean;
  onCreatePlan: () => void;
  onOpenPlan: (planId: string) => void;
  onDeletePlan: (planId: string) => void;
}

export const TrainingPlansCard = ({
  plans,
  isAdmin,
  onCreatePlan,
  onOpenPlan,
  onDeletePlan,
}: TrainingPlansCardProps) => (
    <Card shadow="sm" padding="lg" radius="md" withBorder mt="md">
      <Group justify="space-between" mb="md">
        <Group gap="sm">
          <IconClipboardList size={20} color="var(--mantine-color-orange-6)" />
          <Title order={4}>Historial de Macrociclos</Title>
        </Group>
        {isAdmin && (
          <Button
            size="xs"
            color="orange"
            onClick={onCreatePlan}
          >
            + Crear Plan
          </Button>
        )}
      </Group>

      {plans.length === 0 ? (
        <Center py="md">
          <Text c="dimmed">No hay planes de entrenamiento asignados.</Text>
        </Center>
      ) : (
        <SimpleGrid cols={{ base: 1, sm: 2 }}>
          {plans.map((plan) => (
            <Card key={plan.id} withBorder shadow="sm" radius="md" p="md">
              <Group justify="space-between" mb="xs" align="flex-start">
                <Text fw={700}>Plan de {plan.weeks} Semanas</Text>
                <Group gap="xs">
                  <Badge color="orange" variant="light">
                    {plan._count?.sessions || 0} Sesiones
                  </Badge>
                  {isAdmin && (
                    <ActionIcon
                      color="red"
                      variant="subtle"
                      size="sm"
                      onClick={() => onDeletePlan(plan.id)}
                    >
                      <IconTrash size={16} />
                    </ActionIcon>
                  )}
                </Group>
              </Group>
              <Text size="sm" c="dimmed" mb="md">
                Inicio: {formatDate(plan.startDate)}
              </Text>
              <Button
                variant="light"
                color="blue"
                fullWidth
                onClick={() => onOpenPlan(plan.id)}
              >
                Ver Macrociclo
              </Button>
            </Card>
          ))}
        </SimpleGrid>
      )}
    </Card>
);
