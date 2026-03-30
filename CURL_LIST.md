# HRMS Full API - CURL Commands List

## 1. Authentication (Public)

### Register User
```bash
curl -X POST http://localhost:5000/api/auth/registerUser \
-H "Content-Type: application/json" \
-d '{"username":"admin","email":"admin@example.com","password":"password123","confirmPassword":"password123"}'
```

### Login User
```bash
curl -X POST http://localhost:5000/api/auth/loginUser \
-H "Content-Type: application/json" \
-d '{"email":"admin@example.com","password":"password123"}'
```

---

## 2. Companies / Customers (Protected)

### List Companies (Pagination/Search)
```bash
curl -X GET "http://localhost:5000/api/companies/getAllCompanies?page=1&limit=10&status=Trial" \
-H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### Get Company By ID
```bash
curl -X GET http://localhost:5000/api/companies/getCompanyById/ID_HERE \
-H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### Register Company
```bash
curl -X POST http://localhost:5000/api/companies/registerCompany \
-H "Authorization: Bearer YOUR_TOKEN_HERE" \
-H "Content-Type: application/json" \
-d '{"companyName":"Google","contactNumber":"9998887776","hrName":"Jack","hrEmail":"hr@google.com","gstNumber":"27AAAAA0000A1Z5"}'
```

### Update Company
```bash
curl -X PUT http://localhost:5000/api/companies/updateCompany/ID_HERE \
-H "Authorization: Bearer YOUR_TOKEN_HERE" \
-H "Content-Type: application/json" \
-d '{"companyName":"Updated Name"}'
```

### Delete Company
```bash
curl -X DELETE http://localhost:5000/api/companies/deleteCompany/ID_HERE \
-H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### Notification Toggle
```bash
curl -X PATCH http://localhost:5000/api/companies/toggleNotification/ID_HERE \
-H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### Expiring Soon
```bash
curl -X GET http://localhost:5000/api/companies/getExpiringSoon \
-H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### Company Dropdown (For Select Company)
```bash
curl -X GET http://localhost:5000/api/companies/getCompanyDropdown \
-H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### Validate GST
```bash
curl -X POST http://localhost:5000/api/companies/validateGST \
-H "Authorization: Bearer YOUR_TOKEN_HERE" \
-H "Content-Type: application/json" \
-d '{"gstNumber":"27AAAAA0000A1Z5"}'
```

---

## 3. Subscriptions (Protected)

### Create Subscription
```bash
curl -X POST http://localhost:5000/api/subscriptions/createSubscription \
-H "Authorization: Bearer YOUR_TOKEN_HERE" \
-H "Content-Type: application/json" \
-d '{"company":"COMP_ID","subscriptionType":"Premium","billingType":"Monthly","charge":5000,"startDate":"2024-02-14","duration":12}'
```

### List All Subscriptions
```bash
curl -X GET http://localhost:5000/api/subscriptions/getAllSubscriptions \
-H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### Get Company Subscriptions
```bash
curl -X GET http://localhost:5000/api/subscriptions/getCompanySubscriptions/COMP_ID \
-H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### Update Subscription
```bash
curl -X PUT http://localhost:5000/api/subscriptions/updateSubscription/SUB_ID \
-H "Authorization: Bearer YOUR_TOKEN_HERE" \
-H "Content-Type: application/json" \
-d '{"charge":6000}'
```

### Subscription Types Dropdown (For Select Type)
```bash
curl -X GET http://localhost:5000/api/subscriptions/getSubscriptionTypes \
-H "Authorization: Bearer YOUR_TOKEN_HERE"
```

---

## 4. Notification Banners (Protected)

### Create Banner
```bash
curl -X POST http://localhost:5000/api/notifications/createBanner \
-H "Authorization: Bearer YOUR_TOKEN_HERE" \
-H "Content-Type: application/json" \
-d '{"company":"COMP_ID","companyName":"Alpha","message":"Hello!","startDate":"2024-02-14","endDate":"2024-03-14"}'
```

### List Banners
```bash
curl -X GET http://localhost:5000/api/notifications/getAllBanners \
-H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### Update Banner
```bash
curl -X PUT http://localhost:5000/api/notifications/updateBanner/BAN_ID \
-H "Authorization: Bearer YOUR_TOKEN_HERE" \
-H "Content-Type: application/json" \
-d '{"isActive":false}'
```

### Delete Banner
```bash
curl -X DELETE http://localhost:5000/api/notifications/deleteBanner/BAN_ID \
-H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### Upload Image (Multipart)
```bash
curl -X POST http://localhost:5000/api/notifications/uploadBannerImage \
-H "Authorization: Bearer YOUR_TOKEN_HERE" \
-F "image=@/path/to/image.jpg"
```

---

## 5. Business Enquiries (Leads)

### List Enquiries (Protected)
```bash
curl -X GET http://localhost:5000/api/enquiries/getAllEnquiries \
-H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### Create Enquiry (Public)
```bash
curl -X POST http://localhost:5000/api/enquiries/createEnquiry \
-H "Content-Type: application/json" \
-d '{"companyName":"Beta Inc","enquiryType":"New","description":"Need help","contactPhone":"1234567890","contactEmail":"beta@inc.com"}'
```

### Respond to Enquiry (Protected)
```bash
curl -X PUT http://localhost:5000/api/enquiries/respondToEnquiry/ENQ_ID \
-H "Authorization: Bearer YOUR_TOKEN_HERE" \
-H "Content-Type: application/json" \
-d '{"responseMessage":"Call you tomorrow"}'
```

### Convert to Customer (Protected)
```bash
curl -X POST http://localhost:5000/api/enquiries/convertToCustomer/ENQ_ID \
-H "Authorization: Bearer YOUR_TOKEN_HERE"
```

---

## 6. Face Recognition (Biometric)

### Register Face
```bash
curl -X POST http://localhost:1911/api/faces/register \
-F "userId=USER_ID_HERE" \
-F "image=@/path/to/face_image.jpg"
```

### Face Login (1:N Match)
```bash
curl -X POST http://localhost:1911/api/faces/login \
-F "image=@/path/to/login_image.jpg"
```

### Verify Face (1:1 Match)
```bash
curl -X POST http://localhost:1911/api/faces/verify \
-F "userId=USER_ID_HERE" \
-F "image=@/path/to/verify_image.jpg"
```

---

## 7. Auth Employee (Face Auth)


### Create Employee (Subscription-aware)
```bash
curl -X POST http://localhost:1911/api/auth-employee/createEmployee \
  -F "company=65f1a23e4b5c6d7e8f9a0b1c" \
  -F "firstName=John" \
  -F "lastName=Doe" \
  -F "email=john.doe@example.com" \
  -F "contactNumber=9876543210" \
  -F "countryCode=IN" \
  -F "dialCode=+91" \
  -F "address=123 Main St" \
  -F "dateOfBirth=1995-05-15" \
  -F "dateOfJoining=2024-03-01" \
  -F "department=Sales" \
  -F "designation=Sales Executive" \
  -F "reportingHead=Jane Smith" \
  -F "employmentType=Company Name" \
  -F "employmentCategory=Full-Time" \
  -F "applicationPlanType=2" \
  -F "grossSalary=45000" \
  -F "gender=Male" \
  -F "image=@/path/to/image.jpg"
```


### Get All Employees
```bash
curl -X GET "http://localhost:1911/api/auth-employee/all?page=1&limit=10"
```

### Face Login (Get Face Data)
```bash
curl -X POST http://localhost:1911/api/auth-employee/face-login \
-F "image=@/path/to/login_image.jpg"
```

---

## 8. Dashboard (Protected)

### Dashboard Stats (Counts + Revenue)
```bash
curl -X GET "http://localhost:5000/api/dashboard/stats?startDate=2026-01-01&endDate=2026-02-28" \
-H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### Recent Companies (with Pagination/Search)
```bash
curl -X GET "http://localhost:5000/api/dashboard/recent-companies?page=1&limit=5&status=Active&search=Transform" \
-H "Authorization: Bearer YOUR_TOKEN_HERE"
```
**Response Fields**: `companyName`, `employeeCount`, `subscriptionType` `{ subscriptionTypeBasic, subscriptionTypePro }`, `subscriptionStatus` (Active / Expired / No Subscription)

### Recent Enquiries (with Filters)
```bash
curl -X GET "http://localhost:5000/api/dashboard/recent-enquiries?page=1&limit=5&status=Pending" \
-H "Authorization: Bearer YOUR_TOKEN_HERE"
```

---

## 9. Gate Pass Management (Protected)

### Apply for Gate Pass
```bash
curl -X POST http://localhost:1911/api/gate-passes/apply \
-H "Content-Type: application/json" \
-d '{
  "employeeId": "65f1a23e4b5c6d7e8f9a0b1c",
  "companyId": "65f1a12d4b5c6d7e8f9a0b1b",
  "gatePassType": "Personal",
  "date": "2026-03-27",
  "startTime": "2026-03-27T14:00:00.000Z",
  "endTime": "2026-03-27T16:00:00.000Z",
  "reason": "Personal urgent work"
}'
```

### Get All Gate Passes (Company)
```bash
curl -X GET "http://localhost:1911/api/gate-passes/company/COMP_ID?page=1&limit=10&status=Pending&search=John"
```

### Get Gate Pass Stats
```bash
curl -X GET http://localhost:1911/api/gate-passes/stats/COMP_ID
```

### Update Gate Pass Status (Approve/Reject)
```bash
curl -X PUT http://localhost:1911/api/gate-passes/status/GP_ID \
-H "Content-Type: application/json" \
-d '{"status": 1}'
```

---

## 10. Attendance & Dashboard (Integrated)

### Get Attendance Log (with Gate Passes)
```bash
curl -X GET "http://localhost:1911/api/attendance/log/EMP_ID?month=3&year=2026"
```

### Get Company Dashboard Stats (with Gate Pass count)
```

---

## 11. Weekly Off Management (Protected)

### Create Template
```bash
curl -X POST http://localhost:1911/api/weekly-off/template \
-H "Content-Type: application/json" \
-d '{
  "name": "Standard Weekend",
  "offDays": [0, 6],
  "companyId": "COMP_ID"
}'
```

### List Templates
```bash
curl -X GET http://localhost:1911/api/weekly-off/templates/COMP_ID
```

### Assign Weekly Off to Employee
```bash
curl -X POST http://localhost:1911/api/weekly-off/assign \
-H "Content-Type: application/json" \
-d '{
  "employeeId": "EMP_ID",
  "templateId": "TPL_ID",
  "month": 3,
  "year": 2026,
  "companyId": "COMP_ID"
}'
```

### List Assignments (Month Wise)
```bash
curl -X GET "http://localhost:1911/api/weekly-off/assignments/COMP_ID?month=3&year=2026&search=John"
```

### Get Weekly Off Dashboard Stats
```bash
curl -X GET http://localhost:1911/api/weekly-off/stats/COMP_ID
```

### Delete Template
```bash
curl -X DELETE http://localhost:1911/api/weekly-off/template/TPL_ID
```
