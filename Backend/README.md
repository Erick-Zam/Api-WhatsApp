# WhatsApp API Backend

A Node.js Express server using `@whiskeysockets/baileys` to communicate with WhatsApp via a REST API.

## Features
- **QR Code Auth**: Connects to WhatsApp Web.
- **Messaging**: Text, Image, Video, Audio, Document, Location, Contact.
- **Interactive**: Polls (Questions with options).
- **Presence**: Simulate typing or recording.
- **Authentication**: Secured via `x-api-key`.

## Setup
1.  `npm install`
2.  `npm start`
3.  Default Port: 3001
4.  Default API Key: `default-secure-key`

## API Reference (All require `x-api-key`)

### 1. Send Text
`POST /messages/text`
```json
{ "phone": "593991234567", "message": "Hello!" }
```

### 2. Send Media (Image/Video/Audio)
**Image**: `POST /messages/image`
```json
{ "phone": "...", "imageUrl": "http://...", "caption": "..." }
```
**Video**: `POST /messages/video`
```json
{ "phone": "...", "videoUrl": "http://...", "caption": "...", "gifPlayback": false }
```
**Audio (Voice Note)**: `POST /messages/audio`
```json
{ "phone": "...", "audioUrl": "http://...", "ptt": true }
```

### 3. Send Poll (Interactive Question)
`POST /messages/poll`
```json
{
  "phone": "593991234567",
  "name": "What is your favorite color?",
  "values": ["Red", "Blue", "Green"],
  "singleSelect": true
}
```

### 4. Send Location
`POST /messages/location`
```json
{ "phone": "...", "latitude": -0.1807, "longitude": -78.4678 }
```

### 5. Presence (Typing Status)
`POST /messages/presence`
```json
{ "phone": "...", "type": "composing" }
```
*(Types: `composing`, `recording`, `available`, `unavailable`)*
