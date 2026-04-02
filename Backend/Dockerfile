FROM node:20-alpine

WORKDIR /app

# Install Chromium and dependencies for Puppeteer
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

RUN apk add --no-cache \
      chromium \
      nss \
      freetype \
      harfbuzz \
      ca-certificates \
      ttf-freefont \
      ffmpeg

COPY package.json package-lock.json ./
RUN npm install

COPY . .

# Expose API port
EXPOSE 3001

CMD ["npm", "start"]
