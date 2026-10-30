# La clasificación de la liga se calcula al consultar y se guarda solo al completarse

Los grupos de torneo guardan su clasificación y la recalculan tras cada resultado, pero en una liga en curso la tabla se calcula al consultar a partir de los partidos, porque así nunca queda desfasada si el admin corrige un resultado y el coste es despreciable (unos cientos de partidos como mucho). Al pasar la liga a Completado se guarda una foto final con la posición de cada jugador, para que una liga cerrada conserve su resultado aunque después cambien los datos.

Se descartó guardar la tabla y recalcularla tras cada resultado, como hacen los grupos, por el riesgo de que tabla y partidos se descuadren.
