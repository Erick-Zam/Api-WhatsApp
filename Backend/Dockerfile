FROM node:18-alpine

WORKDIR /app

# Install dependencies needed for Baileys/Chrome if necessary (for screenshots etc)
# But for standard headless usage, node-alpine is usually enough. 
# If complex rendering is needed, switch to node:18

COPY package.json package-lock.json ./
RUN npm install

COPY . .

# Expose API port
EXPOSE 3001

CMD ["npm", "start"]
