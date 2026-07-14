// api/src/utils/match.utils.ts

export const calculateMatchResults = (match: any) => {
  const sets = [
    [match.setOnePlayerOne, match.setOnePlayerTwo],
    [match.setTwoPlayerOne, match.setTwoPlayerTwo],
    [match.setThreePlayerOne, match.setThreePlayerTwo],
    [match.setFourPlayerOne, match.setFourPlayerTwo],
    [match.setFivePlayerOne, match.setFivePlayerTwo],
    [match.setSixPlayerOne, match.setSixPlayerTwo],
    [match.setSevenPlayerOne, match.setSevenPlayerTwo],
  ];

  let p1Sets = 0,
    p2Sets = 0;
  let p1Points = 0,
    p2Points = 0;

  for (const [s1, s2] of sets) {
    const score1 = Number(s1 || 0);
    const score2 = Number(s2 || 0);

    if (score1 === 0 && score2 === 0) continue;

    p1Points += score1;
    p2Points += score2;

    if (score1 > score2) p1Sets++;
    else if (score2 > score1) p2Sets++;
  }

  const p1WinsMatch = p1Sets > p2Sets;
  const p2WinsMatch = p2Sets > p1Sets;

  return {
    p1Sets,
    p2Sets,
    p1Points,
    p2Points,
    p1WinsMatch,
    p2WinsMatch,
  };
};
