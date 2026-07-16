# 🖥️ HR Dashboard — Pro Location Screen
## Flutter Web / Web Frontend Implementation Guide

> **Yeh file sirf HR Dashboard (Web) ke liye hai.**
> Backend already live hai. Sirf APIs aur Socket events consume karne hain.

---

## 🔌 Backend Connection

```
Base URL   : http://<your-server-ip>:5000
Socket URL : http://<your-server-ip>:5000
Auth       : Bearer <JWT_TOKEN>  (HR/Admin login se milta hai)
```

---

## 📦 Flutter Web / Web Packages

```yaml
dependencies:
  socket_io_client: ^2.0.3+1   # WebSocket
  flutter_map: ^6.0.0           # Map (free, no API key)
  latlong2: ^0.9.0              # LatLng for flutter_map
  http: ^1.2.1                  # REST API calls
```

> Map ke liye **OpenStreetMap tiles** use karo (free, no key needed):
> `https://tile.openstreetmap.org/{z}/{x}/{y}.png`

---

## 🗺️ Screen Layout (Reference Image se)

```
┌──────────────────────────────────────────────────────────────┐
│  Pro Location                  🔍 Search...    🔔 3   [PS]   │
│  Track and manage employee attendance                         │
├──────────────────────────────────────────────────────────────┤
│  [All Departments ▼]  [Active ▼]  [⟳ Refresh Locations]     │
├─────────────────────────────┬────────────────────────────────┤
│  📍 Live Location Map        │  🕐 Today's Movement           │
│                              │                                │
│  ┌──────────────────────┐   │  ● Office Entry       09:00   │
│  │                      │   │  ● Client Meeting     11:30   │
│  │   [Map Here]         │   │  ● Lunch Break        13:00   │
│  │   [Pins for each     │   │  ● Back to Office     14:30   │
│  │    employee]         │   │  ● Conference Room A  16:00   │
│  │                      │   │                                │
│  └──────────────────────┘   │                                │
├─────────────────────────────┴────────────────────────────────┤
│  👥 Employee Locations                                        │
│                                                              │
│  [RS]  Ranjeet Singh          📍 Sector 18, Noida            │
│        Sales                     7 min ago    [● Live]       │
│                                                              │
│  [NS]  Neha Sharma            📍 Connaught Place, Delhi      │
│        Marketing                 5 min ago    [● Live]       │
│                                                              │
│  [VG]  Vikram Gupta           📍 Office - Floor 3            │
│        Engineering               1 min ago    [● Live]       │
│                                                              │
│  [AK]  Amit Kumar             📍 Client Site - Gurgaon      │
│        Finance                   15 min ago   [● Offline]    │
└──────────────────────────────────────────────────────────────┘
```

---

## 🌐 REST APIs

---

### API 1 — Get All Live Locations (Page Load)
**Kab call karen:** Dashboard open hone par ek baar (initial data load)

```
Method : GET
URL    : /api/location/live
Header : Authorization: Bearer <token>
Query  : companyId=64xyz...
```

**Response (200):**
```json
{
  "success": true,
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
      "latitude"    : 28.4595,
      "longitude"   : 77.0266,
      "address"     : "Client Site - Gurgaon",
      "isOnline"    : false,
      "lastUpdated" : "2026-07-15T11:02:00.000Z"
    }
  ]
}
```

**UI Mapping:**
```
data[]                → Employee Locations list
data[i].name          → Employee name (bold)
data[i].department    → Department label (grey, small)
data[i].address       → Location text with 📍 icon
data[i].lastUpdated   → "7 min ago" (calculate on frontend)
data[i].isOnline=true → [● Live]    green badge
data[i].isOnline=false→ [● Offline] grey badge
data[i].latitude/lng  → Map pin position
data[i].photo         → Avatar image (fallback: initials circle)
```

---

### API 2 — Get Employee Stats (Sidebar Panel)
**Kab call karen:** User kisi employee ke card pe click kare

```
Method : GET
URL    : /api/location/employee-stats
Header : Authorization: Bearer <token>
Query  : employeeId=64abc...&companyId=64xyz...
```

**Response (200):**
```json
{
  "success": true,
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
        "address"  : "Head Office - Main Gate",
        "placeName": "Head Office",
        "latitude" : 28.6139,
        "longitude": 77.2090,
        "updatedAt": "2026-07-15T12:17:00.000Z"
      }
    },
    "timeline": [
      {
        "_id"         : "64log1...",
        "address"     : "Head Office - Main Gate",
        "placeName"   : "Head Office",
        "latitude"    : 28.6139,
        "longitude"   : 77.2090,
        "status"      : "checked in",
        "batteryLevel": 90,
        "createdAt"   : "2026-07-15T03:32:00.000Z"
      },
      {
        "_id"      : "64log2...",
        "address"  : "Client Meeting - Sector 62",
        "status"   : "on site",
        "createdAt": "2026-07-15T05:30:00.000Z"
      }
    ]
  }
}
```

**UI Mapping (Right Sidebar):**
```
employee.name          → Sidebar header name
employee.department    → Subtitle
stats.checkIn          → "Check In: 09:02 AM"
stats.totalHours       → "Total Hours: 7h 58m"
stats.locationCount    → "Locations: 5"
stats.lastLocation.address → "Current: Head Office - Main Gate"
stats.isOnline         → Live/Offline badge
timeline[]             → "Today's Movement" list (right panel)
timeline[i].address    → Movement name
timeline[i].createdAt  → Time (hh:mm)
```

---

### API 3 — Get Location Logs (History/Filter Table)
**Kab call karen:** "Logs" tab me jao, ya date/employee filter lagao

```
Method : GET
URL    : /api/location/logs
Header : Authorization: Bearer <token>
Query  :
  companyId  = 64xyz...     (REQUIRED)
  employeeId = 64abc...     (optional)
  date       = 2026-07-15   (optional)
  page       = 1            (default=1)
  limit      = 20           (default=20)
```

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "_id": "64log...",
      "employee": {
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
    "total"     : 150,
    "page"      : 1,
    "limit"     : 20,
    "totalPages": 8
  }
}
```

**Pagination logic:**
```dart
// Next page
currentPage++;
callLogsApi(page: currentPage);

// Previous page
if (currentPage > 1) currentPage--;
callLogsApi(page: currentPage);
```

---

## 🔴 WebSocket Events

### Connect + Join Company Room

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

// HR apni company ka room join karta hai
// (MongoDB _id of company, NOT companyCode)
socket.emit('join-company', companyId);
```

---

### Listen: `live-location-update`
**Kab aata hai:** Jab koi employee apna GPS update karta hai (logLocation API hit hoti hai)

```dart
socket.on('live-location-update', (data) {
  // data = {
  //   "employeeId"  : "64abc...",
  //   "name"        : "Ranjeet Singh",
  //   "department"  : "Sales",
  //   "photo"       : "http://server/uploads/photo.jpg",
  //   "latitude"    : 28.6139,
  //   "longitude"   : 77.2090,
  //   "address"     : "Sector 18, Noida",
  //   "placeName"   : "Sector 18",
  //   "status"      : "tracking active",
  //   "batteryLevel": 72,
  //   "isOnline"    : true,
  //   "lastUpdated" : "2026-07-15T12:17:00.000Z"
  // }

  setState(() {
    // Employee list me dhundho aur update karo
    final idx = employees.indexWhere(
      (e) => e['employeeId'] == data['employeeId']
    );

    if (idx != -1) {
      employees[idx] = {...employees[idx], ...data};
    } else {
      // Naya employee aa gaya (pehli baar location send ki)
      employees.add(data);
    }

    // Map pin bhi update karo (latitude/longitude change)
    updateMapPin(data['employeeId'], data['latitude'], data['longitude']);
  });
});
```

---

### Listen: `employee-tracking-status`
**Kab aata hai:** Jab employee "Pause/Stop Tracking" button dabaye

```dart
socket.on('employee-tracking-status', (data) {
  // data = {
  //   "employeeId"    : "64abc...",
  //   "name"          : "Ranjeet Singh",
  //   "department"    : "Sales",
  //   "photo"         : null,
  //   "trackingStatus": "paused",   // 'active' | 'paused' | 'stopped'
  //   "sessionId"     : "64ses...",
  //   "updatedAt"     : "2026-07-15T..."
  // }

  setState(() {
    final idx = employees.indexWhere(
      (e) => e['employeeId'] == data['employeeId']
    );
    if (idx != -1) {
      // isOnline flag update karo based on trackingStatus
      employees[idx]['trackingStatus'] = data['trackingStatus'];
      // Agar stopped hai to badge grey karo
      if (data['trackingStatus'] == 'stopped') {
        employees[idx]['isOnline'] = false;
      }
    }
  });
});
```

### Dispose (Dashboard close hone par)

```dart
@override
void dispose() {
  socket.emit('leave-company', companyId);
  socket.off('live-location-update');
  socket.off('employee-tracking-status');
  socket.disconnect();
  super.dispose();
}
```

---

## ⚡ Complete Dashboard Flow

```
initState()
    │
    ├── 1. GET /api/location/live?companyId=X
    │       → employees list load
    │       → map pe sab pins lगाo
    │
    ├── 2. socket.emit('join-company', companyId)
    │
    ├── 3. socket.on('live-location-update') → pin move + list update
    │
    └── 4. socket.on('employee-tracking-status') → badge update


Employee card pe click:
    └── GET /api/location/employee-stats?employeeId=X&companyId=Y
            → Right sidebar open karo with stats + timeline


"Refresh Locations" button:
    └── GET /api/location/live?companyId=X  (manual refresh)


Logs Tab / Date Filter change:
    └── GET /api/location/logs?companyId=X&date=Y&employeeId=Z&page=1
            → Table update karo + pagination show karo


Department Filter:
    └── Frontend me filter karo (data already loaded hai)
        employees.where((e) => e['department'] == selectedDept)
```

---

## 🎨 Badge Colors

```dart
// isOnline badge
Widget onlineBadge(bool isOnline) {
  return Container(
    padding: EdgeInsets.symmetric(horizontal: 8, vertical: 4),
    decoration: BoxDecoration(
      color: isOnline ? Color(0xFF4CAF50) : Color(0xFF9E9E9E),
      borderRadius: BorderRadius.circular(12),
    ),
    child: Row(children: [
      Icon(Icons.circle, size: 8, color: Colors.white),
      SizedBox(width: 4),
      Text(isOnline ? 'Live' : 'Offline',
           style: TextStyle(color: Colors.white, fontSize: 12))
    ]),
  );
}

// trackingStatus badge
Color trackingColor(String status) {
  switch (status) {
    case 'active'  : return Color(0xFF4CAF50); // Green
    case 'paused'  : return Color(0xFFFF9800); // Orange
    case 'stopped' : return Color(0xFF9E9E9E); // Grey
    default        : return Color(0xFF9E9E9E);
  }
}
```

## 🕐 Time Helpers

```dart
String timeAgo(String isoDate) {
  final diff = DateTime.now().difference(DateTime.parse(isoDate));
  if (diff.inSeconds < 60)  return 'Just now';
  if (diff.inMinutes < 60)  return '${diff.inMinutes} min ago';
  if (diff.inHours < 24)    return '${diff.inHours}h ago';
  return '${diff.inDays}d ago';
}

bool isOnlineNow(String isoDate) {
  // Same logic as backend: < 10 minutes = online
  return DateTime.now().difference(DateTime.parse(isoDate)).inMinutes < 10;
}

String formatTime(String isoDate) {
  final dt = DateTime.parse(isoDate).toLocal();
  final h = dt.hour > 12 ? dt.hour - 12 : dt.hour;
  final m = dt.minute.toString().padLeft(2, '0');
  final ampm = dt.hour >= 12 ? 'PM' : 'AM';
  return '$h:$m $ampm';
}
```

---

## 🗺️ Map Setup (flutter_map + OpenStreetMap)

```dart
FlutterMap(
  options: MapOptions(
    center: LatLng(28.6139, 77.2090), // Default center
    zoom: 12,
  ),
  children: [
    TileLayer(
      urlTemplate: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
    ),
    MarkerLayer(
      markers: employees.map((emp) => Marker(
        point: LatLng(emp['latitude'], emp['longitude']),
        width: 40,
        height: 40,
        child: GestureDetector(
          onTap: () => loadEmployeeStats(emp['employeeId']),
          child: CircleAvatar(
            backgroundColor: emp['isOnline'] ? Colors.green : Colors.grey,
            child: Text(emp['name'][0]), // Initials
          ),
        ),
      )).toList(),
    ),
  ],
)
```

---

## ❌ Error Handling

```json
{ "success": false, "message": "Error description" }
```

| HTTP Code | Matlab | Action |
|-----------|--------|--------|
| `400` | `companyId` missing | Check params |
| `401` | Token expired | Login screen pe bhejo |
| `500` | Server error | "Something went wrong" toast |

---

## ✅ Checklist

- [ ] `getLiveLocations` API on init → employees list + map pins
- [ ] Socket `join-company` emit with `companyId`
- [ ] Socket `live-location-update` → update employee card + map pin
- [ ] Socket `employee-tracking-status` → update badge (Live/Paused/Offline)
- [ ] Employee card click → `employee-stats` API → right sidebar
- [ ] "Refresh Locations" button → re-call `getLiveLocations`
- [ ] Date filter + Employee filter → `logs` API with params
- [ ] Pagination for logs table
- [ ] Department filter (frontend-side filtering)
- [ ] `dispose()` → `leave-company` emit + socket disconnect
- [ ] Avatar fallback: photo URL se load karo, error pe initials circle dikhao

---
*Backend: Node.js + Express + Socket.io v4.8.3 + MongoDB*
