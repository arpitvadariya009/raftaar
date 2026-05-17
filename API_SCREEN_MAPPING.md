# Raftaar HRMS API & Screen Mapping Document

This document provides a detailed mapping between the UI screens provided in the design and the backend API endpoints. Each section describes the functionality, the endpoint, and the parameters required.

## 1. Authentication & Security

### 📱 Screen: Login
**API Engine**: `AuthEmployee` Controller
*   **Endpoint**: `POST /api/auth-employee/login`
*   **Headers**: `Content-Type: application/json`
*   **Request Body**:
    ```json
    {
      "employeeId": "EMP001",
      "password": "yourpassword"
    }
    ```
*   **Details**: Used to authenticate the user and retrieve a JWT token for subsequent requests.

### 📱 Screen: Forgot Password
*   **Endpoint**: `POST /api/auth-employee/forgot-password`
*   **Request Body**:
    ```json
    {
      "email": "piyush.sehdev@company.com"
    }
    ```
*   **Details**: Sends a recovery email with the existing/reset password to the employee's registered email.

---

## 2. Dashboard & Home Screen

### 📱 Screen: Main Dashboard (Today's Birthdays, Schedule, On Leave)
**API Engine**: `EmployeeDashboard` Controller
*   **Endpoint**: `GET /api/dashboard/getEmployeeDashboard`
*   **Query Parameters**:
    *   `employeeId`: ID of the logged-in employee.
    *   `companyId`: ID of the company.
*   **Response Data Mapping**:
    *   `profile`: Mapped to the top header (Name, Image).
    *   `todaysBirthdays`: Mapped to the "Today's Birthdays" slider.
    *   `todaysTasks`: Mapped to "Today's Scheduled Task" list.
    *   `onLeave`: Mapped to "On Leave" horizontal list.
    *   `stats`: Mapped to "Attendance (%)", "Leave Balance", and "Tasks Done".

---

## 3. Task Management

### 📱 Screen: Today's Scheduled (Detailed List)
*   **Endpoint**: `GET /api/tasks/getTasks`
*   **Query Parameters**:
    *   `employeeId`: Filter by employee.
    *   `companyId`: Filter by company.
    *   `date`: `2026-04-22` (Mapped to the calendar selection).
    *   `status`: `Completed`, `In Progress`, `Pending`, `Overdue` (Mapped to filter tabs).

### 📱 Screen: Schedule New (Task Creation)
*   **Endpoint**: `POST /api/tasks/createTask`
*   **Request Body**:
    ```json
    {
      "title": "Code Review",
      "description": "Review the auth module updates",
      "date": "2026-04-22",
      "time": "11:00",
      "priority": "High",
      "assignee": "64a...", 
      "location": "Head Office",
      "companyId": "64b..."
    }
    ```
*   **Update Status Endpoint**: `PUT /api/tasks/updateTaskStatus/:id`
    *   **Body**: `{"status": "Completed"}`

### 📱 Screen: Approvals (Task Tracker)
*   **Stats API**: `GET /api/tasks/getTaskStats`
    *   **Query Params**: `companyId`, `employeeId`
    *   **Details**: Returns counts for Total, Done, Pending.
*   **Sub-Tasks API**: `GET /api/tasks/getTasks?parentTask=[ID]`
    *   **Details**: Used to list the individual steps (e.g., "Send welcome email") shown in the tracker.

---

## 4. Location Tracking

### 📱 Screen: Location Tracking (Live Map & Stats)
*   **Logging Status API**: `POST /api/location/logLocation`
    *   **Request Body**:
        ```json
        {
          "employeeId": "...",
          "companyId": "...",
          "latitude": 28.6139,
          "longitude": 77.2090,
          "address": "Head Office - Main Gate",
          "status": "tracking active",
          "batteryLevel": 85
        }
        ```
*   **Stats & Timeline API**: `GET /api/location/getTimeline`
    *   **Query Params**: `employeeId`, `date`
    *   **Response Data Mapping**:
        *   `stats.checkIn`: Mapped to "09:02 AM Check In".
        *   `stats.totalHours`: Mapped to "7h 58m Total Hours".
        *   `stats.locationCount`: Mapped to "3 Locations".
        *   `logs`: List of locations with timestamps mapped to "Today's Timeline".

---

## 5. Communications

### 📱 Screen: Messaging (List View)
*   **Endpoint**: `GET /api/chat/getMyChatRooms`
    *   **Query Params**: `employeeId`, `companyId`
    *   **Details**: Returns list of Direct Messages and Groups with `lastMessage` and `unreadCount`.

### 📱 Screen: Messaging (Chat Room)
*   **Send Message**: `POST /api/chat/sendMessage`
    *   **Body**: `{ "chatRoomId": "...", "senderId": "...", "text": "...", "attachments": [] }`
*   **Get History**: `GET /api/chat/getMessages/:roomId`
*   **Create Room**: `POST /api/chat/getOrCreateChatRoom` (Used when clicking '+' or starting a new chat).

---

## 6. Notifications

### 📱 Screen: Notifications List
*   **Endpoint**: `GET /api/notifications/getMyNotifications`
    *   **Query Params**: `employeeId`, `companyId`
    *   **Details**: Returns list of all types (Leave Approved, New Task, etc.) with icons determined by `type`.
*   **Mark Read**: `PUT /api/notifications/markAsRead/:id`

---

## 7. Leave Management

### 📱 Screen: Leave Management (List)
*   **Endpoint**: `GET /api/leaves/company/:companyId`
    *   **Details**: Returns the list of leave requests for the logged-in employee. (Can filter by employee).

### 📱 Screen: Apply for Leave (Popup)
*   **Endpoint**: `POST /api/leaves/apply`
*   **Request Body**:
    ```json
    {
      "employeeId": "...",
      "companyId": "...",
      "leaveType": "Casual Leave",
      "fromDate": "2026-04-25",
      "toDate": "2026-04-26",
      "reason": "Family function"
    }
    ```
