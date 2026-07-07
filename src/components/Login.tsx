/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { auth } from '../firebase';
import { Stethoscope, Loader2, ShieldCheck, CalendarDays } from 'lucide-react';

const provider = new GoogleAuthProvider();

// Google's multicolour "G" mark.
function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z" />
      <path fill="#FF3D00" d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z" />
      <path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238C29.211 35.091 26.715 36 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z" />
      <path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303c-.792 2.237-2.231 4.166-4.087 5.571l6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z" />
    </svg>
  );
}

// Sign-in screen. One-tap Google authentication. On success, App's
// onAuthStateChanged listener swaps in the dashboard.
export default function Login() {
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const handleGoogle = async () => {
    setError('');
    setBusy(true);
    try {
      await signInWithPopup(auth, provider);
    } catch (err) {
      const code = (err as { code?: string })?.code ?? '';
      if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') {
        // User dismissed the popup — no error message needed.
      } else if (code === 'auth/unauthorized-domain') {
        setError('This site is not authorised in Firebase. Add it under Authentication → Settings → Authorized domains.');
      } else {
        setError('Sign-in failed. Please try again.');
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-on-surface flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-surface-container-lowest rounded-2xl shadow-xl border border-outline-variant/20 p-6 space-y-6 animate-fade-in">
        <div className="flex flex-col items-center text-center gap-2">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
            <Stethoscope className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-headline-md font-headline-md font-bold text-on-surface">ICU Consultant</h1>
          <p className="text-body-md text-on-surface-variant">On-call rota & leave management</p>
        </div>

        <div className="space-y-2 text-body-md text-on-surface-variant">
          <div className="flex items-center gap-3">
            <CalendarDays className="w-4 h-4 text-primary shrink-0" />
            <span>View the live department schedule</span>
          </div>
          <div className="flex items-center gap-3">
            <ShieldCheck className="w-4 h-4 text-primary shrink-0" />
            <span>Secure sign-in with your Google account</span>
          </div>
        </div>

        <button
          onClick={handleGoogle}
          disabled={busy}
          className="w-full h-12 bg-surface-container-lowest border border-outline-variant/40 text-on-surface font-bold rounded-xl shadow-sm active:scale-95 transition-all flex items-center justify-center gap-3 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed hover:bg-surface-container-low"
        >
          {busy ? <Loader2 className="w-5 h-5 animate-spin" /> : <GoogleIcon />}
          {busy ? 'Signing in…' : 'Continue with Google'}
        </button>

        {error && <p className="text-label-sm text-error font-semibold text-center">{error}</p>}

        <p className="text-[11px] text-center text-on-surface-variant leading-relaxed">
          First sign-in becomes the administrator. Everyone else can view the schedule and submit leave requests.
        </p>
      </div>
    </div>
  );
}
