import { useEffect, useState } from 'react';

export interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

// Module-level cache so we never miss the beforeinstallprompt event if it fires before React mounts
let cachedDeferredPrompt: BeforeInstallPromptEvent | null = null;
let isAppInstalledGlobal = false;

if (typeof window !== 'undefined') {
  // Check standalone mode immediately
  isAppInstalledGlobal =
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as unknown as { standalone?: boolean }).standalone === true;

  window.addEventListener('beforeinstallprompt', (e: Event) => {
    e.preventDefault();
    cachedDeferredPrompt = e as BeforeInstallPromptEvent;
    window.dispatchEvent(new CustomEvent('cimb-pwa-prompt-ready'));
  });

  window.addEventListener('appinstalled', () => {
    cachedDeferredPrompt = null;
    isAppInstalledGlobal = true;
    window.dispatchEvent(new CustomEvent('cimb-pwa-installed'));
  });
}

export function usePWAInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(cachedDeferredPrompt);
  const [isInstalled, setIsInstalled] = useState<boolean>(isAppInstalledGlobal);
  const [isIOS, setIsIOS] = useState<boolean>(false);

  useEffect(() => {
    // Detect standalone mode
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;
    setIsInstalled(isStandalone);

    // Detect iOS devices
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIOSDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(isIOSDevice);

    const onPromptReady = () => {
      setDeferredPrompt(cachedDeferredPrompt);
    };

    const onAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    };

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      cachedDeferredPrompt = e as BeforeInstallPromptEvent;
      setDeferredPrompt(cachedDeferredPrompt);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('cimb-pwa-prompt-ready', onPromptReady);
    window.addEventListener('cimb-pwa-installed', onAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('cimb-pwa-prompt-ready', onPromptReady);
      window.removeEventListener('cimb-pwa-installed', onAppInstalled);
    };
  }, []);

  const install = async (): Promise<boolean> => {
    const promptEvent = deferredPrompt || cachedDeferredPrompt;
    if (!promptEvent) {
      console.warn('[PWA] No deferred prompt available to trigger install');
      return false;
    }
    try {
      await promptEvent.prompt();
      const { outcome } = await promptEvent.userChoice;
      if (outcome === 'accepted') {
        setIsInstalled(true);
        setDeferredPrompt(null);
        cachedDeferredPrompt = null;
        return true;
      }
      return false;
    } catch (err) {
      console.error('[PWA] Error triggering install prompt:', err);
      return false;
    }
  };

  return {
    isInstallable: !!(deferredPrompt || cachedDeferredPrompt),
    isInstalled,
    isIOS,
    install,
  };
}

