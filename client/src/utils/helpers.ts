export const returnEloColor = (elo: number) => {
  if (elo < 500) return 'red';
  if (elo >= 500 && elo < 750) return 'yellow';
  if (elo >= 750 && elo < 1000) return 'blue';
  return 'green';
};
