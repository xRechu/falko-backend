import type { MedusaRequest, MedusaResponse, MedusaNextFunction } from '@medusajs/framework/http'

/**
 * Middleware dodające wsparcie dla "remember me".
 * Założenie: frontend przy logowaniu dopisze rememberMe=true w body.
 * Jeśli sesja istnieje i rememberMe=true a cookie jest jeszcze sesyjne, ustawiamy trwałe.
 */
export async function rememberMeMiddleware(req: MedusaRequest, res: MedusaResponse, next: MedusaNextFunction) {
  try {
    // Działa tylko na ścieżkach auth login/register
    if (!req.path.includes('/auth/') || req.method !== 'POST') {
      return next();
    }

    const body: any = req.body || {};
    const remember = body.rememberMe === true || body.remember_me === true;

    if (!remember) {
      return next();
    }

    // Hook na finish – po wysłaniu headers przez Medusa możemy je zmodyfikować wcześniej
    const originalSetHeader = res.setHeader.bind(res);
    res.setHeader = (key: string, value: any) => {
      if (key.toLowerCase() === 'set-cookie') {
        const cookies: string[] = Array.isArray(value) ? value : [value];
        const modified = cookies.map((c) => {
          // Ustaw trwałość jeśli to cookie sesji (brak Max-Age/Expires) i wygląda na sesyjne
            if (/medusa.*session/i.test(c)) {
              // Dodaj Max-Age 30 dni i Secure/SameSite
              if (!/max-age=/i.test(c)) {
                return c + '; Max-Age=' + 60 * 60 * 24 * 30 + '; SameSite=Lax';
              }
            }
            return c;
        });
        return originalSetHeader(key, modified);
      }
      return originalSetHeader(key, value);
    };
  } catch (e) {
    // Ignoruj błąd i przejdź dalej
  }
  next();
}
