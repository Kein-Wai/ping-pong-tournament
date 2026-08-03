OUTPUT="archivos_nativos.txt"

echo "Generando $OUTPUT..."
> $OUTPUT # Limpiamos el archivo por si ya existía de antes

# Lista de los sospechosos habituales
archivos=(
  "ios/App/Podfile"
  "ios/App/App/AppDelegate.swift"
  "android/app/build.gradle"
  "android/app/src/main/AndroidManifest.xml"
  "android/app/src/main/java/com/keinwaicheung/tttournamentapp/MainActivity.java"
  "android/app/src/main/java/com/keinwaicheung/tttournamentapp/MainActivity.kt"
)

for archivo in "${archivos[@]}"; do
  if [ -f "$archivo" ]; then
    echo "========================================================" >> $OUTPUT
    echo "📄 ARCHIVO: $archivo" >> $OUTPUT
    echo "========================================================" >> $OUTPUT
    cat "$archivo" >> $OUTPUT
    echo -e "\n\n" >> $OUTPUT
    echo "✅ Añadido: $archivo"
  else
    echo "⚠️ Ignorado (no existe): $archivo"
  fi
done

echo "🎉 ¡Terminado! Abre el archivo $OUTPUT y pásame el contenido."