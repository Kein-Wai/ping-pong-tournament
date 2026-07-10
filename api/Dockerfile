FROM node:24-alpine

WORKDIR /app

# Copiamos solo los archivos de dependencias primero (optimiza el caché de Docker)
COPY package*.json ./

RUN npm install

# Copiamos el resto del código
COPY . .

EXPOSE 3000

# Arrancamos en modo desarrollo
CMD ["npm", "run", "dev"]