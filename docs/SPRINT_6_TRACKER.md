# 📊 Sprint 6: Premium & Monetization — Tracker
## Мета: Інтеграція Telegram Stars для Premium підписки

---

## 📅 Sprint Timeline
**Дата початку:** _______________  
**Дата закінчення:** _______________  
**Scrum Master:** _______________

---

## ✅ Backend Tasks

### 🗄️ Database
| # | Task | Assignee | Status | Notes |
|---|------|----------|--------|-------|
| 1.1 | Add premium fields to profiles | | ⬜ | |
| 1.2 | Create payment_history table | | ⬜ | |
| 1.3 | Add indexes | | ⬜ | |
| 1.4 | Configure RLS | | ⬜ | |

### ⚡ RPC Functions
| # | Task | Assignee | Status | Notes |
|---|------|----------|--------|-------|
| 2.1 | `is_user_premium()` | | ⬜ | |
| 2.2 | `activate_premium()` | | ⬜ | |
| 2.3 | `deactivate_expired_premium()` | | ⬜ | |
| 2.4 | `get_premium_status()` | | ⬜ | |
| 2.5 | `create_premium_invoice()` | | ⬜ | |
| 2.6 | `verify_payment()` | | ⬜ | |
| 2.7 | `get_payment_history()` | | ⬜ | |

### 🤖 Telegram Bot
| # | Task | Assignee | Status | Notes |
|---|------|----------|--------|-------|
| 3.1 | Configure bot for payments | | ⬜ | |
| 3.2 | Payment webhook handler | | ⬜ | |
| 3.3 | Payment verification | | ⬜ | |
| 3.4 | Test payment flow | | ⬜ | |

---

## ✅ Frontend Tasks

### 💎 Premium Screen
| # | Task | Assignee | Status | Notes |
|---|------|----------|--------|-------|
| 4.1 | Screen structure | | ⬜ | |
| 4.2 | Active premium view | | ⬜ | |
| 4.3 | Upgrade hero section | | ⬜ | |
| 4.4 | Features list | | ⬜ | |
| 4.5 | Plans grid | | ⬜ | |
| 4.6 | Payment history | | ⬜ | |

### 💳 Payment Flow
| # | Task | Assignee | Status | Notes |
|---|------|----------|--------|-------|
| 5.1 | Plan selection | | ⬜ | |
| 5.2 | Telegram payment init | | ⬜ | |
| 5.3 | Success handling | | ⬜ | |
| 5.4 | Error handling | | ⬜ | |
| 5.5 | Loading states | | ⬜ | |

### 🏷️ Premium Badges
| # | Task | Assignee | Status | Notes |
|---|------|----------|--------|-------|
| 6.1 | Small badge component | | ⬜ | |
| 6.2 | Card badge component | | ⬜ | |
| 6.3 | Large badge component | | ⬜ | |
| 6.4 | Badge in profile | | ⬜ | |
| 6.5 | Badge in event cards | | ⬜ | |

---

## 🧪 Testing Checklist

### Premium Flow
| # | Test Case | Status | Tester | Date |
|---|-----------|--------|--------|------|
| 1 | View premium screen | ⬜ | | |
| 2 | Select plan | ⬜ | | |
| 3 | Initiate payment | ⬜ | | |
| 4 | Pay with Stars | ⬜ | | |
| 5 | Premium activated | ⬜ | | |
| 6 | Badge appears | ⬜ | | |
| 7 | Payment history shows | ⬜ | | |

### Expiration
| # | Test Case | Status | Tester | Date |
|---|-----------|--------|--------|------|
| 1 | Premium expires | ⬜ | | |
| 2 | Badge removed | ⬜ | | |
| 3 | Features blocked | ⬜ | | |
| 4 | Renew subscription | ⬜ | | |

### Edge Cases
| # | Test Case | Status | Tester | Date |
|---|-----------|--------|--------|------|
| 1 | Payment cancelled | ⬜ | | |
| 2 | Double payment | ⬜ | | |
| 3 | Invalid payload | ⬜ | | |
| 4 | Network error | ⬜ | | |

---

## 🐛 Bugs Found

| # | Bug | Severity | Status | Assignee | Fixed |
|---|-----|----------|--------|----------|-------|
| 1 | | | | | |
| 2 | | | | | |
| 3 | | | | | |

---

## 📈 Daily Standups

### Day 1 (Понеділок)
**Що зроблено:**  
- 

**Плани на завтра:**  
- 

**Блокери:**  
- 

### Day 2 (Вівторок)
**Що зроблено:**  
- 

**Плани на завтра:**  
- 

**Блокери:**  
- 

### Day 3 (Середа)
**Що зроблено:**  
- 

**Плани на завтра:**  
- 

**Блокери:**  
- 

### Day 4 (Четвер)
**Що зроблено:**  
- 

**Плани на завтра:**  
- 

**Блокери:**  
- 

### Day 5 (П'ятниця)
**Що зроблено:**  
- 

**Плани на завтра:**  
- 

**Блокери:**  
- 

---

## 📊 Sprint Metrics

| Metric | Target | Actual |
|--------|--------|--------|
| Tasks Completed | 20 | |
| Payment flow works | ✓ | |
| Premium badge visible | ✓ | |
| Bugs Found | - | |
| Bugs Fixed | - | |

---

## 💰 Premium Pricing

| Plan | Stars | EUR (approx) | Days | $/day |
|------|-------|-------------|------|-------|
| Daily | 25 ⭐ | ~€0.05 | 1 | €0.05 |
| Weekly | 100 ⭐ | ~€0.20 | 7 | €0.03 |
| Monthly | 400 ⭐ | ~€0.80 | 30 | €0.03 |
| Yearly | 1500 ⭐ | ~€3.00 | 365 | €0.01 |

---

## ✅ Definition of Done — Sprint 6

| Criteria | Status |
|----------|--------|
| Database tables created | ⬜ |
| RPC functions work | ⬜ |
| Telegram Bot configured | ⬜ |
| Premium Screen UI | ⬜ |
| Payment flow works | ⬜ |
| Premium badge displays | ⬜ |
| 0 Critical Bugs | ⬜ |
| Deployed to Staging | ⬜ |

---

## 🔗 Telegram Payment Flow

```
User selects plan
      ↓
create_premium_invoice() RPC
      ↓
Telegram.WebApp.openInvoice()
      ↓
User pays with Stars
      ↓
Telegram sends webhook to bot
      ↓
Bot calls verify_payment()
      ↓
activate_premium() updates DB
      ↓
Frontend polls status
      ↓
🎉 Premium activated!
```

---

## 🎯 Sprint 6 Sign-off

| Role | Name | Signature | Date |
|------|------|-----------|------|
| Developer | | | |
| QA | | | |
| Product | | | |

**Sprint 6 Status:** 🟡 In Progress / 🟢 Completed / 🔴 Blocked

**Notes:**
