/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { collection, deleteDoc, doc, getDoc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from './firebase';
import { LeaveRequest } from './types';

// Schedule datasets (consultants, shifts, holidays) are each stored as a single
// Firestore document under the `icu` collection — e.g. icu/shifts = { items: [...] }.
// Leave/on-call requests live in their own `requests` collection (one document
// per request) so security rules can be enforced per request.

export type DatasetName = 'consultants' | 'shifts' | 'holidays';

/**
 * Live-subscribe to a single-document dataset. `exists` is false when the
 * cloud document hasn't been created yet. Returns an unsubscribe function.
 */
export function subscribeDataset<T>(
  name: DatasetName,
  onChange: (items: T[], exists: boolean) => void,
  onError?: (err: unknown) => void
) {
  return onSnapshot(
    doc(db, 'icu', name),
    snap => {
      const data = snap.data() as { items?: T[] } | undefined;
      onChange((data?.items ?? []) as T[], snap.exists());
    },
    err => onError?.(err)
  );
}

/** Overwrite a single-document dataset. The subscription reflects it back. */
export function saveDataset<T>(name: DatasetName, items: T[]) {
  return setDoc(doc(db, 'icu', name), { items });
}

// ---------------------------------------------------------------------------
// Requests collection (leave & on-call). One document per request, keyed by
// the request's id, so per-request security rules apply.
// ---------------------------------------------------------------------------

export function subscribeRequests(
  onChange: (items: LeaveRequest[]) => void,
  onError?: (err: unknown) => void
) {
  return onSnapshot(
    collection(db, 'requests'),
    snap => onChange(snap.docs.map(d => d.data() as LeaveRequest)),
    err => onError?.(err)
  );
}

/** Create or update a single request. */
export function saveRequest(request: LeaveRequest) {
  return setDoc(doc(db, 'requests', request.id), request);
}

export function deleteRequest(id: string) {
  return deleteDoc(doc(db, 'requests', id));
}

/**
 * One-time migration of legacy requests stored in the old icu/leaves array
 * document into the requests collection. Safe to call repeatedly — it removes
 * the legacy document afterwards, so subsequent calls are no-ops. Admin-only.
 * Returns the number of requests migrated.
 */
export async function migrateLegacyLeaves(): Promise<number> {
  const legacy = await getDoc(doc(db, 'icu', 'leaves'));
  if (!legacy.exists()) return 0;
  const items = (legacy.data()?.items ?? []) as LeaveRequest[];
  await Promise.all(items.map(r => setDoc(doc(db, 'requests', r.id), r)));
  await deleteDoc(doc(db, 'icu', 'leaves'));
  return items.length;
}

// ---------------------------------------------------------------------------
// App config (access control). Stored at icu/config = { admins: [...], members: [...] }.
// Admins have full control; members may view and submit requests.
// ---------------------------------------------------------------------------

export interface AppConfig {
  admins: string[];
  members: string[];
}

export function subscribeConfig(
  onChange: (config: AppConfig, exists: boolean) => void,
  onError?: (err: unknown) => void
) {
  return onSnapshot(
    doc(db, 'icu', 'config'),
    snap => {
      const data = snap.data() as { admins?: string[]; members?: string[] } | undefined;
      onChange(
        {
          admins: Array.isArray(data?.admins) ? data!.admins : [],
          members: Array.isArray(data?.members) ? data!.members : []
        },
        snap.exists()
      );
    },
    err => onError?.(err)
  );
}

export function saveConfig(config: AppConfig) {
  return setDoc(doc(db, 'icu', 'config'), config);
}
