// web/src/features/sportsbook/SportsbookFrame.tsx
// POC: embed the Esportiva sportsbook directly in an iframe inside the Tips tab.
// Hardcoded URL for now; the platform sends no X-Frame-Options/CSP, so it frames.
const SPORTSBOOK_URL = 'https://esportiva.bet.br/sports/soccer/sp-66';

export function SportsbookFrame() {
  return (
    <iframe
      className="sportsbook-frame"
      src={SPORTSBOOK_URL}
      title="Esportiva"
      allow="fullscreen; payment; clipboard-write"
      referrerPolicy="no-referrer-when-downgrade"
    />
  );
}
