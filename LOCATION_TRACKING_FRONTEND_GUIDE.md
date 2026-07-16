# 📍 Raftaar HRMS — Location Tracking Module
## Complete Frontend Implementation Guide (Flutter)

> **Use this file as a prompt** when implementing the Flutter frontend in another project.
> Backend is already live. Do NOT modify backend. Only consume APIs and WebSocket events described here.

---

## 🏗️ Architecture Overview

```
Mobile App (Employee)                     Backend (Node.js + Express)              HR Web Dashboard (Flutter Web)
─────────────────────                     ───────────────────────────              ──────────────────────────────
1. App opens → calls getTimeline          Socket.io server running on              1. HR logs in → joins company room
2. GPS timer fires every 30s             same port as REST API (port 5000)         2. Calls getLiveLocations (initial load)
3. Calls logLocation API          ──►    Saves to MongoDB                  ──►    3. Listens for live-location-update socket
4. Socket emits back to employee  ◄──    Emits socket events to:          ──►    4. Map pins update in real-time
5. UI updates timeline + stats            - Employee room (employeeId)              5. Sidebar shows employee stats
                                          - Company room (company:companyId)        6. Logs table shows history
```

---

## 🔌 Backend Connection Details

```
Base URL      : http://<your-server-ip>:5000
Socket URL    : http://<your-server-ip>:5000
Auth Header   : Bearer <JWT_TOKEN>  (from login API)
Content-Type  : application/json
```

> JWT token milta hai `/api/auth-employee/login` se. Har API call me `Authorization: Bearer <token>` header lagao.

---

## 📦 MongoDB Models (Reference Only — Do NOT change)

### LocationLog
```
_id           : ObjectId
employee      : ObjectId  → ref AuthEmployee
company       : ObjectId  → ref Company
latitude      : Number    (required)
longitude     : Number    (required)
address       : String    (e.g. "Head Office - Main Gate")
placeName     : String    (e.g. "Head Office")
status        : String    enum: ['checked in', 'on site', 'checked out', 'tracking active', 'tracking paused']
batteryLevel  : Number    (0–100)
speed         : Number    (km/h)
accuracy      : Number    (GPS accuracy in meters)
sessionId     : ObjectId  → ref LocationSession
isMockLocation: Boolean
createdAt     : Date      (auto)
updatedAt     : Date      (auto)
```

### LocationSession
```
_id            : ObjectId
employee       : ObjectId  → ref AuthEmployee
company        : ObjectId  → ref Company
startTime      : Date      (auto = Date.now)
endTime        : Date      (set when stopped)
status         : String    enum: ['active', 'paused', 'stopped']
totalDuration  : Number    (minutes, set when stopped)
totalLocations : Number    (incremented on each logLocation call)
createdAt      : Date      (auto)
```

---

## 🌐 REST APIs

---

### API 1 — Log Location
**Screen**: Employee App → "Location Tracking" screen (fires every 30 seconds)

```
Method  : POST
URL     : /api/location/logLocation
Auth    : Bearer Token (Employee)
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

> `sessionId` is optional. Send it if tracking session was started via API 5.
> `status` values: `"checked in"` | `"on site"` | `"checked out"` | `"tracking active"` | `"tracking paused"`

**Success Response (201):**
```json
{
  "success": true,
  "message": "Location logged successfully",
  "data": {
    "_id"       : "64log...",
    "employee"  : "64abc...",
    "company"   : "64xyz...",
    "latitude"  : 28.6139,
    "longitude" : 77.2090,
    "address"   : "Head Office - Main Gate",
    "placeName" : "Head Office",
    "status"    : "tracking active",
    "batteryLevel": 85,
    "createdAt" : "2026-07-15T06:32:00.000Z"
  }
}
```

**Side Effects (Backend auto-does this):**
- Emits `location-update` socket event to Employee's room
- Emits `live-location-update` socket event to Company's HR Dashboard room

---

### API 2 — Get Today's Timeline (Employee Screen)
**Screen**: Employee App → "Location Tracking" → Stats card + "Today's Timeline" list

```
Method : GET
URL    : /api/location/getTimeline
Auth   : Bearer Token
Query  : employeeId=64abc...&date=2026-07-15   (date is optional, defaults to today)
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Timeline retrieved successfully",
  "data": {
    "stats": {
      "checkIn"       : "2026-07-15T03:32:00.000Z",
      "totalHours"    : "7h 58m",
      "locationCount" : 5,
      "currentStatus" : "tracking active"
    },
    "logs": [
      {
        "_id"       : "64log1...",
        "latitude"  : 28.6139,
        "longitude" : 77.2090,
        "address"   : "Head Office - Main Gate",
        "placeName" : "Head Office",
        "status"    : "checked in",
        "batteryLevel": 90,
        "createdAt" : "2026-07-15T03:32:00.000Z"
      },
      {
        "_id"       : "64log2...",
        "latitude"  : 28.6280,
        "longitude" : 77.3649,
        "address"   : "Client Office - Sector 62",
        "placeName" : "Client Office",
        "status"    : "on site",
        "createdAt" : "2026-07-15T04:45:00.000Z"
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
logs[]              → "Today's Timeline" list items
logs[i].status      → colored badge (checked in=green, on site=blue, checked out=grey)
logs[i].createdAt   → time shown on left
logs[i].address     → location name
```

---

### API 3 — Get All Live Locations (HR Dashboard)
**Screen**: HR Web Dashboard → "Employee Locations" list + Map pins (initial page load)

```
Method : GET
URL    : /api/location/live
Auth   : Bearer Token (HR/Admin)
Query  : companyId=64xyz...
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Live locations fetched successfully",
  "data": [
    {
      "employeeId"  : "64abc...",
      "employeeCode": "EMP001",
      "name"        : "Ranjeet Singh",
      "department"  : "Sales",
      "photo"       : "http://server/uploads/photo.jpg",
      "latitude"    : 28.6139,
      "longitude"   : 77.2090,
      "address"     : "Sector 18, Noida",
      "placeName"   : "Sector 18",
      "status"      : "tracking active",
      "batteryLevel": 72,
      "lastUpdated" : "2026-07-15T12:17:00.000Z",
      "isOnline"    : true
    },
    {
      "employeeId"  : "64def...",
      "name"        : "Amit Kumar",
      "department"  : "Finance",
      "isOnline"    : false,
      "lastUpdated" : "2026-07-15T11:02:00.000Z"
    }
  ]
}
```

**UI Mapping:**
```
data[]              → "Employee Locations" list
data[i].name        → Employee name
data[i].department  → Department label
data[i].address     → Location text (e.g. "Sector 18, Noida")
data[i].lastUpdated → "7 min ago" (calculate from now)
data[i].isOnline    → green "● Live" badge OR grey "● Offline" badge
                      (isOnline=true if last update < 10 minutes ago)
data[i].latitude/longitude → Map pin position
```

---

### API 4 — Get Location Logs with Filters (HR Dashboard Logs Table)
**Screen**: HR Web Dashboard → Logs/History table with date & employee filters

```
Method : GET
URL    : /api/location/logs
Auth   : Bearer Token (HR/Admin)
Query  :
  companyId  = 64xyz...          (REQUIRED)
  employeeId = 64abc...          (optional — filter by employee)
  date       = 2026-07-15        (optional — filter by date)
  page       = 1                 (optional, default=1)
  limit      = 20                (optional, default=20)
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Location logs fetched successfully",
  "data": [
    {
      "_id"      : "64log...",
      "employee" : {
        "_id"       : "64abc...",
        "firstName" : "Ranjeet",
        "lastName"  : "Singh",
        "department": "Sales",
        "photo"     : "http://server/uploads/photo.jpg",
        "employeeId": "EMP001"
      },
      "latitude"    : 28.6139,
      "longitude"   : 77.2090,
      "address"     : "Head Office - Main Gate",
      "placeName"   : "Head Office",
      "status"      : "checked in",
      "batteryLevel": 85,
      "speed"       : 0,
      "accuracy"    : 10.5,
      "createdAt"   : "2026-07-15T03:32:00.000Z"
    }
  ],
  "pagination": {
    "total"      : 150,
    "page"       : 1,
    "limit"      : 20,
    "totalPages" : 8
  }
}
```

---

### API 5 — Get Single Employee Stats (HR Sidebar Panel)
**Screen**: HR Dashboard → Click on employee → Right sidebar panel opens

```
Method : GET
URL    : /api/location/employee-stats
Auth   : Bearer Token (HR/Admin)
Query  : employeeId=64abc...&companyId=64xyz...
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Employee stats fetched successfully",
  "data": {
    "employee": {
      "_id"         : "64abc...",
      "name"        : "Ranjeet Singh",
      "department"  : "Sales",
      "photo"       : "http://server/uploads/photo.jpg",
      "employeeCode": "EMP001"
    },
    "stats": {
      "checkIn"      : "2026-07-15T03:32:00.000Z",
      "totalHours"   : "7h 58m",
      "locationCount": 5,
      "currentStatus": "tracking active",
      "isOnline"     : true,
      "lastLocation" : {
        "address"   : "Head Office - Main Gate",
        "placeName" : "Head Office",
        "latitude"  : 28.6139,
        "longitude" : 77.2090,
        "updatedAt" : "2026-07-15T12:17:00.000Z"
      }
    },
    "timeline": [
      {
        "_id"       : "64log1...",
        "address"   : "Head Office - Main Gate",
        "placeName" : "Head Office",
        "latitude"  : 28.6139,
        "longitude" : 77.2090,
        "status"    : "checked in",
        "batteryLevel": 90,
        "createdAt" : "2026-07-15T03:32:00.000Z"
      }
    ]
  }
}
```

---

### API 6 — Update Tracking Status (Employee App Button)
**Screen**: Employee App → "Pause Tracking" / "Start Tracking" button

```
Method : PATCH
URL    : /api/location/tracking-status
Auth   : Bearer Token (Employee)
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

**Success Response (200):**
```json
{
  "success": true,
  "message": "Tracking started successfully",
  "data": {
    "_id"           : "64ses...",
    "employee"      : "64abc...",
    "company"       : "64xyz...",
    "startTime"     : "2026-07-15T03:30:00.000Z",
    "endTime"       : null,
    "status"        : "active",
    "totalDuration" : 0,
    "totalLocations": 0
  }
}
```

**Side Effects (Backend auto-does this):**
- Emits `employee-tracking-status` socket event to HR's company room

---

## 🔴 WebSocket Events (Socket.io)

### Setup / Connection

```dart
// Flutter — add socket_io_client package
import 'package:socket_io_client/socket_io_client.dart' as IO;

IO.Socket socket = IO.io(
  'http://<server-ip>:5000',
  IO.OptionBuilder()
    .setTransports(['websocket'])
    .disableAutoConnect()
    .build()
);
socket.connect();
```

---

### Employee App — Join Room + Listen

```dart
// Step 1: Join your own room (use MongoDB _id of employee, NOT employeeCode)
socket.emit('join', employeeId);  // e.g. '64abc...'

// Step 2: Listen for real-time updates on YOUR screen
socket.on('location-update', (data) {
  // data shape:
  // {
  //   "newLog": {
  //     "_id": "64log...",
  //     "latitude": 28.6139,
  //     "longitude": 77.2090,
  //     "address": "Head Office - Main Gate",
  //     "placeName": "Head Office",
  //     "status": "tracking active",
  //     "createdAt": "2026-07-15T..."
  //   },
  //   "stats": {
  //     "checkIn"       : "2026-07-15T03:32:00.000Z",
  //     "totalHours"    : "7h 58m",
  //     "locationCount" : 5,
  //     "currentStatus" : "tracking active",
  //     "trackingStatus": "active",   // 'active' | 'paused' | 'inactive'
  //     "lastUpdated"   : "2026-07-15T..."
  //   }
  // }

  // Use this to update UI without calling API again
  setState(() {
    timelineLogs.insert(0, data['newLog']);
    checkIn = data['stats']['checkIn'];
    totalHours = data['stats']['totalHours'];
    locationCount = data['stats']['locationCount'];
    trackingStatus = data['stats']['trackingStatus']; // show on status card
  });
});
```

---

### HR Dashboard — Join Company Room + Listen

```dart
// Step 1: Join company room (HR joins after login)
socket.emit('join-company', companyId);  // e.g. '64xyz...'

// Step 2: Listen for live employee location updates
socket.on('live-location-update', (data) {
  // data shape:
  // {
  //   "employeeId" : "64abc...",
  //   "name"       : "Ranjeet Singh",
  //   "department" : "Sales",
  //   "photo"      : "http://server/uploads/photo.jpg",
  //   "latitude"   : 28.6139,
  //   "longitude"  : 77.2090,
  //   "address"    : "Sector 18, Noida",
  //   "placeName"  : "Sector 18",
  //   "status"     : "tracking active",
  //   "batteryLevel": 72,
  //   "isOnline"   : true,
  //   "lastUpdated": "2026-07-15T12:17:00.000Z"
  // }

  // Update employee's map pin position + list card in real-time
  updateEmployeeOnMap(data);
});

// Step 3: Listen for tracking status changes
socket.on('employee-tracking-status', (data) {
  // data shape:
  // {
  //   "employeeId"    : "64abc...",
  //   "name"          : "Ranjeet Singh",
  //   "department"    : "Sales",
  //   "photo"         : null,
  //   "trackingStatus": "paused",   // 'active' | 'paused' | 'stopped'
  //   "sessionId"     : "64ses...",
  //   "updatedAt"     : "2026-07-15T..."
  // }

  // Update employee card badge (Live → Paused)
  updateTrackingBadge(data['employeeId'], data['trackingStatus']);
});

// On HR logout or screen close
socket.emit('leave-company', companyId);
```

---

## 📱 Screen 1 — Employee Location Tracking Screen

### What to Build
Refer to provided screenshot (blue gradient card with "Tracking Active" status).

### Flow
```
1. onInit:
   a. Call GET /api/location/getTimeline?employeeId=X to load today's data
   b. socket.emit('join', employeeId) to start listening
   c. Start GPS timer (every 30 seconds)

2. GPS Timer fires:
   a. Get current GPS coords from device
   b. Call POST /api/location/logLocation with coords
   c. Do NOT manually update UI — wait for socket 'location-update' event

3. socket 'location-update' fires:
   a. Prepend new log to timeline list
   b. Update stats cards (checkIn, totalHours, locationCount)
   c. Update "Last updated: X min ago" text

4. "Pause Tracking" button pressed:
   a. Call PATCH /api/location/tracking-status with action="pause"
   b. Change button text to "Resume Tracking"
   c. Stop GPS timer

5. onDispose: socket.emit('leave', employeeId) + cancel GPS timer
```

### UI Components
```
┌─────────────────────────────────────┐
│ [←]        Location Tracking        │
├─────────────────────────────────────┤
│ ╔═══════════════════════════════╗   │
│ ║ Current Status                ║   │
│ ║ [wifi icon]                   ║   │
│ ║ Tracking Active  (bold/white) ║   │
│ ║ [▷] Head Office - Main Gate   ║   │
│ ║     Last updated: 2 min ago   ║   │
│ ║  ┌─────────────────────────┐  ║   │
│ ║  │   Pause Tracking        │  ║   │
│ ║  └─────────────────────────┘  ║   │
│ ╚═══════════════════════════════╝   │
│                                     │
│ ┌──────┐  ┌──────────┐  ┌────────┐ │
│ │09:02 │  │  7h 58m  │  │   3    │ │
│ │  AM  │  │          │  │        │ │
│ │Check │  │Total Hrs │  │Locations│ │
│ │  In  │  │          │  │        │ │
│ └──────┘  └──────────┘  └────────┘ │
│                                     │
│ 🕐 Today's Timeline                 │
│                                     │
│ ● Head Office - Main Gate [checked in] │
│   10:15 AM • 28.6139°N 77.2090°E   │
│                                     │
│ ● Client Office - Sector 62 [on site] │
│   10:15 AM • 28.6280°N 77.3649°E   │
│                                     │
│ ● Head Office - Main Gate [checked out] │
│   05:00 PM • 28.6139°N 77.2090°E   │
└─────────────────────────────────────┘
```

### Status Badge Colors
```
"checked in"      → Green  (#4CAF50)
"on site"         → Blue   (#2196F3)
"checked out"     → Grey   (#9E9E9E)
"tracking active" → Green  (#4CAF50)
"tracking paused" → Orange (#FF9800)
```

---

## 🖥️ Screen 2 — HR Dashboard (Web)

### What to Build
Refer to provided screenshot ("Pro Location" web dashboard with map + employee list).

### Flow
```
1. onInit:
   a. Call GET /api/location/live?companyId=X  (load all employee locations)
   b. Render map with Leaflet.js / flutter_map with pins
   c. Render employee list
   d. socket.emit('join-company', companyId)

2. socket 'live-location-update' fires:
   a. Find employee in list by employeeId
   b. Update their map pin coordinates (animate smoothly)
   c. Update their card: address, lastUpdated, isOnline badge

3. socket 'employee-tracking-status' fires:
   a. Find employee in list
   b. Update their status badge (Live/Paused/Stopped)

4. Click on employee in list:
   a. Call GET /api/location/employee-stats?employeeId=X&companyId=Y
   b. Show right sidebar with their stats + mini timeline

5. "Refresh Locations" button:
   a. Re-call GET /api/location/live (manual refresh fallback)

6. Logs Tab / Date filter:
   a. Call GET /api/location/logs?companyId=X&date=Y&employeeId=Z&page=1

7. onDispose: socket.emit('leave-company', companyId)
```

### UI Components
```
┌──────────────────────────────────────────────────────────┐
│ Pro Location                🔍 Search...   🔔  [PS]      │
│ Track and manage employee attendance                      │
├──────────────────────────────────────────────────────────┤
│ [All Departments ▼] [Active ▼] [⟳ Refresh Locations]    │
├───────────────────────────┬──────────────────────────────┤
│ 📍 Live Location Map       │ 🕐 Today's Movement          │
│                            │                              │
│ [Leaflet/flutter_map here] │ ● Office Entry    09:00      │
│ [animated employee pins]   │ ● Client Meeting  11:30      │
│                            │ ● Lunch Break     13:00      │
│                            │ ● Back to Office  14:30      │
│                            │ ● Conference Room 16:00      │
├───────────────────────────┴──────────────────────────────┤
│ 👥 Employee Locations                                     │
│                                                           │
│ [RS] Ranjeet Singh          📍 Sector 18, Noida          │
│      Sales                     7 min ago     [● Live]    │
│                                                           │
│ [NS] Neha Sharma            📍 Connaught Place, Delhi    │
│      Marketing                 5 min ago     [● Live]    │
│                                                           │
│ [AK] Amit Kumar             📍 Client Site - Gurgaon    │
│      Finance                   15 min ago    [● Offline] │
└──────────────────────────────────────────────────────────┘
```

### isOnline Logic (Frontend)
```dart
bool isOnlineNow(String lastUpdated) {
  final lastTime = DateTime.parse(lastUpdated);
  final diff = DateTime.now().difference(lastTime);
  return diff.inMinutes < 10;  // Same logic as backend
}

String timeAgo(String lastUpdated) {
  final diff = DateTime.now().difference(DateTime.parse(lastUpdated));
  if (diff.inMinutes < 1) return 'Just now';
  if (diff.inMinutes < 60) return '${diff.inMinutes} min ago';
  return '${diff.inHours}h ago';
}
```

---

## 📦 Flutter Packages Needed

```yaml
dependencies:
  socket_io_client: ^2.0.3+1   # WebSocket connection
  flutter_map: ^6.0.0           # Map rendering (free, no API key needed)
  latlong2: ^0.9.0              # LatLng for flutter_map
  geolocator: ^12.0.0           # Get device GPS
  permission_handler: ^11.3.1   # Request location permission
  http: ^1.2.1                  # REST API calls
```

---

## ⚡ Complete Data Flow Diagram

```
Employee Device                    Backend                        HR Browser
──────────────                     ───────                        ──────────
  GPS fires (30s)
       │
       ▼
POST /api/location/logLocation ──► Save to MongoDB
                                        │
                                        ├──► emit('location-update')
                                        │    to room: employeeId ──────────► Employee screen updates
                                        │
                                        └──► emit('live-location-update')
                                             to room: company:companyId ───► HR map pin moves
                                                                         ───► HR employee list updates

PATCH /tracking-status ──────────► Update LocationSession
                                        │
                                        └──► emit('employee-tracking-status')
                                             to room: company:companyId ───► HR badge updates (Live→Paused)
```

---

## ❌ Error Response Format (All APIs)

```json
{
  "success": false,
  "message": "Error description here"
}
```

**Common HTTP codes:**
- `400` → Missing required params (check `message`)
- `401` → Invalid/expired JWT token → redirect to login
- `404` → Resource not found (e.g., no active session)
- `500` → Server error → show generic error toast

---

## ✅ Implementation Checklist

### Employee App Screen
- [ ] `geolocator` permission request on screen open
- [ ] `getTimeline` API call on init
- [ ] Socket `join` emit on init
- [ ] 30-second GPS timer with `logLocation` call
- [ ] Socket `location-update` listener → update UI
- [ ] Start/Pause/Stop button → `tracking-status` API
- [ ] Dispose: cancel timer + socket cleanup

### HR Dashboard
- [ ] `getLiveLocations` API call on init
- [ ] Render map with employee pins
- [ ] Socket `join-company` emit on init
- [ ] Socket `live-location-update` → move map pin + update list
- [ ] Socket `employee-tracking-status` → update badge
- [ ] Click employee → `employee-stats` API → sidebar
- [ ] Date filter + employee filter → `logs` API
- [ ] Pagination for logs table
- [ ] Dispose: `leave-company` emit

---

*Backend by: Raftaar HRMS Team*
*Socket.io v4.8.3 | Express v5 | MongoDB | Node.js*
