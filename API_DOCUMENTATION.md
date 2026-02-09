# 📚 WhatsApp SaaS API Documentation

This API allows you to automate WhatsApp interactions, including managing sessions, sending messages, and interacting with groups.

## 🔐 Authentication

All requests (except webhooks) require an API Key.
Include it in the header `x-api-key` or `Authorization: Bearer <token>` for user management.

**Header:**
```http
x-api-key: YOUR_API_KEY
```

---

## ⚡ Rate Limiting

To prevent number blocking and spam, the API implements rate limiting.
- **Limit:** 10 messages per minute per session.
- **Response:** `429 Too Many Requests` or JSON error.

---

## 📱 Sessions

### List Sessions
Get a list of all active and stored sessions.
```http
GET /sessions
```

### Connect Session
Initialize a session and get QR code (or status if already connected).
```http
GET /init?sessionId=my-session
```

---

## 💬 Messaging

### Send Text
```http
POST /messages/text
Content-Type: application/json

{
  "sessionId": "default",
  "phone": "593991234567",
  "message": "Hello World!"
}
```

### Send Media (Image/Video/Audio/Document)
Endpoints: `/messages/image`, `/messages/video`, `/messages/audio`, `/messages/document`
```http
POST /messages/image
Content-Type: application/json

{
  "sessionId": "default",
  "phone": "593991234567",
  "imageUrl": "https://example.com/image.jpg",
  "caption": "Look at this!"
}
```

### Send Poll
```http
POST /messages/poll
Content-Type: application/json

{
  "sessionId": "default",
  "phone": "593991234567",
  "name": "Favorite Color?",
  "values": ["Red", "Blue", "Green"],
  "singleSelect": true
}
```

---

## 📂 Chats & History

### Get All Chats
Retrieve a list of chats for a session.
```http
GET /chats?sessionId=default
```

### Get Messages from Chat
Retrieve message history for a specific chat.
```http
GET /chats/593991234567@s.whatsapp.net/messages?sessionId=default&limit=50
```

---

## 👥 Groups

### Create Group
```http
POST /chats/groups
Content-Type: application/json

{
  "sessionId": "default",
  "subject": "My New Group",
  "participants": ["593991234567"]
}
```

### Get Group Metadata
Get info like participants, owner, description.
```http
GET /chats/groups/123456789@g.us?sessionId=default
```

### Manage Participants
Add, remove, promote, or demote participants.
```http
POST /chats/groups/123456789@g.us/participants
Content-Type: application/json

{
  "sessionId": "default",
  "action": "add",
  "participants": ["593991234567"]
}
```
**Actions:** `add`, `remove`, `promote`, `demote`.

### Get Invite Code
```http
GET /chats/groups/123456789@g.us/invite-code?sessionId=default
```

---

## 📡 Webhooks

Configure webhooks to receive real-time events.

**Events:**
- `messages.upsert`: New incoming messages.
- `messages.update`: Message status updates (sent, delivered, read).
- `connection.update`: Connection state changes (QR code, connected, disconnected).

**Example Payload:**
```json
{
  "event": "messages.upsert",
  "sessionId": "default",
  "payload": { ... }
}
```
