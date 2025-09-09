/**
 * Serwis OAuth dla Furgonetka.pl API
 * Obsługuje automatyczne pobieranie i odnawianie tokenów
 */

class FurgonetkaOAuthService {
  private clientId: string;
  private clientSecret: string;
  private baseUrl: string;
  private accessToken: string | null = null;
  private tokenExpiry: number = 0;
  // User impersonation (bearer-token-for-user)
  private partnerUserId: string | null = null;
  private userAccessToken: string | null = null;
  private userTokenExpiry: number = 0;

  constructor() {
    this.clientId = process.env.FURGONETKA_OAUTH_CLIENT_ID || '';
    this.clientSecret = process.env.FURGONETKA_OAUTH_CLIENT_SECRET || '';
    this.baseUrl = process.env.FURGONETKA_BASE_URL || 'https://api.sandbox.furgonetka.pl';
  this.partnerUserId = process.env.FURGONETKA_PARTNER_USER_ID || null;
    
    if (!this.clientId || !this.clientSecret) {
      console.warn('🚨 Furgonetka OAuth: Brak konfiguracji Client ID/Secret');
    }
    if (process.env.FURGONETKA_AUTH_TOKEN) {
      console.log('🔐 Furgonetka: X-Auth-Token configured (env present)');
    }
    if (process.env.FURGONETKA_COMPANY_ID) {
      console.log('🏢 Furgonetka: X-Company-Id configured (env present)');
    }
    if (process.env.FURGONETKA_USER_EMAIL) {
      console.log('👤 Furgonetka: X-User-Email configured (env present)');
    }
    if (this.partnerUserId) {
      console.log('🧑‍💼 Furgonetka: PARTNER_USER_ID configured (user impersonation enabled)');
    }
  }

  /**
   * Pobiera lub odświeża token OAuth
   */
  async getAccessToken(): Promise<string> {
    // Sprawdź czy token jest nadal ważny (z 5min buforem)
    const now = Date.now();
    const bufferTime = 5 * 60 * 1000; // 5 minut
    
    if (this.accessToken && now < (this.tokenExpiry - bufferTime)) {
      return this.accessToken;
    }

    console.log('🔄 Furgonetka OAuth: Pobieranie nowego tokenu...');
    
    try {
      const params = new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: this.clientId,
        client_secret: this.clientSecret,
      })
      // Opcjonalne: scope/audience z ENV, jeśli wymagane przez środowisko
      const scope = process.env.FURGONETKA_OAUTH_SCOPE
      const audience = process.env.FURGONETKA_OAUTH_AUDIENCE
      if (scope) params.append('scope', scope)
      if (audience) params.append('audience', audience)

      if (scope || audience) {
        console.log('🔧 OAuth token params:', {
          scope: scope ? '[SET]' : undefined,
          audience: audience ? '[SET]' : undefined,
        })
      }

  const response = await fetch(`${this.baseUrl}/oauth/token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params.toString()
      });

      if (!response.ok) {
        throw new Error(`OAuth request failed: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      
      this.accessToken = data.access_token;
      this.tokenExpiry = now + (data.expires_in * 1000); // expires_in jest w sekundach
      
      console.log('✅ Furgonetka OAuth: Token otrzymany');
      console.log(`   Wygasa: ${new Date(this.tokenExpiry).toISOString()}`);
      
      return this.accessToken!; // Non-null assertion - właśnie przypisaliśmy token
      
    } catch (error) {
      console.error('❌ Furgonetka OAuth: Błąd pobierania tokenu', error);
      throw error;
    }
  }

  /**
   * Zwraca token użytkownika (bearer-token-for-user), jeśli skonfigurowano PARTNER_USER_ID.
   * W przeciwnym wypadku zwraca token aplikacji.
   */
  async getEffectiveAccessToken(): Promise<string> {
    const now = Date.now();
    const bufferTime = 5 * 60 * 1000; // 5 minut
    if (this.partnerUserId) {
      // Jeśli mamy świeży token użytkownika – użyj go
      if (this.userAccessToken && now < (this.userTokenExpiry - bufferTime)) {
        return this.userAccessToken;
      }
      // Odśwież: najpierw token aplikacji
      const appToken = await this.getAccessToken();
      try {
        const url = `${this.baseUrl}/account/token/${encodeURIComponent(this.partnerUserId)}`;
        console.log('🔁 Furgonetka OAuth: Wymiana tokenu aplikacji na token użytkownika przez', url);
        const resp = await fetch(url, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${appToken}`,
            'Accept': 'application/vnd.furgonetka.v1+json',
          },
        });
        if (!resp.ok) {
          const preview = await resp.text().catch(() => '');
          throw new Error(`User token exchange failed: ${resp.status} ${resp.statusText} ${preview}`);
        }
        const data: any = await resp.json();
        this.userAccessToken = data.access_token;
        this.userTokenExpiry = now + (Number(data.expires_in || 0) * 1000);
        console.log('✅ Furgonetka OAuth: Token użytkownika otrzymany');
        return this.userAccessToken!;
      } catch (e) {
        console.error('❌ Furgonetka OAuth: Błąd wymiany na token użytkownika', e);
        // Fallback: użyj tokenu aplikacji (część endpointów i tak zadziała)
        return appToken;
      }
    }
    // Brak impersonacji – użyj tokenu aplikacji
    return await this.getAccessToken();
  }

  /**
   * Wykonuje autoryzowane zapytanie do API Furgonetka.pl
   */
  async authenticatedRequest(endpoint: string, options: RequestInit = {}): Promise<Response> {
  const token = await this.getEffectiveAccessToken();
    
    const hasBody = typeof options.body !== 'undefined'
    const defaultHeaders: Record<string, string> = {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/vnd.furgonetka.v1+json',
      'X-Language': 'pl_PL',
      ...(process.env.FURGONETKA_AUTH_TOKEN
        ? { 'X-Auth-Token': process.env.FURGONETKA_AUTH_TOKEN as string }
        : {}),
      ...(process.env.FURGONETKA_COMPANY_ID
        ? { 'X-Company-Id': process.env.FURGONETKA_COMPANY_ID as string }
        : {}),
      ...(process.env.FURGONETKA_USER_EMAIL
        ? { 'X-User-Email': process.env.FURGONETKA_USER_EMAIL as string }
        : {}),
    }
    if (hasBody) {
      defaultHeaders['Content-Type'] = 'application/vnd.furgonetka.v1+json'
    }

    const finalOptions: RequestInit = {
      ...options,
      headers: {
        ...defaultHeaders,
        ...options.headers
      }
    };

    const url = endpoint.startsWith('http') ? endpoint : `${this.baseUrl}${endpoint}`;
    
    console.log(`📡 Furgonetka API: ${finalOptions.method || 'GET'} ${url}`);
    
  const response = await fetch(url, finalOptions);
    
    // Loguj rate limiting info
    const rateLimit = response.headers.get('X-RateLimit-Limit');
    const rateRemaining = response.headers.get('X-RateLimit-Remaining');
    const rateRetryAfter = response.headers.get('X-RateLimit-Retry-After');
    
    if (rateLimit) {
      console.log(`📊 Rate Limit: ${rateRemaining}/${rateLimit} remaining`);
      if (rateRetryAfter && rateRetryAfter !== '0') {
        console.warn(`⏰ Rate limit retry after: ${rateRetryAfter} seconds`);
      }
    }

    if (!response.ok) {
      // Użyj klona, by nie konsumować body – caller może je jeszcze odczytać
      let errorPreview = ''
      try {
        errorPreview = await response.clone().text()
      } catch (_) {
        // ignore
      }
      console.error(`❌ Furgonetka API Error: ${response.status} ${response.statusText}`, errorPreview);
    }
    
    return response;
  }

  /**
   * Test połączenia z API
   */
  async testConnection(): Promise<boolean> {
    try {
      console.log('🧪 Furgonetka: Testowanie połączenia...');
      
      const response = await this.authenticatedRequest('/configuration/dictionary', {
        method: 'GET'
      });
      
      if (response.ok) {
        console.log('✅ Furgonetka: Połączenie działa');
        return true;
      } else {
        console.error('❌ Furgonetka: Test połączenia nieudany');
        return false;
      }
    } catch (error) {
      console.error('❌ Furgonetka: Błąd testowania połączenia', error);
      return false;
    }
  }

  /**
   * Pobiera listę dostępnych przewoźników
   */
  async getAvailableServices(): Promise<any> {
    try {
      const response = await this.authenticatedRequest('/account/services', {
        method: 'GET'
      });
      
      if (response.ok) {
        return await response.json();
      } else {
        throw new Error(`Failed to get services: ${response.status}`);
      }
    } catch (error) {
      console.error('❌ Furgonetka: Błąd pobierania usług', error);
      throw error;
    }
  }

  /**
   * Oblicza cenę przesyłki
   */
  async calculateShippingPrice(packageData: any): Promise<any> {
    try {
      const response = await this.authenticatedRequest('/packages/calculate-price', {
        method: 'POST',
        body: JSON.stringify(packageData)
      });
      
      if (response.ok) {
        return await response.json();
      } else {
        throw new Error(`Failed to calculate price: ${response.status}`);
      }
    } catch (error) {
      console.error('❌ Furgonetka: Błąd obliczania ceny', error);
      throw error;
    }
  }
}

// Singleton instance
export const furgonetkaOAuth = new FurgonetkaOAuthService();
export default FurgonetkaOAuthService;
