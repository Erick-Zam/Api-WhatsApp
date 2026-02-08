FROM node:18-alpine

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm install

COPY . .

# Build Next.js app
RUN npm run build

# Expose app port
EXPOSE 3000

CMD ["npm", "start"]
