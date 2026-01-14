# Test Plan: Volunteer Approval System

## Overview
This test plan covers the new volunteer approval system for MPS Kids Ride, which adds approval workflow and admin functionality.

## Features to Test

### 1. Database Schema Changes
- [x] `approved` column added to volunteers table (default: false)
- [x] `is_admin` column added to volunteers table (default: false)
- [x] RLS policies updated to restrict access to approved volunteers only
- [x] Trigger updated to auto-approve and set admin for first user and frank@centerpointcorp.com

### 2. Authentication & Registration

#### Test Case 2.1: New User Registration
**Steps:**
1. Navigate to the application
2. Click "Sign up"
3. Enter name, email, and password (min 6 chars)
4. Submit the form

**Expected Results:**
- Account is created successfully
- User sees "Pending Approval" screen
- User cannot access conversations or messages
- Volunteer record has `approved = false` and `is_admin = false`

#### Test Case 2.2: First User Registration (Auto-Admin)
**Steps:**
1. Start with empty database
2. Register the first user
3. Check volunteer record in database

**Expected Results:**
- First user is automatically set as admin (`is_admin = true`)
- First user is automatically approved (`approved = true`)
- User sees inbox immediately, not pending screen
- "Approve Volunteers" button is visible in sidebar

#### Test Case 2.3: frank@centerpointcorp.com Registration (Auto-Admin)
**Steps:**
1. Register with email: frank@centerpointcorp.com
2. Check volunteer record

**Expected Results:**
- User is automatically set as admin (`is_admin = true`)
- User is automatically approved (`approved = true`)
- User sees inbox immediately
- "Approve Volunteers" button is visible

### 3. Pending Approval Screen

#### Test Case 3.1: Unapproved Volunteer Experience
**Steps:**
1. Log in as unapproved volunteer
2. Check screen display

**Expected Results:**
- See "Pending Approval" heading with clock icon
- See user's email displayed
- See message about waiting for approval
- See "Sign Out" button
- Cannot access any conversations or messages
- No sidebar or inbox visible

#### Test Case 3.2: Sign Out from Pending Screen
**Steps:**
1. Log in as unapproved volunteer
2. Click "Sign Out" button

**Expected Results:**
- User is signed out successfully
- Returns to login screen

### 4. Admin Approval Interface

#### Test Case 4.1: Admin Access to Approval Interface
**Steps:**
1. Log in as admin
2. Look for "Approve Volunteers" button in sidebar
3. Click the button

**Expected Results:**
- Button is visible only to admins
- Clicking opens full-screen approval interface
- Shows list of pending volunteers

#### Test Case 4.2: View Pending Volunteers
**Steps:**
1. Admin opens approval interface
2. Review list of pending volunteers

**Expected Results:**
- Shows all volunteers with `approved = false`
- Displays volunteer name (or display_name), email, and registration date
- Shows most recent registrations first
- If no pending volunteers, shows "All caught up!" message

#### Test Case 4.3: Approve a Volunteer
**Steps:**
1. Admin opens approval interface
2. Click "Approve" on a pending volunteer
3. Check that volunteer's status

**Expected Results:**
- Volunteer's `approved` field set to `true` in database
- Volunteer removed from pending list immediately
- When that volunteer logs in, they see inbox (not pending screen)
- Volunteer can now access conversations and messages

#### Test Case 4.4: Reject a Volunteer
**Steps:**
1. Admin opens approval interface
2. Click "Reject" on a pending volunteer
3. Confirm rejection in dialog

**Expected Results:**
- Confirmation dialog appears
- Volunteer record is deleted from database
- Auth user is deleted (cascade)
- Volunteer removed from pending list
- If rejected user tries to log in, they get "Invalid credentials" error

#### Test Case 4.5: Real-time Updates in Approval Interface
**Steps:**
1. Admin A opens approval interface
2. Admin B approves a volunteer in another session
3. Check Admin A's screen

**Expected Results:**
- Admin A sees the volunteer removed from list in real-time
- Uses Supabase real-time subscriptions

#### Test Case 4.6: Close Approval Interface
**Steps:**
1. Admin opens approval interface
2. Click "Close" button

**Expected Results:**
- Returns to normal inbox view
- Can click "Approve Volunteers" button again to re-open

### 5. Access Control & Security

#### Test Case 5.1: Unapproved Volunteer Cannot Access Conversations
**Steps:**
1. Create unapproved volunteer in database
2. Try to query conversations table directly via Supabase client
3. Try to insert a message

**Expected Results:**
- All queries return empty results or permission denied
- RLS policies block access
- Cannot see any conversations
- Cannot send messages

#### Test Case 5.2: Approved Non-Admin Cannot Access Admin Interface
**Steps:**
1. Log in as approved, non-admin volunteer
2. Look for "Approve Volunteers" button

**Expected Results:**
- Button is not visible
- User sees normal inbox interface
- Can access conversations and messages normally

#### Test Case 5.3: Approved Volunteer Can Access Conversations
**Steps:**
1. Admin approves a volunteer
2. Log in as that volunteer
3. Access inbox

**Expected Results:**
- Can see conversation list
- Can view messages
- Can send messages
- All functionality works normally

### 6. Admin User Management

#### Test Case 6.1: Multiple Admins
**Steps:**
1. Manually set another user as admin via SQL
2. Log in as that user
3. Check for admin features

**Expected Results:**
- User sees "Approve Volunteers" button
- Can access approval interface
- Can approve/reject volunteers

#### Test Case 6.2: Manual Admin Assignment
**Steps:**
1. Run SQL: `UPDATE volunteers SET is_admin = true, approved = true WHERE email = 'test@example.com';`
2. Log in as test@example.com

**Expected Results:**
- User is admin
- Can access approval interface

### 7. Edge Cases

#### Test Case 7.1: User with No Volunteer Profile
**Steps:**
1. Create auth user without volunteer profile
2. Try to log in

**Expected Results:**
- Gracefully handle missing profile
- Show loading state or error
- Don't crash application

#### Test Case 7.2: Rapid Approve/Reject Actions
**Steps:**
1. Admin clicks approve on multiple volunteers quickly
2. Check database consistency

**Expected Results:**
- All actions complete successfully
- No duplicate approvals
- Loading states prevent double-clicks

#### Test Case 7.3: Volunteer Logs In During Approval Process
**Steps:**
1. Volunteer is on pending screen
2. Admin approves them in another session
3. Volunteer refreshes or waits

**Expected Results:**
- After refresh, volunteer sees inbox
- Real-time auth state change should trigger re-fetch
- Smooth transition from pending to approved

### 8. Migration Testing (For Existing Databases)

#### Test Case 8.1: Run Migration on Existing Database
**Steps:**
1. Start with existing database
2. Run migration-add-volunteer-approval.sql
3. Check schema

**Expected Results:**
- Columns added successfully
- RLS policies updated
- No data loss
- frank@centerpointcorp.com set as admin

#### Test Case 8.2: Existing Users After Migration
**Steps:**
1. Run migration without auto-approving existing users
2. Existing user tries to log in

**Expected Results:**
- Existing user sees pending approval screen
- Admin must approve them
- (Or uncomment auto-approve line in migration)

## Automated Tests (To Run Before Deployment)

### Build Test
```bash
npm run build
```
**Expected:** Build completes without errors

### TypeScript Check
```bash
npx tsc --noEmit
```
**Expected:** No TypeScript errors

### Lint Check
```bash
npm run lint
```
**Expected:** No linting errors

## Manual Testing Checklist

Before marking this feature complete, verify:

- [ ] TypeScript compiles without errors
- [ ] Application builds successfully
- [ ] First user gets admin automatically
- [ ] frank@centerpointcorp.com gets admin automatically
- [ ] New signups see pending approval screen
- [ ] Unapproved volunteers cannot access conversations
- [ ] Admin can see and click "Approve Volunteers" button
- [ ] Admin approval interface shows pending volunteers
- [ ] Admin can approve volunteers successfully
- [ ] Admin can reject volunteers successfully
- [ ] Approved volunteers can access inbox normally
- [ ] Non-admin approved volunteers don't see admin button
- [ ] Sign out works from all screens
- [ ] Real-time updates work in approval interface
- [ ] Migration script provided for existing databases
- [ ] Manual SQL commands documented

## Known Limitations

1. **Email Notifications**: System does not automatically email volunteers when approved (future enhancement)
2. **Rejection Message**: Rejected volunteers don't see a custom message explaining why (they just can't log in)
3. **Volunteer Deletion**: Rejecting a volunteer deletes their auth account entirely (cannot undo except by re-registering)
4. **Browser Refresh**: Pending volunteers must refresh page after approval (no automatic real-time transition)

## Security Considerations

- ✅ RLS policies enforce approval requirement at database level
- ✅ Service role key still allows webhook to insert messages (bypasses RLS)
- ✅ Admin status checked in frontend and enforced by RLS
- ✅ Volunteer profile created by database trigger (prevents race conditions)
- ✅ First user detection race condition possible (use frank@centerpointcorp.com as fallback)

## Deployment Notes

1. Apply migration script to existing databases before deploying code
2. Inform frank@centerpointcorp.com that they need to be the first to sign up, or run manual SQL to set admin
3. Consider auto-approving existing volunteers during migration
4. Test in staging environment with real Supabase instance before production
