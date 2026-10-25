import { Accordion, Text } from '@mantine/core';
import { IconClipboardList } from '@tabler/icons-react';

import { formatPlanningText, parsePlanningNotes } from '../../utils/manual-match';

interface PlanningAccordionProps {
  /** Notas de planificación guardadas: JSON con las tres notas o texto libre antiguo. */
  planningNotes: string;
  mb?: string;
}

/** Acordeón «Ver Planificación del Partido» para consultar el plan durante el partido. */
export const PlanningAccordion = ({ planningNotes, mb }: PlanningAccordionProps) => {
  const parsed = parsePlanningNotes(planningNotes);

  return (
    <Accordion variant="separated" mb={mb}>
      <Accordion.Item value="plan">
        <Accordion.Control
          icon={<IconClipboardList size={20} color="var(--mantine-color-orange-6)" />}
        >
          <Text fw={700} c="orange.7">
            Ver Planificación del Partido
          </Text>
        </Accordion.Control>
        <Accordion.Panel>
          <Text style={{ whiteSpace: 'pre-wrap' }} size="sm">
            {parsed ? formatPlanningText(parsed) : planningNotes}
          </Text>
        </Accordion.Panel>
      </Accordion.Item>
    </Accordion>
  );
};
