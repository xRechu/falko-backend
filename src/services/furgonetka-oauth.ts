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

  constructor() {
    this.clientId = process.env.FURGONETKA_OAUTH_CLIENT_ID || '';
    this.clientSecret = process.env.FURGONETKA_OAUTH_CLIENT_SECRET || '';
    this.baseUrl = process.env.FURGONETKA_BASE_URL || 'https://api.sandbox.furgonetka.pl';
    
    if (!this.clientId || !this.clientSecret) {
      console.warn('🚨 Furgonetka OAuth: Brak konfiguracji Client ID/Secret');
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
      const response = await fetch(`${this.baseUrl}/oauth/token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          grant_type: 'client_credentials',
          client_id: this.clientId,
          client_secret: this.clientSecret
        }).toString()
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
   * Wykonuje autoryzowane zapytanie do API Furgonetka.pl
   */
  async authenticatedRequest(endpoint: string, options: RequestInit = {}): Promise<Response> {
    const token = await this.getAccessToken();
    
    const defaultHeaders = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/vnd.furgonetka.v1+json',
      'Accept': 'application/vnd.furgonetka.v1+json',
      'X-Language': 'pl_PL'
    };

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
      const errorText = await response.text();
      console.error(`❌ Furgonetka API Error: ${response.status} ${response.statusText}`, errorText);
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
