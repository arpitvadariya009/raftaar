# Detailed API Explanation (Hindi/English)

Yeh document sabhi APIs ka matlab aur unka use case samjhata hai.

---

## **Authorization (Token Header)**
**Important**: Login aur Register ke alawa, baaki sabhi APIs ke liye aapko **Authorization Header** bhejna zaruri hai.
- Format: `Authorization: Bearer YOUR_JWT_TOKEN`

---

## 1. Auth Module (Authentication)
**Purpose**: User login aur registration ke liye.

- **POST `/api/auth/registerUser`**: 
  - **Kya karta hai?**: Naya admin user create karta hai.
  - **Logic**: Password ko hash (encrypt) karta hai aur database me store karta hai. Ek token generate karke return karta hai (JWT).

- **POST `/api/auth/loginUser`**: 
  - **Kya karta hai?**: User ko login karwata hai.
  - **Logic**: Email aur Password check karta hai. Agar sahi hai, toh naya token deta hai aur purana token database me update karta hai.

---

## 2. Company Module (Management)
**Purpose**: HRMS portal me kitni companies onboarded hain unhe manage karne ke liye.

- **GET `/api/companies/getAllCompanies`**: 
  - **Kya karta hai?**: Sabhi companies ki list dikhata hai.
  - **Speciality**: Search aur Filters (Status) ke saath pagination support karta hai.

- **POST `/api/companies/registerCompany`**: 
  - **Kya karta hai?**: Nayi company register karta hai.
  - **Logic**: Automatically **Company Code** generate karta hai aur details save karta hai.

- **PATCH `/api/companies/toggleNotification/:id`**: 
  - **Kya karta hai?**: Kisi specific company ki alerts/notifications on ya off karta hai.

---

## 3. Subscription Module
**Purpose**: Plan management aur billing.

- **POST `/api/subscriptions/createSubscription`**: 
  - **Kya karta hai?**: Naya subscription plan assign karta hai.
  - **Calculation**: Database automatically **`validTill`** date calculate kar leta hai.

- **GET `/api/companies/getExpiringSoon`**: 
  - **Kya karta hai?**: Woh companies dikhata hai jinka subscription agle 30 din me khatam hone wala hai.

---

## 4. Banner Module (Promotion)
**Purpose**: Admin panel pe specific companies ke liye promotion banners dikhane ke liye.

- **POST `/api/notifications/createBanner`**: 
  - **Kya karta hai?**: Banner details store karta hai.

- **POST `/api/notifications/uploadBannerImage`**: 
  - **Kya karta hai?**: Multer ka use karke banner ki image upload karta hai.

---

## 5. Enquiry Module (Leads)
**Purpose**: Naye potential customers ko track karne ke liye.

- **POST `/api/enquiries/createEnquiry` (Public)**: 
  - **Kya karta hai?**: Bina login ke koi bhi company enquiry bhej sakti hai.

- **PUT `/api/enquiries/respondToEnquiry/:id` (Protected)**: 
  - **Kya karta hai?**: Admin lead ka jawaab store karta hai.

- **POST `/api/enquiries/convertToCustomer/:id` (Protected)**:
  - **Kya karta hai?**: Lead ko successful customer/company me badal deta hai.

---

## Background System logic (Cron Jobs)
**Purpose**: Automation.

1. **Daily Check**: System check karta hai ki kaunsi company ka subscription expire hone wala hai aur notifications bhejne ki taiyari karta hai.
2. **Auto-Expire**: Subscription khatam hone par status automatically **"Expired"** ho jata hai.
