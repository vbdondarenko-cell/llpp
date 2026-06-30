# 📊 Sprint 3: Create Event — Tracker
## Мета: Будь-який користувач може створити подію менш ніж за хвилину

---

## 📅 Sprint Timeline
**Дата початку:** _______________  
**Дата закінчення:** _______________  
**Scrum Master:** _______________

---

## ✅ Backend Tasks

### 🗄️ Storage
| # | Task | Assignee | Status | Notes |
|---|------|----------|--------|-------|
| 1.1 | Create storage bucket | | ⬜ | |
| 1.2 | Storage policies | | ⬜ | |
| 1.3 | Test upload | | ⬜ | |

### ⚡ RPC Functions
| # | Task | Assignee | Status | Notes |
|---|------|----------|--------|-------|
| 2.1 | Update `create_event()` | | ⬜ | Add photo URL |
| 2.2 | Create `update_event()` | | ⬜ | |
| 2.3 | Create `cancel_event()` | | ⬜ | |
| 2.4 | Create `get_upload_url()` | | ⬜ | |
| 2.5 | Test all functions | | ⬜ | |

### 🔒 Validation
| # | Task | Assignee | Status | Notes |
|---|------|----------|--------|-------|
| 3.1 | Category validation | | ⬜ | |
| 3.2 | Date validation (not past) | | ⬜ | |
| 3.3 | Participants limit (2-50) | | ⬜ | |
| 3.4 | User event limit (10) | | ⬜ | |

---

## ✅ Frontend Tasks

### 📝 Create Event Screen
| # | Task | Assignee | Status | Notes |
|---|------|----------|--------|-------|
| 1.1 | Screen structure | | ⬜ | |
| 1.2 | Step navigation | | ⬜ | |
| 1.3 | Progress bar | | ⬜ | |
| 1.4 | Form validation | | ⬜ | |

### 🏷️ Category Picker
| # | Task | Assignee | Status | Notes |
|---|------|----------|--------|-------|
| 2.1 | Grid layout | | ⬜ | |
| 2.2 | Selection state | | ⬜ | |
| 2.3 | Icons by category | | ⬜ | |
| 2.4 | Click handler | | ⬜ | |

### 📅 Date & Time Pickers
| # | Task | Assignee | Status | Notes |
|---|------|----------|--------|-------|
| 3.1 | DatePicker component | | ⬜ | |
| 3.2 | TimePicker component | | ⬜ | |
| 3.3 | Min date validation | | ⬜ | |
| 3.4 | Localization | | ⬜ | |

### 👥 Participants Selector
| # | Task | Assignee | Status | Notes |
|---|------|----------|--------|-------|
| 4.1 | +/- buttons | | ⬜ | |
| 4.2 | Range slider | | ⬜ | |
| 4.3 | Min/max limits | | ⬜ | |
| 4.4 | Validation | | ⬜ | |

### 📍 Location Picker
| # | Task | Assignee | Status | Notes |
|---|------|----------|--------|-------|
| 5.1 | MapBox integration | | ⬜ | |
| 5.2 | Click to select | | ⬜ | |
| 5.3 | Search places | | ⬜ | |
| 5.4 | Reverse geocoding | | ⬜ | |
| 5.5 | Selected location UI | | ⬜ | |

### 📷 Photo Upload
| # | Task | Assignee | Status | Notes |
|---|------|----------|--------|-------|
| 6.1 | File input | | ⬜ | |
| 6.2 | Image preview | | ⬜ | |
| 6.3 | Image resize | | ⬜ | |
| 6.4 | Upload progress | | ⬜ | |
| 6.5 | Storage integration | | ⬜ | |

### 📋 Review Screen
| # | Task | Assignee | Status | Notes |
|---|------|----------|--------|-------|
| 7.1 | Summary card | | ⬜ | |
| 7.2 | Edit buttons | | ⬜ | |
| 7.3 | Submit handler | | ⬜ | |

---

## 🧪 Testing Checklist

### Create Event Flow
| # | Test Case | Status | Tester | Date |
|---|-----------|--------|--------|------|
| 1 | Open create form | ⬜ | | |
| 2 | Select category | ⬜ | | |
| 3 | Enter title | ⬜ | | |
| 4 | Select date (future) | ⬜ | | |
| 5 | Select date (past) | ⬜ | | |
| 6 | Upload photo | ⬜ | | |
| 7 | Select location | ⬜ | | |
| 8 | Set participants | ⬜ | | |
| 9 | Submit form | ⬜ | | |
| 10 | View created event | ⬜ | | |

### Validation
| # | Test Case | Status | Tester | Date |
|---|-----------|--------|--------|------|
| 1 | Empty title | ⬜ | | |
| 2 | Short title | ⬜ | | |
| 3 | No category | ⬜ | | |
| 4 | No location | ⬜ | | |
| 5 | Participants < 2 | ⬜ | | |
| 6 | Participants > 50 | ⬜ | | |

### Edge Cases
| # | Test Case | Status | Tester | Date |
|---|-----------|--------|--------|------|
| 1 | No GPS permission | ⬜ | | |
| 2 | Slow upload | ⬜ | | |
| 3 | Large image | ⬜ | | |
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
| Create time | < 60 sec | |
| Tasks Completed | 25 | |
| Bugs Found | - | |
| Bugs Fixed | - | |

---

## ⏱️ Performance Target

### Створення події за 60 секунд:

| Step | Time Target |
|------|------------|
| Category | 5 sec |
| Basics | 15 sec |
| Location | 20 sec |
| Participants | 10 sec |
| Review + Submit | 10 sec |
| **Total** | **< 60 sec** |

---

## ✅ Definition of Done — Sprint 3

| Criteria | Status |
|----------|--------|
| Create form complete | ⬜ |
| Photo upload works | ⬜ |
| Location picker works | ⬜ |
| All validations pass | ⬜ |
| Create time < 60 sec | ⬜ |
| 0 Critical Bugs | ⬜ |
| Deployed to Staging | ⬜ |

---

## 🎯 Sprint 3 Sign-off

| Role | Name | Signature | Date |
|------|------|-----------|------|
| Developer | | | |
| QA | | | |
| Product | | | |

**Sprint 3 Status:** 🟡 In Progress / 🟢 Completed / 🔴 Blocked

**Notes:**
