# COMPREHENSIVE DEBUGGING PROMPT FOR ISSUE NOTIFY APP

## PROJECT OVERVIEW
- **Tech Stack:** Node.js/Express backend, React Native Expo mobile app, MongoDB database
- **Purpose:** GitHub issue tracking app with push notifications
- **Deployment:** Production on Railway, testing locally on port 5000
- **GitHub:** User pushes code changes which trigger automatic redeployment

---

## CURRENT STATUS

### ✅ FIXED ISSUES
1. **Encryption Key Conversion** - Hex string now properly converts to 32-byte buffer
2. **Token Decryption Errors** - No more "Invalid encrypted token format" spam
3. **Duplicate Notifications** - Fixed by using updateOne with upsert in subscribe endpoint
4. **Database Clean** - Migration script verified 2 valid tokens, 0 corrupted tokens
5. **Server & Scheduler Running** - Both working correctly with 5-minute checks

### ❌ REMAINING CRITICAL ISSUE
**Mobile Device Push Notifications NOT Arriving**
- Notifications ARE created in database ✅
- Notifications appear in app screen ✅
- BUT device does NOT receive push notification when app closed ❌

---

## PROBLEM DETAILS

### Symptoms Observed
1. Server logs show NO attempt to send push notifications
   - Log shows: "⚠️ No push token registered for user"
   - OR push attempts are completely missing from logs
2. Users not seeing push on device even with permission granted
3. Ultra-verbose logging added but still no push attempts appearing in logs

### Technology Stack for Push
- **Expo SDK:** `expo-notifications` and `expo-server-sdk`
- **Frontend:** React Native mobile app (iOS/Android)
- **Backend:** Node.js Expo Server SDK to send notifications
- **Flow:** Mobile app → Expo → Device push

### Code Files Relevant
```
Mobile:
- mobile/context/AuthContext.js (BASE_URL hardcoded to production)
- mobile/utils/notifications.js (registerForPushNotificationsAsync)
- mobile/screens/LoginScreen.js (calls registerPushToken on login)

Server:
- server/routes/auth.js (POST /api/auth/register-push-token)
- server/services/pushNotifications.js (sendPushNotification function)
- server/services/scheduler.js (sends push when new issue matches)
- server/models/User.js (expoPushToken field)
```

---

## KEY QUESTIONS TO INVESTIGATE

1. **Is the push token being sent from mobile to server?**
   - Check if `POST /api/auth/register-push-token` is being called
   - Verify the token is being saved in User.expoPushToken in database
   - Token format should be: `ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx]`

2. **Is the push token being retrieved when scheduler runs?**
   - When checking repos, the subscription user should have expoPushToken populated
   - Currently scheduler.js logs show "Has Push Token: false" for users

3. **Why isn't sendPushNotification being called?**
   - Check if notifications are even reaching the "Send push notification" code
   - The ultra-verbose logging should show `📤📤📤 ATTEMPTING PUSH NOTIFICATION FOR USER`
   - This is NOT appearing in production logs

4. **Is Expo API rejecting the requests?**
   - Are we getting errors from Expo like "invalid token" or "service unavailable"?
   - Should see ticket status in logs

---

## REPRODUCTION STEPS
1. User creates account and signs in
2. App should call `registerForPushNotificationsAsync()` to get Expo token
3. App sends token to backend via `POST /api/auth/register-push-token`
4. Token saved to database in user.expoPushToken
5. User subscribes to a GitHub repo with labels
6. A new issue matching labels is created on GitHub
7. Scheduler checks (every 5 min) and should:
   - Find the subscription
   - Populate user data INCLUDING expoPushToken
   - Create notification in database
   - Call sendPushNotification()
   - Send request to Expo to push to device

**Currently:** Steps 1-5 work. Steps 6+ fail at "populate user data" - expoPushToken is NULL/undefined

---

## HYPOTHESIS
**The issue is in the scheduler.js subscription population:**

```javascript
// Line 18-20 in scheduler.js
.populate('user', 'notificationsEnabled personalGitHubToken tokenIsValid rateLimitTier expoPushToken deviceInfo')
```

**Possible causes:**
1. User select string syntax is wrong - not fetching expoPushToken
2. The subscription.user ref is corrupted or null
3. expoPushToken field is not being saved to User model
4. MongoDB query is not returning the field even though it exists

---

## DEBUGGING CHECKLIST FOR NEW AI

### Phase 1: Database Verification
```bash
# Connect to MongoDB and check:
db.users.find({expoPushToken: {$exists: true, $ne: null}}).pretty()

# Should show users with push tokens like:
{
  _id: ObjectId(...),
  email: "user@example.com",
  expoPushToken: "ExponentPushToken[...]",
  deviceInfo: {platform: "ios", model: "iPhone"}
}
```

### Phase 2: API Testing
```bash
# 1. Register push token for a user (need auth token first)
POST https://opensource-issue-notify-production-e468.up.railway.app/api/auth/register-push-token
Headers: Authorization: Bearer {JWT_TOKEN}
Body: {
  "expoPushToken": "ExponentPushToken[actual-token-here]",
  "deviceInfo": {"platform": "ios", "model": "iPhone"}
}

# 2. Check if token was saved
GET https://opensource-issue-notify-production-e468.up.railway.app/api/debug/push-tokens

# 3. Send test push to user
POST https://opensource-issue-notify-production-e468.up.railway.app/api/debug/test-push/{USER_ID}
```

### Phase 3: Scheduler Trace
1. Add console.log right before `.populate('user', ...)` to show what it receives
2. Add console.log after populate to show if expoPushToken exists
3. Add console.log before sendPushNotification call to verify function is reached
4. Check if sendPushNotification is returning proper responses

### Phase 4: Production Logs Analysis
- Search logs for `ATTEMPTING PUSH NOTIFICATION`
- Search for `Token is valid` 
- Search for Expo API responses/errors
- Search for any 401/403/500 errors from Expo SDK

---

## FILES TO MODIFY

### Critical Files
1. `server/services/scheduler.js` - Line 18-20, verify populate fields
2. `server/services/pushNotifications.js` - Already has ultra verbose logging
3. `server/routes/auth.js` - Verify token registration endpoint works
4. `server/models/User.js` - Verify expoPushToken field exists and is not select:false
5. `mobile/context/AuthContext.js` - Verify registerPushToken is called on login

---

## EXPECTED SERVER LOGS FOR WORKING SYSTEM

When a new issue matching labels is created:

```
🔍 Checking 2 default tier repos...
   ✓ Found boundary at page 1, stopping pagination
✓ Notify user for issue #608
  📬 Notification ID: 696ca81d1ad3259d6dd4240a
  👤 User ID: 6969d9b611a4a5bb555b282d
  📧 User Email: bikiknalita2617@gmail.com
  📖 Issue: Fix login page styling
  🔔 Has Push Token: true
  📱 Device: ios

📤📤📤 ATTEMPTING PUSH NOTIFICATION FOR USER: 6969d9b611a4a5bb555b282d
   👤 User Email: bikiknalita2617@gmail.com
   🔔 Notifications Enabled: true
   📱 Has Push Token: true
   ✅ TOKEN IS VALID
   Token: ExponentPushToken[xxxxx]...
   Issue: Fix login page styling
   Repo: owner/repo
📨 SENDING MESSAGE TO EXPO...
   To: ExponentPushToken[xxxxx]
   Title: 🔔 New Issue Matched!
   Body: Fix login page styling
📬 EXPO RESPONSE RECEIVED
   Ticket: {"id":"12345-6789","status":"ok"}
✅✅✅ PUSH SENT SUCCESSFULLY!
   Device: ios (iPhone)
   Ticket ID: 12345-6789
```

**Currently seeing:** Only the first 3 lines, then nothing. The push attempt lines are missing.

---

## SOLUTION REQUIREMENTS

By end of investigation, should provide:
1. Root cause identification
2. Step-by-step fix implementation
3. Verification tests to confirm push notifications work
4. Documentation of what was fixed

---

## REFERENCE DATA

**Production Server URL:**
```
https://opensource-issue-notify-production-e468.up.railway.app
```

**Database Connection:**
```
mongodb+srv://bikikalita304_db_user:6Rg3GGJuRIvEJipQ@notify.ogvjhgu.mongodb.net/issuenotify
```

**Environment Variables Configured:**
- ENCRYPTION_KEY: 64-char hex string
- GITHUB_TOKEN: Personal access token
- GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET: OAuth credentials
- JWT_SECRET: Auth secret
- MONGO_URI: Database connection

---

## NOTES FOR NEW AI
- Do NOT modify any other functionality - only fix push notifications
- Do NOT create migration scripts unless absolutely necessary
- Focus on why expoPushToken is not reaching sendPushNotification function
- Test each hypothesis with actual data from production
- Push notifications should work for both iOS and Android
- Preserve all existing logging and enhancements already added

