# Saathi AI - Security Specification

## 1. Data Invariants
- A user document must have a name, email, usage count, and subscription status.
- Once created, the email and createdAt timestamp are immutable.
- Only the server can upgrade a user's subscription status.
- Free users can only increment their usage count by 1 (max 3).
- Subscribed users do not have usage count limits, but increments are blocked (or irrelevant).

## 2. The "Dirty Dozen" Payloads (Target: /users/{userId})

1. **Identity Spoofing**: Attempt to create/update a document with a `userId` different from `request.auth.uid`.
   - Result: `PERMISSION_DENIED` (isOwner check).
2. **Shadow Field Injection**: Adding `isAdmin: true` to the user profile update.
   - Result: `PERMISSION_DENIED` (affectedKeys().hasOnly check).
3. **Privilege Escalation**: Attempt to update `isSubscribed` to `true`.
   - Result: `PERMISSION_DENIED` (affectedKeys().hasOnly check).
4. **Email Modification**: Changing the `email` field after account creation.
   - Result: `PERMISSION_DENIED` (existing check).
5. **Timestamp Backdating**: Changing `createdAt` to gain seniority.
   - Result: `PERMISSION_DENIED` (existing check).
6. **Usage Reset**: Attempting to set `freeMessagesUsed` back to 0 without subscribing.
   - Result: `PERMISSION_DENIED` (usage logic check).
7. **Junk ID Injection**: Using a 1MB string as a field value to cause resource exhaustion.
   - Result: `PERMISSION_DENIED` (size constraints in isValidUser).
8. **Unverified Account Writing**: Writing to a profile with `email_verified: false`.
   - Result: `PERMISSION_DENIED` (isVerified check).
9. **PII Scraping**: Attempting to `get` or `list` other users' profiles.
   - Result: `PERMISSION_DENIED` (isOwner check).
10. **State Shortcutting**: Skipping the mandatory `isSubscribed: false` on creation.
    - Result: `PERMISSION_DENIED` (create rule).
11. **Orphaned Record Creation**: (N/A for users collection root).
12. **Malicious ID Poisoning**: Using `/users/..%2F..%2Fsys` as a document path.
    - Result: `PERMISSION_DENIED` (default deny).

## 3. Red Team Conflict Report

| Attack | Collection | Pillar Guard | Status |
| :--- | :--- | :--- | :--- |
| Identity Spoofing | users | Pillar 3 (Path Guard) | [PASS] |
| State Shortcutting | users | Pillar 4 (Tiered Logic) | [PASS] |
| Resource Poisoning | users | Pillar 5 (Total Guard) | [PASS] |
| PII Leak | users | Pillar 6 (Isolation) | [PASS] |
| Denial of Wallet | users | Pillar 7 (Order) | [PASS] |
| Query Scraping | users | Pillar 8 (Enforcer) | [PASS] |
