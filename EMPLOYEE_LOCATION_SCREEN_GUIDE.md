# 📱 Employee — Location Tracking Screen
## Flutter Frontend Implementation Guide

> **Yeh file sirf Employee Mobile App ke liye hai.**
> Backend already live hai. Sirf APIs aur Socket events consume karne hain.

---

## 🔌 Backend Connection

```
Base URL   : http://<your-server-ip>:5000
Socket URL : http://<your-server-ip>:5000
Auth       : Bearer <JWT_TOKEN>  (employee login se milta hai)
```

---

## 📦 Flutter Packages

```yaml
dependencies:
  socket_io_client: ^2.0.3+1   # WebSocket
  geolocator: ^12.0.0           # Device GPS
  permission_handler: ^11.3.1   # Location permission
  http: ^1.2.1                  # REST API calls
```

---

## 🗺️ Screen Layout (Reference Image se)

```
┌─────────────────────────────────────┐
│ [←]        Location Tracking        │
├─────────────────────────────────────┤
│ ╔═══════════════════════════════╗   │
│ ║ Current Status        [wifi]  ║   │
│ ║                               ║   │
│ ║  Tracking Active  (bold)      ║   │
│ ║                               ║   │
│ ║ [▷] Head Office - Main Gate   ║   │
│ ║  •  Last updated: 2 min ago   ║   │
│ ║                               ║   │
│ ║  ┌─────────────────────────┐  ║   │
│ ║  │     Pause Tracking      │  ║   │
│ ║  └─────────────────────────┘  ║   │
│ ╚═══════════════════════════════╝   │
│                                     │
│ ┌──────┐  ┌──────────┐  ┌────────┐ │
│ │09:02 │  │  7h 58m  │  │   3    │ │
│ │  AM  │  │          │  │        │ │
│ │Check │  │ Total Hrs│  │Locations│ │
│ │  In  │  │          │  │        │ │
│ └──────┘  └──────────┘  └────────┘ │
│                                     │
│ 🕐 Today's Timeline                 │
│                                     │
│ ●  Head Office - Main Gate          │
│    09:02 AM  28.6139°N 77.2090°E   │
│                          [checked in]│
│                                     │
│ ●  Client Office - Sector 62        │
│    10:15 AM  28.6280°N 77.3649°E   │
│                             [on site]│
│                                     │
│ ●  Head Office - Main Gate          │
│    05:00 PM  28.6139°N 77.2090°E   │
│                         [checked out]│
└─────────────────────────────────────┘
```

---

## 🌐 REST APIs

---

### API 1 — Get Today's Timeline (Screen Load)
**Kab call karen:** Screen open hone par ek baar

```
Method : GET
URL    : /api/location/getTimeline
Header : Authorization: Bearer <token>
Query  : employeeId=<mongo_id>&date=2026-07-15
         (date optional, default = aaj)
```

**Response:**
```json
{
  "success": true,
  "data": {
    "stats": {
      "checkIn"       : "2026-07-15T03:32:00.000Z",
      "totalHours"    : "7h 58m",
      "locationCount" : 5,
      "currentStatus" : "tracking active"
    },
    "logs": [
      {
        "_id"         : "64log1...",
        "latitude"    : 28.6139,
        "longitude"   : 77.2090,
        "address"     : "Head Office - Main Gate",
        "placeName"   : "Head Office",
        "status"      : "checked in",
        "batteryLevel": 90,
        "createdAt"   : "2026-07-15T03:32:00.000Z"
      },
      {
        "_id"      : "64log2...",
        "latitude" : 28.6280,
        "longitude": 77.3649,
        "address"  : "Client Office - Sector 62",
        "status"   : "on site",
        "createdAt": "2026-07-15T04:45:00.000Z"
      }
    ]
  }
}
```

**UI Mapping:**
```
stats.checkIn       → "09:02 AM  Check In" card
stats.totalHours    → "7h 58m  Total Hours" card
stats.locationCount → "3  Locations" card
logs[]              → "Today's Timeline" list (latest bhi neeche)
logs[i].address     → Location name
logs[i].createdAt   → Time (format: hh:mm a)
logs[i].latitude/longitude → "28.6139°N 77.2090°E"
logs[i].status      → colored badge
```

---

### API 2 — Log Location (GPS Timer — har 30 second)
**Kab call karen:** Background timer se, screen pe rehte hue

```
Method  : POST
URL     : /api/location/logLocation
Header  : Authorization: Bearer <token>
          Content-Type: application/json
```

**Request Body:**
```json
{
  "employeeId"  : "64abc...",
  "companyId"   : "64xyz...",
  "latitude"    : 28.6139,
  "longitude"   : 77.2090,
  "address"     : "Head Office - Main Gate",
  "placeName"   : "Head Office",
  "status"      : "tracking active",
  "batteryLevel": 85,
  "speed"       : 0.0,
  "accuracy"    : 10.5,
  "sessionId"   : "64ses..."
}
```

> `sessionId` — API 3 se mila hua ID. Optional hai.
> `status` values: `"checked in"` | `"on site"` | `"checked out"` | `"tracking active"` | `"tracking paused"`

**Response (201):**
```json
{
  "success": true,
  "message": "Location logged successfully",
  "data": { "_id": "64log...", "createdAt": "..." }
}
```

> ⚠️ **API call ke baad UI mat update karo manually.**
> Backend khud socket `location-update` emit karta hai — usse UI update hogi.

---

### API 3 — Start / Pause / Stop Tracking (Button)
**Kab call karen:** User jab "Pause Tracking" / "Resume" / "Stop" button dabaye

```
Method  : PATCH
URL     : /api/location/tracking-status
Header  : Authorization: Bearer <token>
          Content-Type: application/json
```

**Request Body:**
```json
{
  "employeeId": "64abc...",
  "companyId" : "64xyz...",
  "action"    : "start"
}
```

> `action` values: `"start"` | `"pause"` | `"stop"`

**Response (200):**
```json
{
  "success": true,
  "message": "Tracking started successfully",
  "data": {
    "_id"    : "64ses...",
    "status" : "active",
    "startTime": "2026-07-15T03:30:00.000Z"
  }
}
```

**Button Logic:**
```
action="start"  → GPS timer shuru karo + sessionId save karo
action="pause"  → GPS timer band karo + button → "Resume Tracking"
action="stop"   → GPS timer band karo + screen se bahar niklo
```

---

## 🔴 WebSocket Events

### Connect + Join Room

```dart
import 'package:socket_io_client/socket_io_client.dart' as IO;

IO.Socket socket = IO.io(
  'http://<server-ip>:5000',
  IO.OptionBuilder()
    .setTransports(['websocket'])
    .disableAutoConnect()
    .build()
);

socket.connect();

// Apna room join karo (MongoDB _id use karo, employeeCode nahi)
socket.emit('join', employeeId);
```

### Listen: `location-update`
**Kab aata hai:** Jab POST /logLocation successful hota hai (backend khud emit karta hai)

```dart
socket.on('location-update', (data) {
  // data = {
  //   "newLog": {
  //     "_id"      : "64log...",
  //     "latitude" : 28.6139,
  //     "longitude": 77.2090,
  //     "address"  : "Head Office - Main Gate",
  //     "placeName": "Head Office",
  //     "status"   : "tracking active",
  //     "createdAt": "2026-07-15T..."
  //   },
  //   "stats": {
  //     "checkIn"       : "2026-07-15T03:32:00.000Z",
  //     "totalHours"    : "7h 58m",
  //     "locationCount" : 6,
  //     "currentStatus" : "tracking active",
  //     "trackingStatus": "active",   // 'active' | 'paused' | 'inactive'
  //     "lastUpdated"   : "2026-07-15T..."
  //   }
  // }

  setState(() {
    // Timeline list me naya log add karo (end me)
    timelineLogs.add(data['newLog']);

    // Stats cards update karo
    checkIn         = data['stats']['checkIn'];
    totalHours      = data['stats']['totalHours'];
    locationCount   = data['stats']['locationCount'];
    trackingStatus  = data['stats']['trackingStatus'];

    // Top card update
    currentAddress  = data['newLog']['address'];
    lastUpdated     = DateTime.now(); // "Last updated: just now"
  });
});
```

### Dispose (Screen se bahar nikalne par)

```dart
@override
void dispose() {
  gpsTimer?.cancel();           // Timer band karo
  socket.off('location-update');
  socket.disconnect();
  super.dispose();
}
```

---

## ⚡ Complete Screen Flow

```
initState()
    │
    ├── 1. Location permission maango
    │
    ├── 2. GET /api/location/getTimeline  → timeline + stats load
    │
    ├── 3. socket.emit('join', employeeId)
    │
    └── 4. PATCH /tracking-status (action="start") → sessionId save karo
              │
              └── 5. GPS Timer start (every 30 sec)
                        │
                        └── 6. POST /api/location/logLocation
                                    │
                                    └── Backend emits 'location-update'
                                                │
                                                └── setState() → UI update


"Pause Tracking" button:
    ├── PATCH /tracking-status (action="pause")
    ├── GPS Timer cancel
    └── Button text → "Resume Tracking"

"Resume Tracking" button:
    ├── PATCH /tracking-status (action="start") → naya sessionId
    ├── GPS Timer restart
    └── Button text → "Pause Tracking"
```

---

## 🎨 Status Badge Colors

```dart
Color getStatusColor(String status) {
  switch (status) {
    case 'checked in':      return Color(0xFF4CAF50); // Green
    case 'on site':         return Color(0xFF2196F3); // Blue
    case 'checked out':     return Color(0xFF9E9E9E); // Grey
    case 'tracking active': return Color(0xFF4CAF50); // Green
    case 'tracking paused': return Color(0xFFFF9800); // Orange
    default:                return Color(0xFF9E9E9E); // Grey
  }
}
```

## 🕐 Time Helper

```dart
String formatTime(String isoDate) {
  final dt = DateTime.parse(isoDate).toLocal();
  final h = dt.hour > 12 ? dt.hour - 12 : dt.hour;
  final m = dt.minute.toString().padLeft(2, '0');
  final ampm = dt.hour >= 12 ? 'PM' : 'AM';
  return '$h:$m $ampm';
}

String formatCoords(double lat, double lng) {
  return '${lat.toStringAsFixed(4)}°N ${lng.toStringAsFixed(4)}°E';
}
```

---

## ❌ Error Handling

```json
{ "success": false, "message": "Error description" }
```

| HTTP Code | Matlab | Action |
|-----------|--------|--------|
| `400` | Missing params | Log karo, toast dikhao |
| `401` | Token expired | Login screen pe bhejo |
| `404` | Session nahi mila | "Start" se shuru karo |
| `500` | Server error | "Something went wrong" toast |

---

## ✅ Checklist

- [ ] Location permission request on init
- [ ] `getTimeline` API call on init → stats + logs load
- [ ] Socket `join` emit with `employeeId`
- [ ] Socket `location-update` listener → UI update
- [ ] `tracking-status` API (start) → sessionId save
- [ ] 30-second GPS timer → `logLocation` API call
- [ ] Pause button → timer cancel + status update
- [ ] Resume button → timer restart + naya session
- [ ] `dispose()` → timer cancel + socket disconnect

---
*Backend: Node.js + Express + Socket.io v4.8.3 + MongoDB*
