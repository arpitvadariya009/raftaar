# Subscription System — Complete Flow

## Architecture

```
SubscriptionPlan (Master)          Subscription (Per Company)           SubscriptionHistory (Log)
┌──────────────────────┐          ┌───────────────────────────┐        ┌──────────────────────────┐
│ Basic: ₹1/mo, ₹12/yr│───────▶  │ 10 Basic + 5 Pro          │──────▶ │ Created  → 10B, 5P       │
│ Pro: ₹1.25/mo, ₹15/yr│         │ charge (auto-calculated)  │        │ Upgraded → 20B, 5P       │
│ (+ future plans)     │          │ discount (manual by admin)│        │ Renewed  → new sub       │
└──────────────────────┘          │ finalAmount = charge-disc │        │ Cancelled                │
                                  └───────────────────────────┘        └──────────────────────────┘
```

## Charge Calculation

| Billing  | Formula |
|----------|---------|
| Monthly  | `(basicCount × monthlyPrice + proCount × proMonthlyPrice) × duration_months` |
| Yearly   | `(basicCount × yearlyPrice + proCount × proYearlyPrice) × years` |

---

## Case 1: 🆕 New Company — First Subscription

**Scenario:** ABC Company signs up, needs 10 Basic + 5 Pro employees, Yearly plan

```json
POST /api/subscriptions/createSubscription
{
    "company": "<companyId>",
    "subscriptionType": { "subscriptionTypeBasic": 10, "subscriptionTypePro": 5 },
    "billingType": "Yearly",
    "startDate": "2026-03-01",
    "duration": 12
}
```

**System:**
- Charge = `(10 × 12) + (5 × 15)` = **₹195**
- Discount = 0, FinalAmount = **₹195**
- ValidTill = 2027-03-01
- History → **"Created"**

---

## Case 2: 📈 Mid-Term Upgrade (Team Grew)

**Scenario:** 3 months later, ABC needs 10 more Basic employees

```json
PUT /api/subscriptions/updateSubscription/:id
{
    "subscriptionType": { "subscriptionTypeBasic": 20, "subscriptionTypePro": 5 },
    "remarks": "Added 10 more Basic employees"
}
```

**System:**
- Previous: `10B, 5P, ₹195` → saved to history
- New charge = `(20 × 12) + (5 × 15)` = **₹315**
- History → **"Upgraded"** | prev: 10B → new: 20B

---

## Case 3: 📉 Downgrade (Team Reduced)

**Scenario:** 3 Pro employees removed from ABC Company

```json
PUT /api/subscriptions/updateSubscription/:id
{
    "subscriptionType": { "subscriptionTypeBasic": 20, "subscriptionTypePro": 2 },
    "remarks": "Removed 3 Pro employees"
}
```

**System:**
- Previous: `20B, 5P, ₹315` → saved to history
- New charge = `(20 × 12) + (2 × 15)` = **₹270**
- History → **"Downgraded"** | prev: 5P → new: 2P

---

## Case 4: 🎁 Admin Gives Discount

**Scenario:** Admin wants to give ABC Company ₹50 discount

```json
PUT /api/subscriptions/updateSubscription/:id
{
    "discount": 50
}
```

**System:**
- Charge stays ₹270, Discount = ₹50
- FinalAmount = ₹270 - ₹50 = **₹220**
- History → logged with discount change

> **Note:** Discount is optional at creation time. Admin can add/update it anytime.

---

## Case 5: 🔄 Renewal (Subscription Expired)

**Scenario:** ABC's yearly plan expired, they want to renew — 25 Basic, 10 Pro, Monthly billing

```json
POST /api/subscriptions/createSubscription
{
    "company": "<same_companyId>",
    "subscriptionType": { "subscriptionTypeBasic": 25, "subscriptionTypePro": 10 },
    "billingType": "Monthly",
    "discount": 30,
    "startDate": "2027-03-01",
    "duration": 12
}
```

**System:**
1. Checks if company has Active subscription → **YES**
2. Old subscription auto-set to **"Expired"**
3. Old subscription history → **"Renewed"**
4. New subscription created → charge = `(25 × 1 + 10 × 1.25) × 12` = **₹450**
5. Discount ₹30 → finalAmount = **₹420**
6. New subscription history → **"Created"** (Renewal)

**Database after renewal:**
```
Subscription #1: 20B, 2P, Yearly   → status: Expired  ← old
Subscription #2: 25B, 10P, Monthly → status: Active   ← new
```

---

## Case 6: ❌ Cancellation

**Scenario:** ABC Company cancels their subscription

```json
DELETE /api/subscriptions/cancelSubscription/:id
```

**System:**
- Status → **"Expired"**
- History → **"Cancelled"**

---

## Case 7: 📋 View Full History

**Scenario:** Admin wants to see ABC Company's complete subscription timeline

```json
GET /api/subscriptions/getCompanyHistory/<companyId>
```

**Response Timeline:**
```
2026-03-01  Created      → 10B, 5P,  charge: ₹195
2026-06-15  Upgraded     → 20B, 5P,  charge: ₹315  (added 10 Basic)
2026-09-01  Downgraded   → 20B, 2P,  charge: ₹270  (removed 3 Pro)
2027-03-01  Renewed      → old subscription expired
2027-03-01  Created      → 25B, 10P, charge: ₹450  (new subscription)
2027-08-01  Cancelled    → service stopped
```

---

## All API Endpoints

### Subscription Plans (`/api/subscription-plans`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/createPlan` | Create new plan |
| GET | `/getAllPlans` | List all active plans |
| GET | `/getPlan/:id` | Single plan details |
| PUT | `/updatePlan/:id` | Update plan prices/features |
| DELETE | `/deletePlan/:id` | Soft delete plan |

### Subscriptions (`/api/subscriptions`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/createSubscription` | New purchase / Renewal |
| GET | `/getAllSubscriptions` | List all (pagination, filters) |
| GET | `/getCompanySubscriptions/:companyId` | Company's subscriptions |
| GET | `/getHistory/:subscriptionId` | Change log for one subscription |
| GET | `/getCompanyHistory/:companyId` | Full history for company |
| PUT | `/updateSubscription/:id` | Upgrade / Downgrade |
| DELETE | `/cancelSubscription/:id` | Cancel subscription |

---

## Setup

```bash
# Seed default plans (one-time)
node scripts/seedPlans.js
# Creates: Basic (₹1/mo, ₹12/yr) and Pro (₹1.25/mo, ₹15/yr)
```
