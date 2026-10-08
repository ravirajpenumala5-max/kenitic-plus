# Kinetic Pulse — Phase 0 Security Specification

## 1. Data Invariants
1. **Identity Isolation (`ownerId`)**: Every document in `/workoutLogs/{logId}`, `/protocols/{protocolId}`, and `/fuelingEntries/{entryId}` MUST belong to the authenticated user (`ownerId == request.auth.uid`) with a verified email (`request.auth.token.email_verified == true`).
2. **Strict Schema & Volumetric Boundaries**: Every write operation (`create` and `update`) MUST pass `isValidWorkoutLog()`, `isValidCustomProtocol()`, or `isValidFuelingEntry()` enforcing `hasAll` and `hasOnly` keys, exact primitive types, numeric bounds, enum membership, and string `.size()` limits matching `firebase-blueprint.json`.
3. **Path Variable Hardening**: Every single-document operation (`get`, `create`, `update`, `delete`) MUST validate the document ID via `isValidId(id)` (`^[a-zA-Z0-9_\-]+$`, max 128 chars).
4. **Temporal & Ownership Immutability**: `createdAt` MUST equal `request.time` on creation and remain strictly immutable (`incoming().createdAt == existing().createdAt`) on update, alongside `incoming().ownerId == existing().ownerId`.
5. **Query Enforcer**: All `allow list` rules explicitly enforce `resource.data.ownerId == request.auth.uid` to prevent cross-tenant query scraping.

## 2. The "Dirty Dozen" Adversarial Payloads
1. **Payload 01 (Identity Spoofing on WorkoutLog)**: Authenticated user `user_A` creates `/workoutLogs/log_1` with `ownerId: "user_B"`. -> `PERMISSION_DENIED`
2. **Payload 02 (Unverified Email Write)**: User with `email_verified: false` attempts to create `/workoutLogs/log_1`. -> `PERMISSION_DENIED`
3. **Payload 03 (Shadow Field Injection)**: User creates `/workoutLogs/log_1` with all valid fields plus `"isAdmin": true`. -> `PERMISSION_DENIED`
4. **Payload 04 (ID Poisoning Attack)**: User creates `/workoutLogs/invalid$id!@#` with non-alphanumeric characters. -> `PERMISSION_DENIED`
5. **Payload 05 (String Volumetric Overflow)**: User creates `/workoutLogs/log_1` with a `notes` string of 2,000 characters (`maxLength: 500`). -> `PERMISSION_DENIED`
6. **Payload 06 (Invalid Discipline Enum)**: User creates `/workoutLogs/log_1` with `discipline: "Skydiving"`. -> `PERMISSION_DENIED`
7. **Payload 07 (Forged Client Timestamp)**: User creates `/workoutLogs/log_1` with `createdAt` set to a past timestamp instead of `request.time`. -> `PERMISSION_DENIED`
8. **Payload 08 (Ownership Transfer on Update)**: User updates `/workoutLogs/log_1` changing `ownerId` to another UID. -> `PERMISSION_DENIED`
9. **Payload 09 (Cross-User Read/Get)**: User `user_B` attempts `get` on `/workoutLogs/log_owned_by_A`. -> `PERMISSION_DENIED`
10. **Payload 10 (Unscoped List Query)**: User `user_A` executes an unconstrained `list` query across `/workoutLogs` without filtering `ownerId == request.auth.uid`. -> `PERMISSION_DENIED`
11. **Payload 11 (Value Poisoning on Update)**: User updates `notes` on `/workoutLogs/log_1` with a number `99999` instead of a bounded string. -> `PERMISSION_DENIED`
12. **Payload 12 (Unauthorized Delete)**: User `user_B` attempts to `delete` `/fuelingEntries/entry_owned_by_A`. -> `PERMISSION_DENIED`
