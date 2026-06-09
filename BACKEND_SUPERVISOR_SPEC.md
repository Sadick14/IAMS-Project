# Industrial Supervisor Backend Implementation Spec

## Overview
Complete backend implementation guide for industrial supervisor features including invitations, approvals, and push notifications.

---

## 1. DATABASE SCHEMA

### 1.1 Supervisor Invitations Table
```sql
CREATE TABLE supervisor_invitations (
  id UUID PRIMARY KEY,
  internship_id UUID NOT NULL,
  student_id UUID NOT NULL,
  supervisor_id UUID,  -- NULL if supervisor doesn't exist yet
  supervisor_email VARCHAR(255) NOT NULL,
  supervisor_name VARCHAR(255),
  supervisor_phone VARCHAR(20),
  company_id UUID,
  
  -- Status: pending, approved, rejected, expired
  status ENUM('pending', 'approved', 'rejected', 'expired') DEFAULT 'pending',
  
  -- Who approved/rejected and when
  approved_at TIMESTAMP,
  approved_by UUID,  -- supervisor_id who approved
  rejected_at TIMESTAMP,
  rejected_by UUID,
  
  -- Dates
  invited_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP,  -- 30 days from invitation
  
  -- Metadata
  invitation_method ENUM('magic_link', 'direct') DEFAULT 'magic_link',
  magic_link_token VARCHAR(255),
  magic_link_used BOOLEAN DEFAULT FALSE,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  FOREIGN KEY (internship_id) REFERENCES internships(id),
  FOREIGN KEY (student_id) REFERENCES students(id),
  FOREIGN KEY (supervisor_id) REFERENCES users(id),
  FOREIGN KEY (company_id) REFERENCES companies(id),
  
  UNIQUE(internship_id, supervisor_email)
);

-- Index for faster lookups
CREATE INDEX idx_supervisor_invitations_email ON supervisor_invitations(supervisor_email, status);
CREATE INDEX idx_supervisor_invitations_supervisor_id ON supervisor_invitations(supervisor_id, status);
```

### 1.2 Updates to Users Table
```sql
ALTER TABLE users ADD COLUMN supervisor_approval_date TIMESTAMP;
ALTER TABLE users ADD COLUMN supervisor_phone VARCHAR(20);
ALTER TABLE users ADD COLUMN supervisor_company_id UUID;
```

### 1.3 Updates to Internships Table
```sql
-- If not already present
ALTER TABLE internships ADD COLUMN industry_supervisor_id UUID;
ALTER TABLE internships ADD COLUMN supervisor_approval_status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending';
ALTER TABLE internships ADD COLUMN supervisor_approved_at TIMESTAMP;

FOREIGN KEY (industry_supervisor_id) REFERENCES users(id);
```

---

## 2. API ENDPOINTS

### 2.1 Supervisor Invitation Endpoints

#### GET `/api/v1/supervisor-invitations/pending`
**Purpose:** Fetch pending supervisor invitations for a supervisor
**Authentication:** Required (Industry Supervisor role)
**Query Parameters:**
- `per_page` (optional, default: 20)
- `page` (optional, default: 1)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "inv_123",
      "internship_id": "int_456",
      "student": {
        "id": "std_789",
        "student_id": "22001234",
        "user": {
          "id": "usr_abc",
          "name": "John Student",
          "email": "john@student.com"
        },
        "department": {
          "id": "dept_xyz",
          "name": "Computer Science"
        }
      },
      "company": {
        "id": "cmp_def",
        "name": "Tech Company"
      },
      "status": "pending",
      "invited_at": "2026-06-08T10:00:00Z",
      "expires_at": "2026-07-08T10:00:00Z"
    }
  ],
  "pagination": {
    "total": 5,
    "page": 1,
    "per_page": 20
  }
}
```

**Status Codes:**
- 200: Success
- 401: Unauthorized
- 500: Server error

---

#### POST `/api/v1/supervisor-invitations/:invitationId/approve`
**Purpose:** Approve a pending supervisor invitation
**Authentication:** Required (Industry Supervisor role)
**Path Parameters:**
- `invitationId` (string): UUID of the invitation

**Request Body:** (optional)
```json
{
  "notes": "Ready to supervise this student"  // optional
}
```

**Response:**
```json
{
  "success": true,
  "message": "Invitation approved successfully",
  "data": {
    "id": "inv_123",
    "status": "approved",
    "approved_at": "2026-06-09T14:30:00Z",
    "internship_id": "int_456"
  }
}
```

**Side Effects:**
- Update `supervisor_approval_status` in internships table to "approved"
- Set `supervisor_approved_at` timestamp
- Send notification to student: "Your company supervisor [Name] has approved your internship"
- Send notification to DLO: "Supervisor approved for student [Name]"
- Log audit entry

**Status Codes:**
- 200: Success
- 400: Invalid invitation ID or already approved
- 401: Unauthorized
- 404: Invitation not found
- 500: Server error

---

#### POST `/api/v1/supervisor-invitations/:invitationId/send-reminder`
**Purpose:** Resend invitation to supervisor
**Authentication:** Required (Student or DLO role)
**Path Parameters:**
- `invitationId` (string): UUID of the invitation

**Response:**
```json
{
  "success": true,
  "message": "Invitation reminder sent"
}
```

**Side Effects:**
- Send email to supervisor email address with magic link
- Send push notification to supervisor (if registered device)
- Update `invited_at` timestamp
- Log action

**Status Codes:**
- 200: Success
- 401: Unauthorized
- 404: Invitation not found
- 500: Server error

---

### 2.2 Supervisor Onboarding Endpoints

#### POST `/api/v1/auth/magic-link-verify`
**Purpose:** Verify magic link and approve supervisor account
**Authentication:** Not required (public endpoint, but token-validated)
**Request Body:**
```json
{
  "token": "magic_link_token_here",
  "email": "supervisor@company.com"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Account approved. Please log in with your email and password.",
  "data": {
    "email": "supervisor@company.com",
    "name": "John Supervisor",
    "role": "industry_supervisor",
    "status": "approved"
  }
}
```

**Logic:**
1. Find invitation by token and email
2. Verify token not expired (30 days)
3. Check if supervisor exists by email:
   - If exists: Update `magic_link_used = TRUE`, skip account creation
   - If not exists: Create new user account with role "industry_supervisor", status "approved"
4. Mark all pending invitations for this email as associated with supervisor_id
5. Send welcome email to supervisor
6. Log action

**Status Codes:**
- 200: Success
- 400: Invalid or expired token
- 404: Invitation not found
- 500: Server error

---

### 2.3 Student Invitation Endpoint (Existing - Enhancement)

#### POST `/api/v1/internships/:internshipId/invite-supervisor`
**Purpose:** Invite a supervisor to manage an internship
**Authentication:** Required (Student role)
**Request Body:**
```json
{
  "supervisor_email": "supervisor@company.com",
  "supervisor_name": "John Supervisor",
  "supervisor_phone": "+1234567890"  // optional
}
```

**Enhanced Logic:**
1. Validate student owns this internship
2. Check if supervisor exists by email:
   ```sql
   SELECT * FROM users WHERE email = ? AND role = 'industry_supervisor'
   ```
3. If supervisor exists:
   - Check if already invited: `SELECT * FROM supervisor_invitations WHERE internship_id = ? AND supervisor_email = ?`
   - If already invited and pending: Return error "Invitation already sent"
   - If already invited and approved: Return error "Supervisor already assigned"
   - If not invited: Create new pending invitation (status = 'pending')
   - Send push notification to supervisor: "New student [Name] has invited you"
4. If supervisor doesn't exist:
   - Create invitation with `status = 'pending'`, `magic_link_token = generate_token()`
   - Send magic link email to supervisor
   - Set `expires_at = NOW() + 30 days`

**Response:**
```json
{
  "success": true,
  "message": "Invitation sent to supervisor",
  "data": {
    "invitation_id": "inv_123",
    "supervisor_email": "supervisor@company.com",
    "status": "pending",
    "requires_magic_link": false  // true if supervisor doesn't exist yet
  }
}
```

**Status Codes:**
- 200: Success
- 400: Invalid data or supervisor already assigned
- 401: Unauthorized
- 404: Internship not found
- 500: Server error

---

## 3. PUSH NOTIFICATIONS

### 3.1 Push Notification Schema
```sql
CREATE TABLE push_subscriptions (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  device_endpoint VARCHAR(500),
  auth_key VARCHAR(255),
  p256_key VARCHAR(255),
  
  -- Device info
  device_type ENUM('web', 'mobile_ios', 'mobile_android'),
  browser VARCHAR(100),
  os VARCHAR(100),
  is_active BOOLEAN DEFAULT TRUE,
  
  created_at TIMESTAMP DEFAULT NOW(),
  last_used TIMESTAMP,
  
  FOREIGN KEY (user_id) REFERENCES users(id),
  UNIQUE(user_id, device_endpoint)
);

CREATE TABLE push_notifications (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  title VARCHAR(255) NOT NULL,
  body TEXT,
  action_url VARCHAR(500),
  
  -- Notification type for grouping
  type ENUM('invitation', 'approval', 'logbook', 'attendance', 'assessment', 'message', 'system'),
  related_id UUID,  -- internship_id, logbook_id, etc.
  
  is_read BOOLEAN DEFAULT FALSE,
  sent_at TIMESTAMP DEFAULT NOW(),
  read_at TIMESTAMP,
  
  FOREIGN KEY (user_id) REFERENCES users(id),
  INDEX idx_user_notifications (user_id, is_read, sent_at DESC)
);
```

### 3.2 Supervisor Notification Triggers

#### 3.2.1 Student Invites Supervisor
**Trigger:** When invitation is created
**Recipient:** Supervisor (if exists)
**Type:** `invitation`
**Title:** "New Student Invitation"
**Body:** "[StudentName] has invited you to supervise their internship at [CompanyName]"
**Action URL:** `/supervisor/approvals`
**Send Via:** 
- Push notification (if registered)
- Email
- In-app notification

#### 3.2.2 Logbook Submitted for Review
**Trigger:** When logbook status changes to "submitted"
**Recipient:** Assigned supervisor
**Type:** `logbook`
**Title:** "Logbook Submitted for Review"
**Body:** "[StudentName] submitted a logbook entry for [Date] - tap to review"
**Action URL:** `/supervisor/logbooks?student=[studentId]`
**Send Via:**
- Push notification
- In-app notification

#### 3.2.3 Attendance Needs Verification
**Trigger:** When attendance record is created and `verified_by IS NULL`
**Recipient:** Assigned supervisor
**Type:** `attendance`
**Title:** "Attendance Verification Needed"
**Body:** "[StudentName] checked in at [Time] on [Date]"
**Action URL:** `/supervisor/attendance?student=[studentId]`
**Send Via:**
- Push notification
- In-app notification

#### 3.2.4 Assessment Needs Submission
**Trigger:** When week ends and no rubric submitted
**Recipient:** Assigned supervisor
**Type:** `assessment`
**Title:** "Weekly Assessment Due"
**Body:** "Please submit your weekly assessment for [StudentName]'s week [WeekNum]"
**Action URL:** `/supervisor/evaluate?student=[studentId]&tab=weekly`
**Send Via:**
- Push notification
- Email
- In-app notification

#### 3.2.5 Reminder: Pending Approvals
**Trigger:** Scheduled job - daily at 9 AM
**Recipient:** Supervisors with pending invitations
**Type:** `invitation`
**Title:** "Pending Student Approvals"
**Body:** "You have [N] pending student invitation(s) to approve"
**Action URL:** `/supervisor/approvals`
**Send Via:**
- Push notification

---

### 3.3 Push Notification Service Implementation

#### Endpoint: POST `/api/v1/push/subscribe`
**Purpose:** Register device for push notifications
**Authentication:** Required
**Request Body:**
```json
{
  "subscription": {
    "endpoint": "https://fcm.googleapis.com/...",
    "keys": {
      "auth": "...",
      "p256dh": "..."
    }
  },
  "device_type": "web",
  "browser": "Chrome",
  "os": "Windows"
}
```

#### Endpoint: GET `/api/v1/notifications`
**Purpose:** Get user's push notifications
**Query Parameters:**
- `unread_only` (boolean, optional)
- `type` (string, optional)
- `per_page` (number, default: 20)
- `page` (number, default: 1)

#### Endpoint: POST `/api/v1/notifications/:id/read`
**Purpose:** Mark notification as read

---

### 3.4 Email Notification Templates

#### Template: supervisor_invitation.html
- Subject: "[StudentName] invited you to supervise their internship"
- Body: HTML email with student info, company, start date, magic link
- Magic link expires: 30 days

#### Template: supervisor_pending_reminder.html
- Subject: "[N] students waiting for your approval"
- Body: List of pending approvals with action button
- Sent: Daily at 9 AM to supervisors with pending invitations

#### Template: logbook_submitted.html
- Subject: "[StudentName] submitted a logbook entry"
- Body: Date, preview, link to review

#### Template: assessment_reminder.html
- Subject: "Weekly assessment due for [StudentName]"
- Body: Week number, deadline, link to submit

---

## 4. BACKGROUND JOBS

### 4.1 Job: Clean Up Expired Invitations
**Frequency:** Daily at midnight
**Logic:**
```sql
UPDATE supervisor_invitations 
SET status = 'expired'
WHERE status = 'pending' 
AND expires_at < NOW()
```

### 4.2 Job: Send Assessment Reminders
**Frequency:** Daily at 7 AM
**Logic:**
1. Find all active internships with supervisors
2. Check if current week's rubric submitted
3. If not, send notification/email reminder

### 4.3 Job: Send Pending Approval Reminders
**Frequency:** Daily at 9 AM
**Logic:**
1. Find supervisors with pending invitations
2. Send push notification + email
3. Log sending

---

## 5. DATA VALIDATION & SECURITY

### 5.1 Validation Rules
- Email must be valid format
- Phone must be valid format (if provided)
- Invitation token must be 32+ characters
- Supervisor email must not already exist as student account
- Student can't invite themselves
- Invitation can't be sent to supervisors from different departments (optional policy)

### 5.2 Permission Checks
- Only students can invite supervisors to their internships
- Only assigned supervisors can approve invitations
- Supervisors can only see pending invitations sent to their email
- DLO can view all supervisor invitations in their department

### 5.3 Audit Logging
Log all actions:
- Invitation created
- Magic link sent
- Magic link clicked
- Account approved
- Invitation approved
- Invitation reminder sent

---

## 6. MIGRATION CHECKLIST

### Phase 1: Data Model
- [ ] Create `supervisor_invitations` table
- [ ] Add columns to `users` table
- [ ] Add columns to `internships` table
- [ ] Create indexes

### Phase 2: API Endpoints
- [ ] GET `/api/v1/supervisor-invitations/pending`
- [ ] POST `/api/v1/supervisor-invitations/:id/approve`
- [ ] POST `/api/v1/supervisor-invitations/:id/send-reminder`
- [ ] POST `/api/v1/auth/magic-link-verify` (enhance existing)
- [ ] POST `/api/v1/internships/:id/invite-supervisor` (enhance existing)

### Phase 3: Push Notifications
- [ ] Create push subscription tables
- [ ] Implement push notification service
- [ ] Set up Web Push API integration (or FCM)
- [ ] Create email templates
- [ ] Test notification delivery

### Phase 4: Background Jobs
- [ ] Implement job queue (Bull, APScheduler, etc.)
- [ ] Set up expired invitation cleanup
- [ ] Set up assessment reminder job
- [ ] Set up pending approval reminder job

### Phase 5: Testing & Deployment
- [ ] Unit tests for all endpoints
- [ ] Integration tests for invitation flow
- [ ] Push notification tests
- [ ] Email template tests
- [ ] Load testing
- [ ] Deployment to staging
- [ ] Deployment to production

---

## 7. ERROR HANDLING

All error responses should follow this format:
```json
{
  "success": false,
  "message": "Human-readable error message",
  "error_code": "SPECIFIC_ERROR_CODE",
  "details": {}  // optional
}
```

**Common Error Codes:**
- `INVITATION_ALREADY_SENT`
- `SUPERVISOR_ALREADY_ASSIGNED`
- `TOKEN_EXPIRED`
- `INVALID_EMAIL`
- `PERMISSION_DENIED`

---

## 8. API RESPONSE EXAMPLE FLOW

### Complete Invitation → Approval Flow

**Step 1: Student invites supervisor (new)**
```
POST /api/v1/internships/int_123/invite-supervisor
Body: {supervisor_email: "john@company.com", supervisor_name: "John S", supervisor_phone: "+123..."}

Response: 200
{
  invitation_id: "inv_abc",
  status: "pending",
  requires_magic_link: true  // supervisor doesn't exist yet
}

Backend Actions:
- Create supervisor_invitation (pending)
- Generate magic link token
- Send email with magic link
- Send push notification (if emails don't work)
```

**Step 2: Supervisor clicks magic link**
```
GET /auth/magic-link?token=xxx&email=john@company.com

Redirects to: POST /api/v1/auth/magic-link-verify
Body: {token: "xxx", email: "john@company.com"}

Response: 200
{
  message: "Account approved. Please log in with your email and password."
}

Backend Actions:
- Create user account (role: industry_supervisor, status: approved)
- Mark invitation magic link as used
- Link supervisor_id to all pending invitations for this email
- Send welcome email
```

**Step 3: Supervisor logs in and sees pending approvals**
```
GET /api/v1/supervisor-invitations/pending

Response: 200
{
  data: [
    {
      id: "inv_abc",
      student: {name: "Jane Student", student_id: "22001234"},
      company: {name: "Tech Corp"},
      status: "pending",
      invited_at: "2026-06-08T..."
    }
  ]
}
```

**Step 4: Supervisor approves invitation**
```
POST /api/v1/supervisor-invitations/inv_abc/approve

Response: 200
{
  success: true,
  message: "Invitation approved",
  data: {
    id: "inv_abc",
    status: "approved",
    approved_at: "2026-06-09T..."
  }
}

Backend Actions:
- Update supervisor_invitation status = "approved"
- Update internship supervisor_approval_status = "approved"
- Send notification to student: "Your supervisor approved you!"
- Send notification to DLO: "Supervisor assigned"
- Log audit entry
```

---

## 9. TESTING CHECKLIST

- [ ] Supervisor doesn't exist → Magic link flow works
- [ ] Supervisor exists → No magic link, direct approval
- [ ] Multiple students invite same supervisor → All appear in pending
- [ ] Approve invitation → Student and DLO notified
- [ ] Expired invitation → Cleaned up by job
- [ ] Push notifications → Delivered to registered devices
- [ ] Email notifications → Delivered correctly
- [ ] Audit logging → All actions logged
- [ ] Permissions → Only authorized users can access endpoints

---

## 10. DEPENDENCIES & LIBRARIES

Recommended:
- **Push Notifications:** Firebase Cloud Messaging (FCM) or Web Push API + Service Workers
- **Job Queue:** Bull (Node.js), Celery (Python), APScheduler (Python)
- **Email:** SendGrid, Mailgun, AWS SES
- **Database:** PostgreSQL with proper indexes
- **Caching:** Redis (for rate limiting, session store)

