# HRMS Admin Panel - Comprehensive API Documentation

## Table of Contents
1. [Auth](#1-auth)
2. [Companies (Customers)](#2-companies-customers)
3. [Subscriptions](#3-subscriptions)
4. [Notification Banners](#4-notification-banners)
5. [Business Enquiries (Leads)](#5-business-enquiries-leads)

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
- `POST /validateGST`: Check GST format.

## 3. Subscriptions
Handle company plans and billing. Base URL: `/api/subscriptions`
- `POST /createSubscription`: Create plan (calculates `validTill`).
- `GET /getAllSubscriptions`: View all active plans.
- `GET /getCompanySubscriptions/:companyId`: History for one client.
- `PUT /updateSubscription/:id`: Edit plan details.
- `DELETE /cancelSubscription/:id`: Cancel/Expire plan.

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
