'use client';

import { useState, useEffect } from 'react';
import { X, Download } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function PwaInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showInstall, setShowInstall] = useState(false);

  useEffect(() => {
    const installHandler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      if (!localStorage.getItem('pwa-install-dismissed')) {
        setShowInstall(true);
      }
    };
    window.addEventListener('beforeinstallprompt', installHandler);

    const handleSWUpdate = (registration: ServiceWorkerRegistration) => {
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        if (!newWorker) return;

        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            newWorker.postMessage({ type: 'SKIP_WAITING' });
          }
        });
      });
    };

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then(handleSWUpdate);
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        window.location.reload();
      });
    }

    const isMobile = /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent);
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
    if (isMobile && !isStandalone) {
      const timer = setTimeout(() => {
        if (!localStorage.getItem('pwa-install-dismissed')) {
          setShowInstall(true);
        }
      }, 10000);
      return () => {
        clearTimeout(timer);
        window.removeEventListener('beforeinstallprompt', installHandler);
      };
    }

    return () => window.removeEventListener('beforeinstallprompt', installHandler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) {
      const isIos = /iPhone|iPad|iPod/i.test(navigator.userAgent);
      if (isIos) {
        alert('No Safari, toque no ícone "Compartilhar" e depois em "Adicionar à Tela de Início".');
      } else {
        alert('No seu navegador, acesse o menu e selecione "Adicionar à tela inicial" ou "Instalar aplicativo".');
      }
      return;
    }

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setShowInstall(false);
    }
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setShowInstall(false);
    localStorage.setItem('pwa-install-dismissed', 'true');
  };

  if (!showInstall) return null;

  return (
    <div className="fixed bottom-20 left-4 right-4 z-50 md:bottom-6 md:left-auto md:right-6 md:w-80 animate-in slide-in-from-bottom-4 fade-in duration-300">
      <div className="bg-surface border border-border/80 rounded-2xl p-4 shadow-[0_10px_40px_rgba(0,0,0,0.5)] backdrop-blur-xl">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-neon/10 border border-neon/20 flex items-center justify-center flex-shrink-0">
            <Download className="w-5 h-5 text-neon" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-foreground">Instalar TamoQuite</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Instale em seu celular para acessar mais rápido como um app.
            </p>
            <div className="flex items-center gap-2 mt-3">
              <button
                onClick={handleInstall}
                className="px-4 py-1.5 bg-neon text-background text-xs font-bold rounded-lg hover:bg-neon/90 transition-all active:scale-[0.98] cursor-pointer"
              >
                Instalar
              </button>
              <button
                onClick={handleDismiss}
                className="px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              >
                Agora não
              </button>
            </div>
          </div>
          <button
            onClick={handleDismiss}
            className="p-1 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors cursor-pointer flex-shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
