/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { Download, X, Share } from 'lucide-react';

const DISMISS_KEY = 'icu_install_dismissed';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

// A friendly "Add to Home Screen" banner. Uses the native install prompt on
// Android/Chrome, and shows manual instructions on iOS Safari (which has no
// programmatic prompt). Hidden once installed or dismissed.
export default function InstallPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [show, setShow] = useState(false);
  const [iosHint, setIosHint] = useState(false);

  useEffect(() => {
    if (localStorage.getItem(DISMISS_KEY)) return;

    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (navigator as unknown as { standalone?: boolean }).standalone === true;
    if (isStandalone) return; // already installed

    const onBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
      setShow(true);
    };
    window.addEventListener('beforeinstallprompt', onBeforeInstall);

    // iOS Safari: no beforeinstallprompt — offer manual steps after a beat.
    const ua = window.navigator.userAgent;
    const isIOS = /iphone|ipad|ipod/i.test(ua);
    const isSafari = isIOS && /safari/i.test(ua) && !/crios|fxios|edgios/i.test(ua);
    let timer: ReturnType<typeof setTimeout> | undefined;
    if (isIOS && isSafari) {
      timer = setTimeout(() => {
        setIosHint(true);
        setShow(true);
      }, 1500);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall);
      if (timer) clearTimeout(timer);
    };
  }, []);

  const dismiss = () => {
    setShow(false);
    localStorage.setItem(DISMISS_KEY, '1');
  };

  const install = async () => {
    if (!deferred) return;
    await deferred.prompt();
    try {
      await deferred.userChoice;
    } catch {
      /* ignore */
    }
    setDeferred(null);
    dismiss();
  };

  if (!show) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-[60] p-3 pb-safe pointer-events-none">
      <div className="max-w-2xl mx-auto bg-surface-container-lowest border border-outline-variant/30 rounded-2xl shadow-xl p-4 flex items-center gap-3 animate-fade-in pointer-events-auto">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
          <Download className="w-5 h-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-body-md font-bold text-on-surface">Add to Home Screen</p>
          {iosHint ? (
            <p className="text-label-sm text-on-surface-variant">
              Tap <Share className="inline w-3.5 h-3.5 align-text-bottom" /> Share, then “Add to Home Screen”.
            </p>
          ) : (
            <p className="text-label-sm text-on-surface-variant">Install for quick, full-screen access.</p>
          )}
        </div>
        {!iosHint && (
          <button
            onClick={install}
            className="shrink-0 bg-primary text-on-primary font-bold text-sm px-4 py-2 rounded-xl active:scale-95 transition-all cursor-pointer"
          >
            Install
          </button>
        )}
        <button
          onClick={dismiss}
          className="shrink-0 p-2 text-on-surface-variant hover:text-on-surface cursor-pointer"
          aria-label="Dismiss"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
