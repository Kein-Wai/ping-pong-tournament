# Los datos sin conexión se guardan en SQLite, solo en las apps nativas

Lo pendiente de enviar se guarda en SQLite (`@capacitor-community/sqlite`) detrás de una interfaz `LocalStore`, y el modo sin conexión existe únicamente en iOS y Android. Se eligió por fiabilidad: perder un partido analizado de unos 200 puntos es lo peor que puede pasar, e IndexedDB puede ser purgado por el sistema. Al no haber modo sin conexión en la web no hace falta ningún soporte web del plugin, y en el navegador esta capa simplemente no se activa.

Se descartó IndexedDB (con Dexie) por esa fragilidad, aunque habría evitado un plugin nativo. El coste es que el plugin exige nuevas builds de TestFlight y Play Store y que los tests solo pueden usar el adaptador en memoria, así que el SQL real se comprueba a mano en un móvil.
