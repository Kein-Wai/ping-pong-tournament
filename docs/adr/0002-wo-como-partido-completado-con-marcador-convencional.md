# Un W.O. es un partido Completado con marcador convencional

`Match` no tiene campo de ganador: el ganador sale de los sets, y `calculateMatchResults` ignora los sets con 0-0. Para que el ELO y las estadísticas traten un W.O. como cualquier victoria sin lógica aparte, el partido se guarda como Completado, con `walkover` activo y los sets convencionales que el rival necesita para ganar, cada uno a 11-0. La clasificación de la liga ignora los puntos de los partidos W.O. (no suman diferencia de puntos a nadie) y el jugador que se retira recibe 0 puntos de clasificación en lugar de 1.

Se descartó dejar esos partidos como Cancelado con un ganador aparte, porque obligaría a ramificar clasificación, ELO y estadísticas. Se descartó guardar los puntos a 0-0, porque `calculateMatchResults` no contaría esos sets y el partido no tendría ganador.

Consecuencia: las estadísticas de puntos a favor y en contra (`Stats`) sí incluyen los 11-0 de un W.O.
