# WhatsApp API Frontend

A simple dashboard built with Next.js 14+ and Tailwind CSS to manage your WhatsApp API connection.

## Features
- **Real-time QR Code**: Displays the QR code dynamically from the backend for easy scanning.
- **Connection Status**: Shows when the bot is connected and ready.

## Getting Started

1.  **Install Dependencies**:
    ```bash
    npm install
    ```

2.  **Run Development Server**:
    ```bash
    npm run dev
    ```

3.  **Open in Browser**:
    Visit [http://localhost:3000](http://localhost:3000).

## Configuration
The frontend expects the backend to be running on `http://localhost:3001`. If you change the backend port, update the `fetch` URL in `src/app/page.tsx`.
