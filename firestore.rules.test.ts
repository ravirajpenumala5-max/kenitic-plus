/**
 * Dirty Dozen Security Verification Suite for Kinetic Pulse Firestore Rules
 */
export interface DirtyDozenTestCase {
  id: string;
  description: string;
  collection: string;
  docId: string;
  operation: 'get' | 'list' | 'create' | 'update' | 'delete';
  auth: { uid: string; email_verified: boolean } | null;
  payload?: Record<string, unknown>;
  expectedOutcome: 'PERMISSION_DENIED';
}

export const DIRTY_DOZEN_TESTS: DirtyDozenTestCase[] = [
  {
    id: 'DD-01',
    description: 'Identity Spoofing on WorkoutLog create',
    collection: 'workoutLogs',
    docId: 'log_01',
    operation: 'create',
    auth: { uid: 'user_A', email_verified: true },
    payload: { ownerId: 'user_B', title: 'Spoofed Run' },
    expectedOutcome: 'PERMISSION_DENIED',
  },
  {
    id: 'DD-02',
    description: 'Unverified Email Write on WorkoutLog',
    collection: 'workoutLogs',
    docId: 'log_02',
    operation: 'create',
    auth: { uid: 'user_A', email_verified: false },
    payload: { ownerId: 'user_A', title: 'Unverified Run' },
    expectedOutcome: 'PERMISSION_DENIED',
  },
  {
    id: 'DD-03',
    description: 'Shadow Field Injection on WorkoutLog',
    collection: 'workoutLogs',
    docId: 'log_03',
    operation: 'create',
    auth: { uid: 'user_A', email_verified: true },
    payload: { ownerId: 'user_A', isAdmin: true },
    expectedOutcome: 'PERMISSION_DENIED',
  },
  {
    id: 'DD-04',
    description: 'ID Poisoning with special characters',
    collection: 'workoutLogs',
    docId: 'bad$id!@#',
    operation: 'create',
    auth: { uid: 'user_A', email_verified: true },
    payload: { ownerId: 'user_A' },
    expectedOutcome: 'PERMISSION_DENIED',
  },
  {
    id: 'DD-05',
    description: 'Volumetric Overflow on notes > 500 chars',
    collection: 'workoutLogs',
    docId: 'log_05',
    operation: 'create',
    auth: { uid: 'user_A', email_verified: true },
    payload: { ownerId: 'user_A', notes: 'x'.repeat(501) },
    expectedOutcome: 'PERMISSION_DENIED',
  },
  {
    id: 'DD-06',
    description: 'Invalid Discipline Enum value',
    collection: 'workoutLogs',
    docId: 'log_06',
    operation: 'create',
    auth: { uid: 'user_A', email_verified: true },
    payload: { ownerId: 'user_A', discipline: 'Paragliding' },
    expectedOutcome: 'PERMISSION_DENIED',
  },
  {
    id: 'DD-07',
    description: 'Forged Client Timestamp instead of request.time',
    collection: 'protocols',
    docId: 'proto_07',
    operation: 'create',
    auth: { uid: 'user_A', email_verified: true },
    payload: { ownerId: 'user_A', createdAt: '1999-01-01T00:00:00Z' },
    expectedOutcome: 'PERMISSION_DENIED',
  },
  {
    id: 'DD-08',
    description: 'Ownership Transfer on Update',
    collection: 'protocols',
    docId: 'proto_08',
    operation: 'update',
    auth: { uid: 'user_A', email_verified: true },
    payload: { ownerId: 'user_B' },
    expectedOutcome: 'PERMISSION_DENIED',
  },
  {
    id: 'DD-09',
    description: 'Cross-User Read/Get on WorkoutLog',
    collection: 'workoutLogs',
    docId: 'log_owned_by_A',
    operation: 'get',
    auth: { uid: 'user_B', email_verified: true },
    expectedOutcome: 'PERMISSION_DENIED',
  },
  {
    id: 'DD-10',
    description: 'Unscoped List Query across tenant boundary',
    collection: 'workoutLogs',
    docId: '*',
    operation: 'list',
    auth: { uid: 'user_B', email_verified: true },
    expectedOutcome: 'PERMISSION_DENIED',
  },
  {
    id: 'DD-11',
    description: 'Value Poisoning on Update (number instead of string)',
    collection: 'workoutLogs',
    docId: 'log_11',
    operation: 'update',
    auth: { uid: 'user_A', email_verified: true },
    payload: { notes: 12345 },
    expectedOutcome: 'PERMISSION_DENIED',
  },
  {
    id: 'DD-12',
    description: 'Unauthorized Delete on FuelingEntry',
    collection: 'fuelingEntries',
    docId: 'fuel_owned_by_A',
    operation: 'delete',
    auth: { uid: 'user_B', email_verified: true },
    expectedOutcome: 'PERMISSION_DENIED',
  },
];
