FROM node:18

WORKDIR /app

# Copiamos dependencias
COPY package*.json ./
RUN npm install --production

# Copiamos el resto del código
COPY . .

EXPOSE 4000

CMD ["npm", "start"]
