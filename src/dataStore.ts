/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from './firebase';

// Each dataset is stored as a single Firestore document under the `icu`
// collection — e.g. icu/consultants = { items: [...] }. These datasets are
// small (well under Firestore's 1 MB/document limit) and map cleanly onto the
// app's array state, so the whole array is read/written at once.

export type DatasetName = 'consultants' | 'shifts' | 'leaves' | 'holidays';

/**
 * Live-subscribe to a dataset. `onChange` fires immediately with the current
 * value and again on every remote change (real-time sync across devices).
 * `exists` is false when the cloud document hasn't been created yet.
 * Returns an unsubscribe function.
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

/** Overwrite a dataset in Firestore. The subscription reflects it back. */
export function saveDataset<T>(name: DatasetName, items: T[]) {
  return setDoc(doc(db, 'icu', name), { items });
}

// ---------------------------------------------------------------------------
// App config (access control). Stored at icu/config = { admins: [email, …] }.
// ---------------------------------------------------------------------------

export interface AppConfig {
  admins: string[];
}

export function subscribeConfig(
  onChange: (config: AppConfig, exists: boolean) => void,
  onError?: (err: unknown) => void
) {
  return onSnapshot(
    doc(db, 'icu', 'config'),
    snap => {
      const data = snap.data() as { admins?: string[] } | undefined;
      onChange({ admins: Array.isArray(data?.admins) ? data!.admins : [] }, snap.exists());
    },
    err => onError?.(err)
  );
}

export function saveConfig(config: AppConfig) {
  return setDoc(doc(db, 'icu', 'config'), config);
}
