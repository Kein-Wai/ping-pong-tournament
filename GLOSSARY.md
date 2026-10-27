# Ping Pong App

Aplicación para gestionar torneos, partidos y entrenamiento de tenis de mesa en clubes. Este glosario recoge el lenguaje propio del dominio; se amplía término a término.

## Language

### Clubes y personas

**Club**:
Sede que agrupa a sus jugadores, torneos, ejercicios, equipos y eventos. Un club nuevo está pendiente hasta que un Super admin lo aprueba.

**Super admin**:
Rol con control sobre toda la aplicación, incluida la aprobación de clubes y la bandeja de feedback.
_Avoid_: Administrador general

**Admin de club**:
Rol que gestiona un único club: su plantilla, sus torneos y sus entrenamientos.
_Avoid_: Administrador a secas

**Jugador**:
Rol del usuario que juega, entrena y se inscribe en torneos. En código es `Player`.
_Avoid_: Player en textos de interfaz, usuario

**Plantilla**:
Jugadores aprobados de un club, frente a las solicitudes pendientes y las bajas o rechazos.
_Avoid_: Equipo, roster

**Equipo**:
Grupo de jugadores de un club que disputa encuentros por equipos contra otros clubes.
_Avoid_: Plantilla

### Torneos

**Torneo**:
Competición con fecha, formato, nivel y participantes, organizada por un club.

**Tipo de torneo**:
Quién puede participar y con qué alcance: interno (solo del club), abierto u oficial.

**Nivel del torneo**:
Categoría de juego a la que se dirige: principiante, intermedio, avanzado, federado o mixto.

**Formato del torneo**:
Estructura de competición elegida: todos contra todos, fase de grupos seguida de eliminatorias, o solo eliminatorias. En código es `Rounds`.
_Avoid_: Rondas (para el formato)

**Inscripción**:
Participación de un jugador en un torneo. Está pendiente, confirmada o marcada como no presentada.

**Sets para ganar**:
Sets que debe ganar un jugador para llevarse un partido de torneo. Se fija por separado para la fase de grupos y para las eliminatorias.

**Liga**:
Competición interna de un club en varias jornadas. Existe como término y como tabla en la base de datos, pero la funcionalidad nunca se construyó. No es lo mismo que el formato «todos contra todos» de un torneo.
_Avoid_: Liga para el formato de torneo todos contra todos

**Grupo**:
Subconjunto de jugadores de un torneo que se enfrentan todos contra todos en la fase de grupos.

**Clasificación del grupo**:
Tabla de un grupo con partidos jugados, sets y puntos a favor y en contra, y posición de cada jugador.

**Cuadro eliminatorio**:
Fase de enfrentamientos directos en la que el perdedor queda eliminado de su llave. Cada partido envía al ganador al siguiente partido del cuadro. Es lo mismo que las eliminatorias, las llaves y el cuadro final.
_Avoid_: Knockout en textos de interfaz, cuadro final

**Llave A**:
Cuadro principal del cuadro eliminatorio, donde se decide el campeón.

**Llave B**:
Cuadro de consolación, para los jugadores eliminados de la Llave A.
_Avoid_: Cuadro secundario

**Ronda del cuadro**:
Etapa del cuadro eliminatorio, en general. Cada ronda concreta tiene su nombre: R128avos, R64avos, R32avos, R16avos, Octavos, Cuartos, Semifinales y Final. Es distinta del intento de un juego de reflejo.

**Final**:
Último partido del cuadro eliminatorio, el que decide el campeón. No es el cuadro entero.
_Avoid_: Cuadro final

**Siembra**:
Ordenación del cuadro eliminatorio según el nivel de los jugadores, de modo que los mejores no se crucen pronto, frente al sorteo aleatorio.
_Avoid_: Seed, cabezas de serie (salvo para nombrar a los jugadores sembrados)

### Partidos y estadísticas

**Partido**:
Enfrentamiento entre dos jugadores, jugado al mejor de varios sets. Puede ser de torneo, de liga o de otro tipo oficial.
_Avoid_: Encuentro (reservado para el choque entre equipos), partida

**Set**:
Parte de un partido que gana el primero en llegar a los puntos reglamentarios. Se gana el partido ganando un número de sets.
_Avoid_: Game, juego, manga

**Estado del partido**:
Programado, iniciado, abierto, completado o cancelado. Abierto significa que todavía puede haber cambios, e iniciado que el partido ya ha empezado.

**Partido manual**:
Partido que el propio jugador registra, con rival, lugar y marcador, para analizarse. No cuenta como oficial.
_Avoid_: Partido amistoso (el amistoso es un tipo de partido manual)

**Análisis**:
Anotación punto a punto de un partido, rápida o extensa, clasificando cada punto por categoría, golpe y colocación.

**Temporada**:
Periodo anual, de agosto a julio, que delimita estadísticas, torneos y entrenamientos. Solo una está vigente.

**ELO**:
Puntuación de nivel de cada jugador por temporada, que sube o baja tras cada partido oficial según la diferencia de nivel con el rival.
_Avoid_: Ranking, rating

### Entrenamiento

**Ejercicio de entrenamiento**:
Ejercicio del catálogo de un club, de una categoría concreta (control, bloqueo y contraataque, movilidad, recepciones, saques, etc.). Se distingue del ejercicio de calentamiento.

**Plan de entrenamiento**:
Programa individual de un jugador con fortalezas, debilidades, objetivos, semanas y sesiones por semana. En código es `PlayerTraining`.
_Avoid_: Entrenamiento a secas

**Sesión de entrenamiento**:
Día concreto de trabajo de un jugador con sus ejercicios; puede pertenecer a un plan o ser suelta.

**Entrenamiento general**:
Sesión colectiva del club a la que se apuntan varios jugadores, distinta del plan individual.
_Avoid_: Plan de entrenamiento

**Habilidades**:
Valoración de un jugador en cada faceta del juego, que se actualiza tras entrenamientos y partidos.
_Avoid_: Skills

### Calentamiento

**Calentamiento**:
Preparación física y técnica de un jugador antes de un partido o torneo, hecha como una secuencia de ejercicios de calentamiento.
_Avoid_: Warm-up, precalentamiento

**Ejercicio de calentamiento**:
Una de las partes fijas del catálogo de calentamiento (Estiramientos, Movilidad sin raqueta, Derecha a Derecha, Revés a Revés, Top de Derecha, Top de Revés, Juego de sensibilidad, Saque y entrada, Drill en el momento). Se distingue del ejercicio de entrenamiento, que pertenece a un plan de entrenamiento.
_Avoid_: Ejercicio a secas, paso, bloque

**Rutina de calentamiento**:
Lista ordenada de ejercicios de calentamiento que un jugador monta y guarda con un nombre, cada uno con su duración y su descanso. Un jugador puede guardar hasta cinco.
_Avoid_: Plan de calentamiento, sesión de calentamiento

**Descanso**:
Tiempo previo a cada ejercicio de calentamiento en el que el jugador se prepara, se desplaza o consigue mesa. Puede alargarse sin límite hasta que el jugador indique que está listo. No es la pausa del cronómetro, que congela cualquier fase.
_Avoid_: Cortesía, pausa, transición

### Juegos de reflejo

**Juego de reflejo**:
Minijuego corto que entrena la rapidez de reacción, la decisión o el timing del jugador. No es un partido ni cuenta para el ELO.
_Avoid_: Minijuego, test

**Partida**:
Una vez que se juega un juego de reflejo, de la cuenta atrás al resultado.
_Avoid_: Partido, sesión

**Récord personal**:
Mejor resultado de un jugador en un juego de reflejo, guardado en su dispositivo. En unos juegos mejor es mayor y en otros menor.
_Avoid_: Ranking, marca

**Teja**:
Cada casilla de la cuadrícula del juego Tejas, que se ilumina para que el jugador la toque.
_Avoid_: Baldosa, botón

**Intento**:
Cada repetición dentro de una partida de reacción simple o de timing.
_Avoid_: Ronda (reservada para el cuadro eliminatorio)

**Impacto**:
Instante en que la pelota del juego Timing vuelve a la raqueta, el momento ideal para golpear.
_Avoid_: Golpe (reservado para el toque del jugador)

**Desviación**:
Milisegundos entre el toque del jugador y el impacto: negativa si se toca pronto y positiva si se toca tarde. Se muestra tras cada pelota y su media aparece en el resultado de Timing.
_Avoid_: Error, retraso

**Salida en falso**:
Toque anticipado, antes de que aparezca la señal, en reacción simple. No cuenta y el intento se repite.
_Avoid_: Falta, error
