// web/src/features/sportsbook/SportsbookFrame.tsx
// POC: embed the Esportiva sportsbook directly in an iframe inside the Tips tab.
// Hardcoded URL for now; the platform sends no X-Frame-Options/CSP, so it frames.
export const DEFAULT_SPORTSBOOK_URL = 'https://esportiva.bet.br/sports/soccer/sp-66';

export function SportsbookFrame({
  src = DEFAULT_SPORTSBOOK_URL,
  title = 'Esportiva',
  onLoad,
}: {
  src?: string;
  title?: string;
  onLoad?: () => void;
}) {
  return (
    <iframe
      className="sportsbook-frame"
      src={src}
      title={title}
      allow="fullscreen; payment; clipboard-write"
      referrerPolicy="no-referrer-when-downgrade"
      onLoad={onLoad}
    />
  );
}
