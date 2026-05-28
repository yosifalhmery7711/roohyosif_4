# Firebase Security Specification

## 1. Data Invariants
- A **User** must have a unique phone number and name.
- A **BirthdayConfig** is owned by the user who created it (using `usernameEn` as an identifier for now, but should ideally move to UID).
- A **Wish** cannot be created without a parent **BirthdayConfig**.

## 2. The Dirty Dozen (Threat Vectors)
1.  **Anonymous Takeover**: An unauthenticated user tries to create a `BirthdayConfig` for an existing `usernameEn`.
2.  **Referral Injection**: A user tries to set their own `referralCount` to `999,999`.
3.  **Identity Spoofing**: User A tries to edit User B's profile.
4.  **Wish Poisoning**: Someone sends a 1MB string as a wish text.
5.  **Ghost Field Update**: Changing a `BirthdayConfig` and adding an `isAdmin: true` field.
6.  **Immutable Freeze**: Trying to change the `registeredAt` timestamp of a user.
7.  **Path traversal**: Using `../` in a `usernameEn` to access other configs (Guarded by `isValidId`).
8.  **Bulk Leak**: Authenticated user trying to `list` all user profiles.
9.  **Terminal State Bypass**: (None applicable yet, but status transitions should be guarded).
10. **PII Leak**: Accessing a user's phone number without being that user.
11. **Orphaned Writes**: Creating a wish for a `BirthdayConfig` that doesn't exist.
12. **Future Timestamping**: Setting `timestamp` to a future date instead of `request.time`.

## 3. Test Runner (Draft)
A separate test file will be created to verify these denials.
