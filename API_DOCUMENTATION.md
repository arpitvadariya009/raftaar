# HRMS Admin Panel - Comprehensive API Documentation

## Table of Contents
1. [Auth](#1-auth)
2. [Companies (Customers)](#2-companies-customers)
3. [Subscriptions](#3-subscriptions)
4. [Notification Banners](#4-notification-banners)
5. [Business Enquiries (Leads)](#5-business-enquiries-leads)
6. [Auth Employee (Face Auth)](#6-auth-employee-face-auth)
7. [Dashboard](#7-dashboard)

---

## Authentication
Most API endpoints require authentication using a **Bearer Token**.
- Include `Authorization: Bearer <your_token>` in the request headers.
- Tokens can be obtained through the [Auth Module](#1-auth) via `/loginUser` or `/registerUser`.

---

## 1. Auth Module
Manage administrator access. Base URL: `/api/auth`
- `POST /registerUser`: Create a new user.
- `POST /loginUser`: Authenticate and receive a token.

## 2. Companies (Customers)
Manage registered companies. Base URL: `/api/companies`
- `GET /getAllCompanies`: List companies with search/pagination.
- `GET /getCompanyById/:id`: Specific company details.
- `POST /registerCompany`: Register a new company (auto-generates code).
- `PUT /updateCompany/:id`: Update company info.
- `DELETE /deleteCompany/:id`: Remove a company.
- `PATCH /toggleNotification/:id`: Toggle alerts.
- `GET /getExpiringSoon`: List companies with plans ending in 30 days.
- `GET /getCompanyDropdown`: Get companies list for dropdown (id + name + code).
- `POST /validateGST`: Check GST format.

## 3. Subscriptions
Handle company plans and billing. Base URL: `/api/subscriptions`
- `POST /createSubscription`: Create plan (calculates `validTill`).
- `GET /getAllSubscriptions`: View all active plans.
- `GET /getCompanySubscriptions/:companyId`: History for one client.
- `PUT /updateSubscription/:id`: Edit plan details.
- `DELETE /cancelSubscription/:id`: Cancel/Expire plan.
- `GET /getSubscriptionTypes`: Get subscription types for dropdown.

## 4. Notification Banners
Admin-targeted advertisements for specific clients. Base URL: `/api/notifications`
- `POST /createBanner`: Setup a new ad.
- `GET /getAllBanners`: View scheduled ads.
- `PUT /updateBanner/:id`: Edit ad or toggle `isActive`.
- `DELETE /deleteBanner/:id`: Remove ad.
- `POST /uploadBannerImage`: Handle image uploads (Multer).

## 5. Business Enquiries (Leads)
Track potential leads. Base URL: `/api/enquiries`
- `GET /getAllEnquiries`: List incoming leads.
- `POST /createEnquiry`: Create lead (Public API).
- `GET /getEnquiryById/:id`: Lead details.
- `PUT /respondToEnquiry/:id`: Log admin response.
- `POST /convertToCustomer/:id`: Transition lead to customer status.
- `DELETE /deleteEnquiry/:id`: Clear/Reject lead.

## 6. Auth Employee (Face Auth)
Manage employees using biometrics. Base URL: `/api/auth-employee`
- `POST /createEmployee`: Create employee with full profile and face image (Subscription-aware).
- `GET /getAllEmployees`: List employees with pagination and company filter.
- `POST /face-login`: Recognize an employee via face image.
- `PUT /updateEmployee/:id`: Update employee details.
- `POST /uploadEmployeeImage/:id`: Update employee face image (Pro Plan Only).


## 7. Dashboard
Dashboard statistics and recent data. Base URL: `/api/dashboard`
- `GET /stats`: Get all dashboard counts & revenue (supports `startDate` & `endDate` filters).
- `GET /recent-companies`: Get recent companies with search/pagination. Returns: `companyName`, `employeeCount`, `subscriptionType`, `subscriptionStatus`.
- `GET /recent-enquiries`: Get recent enquiries with type/status filters & pagination.
