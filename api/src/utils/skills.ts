// src/utils/skills.ts

export const calculateSkillGrowth = (currentStat: number | null | undefined): number => {
  const val = currentStat || 0;
  if (val < 20) return 0.25;
  if (val < 40) return 0.2;
  if (val < 60) return 0.15;
  if (val < 80) return 0.07;
  return 0.01;
};

// Versión que acepta un booleano (útil para entrenamientos generales donde se marca si se entrenó o no)
export const calculateConditionalGrowth = (
  isTrained: boolean,
  currentStat: number | null | undefined,
): number => {
  if (!isTrained) return 0;
  return calculateSkillGrowth(currentStat);
};
