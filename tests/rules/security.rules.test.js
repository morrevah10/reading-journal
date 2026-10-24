import { readFileSync } from 'node:fs';
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest';
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
} from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc } from 'firebase/firestore';

const firestoreRules = readFileSync('firestore.rules', 'utf8');

// The owner uid is read from the rules file so the tests track the real value.
function readOwnerUid(rules) {
  const match = rules.match(/function ownerUid\(\)\s*\{\s*return '([^']+)';/);
  if (!match) throw new Error('ownerUid() not found in rules');
  return match[1];
}

const OWNER = readOwnerUid(firestoreRules);
const INTRUDER = 'intruder-uid';

let testEnv;

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: 'demo-reading-journal',
    firestore: { rules: firestoreRules, host: '127.0.0.1', port: 8080 },
  });
});

beforeEach(async () => {
  await testEnv.clearFirestore();
});

afterAll(async () => {
  await testEnv?.cleanup();
});

const ownerPaths = [
  `users/${OWNER}/books/b1`,
  `users/${OWNER}/books/b1/notes/n1`,
  `users/${OWNER}/books/b1/quotes/q1`,
  `users/${OWNER}/goals/g1`,
];

describe('Firestore rules', () => {
  it('blocks unauthenticated reads and writes', async () => {
    const db = testEnv.unauthenticatedContext().firestore();
    await assertFails(getDoc(doc(db, `users/${OWNER}/books/b1`)));
    await assertFails(setDoc(doc(db, `users/${OWNER}/books/b1`), { title: 'x' }));
  });

  it.each(ownerPaths)('lets the owner read and write %s', async (path) => {
    const db = testEnv.authenticatedContext(OWNER).firestore();
    await assertSucceeds(setDoc(doc(db, path), { text: 'x' }));
    await assertSucceeds(getDoc(doc(db, path)));
  });

  it('blocks the owner from another user\'s data', async () => {
    const db = testEnv.authenticatedContext(OWNER).firestore();
    await assertFails(getDoc(doc(db, `users/${INTRUDER}/books/b1`)));
    await assertFails(setDoc(doc(db, `users/${INTRUDER}/books/b1`), { title: 'x' }));
  });

  it('blocks another signed-in user from the owner\'s data', async () => {
    const db = testEnv.authenticatedContext(INTRUDER).firestore();
    await assertFails(getDoc(doc(db, `users/${OWNER}/books/b1`)));
    await assertFails(setDoc(doc(db, `users/${OWNER}/books/b1`), { title: 'x' }));
  });

  it('blocks another signed-in user even under their own uid', async () => {
    const db = testEnv.authenticatedContext(INTRUDER).firestore();
    await assertFails(setDoc(doc(db, `users/${INTRUDER}/books/b1`), { title: 'x' }));
    await assertFails(getDoc(doc(db, `users/${INTRUDER}/books/b1`)));
  });

  it('blocks paths outside users/', async () => {
    const db = testEnv.authenticatedContext(OWNER).firestore();
    await assertFails(setDoc(doc(db, 'public/doc1'), { x: 1 }));
    await assertFails(getDoc(doc(db, 'public/doc1')));
  });
});
