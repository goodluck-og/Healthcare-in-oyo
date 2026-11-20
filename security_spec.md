# HealthConnect Africa — Firestore Security Specification (Phase 0 TDD)

## 1. Core Data Invariants
1. **Default-Deny Safety**: Every unmatched path under `/databases/{database}/documents` is denied.
2. **PII Isolation**: User email, phone, and street address live inside `/users/{userId}/private/info`, accessible strictly to the owning user (`request.auth.uid == userId`) or a verified administrator.
3. **Zero Self-Assigned Privileges**: A registering user can only create `/users/{userId}` with `role == 'patient'` and `verifiedRoleStatus == 'active'`. Users cannot self-assign `doctor`, `hospital`, or `administrator` roles or mutate `role` / `verifiedRoleStatus`.
4. **Patient Record Ownership**: `familyProfiles`, `bpReadings`, `glucoseReadings`, `emergencyContacts`, and `transactions` can only be listed/read/written by `ownerUid == request.auth.uid` (or `patientUid == request.auth.uid`), an explicitly shared clinician (`sharedWithDoctorUid == request.auth.uid`), or a verified administrator.
5. **Strict Server Timestamps & ID Validation**: Every document ID path variable is validated with `isValidId()`, strings enforce `.size()` upper bounds, and `createdAt` / `updatedAt` require `request.time`.
6. **Terminal State & Action Locking**: Completed/cancelled appointments and resolved emergency requests cannot be mutated by non-administrators. Audit logs are strictly append-only (`allow update, delete: if false`).

## 2. The "Dirty Dozen" Adversarial Payloads (Must All Yield PERMISSION_DENIED)
1. **Privilege Escalation on Create**: Patient creates `/users/{uid}` with `role: "administrator"`.
2. **Role Self-Promotion on Update**: Patient updates `/users/{uid}` changing `role` from `"patient"` to `"doctor"`.
3. **Ghost Field Shadow Write**: Patient adds `{ isVerified: true }` to `/bpReadings/{id}`.
4. **Cross-Patient Data Read**: Patient A attempts `get` on Patient B's `/users/{uidB}/private/info` or `/bpReadings/{idB}`.
5. **Unfiltered Collection Scraping (`list`)**: Authenticated user runs `list` on `/bpReadings` without `where('ownerUid', '==', uid)`.
6. **Spoofed Owner ID**: Patient A creates `/bpReadings/{id}` with `ownerUid: uidB`.
7. **ID Poisoning**: Attacker writes to `/bpReadings/../../etc/passwd` or a 500-char document ID.
8. **Type / Boundary Poisoning**: Attacker submits `systolic: "120"` (string instead of number) or `systolic: 999` or 50KB `note`.
9. **Client-Spoofed Timestamp**: Attacker creates `/transactions/{id}` with backdated `createdAt` instead of `request.time`.
10. **Terminal State Tampering**: Patient modifies `status` on an appointment already marked `'Completed'`.
11. **Emergency Stage Shortcutting**: Patient directly creates an `/emergencyRequests/{id}` with `stage: 'dispatched'` instead of `'submitted'`.
12. **Audit Log Tampering**: Any user (even admin) attempts `update` or `delete` on `/auditLogs/{logId}`.
