FROM node:24-alpine

WORKDIR /app

COPY package*.json ./

RUN npm install --legacy-peer-deps

COPY . .

EXPOSE 5173

# Vite necesita exponerse al host en Docker
CMD ["npm", "run", "dev", "--", "--host"]