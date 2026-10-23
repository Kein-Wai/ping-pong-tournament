import { ActionIcon, Badge, Button, Card, Center, Group, SimpleGrid, Stack, Text } from '@mantine/core';
import { IconTrash } from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';
import { APP_ROUTES } from '../../constants/routes';
import type { PlayerTraining } from '../../types/api';

/**
 * Rejilla de planes de entrenamiento de un jugador.
 *
 * Cada tarjeta muestra el plan, cuantas sesiones tiene y el acceso al
 * macrociclo. El borrado lo decide quien usa el componente.
 */

/** Propiedades de la lista. */
export interface PlanListProps {
  plans: PlayerTraining[];
  /** Si el usuario puede eliminar planes. */
  isAdmin: boolean;
  /** Pide eliminar un plan. */
  onDeletePlan?: (planId: string) => void;
  /** Navega al detalle del plan. */
  onOpenPlan?: (planId: string) => void;
}

export const PlanList = ({ plans, isAdmin, onDeletePlan, onOpenPlan }: PlanListProps) => {
  const navigate = useNavigate();

  if (plans.length === 0) {
    return (
      <Center py="md">
        <Text c="dimmed" size="sm" ta="center">
          No hay planes de entrenamiento asignados.
        </Text>
      </Center>
    );
  }

  return (
    <SimpleGrid cols={{ base: 1, sm: 2 }}>
      {plans.map((plan) => (
        <Card key={plan.id} withBorder shadow="sm" radius="md" p="md">
          <Group justify="space-between" mb="xs" align="flex-start">
            <Text fw={700}>Plan de {plan.weeks} Semanas</Text>
            <Group gap="xs">
              <Badge color="orange" variant="light">
                {plan._count?.sessions || 0} Sesiones
              </Badge>
              {isAdmin && onDeletePlan && (
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
            Inicio: {new Date(plan.startDate).toLocaleDateString('es-ES')}
          </Text>

          <Stack gap="xs">
            <Button
              variant="light"
              color="blue"
              fullWidth
              onClick={() =>
                onOpenPlan ? onOpenPlan(plan.id) : navigate(APP_ROUTES.ENTRENAMIENTOS.DETAILS(plan.id))
              }
            >
              Ver Macrociclo
            </Button>
          </Stack>
        </Card>
      ))}
    </SimpleGrid>
  );
};

export default PlanList;
