/**
 * D'on surt l'adreça del client que alimenta el límit de ritme comercial.
 *
 * Una capçalera de reenviament només val si la posa la plataforma. Vercel
 * escriu `x-vercel-forwarded-for` i el navegador no la pot substituir. En canvi
 * `x-forwarded-for` l'escriu qualsevol client quan el desplegament no té al
 * davant cap proxy que la normalitzi: acceptar-la sempre vol dir que n'hi ha
 * prou amb una capçalera nova a cada petició per burlar el límit sencer.
 *
 * Per això `x-forwarded-for` només es llegeix si el desplegament declara que hi
 * ha un proxy de confiança al davant (`TRUST_FORWARDED_FOR=1`).
 */
export const maximumClientAddressLength = 128;

export function forwardedClientAddress(
  headers: Headers,
  trustForwardedFor: boolean,
  vercelPlatform = false,
): string | null {
  const forwarded =
    (vercelPlatform ? headers.get("x-vercel-forwarded-for") : null) ??
    (trustForwardedFor ? headers.get("x-forwarded-for") : null);
  const address = forwarded?.split(",", 1)[0]?.trim();
  return address && address.length <= maximumClientAddressLength
    ? address
    : null;
}

/**
 * Material del qual es deriva la clau de ritme. Quan no hi ha cap adreça de
 * confiança el dipòsit va per sessió de compra i no per a tothom: una constant
 * compartida deixaria que un sol client esgotés el límit de la botiga sencera,
 * que és una denegació de servei contra la clientela legítima.
 *
 * Null quan no hi ha cap de les dues coses. El backend rebutja aquesta
 * situació en producció; el recanvi de sessió només serveix en local.
 */
export function commerceRateSubject(
  headers: Headers,
  sessionToken: string | null,
  trustForwardedFor: boolean,
  vercelPlatform = false,
): string | null {
  const address = forwardedClientAddress(
    headers,
    trustForwardedFor,
    vercelPlatform,
  );
  if (address) return `address:${address}`;
  return sessionToken ? `session:${sessionToken}` : null;
}
