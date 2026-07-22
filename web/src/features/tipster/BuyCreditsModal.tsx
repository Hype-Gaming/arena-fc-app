// web/src/features/tipster/BuyCreditsModal.tsx — "Comprar créditos IA" sheet
import { useEffect, useRef, useState } from 'react';
import {
  CREDIT_PACKS,
  checkoutUrlForPack,
  type CreditPack,
} from '../../shared/lib/creditPacks';
import './BuyCreditsModal.css';

interface Props {
  open: boolean;
  onClose: () => void;
}

export function BuyCreditsModal({ open, onClose }: Props) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const backRef = useRef<HTMLButtonElement>(null);
  const [selectedPack, setSelectedPack] = useState<CreditPack | null>(null);
  const [checkoutLoaded, setCheckoutLoaded] = useState(false);

  function closeModal() {
    setSelectedPack(null);
    setCheckoutLoaded(false);
    onClose();
  }

  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeModal();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) {
      setSelectedPack(null);
      setCheckoutLoaded(false);
      return;
    }
    if (selectedPack) backRef.current?.focus();
  }, [open, selectedPack]);

  if (!open) return null;

  const packs = CREDIT_PACKS.filter((p) => p.kind === 'credits');
  const unlimited = CREDIT_PACKS.filter((p) => p.kind === 'unlimited');

  function buy(pack: CreditPack) {
    setCheckoutLoaded(false);
    setSelectedPack(pack);
  }

  const checkoutUrl = selectedPack ? checkoutUrlForPack(selectedPack.id) : null;

  return (
    <div
      className="bcm-backdrop"
      onClick={closeModal}
      role="presentation"
    >
      <div
        className="bcm"
        data-view={selectedPack ? 'checkout' : 'packs'}
        role="dialog"
        aria-modal="true"
        aria-labelledby="bcm-title"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          ref={closeRef}
          type="button"
          className="bcm__close"
          onClick={closeModal}
          aria-label="Fechar"
        >
          <CloseIcon />
        </button>

        {selectedPack && checkoutUrl ? (
          <div className="bcm-checkout">
            <button
              ref={backRef}
              type="button"
              className="bcm-checkout__back"
              onClick={() => setSelectedPack(null)}
            >
              <BackIcon /> Voltar aos pacotes
            </button>
            <h2 id="bcm-title" className="bcm__title">
              Finalizar compra
            </h2>
            <p className="bcm__subtitle bcm-checkout__subtitle">
              {selectedPack.name} · pagamento seguro processado pela Payt
            </p>

            <div className="bcm-checkout__frame-wrap" data-loaded={checkoutLoaded}>
              {!checkoutLoaded && (
                <div className="bcm-checkout__loading" role="status">
                  <span /> Carregando checkout...
                </div>
              )}
              <iframe
                className="bcm-checkout__frame"
                src={checkoutUrl}
                title={`Checkout ${selectedPack.name}`}
                allow="payment *; clipboard-write"
                referrerPolicy="strict-origin-when-cross-origin"
                onLoad={() => setCheckoutLoaded(true)}
              />
            </div>

            <a
              className="bcm-checkout__external"
              href={checkoutUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              Se o checkout não carregar, abrir em nova aba
            </a>
          </div>
        ) : (
          <>
            <h2 id="bcm-title" className="bcm__title">
              Comprar créditos IA
            </h2>
            <p className="bcm__subtitle">
              Escolha um pacote ou desbloqueie acesso ilimitado.
            </p>

            <section className="bcm__section">
              <h3 className="bcm__eyebrow">
                <CoinsIcon /> Pacotes de créditos
              </h3>
              <div className="bcm__list">
                {packs.map((p) => (
                  <PackRow key={p.id} pack={p} onBuy={() => buy(p)} />
                ))}
              </div>
            </section>

            <section className="bcm__section">
              <h3 className="bcm__eyebrow">
                <InfinityIcon /> Acesso ilimitado
              </h3>
              <div className="bcm__list">
                {unlimited.map((p) => (
                  <PackRow key={p.id} pack={p} onBuy={() => buy(p)} />
                ))}
              </div>
            </section>
          </>
        )}
      </div>
    </div>
  );
}

function PackRow({ pack, onBuy }: { pack: CreditPack; onBuy: () => void }) {
  return (
    <button type="button" className="bcm-row" onClick={onBuy}>
      <span className="bcm-row__text">
        <span className="bcm-row__name">{pack.name}</span>
        <span className="bcm-row__sub">{pack.sub}</span>
      </span>
      <span className="bcm-row__price">{pack.priceLabel}</span>
    </button>
  );
}

/* ---- icons ---- */
function CloseIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M18 6 6 18M6 6l12 12" />
    </svg>
  );
}
function CoinsIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="8" cy="8" r="6" />
      <path d="M18.09 10.37A6 6 0 1 1 10.34 18M7 6h1v4" />
      <path d="m16.71 13.88.7.71-2.82 2.82" />
    </svg>
  );
}
function InfinityIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 12c-2-2.67-4-4-6-4a4 4 0 0 0 0 8c2 0 4-1.33 6-4Zm0 0c2 2.67 4 4 6 4a4 4 0 0 0 0-8c-2 0-4 1.33-6 4Z" />
    </svg>
  );
}

function BackIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="m15 18-6-6 6-6" />
    </svg>
  );
}
