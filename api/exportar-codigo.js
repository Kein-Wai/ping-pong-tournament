const fs = require('fs');
const path = require('path');

// Las carpetas que queremos escanear (añade más si tienes lógica fuera de src)
const dirsToScan = ['./src', './prisma'];
const outputFile = 'codigo_completo.txt';
let output = '';

function scanDirectory(dir) {
  if (!fs.existsSync(dir)) return;

  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);

    // Ignoramos carpetas que no nos interesan
    if (stat.isDirectory()) {
      scanDirectory(fullPath);
    } else if (fullPath.endsWith('.ts') || fullPath.endsWith('.prisma')) {
      output += `\n\n================================================\n`;
      output += `📂 ARCHIVO: ${fullPath}\n`;
      output += `================================================\n\n`;
      output += fs.readFileSync(fullPath, 'utf-8');
    }
  }
}

dirsToScan.forEach(scanDirectory);
fs.writeFileSync(outputFile, output);
console.log(`✅ ¡Éxito! Todo tu código se ha guardado en: ${outputFile}`);
