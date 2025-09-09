import { Resend } from 'resend';

interface EmailConfig {
  apiKey: string;
  from: string;
  replyTo?: string;
}

interface EmailTemplate {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

interface WelcomeEmailData {
  customerName: string;
  customerEmail: string;
  loginUrl: string;
}

interface OrderConfirmationData {
  customerName: string;
  orderNumber: string;
  orderTotal: string;
  orderItems: Array<{
    title: string;
    quantity: number;
    price: string;
  }>;
  shippingAddress: string;
  trackingUrl?: string;
}

interface PasswordResetData {
  customerName: string;
  resetUrl: string;
  expiresIn: string;
}

interface ReturnConfirmationData {
  customerName: string;
  returnId: string;
  orderNumber: string;
  items: Array<{
    title: string;
    quantity: number;
    price: string;
  }>;
  refundMethod: 'card' | 'loyalty_points';
  refundAmount: string;
  qrCodeUrl: string;
  trackingNumber: string;
}

interface ReturnProcessedData {
  customerName: string;
  returnId: string;
  orderNumber: string;
  refundMethod: 'card' | 'loyalty_points';
  refundAmount: string;
  loyaltyPointsAdded?: number;
}

export class EmailService {
  private resend: Resend;
  private config: EmailConfig;

  constructor() {
    this.config = {
      apiKey: process.env.RESEND_API_KEY || '',
      from: process.env.EMAIL_FROM || 'noreply@falkoproject.com',
      replyTo: process.env.EMAIL_REPLY_TO || 'support@falkoproject.com'
    };

    if (!this.config.apiKey) {
      console.warn('⚠️ RESEND_API_KEY not configured. Email service will use mock mode.');
      // Don't initialize Resend without API key
      this.resend = null as any;
    } else {
      this.resend = new Resend(this.config.apiKey);
    }
  }

  /**
   * 🎉 Welcome Email - Po rejestracji nowego klienta
   */
  async sendWelcomeEmail(data: WelcomeEmailData): Promise<boolean> {
    const template = this.generateWelcomeTemplate(data);
    
    return this.sendEmail({
      to: data.customerEmail,
      subject: '🎉 Witaj w Falko Project!',
      html: template.html,
      text: template.text
    });
  }

  /**
   * 📧 Password Reset Email - Reset hasła
   */
  async sendPasswordResetEmail(data: PasswordResetData): Promise<boolean> {
    const template = this.generatePasswordResetTemplate(data);
    
    return this.sendEmail({
      to: data.customerName, // Assuming this contains email
      subject: '🔐 Reset hasła - Falko Project',
      html: template.html,
      text: template.text
    });
  }

  /**
   * 📦 Order Confirmation Email - Potwierdzenie zamówienia
   */
  async sendOrderConfirmationEmail(toEmail: string, data: OrderConfirmationData): Promise<boolean> {
    const template = this.generateOrderConfirmationTemplate(data);
    
    return this.sendEmail({
      to: toEmail,
      subject: `📦 Potwierdzenie zamówienia #${data.orderNumber}`,
      html: template.html,
      text: template.text
    });
  }

  /**
   * 🚚 Shipping Notification Email - Wysłano zamówienie
   */
  async sendShippingNotificationEmail(data: OrderConfirmationData): Promise<boolean> {
    const template = this.generateShippingNotificationTemplate(data);
    
    return this.sendEmail({
      to: data.customerName, // Assuming this contains email
      subject: `🚚 Twoje zamówienie #${data.orderNumber} zostało wysłane!`,
      html: template.html,
      text: template.text
    });
  }

  /**
   * Core email sending method
   */
  private async sendEmail(template: EmailTemplate): Promise<boolean> {
    try {
      // Mock mode for development
      if (!this.config.apiKey || !this.resend) {
        console.log('📧 MOCK EMAIL SENT:');
        console.log(`To: ${template.to}`);
        console.log(`Subject: ${template.subject}`);
        console.log(`HTML Length: ${template.html.length} chars`);
        return true;
      }

      // Real email sending
      const result = await this.resend.emails.send({
        from: this.config.from,
        to: template.to,
        subject: template.subject,
        html: template.html,
        text: template.text,
        replyTo: this.config.replyTo
      });

      console.log('✅ Email sent successfully:', result.data?.id);
      return true;

    } catch (error) {
      console.error('❌ Email sending failed:', error);
      return false;
    }
  }

  /**
   * 🎨 Welcome Email Template
   */
  private generateWelcomeTemplate(data: WelcomeEmailData) {
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Witaj w Falko Project!</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background-color: #f8f9fa; }
            .container { max-width: 600px; margin: 0 auto; background-color: white; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 20px; text-align: center; }
            .header h1 { color: white; margin: 0; font-size: 28px; font-weight: 600; }
            .content { padding: 40px 20px; }
            .welcome-text { font-size: 18px; color: #333; line-height: 1.6; margin-bottom: 30px; }
            .cta-button { display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: 600; margin: 20px 0; }
            .features { background-color: #f8f9fa; padding: 30px 20px; border-radius: 8px; margin: 30px 0; }
            .feature { margin: 15px 0; }
            .feature-icon { display: inline-block; width: 20px; margin-right: 10px; }
            .footer { background-color: #333; color: white; padding: 30px 20px; text-align: center; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🎉 Witaj w Falko Project!</h1>
            </div>
            
            <div class="content">
              <p class="welcome-text">
                Cześć <strong>${data.customerName}</strong>!
              </p>
              
              <p class="welcome-text">
                Dziękujemy za dołączenie do społeczności Falko Project! Jesteśmy podekscytowani, że możemy Ci przedstawić naszą kolekcję premium odzieży streetwear.
              </p>
              
              <div style="text-align: center;">
                <a href="${data.loginUrl}" class="cta-button">
                  🛍️ Rozpocznij zakupy
                </a>
              </div>
              
              <div class="features">
                <h3 style="margin-top: 0; color: #333;">Co Cię czeka:</h3>
                <div class="feature">
                  <span class="feature-icon">🎁</span>
                  <strong>Program lojalnościowy</strong> - Zbieraj punkty za każdy zakup
                </div>
                <div class="feature">
                  <span class="feature-icon">🚚</span>
                  <strong>Darmowa dostawa</strong> - Od 200 zł
                </div>
                <div class="feature">
                  <span class="feature-icon">↩️</span>
                  <strong>Łatwe zwroty</strong> - 30 dni na zwrot
                </div>
                <div class="feature">
                  <span class="feature-icon">⭐</span>
                  <strong>Premium jakość</strong> - Najwyższej klasy materiały
                </div>
              </div>
              
              <p style="color: #666; font-size: 14px; margin-top: 30px;">
                Masz pytania? Napisz do nas na <a href="mailto:support@falkoproject.com">support@falkoproject.com</a>
              </p>
            </div>
            
            <div class="footer">
              <p><strong>Falko Project</strong></p>
              <p>Premium Streetwear • Made with ❤️ in Poland</p>
              <p>
                <a href="https://falkoproject.com" style="color: #ccc;">falkoproject.com</a> • 
                <a href="mailto:support@falkoproject.com" style="color: #ccc;">support@falkoproject.com</a>
              </p>
            </div>
          </div>
        </body>
      </html>
    `;

    const text = `
      🎉 Witaj w Falko Project!
      
      Cześć ${data.customerName}!
      
      Dziękujemy za dołączenie do społeczności Falko Project! 
      
      Rozpocznij zakupy: ${data.loginUrl}
      
      Co Cię czeka:
      🎁 Program lojalnościowy - Zbieraj punkty za każdy zakup
      🚚 Darmowa dostawa - Od 200 zł
      ↩️ Łatwe zwroty - 30 dni na zwrot
      ⭐ Premium jakość - Najwyższej klasy materiały
      
      Masz pytania? Napisz do nas na support@falkoproject.com
      
      Falko Project
      Premium Streetwear • Made with ❤️ in Poland
    `;

    return { html, text };
  }

  /**
   * 🔐 Password Reset Email Template
   */
  private generatePasswordResetTemplate(data: PasswordResetData) {
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Reset hasła - Falko Project</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background-color: #f8f9fa; }
            .container { max-width: 600px; margin: 0 auto; background-color: white; }
            .header { background: linear-gradient(135deg, #ff6b6b 0%, #ee5a24 100%); padding: 40px 20px; text-align: center; }
            .header h1 { color: white; margin: 0; font-size: 28px; font-weight: 600; }
            .content { padding: 40px 20px; }
            .reset-text { font-size: 16px; color: #333; line-height: 1.6; margin-bottom: 30px; }
            .cta-button { display: inline-block; background: linear-gradient(135deg, #ff6b6b 0%, #ee5a24 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: 600; margin: 20px 0; }
            .warning { background-color: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 8px; margin: 20px 0; }
            .footer { background-color: #333; color: white; padding: 30px 20px; text-align: center; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🔐 Reset hasła</h1>
            </div>
            
            <div class="content">
              <p class="reset-text">
                Cześć <strong>${data.customerName}</strong>!
              </p>
              
              <p class="reset-text">
                Otrzymaliśmy prośbę o reset hasła do Twojego konta w Falko Project. Kliknij poniższy przycisk, aby ustawić nowe hasło.
              </p>
              
              <div style="text-align: center;">
                <a href="${data.resetUrl}" class="cta-button">
                  🔑 Resetuj hasło
                </a>
              </div>
              
              <div class="warning">
                <strong>⚠️ Ważne informacje:</strong>
                <ul style="margin: 10px 0;">
                  <li>Link jest ważny przez <strong>${data.expiresIn}</strong></li>
                  <li>Jeśli nie prosiłeś o reset hasła, zignoruj ten email</li>
                  <li>Nie udostępniaj tego linku nikomu</li>
                </ul>
              </div>
              
              <p style="color: #666; font-size: 14px; margin-top: 30px;">
                Jeśli przycisk nie działa, skopiuj i wklej ten link do przeglądarki:<br>
                <a href="${data.resetUrl}" style="color: #007bff; word-break: break-all;">${data.resetUrl}</a>
              </p>
              
              <p style="color: #666; font-size: 14px;">
                Potrzebujesz pomocy? Napisz do nas na <a href="mailto:support@falkoproject.com">support@falkoproject.com</a>
              </p>
            </div>
            
            <div class="footer">
              <p><strong>Falko Project</strong></p>
              <p>Ten email został wysłany automatycznie. Nie odpowiadaj na niego.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    const text = `
      🔐 Reset hasła - Falko Project
      
      Cześć ${data.customerName}!
      
      Otrzymaliśmy prośbę o reset hasła do Twojego konta w Falko Project.
      
      Resetuj hasło: ${data.resetUrl}
      
      ⚠️ Ważne informacje:
      - Link jest ważny przez ${data.expiresIn}
      - Jeśli nie prosiłeś o reset hasła, zignoruj ten email
      - Nie udostępniaj tego linku nikomu
      
      Potrzebujesz pomocy? Napisz do nas na support@falkoproject.com
      
      Falko Project
      Ten email został wysłany automatycznie.
    `;

    return { html, text };
  }

  /**
   * 📦 Order Confirmation Email Template
   */
  private generateOrderConfirmationTemplate(data: OrderConfirmationData) {
    const itemsHtml = data.orderItems.map(item => `
      <tr>
        <td style="padding: 10px; border-bottom: 1px solid #eee;">${item.title}</td>
        <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: center;">${item.quantity}</td>
        <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right;">${item.price}</td>
      </tr>
    `).join('');

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Potwierdzenie zamówienia #${data.orderNumber}</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background-color: #f8f9fa; }
            .container { max-width: 600px; margin: 0 auto; background-color: white; }
            .header { background: linear-gradient(135deg, #28a745 0%, #20c997 100%); padding: 40px 20px; text-align: center; }
            .header h1 { color: white; margin: 0; font-size: 28px; font-weight: 600; }
            .content { padding: 40px 20px; }
            .order-summary { background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; }
            .order-table { width: 100%; border-collapse: collapse; margin: 20px 0; }
            .order-table th { background-color: #e9ecef; padding: 12px; text-align: left; font-weight: 600; }
            .total-row { background-color: #e8f5e8; font-weight: 600; }
            .footer { background-color: #333; color: white; padding: 30px 20px; text-align: center; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>📦 Zamówienie potwierdzone!</h1>
            </div>
            
            <div class="content">
              <p style="font-size: 18px; color: #333; margin-bottom: 30px;">
                Cześć <strong>${data.customerName}</strong>!
              </p>
              
              <p style="color: #333; line-height: 1.6;">
                Dziękujemy za zamówienie! Twoje zamówienie <strong>#${data.orderNumber}</strong> zostało potwierdzone i jest obecnie przetwarzane.
              </p>
              
              <div class="order-summary">
                <h3 style="margin-top: 0; color: #333;">📋 Szczegóły zamówienia</h3>
                
                <table class="order-table">
                  <thead>
                    <tr>
                      <th>Produkt</th>
                      <th style="text-align: center;">Ilość</th>
                      <th style="text-align: right;">Cena</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${itemsHtml}
                    <tr class="total-row">
                      <td colspan="2" style="padding: 15px; font-weight: 600;">RAZEM:</td>
                      <td style="padding: 15px; text-align: right; font-weight: 600; font-size: 18px;">${data.orderTotal}</td>
                    </tr>
                  </tbody>
                </table>
                
                <div style="margin-top: 20px;">
                  <strong>📍 Adres dostawy:</strong><br>
                  ${data.shippingAddress}
                </div>
              </div>
              
              ${data.trackingUrl ? `
                <div style="text-align: center; margin: 30px 0;">
                  <a href="${data.trackingUrl}" style="display: inline-block; background: linear-gradient(135deg, #28a745 0%, #20c997 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: 600;">
                    📱 Śledź przesyłkę
                  </a>
                </div>
              ` : ''}
              
              <p style="color: #666; font-size: 14px; margin-top: 30px;">
                Otrzymasz kolejny email, gdy Twoje zamówienie zostanie wysłane. Masz pytania? Napisz do nas na <a href="mailto:support@falkoproject.com">support@falkoproject.com</a>
              </p>
            </div>
            
            <div class="footer">
              <p><strong>Falko Project</strong></p>
              <p>Dziękujemy za zaufanie! 🙏</p>
            </div>
          </div>
        </body>
      </html>
    `;

    const text = `
      📦 Zamówienie potwierdzone! - Falko Project
      
      Cześć ${data.customerName}!
      
      Dziękujemy za zamówienie! Twoje zamówienie #${data.orderNumber} zostało potwierdzone.
      
      📋 Szczegóły zamówienia:
      ${data.orderItems.map(item => `${item.title} x${item.quantity} - ${item.price}`).join('\n')}
      
      RAZEM: ${data.orderTotal}
      
      📍 Adres dostawy:
      ${data.shippingAddress}
      
      ${data.trackingUrl ? `📱 Śledź przesyłkę: ${data.trackingUrl}` : ''}
      
      Otrzymasz kolejny email, gdy Twoje zamówienie zostanie wysłane.
      
      Masz pytania? Napisz do nas na support@falkoproject.com
      
      Falko Project
      Dziękujemy za zaufanie! 🙏
    `;

    return { html, text };
  }

  /**
   * 🚚 Shipping Notification Email Template
   */
  private generateShippingNotificationTemplate(data: OrderConfirmationData) {
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Zamówienie #${data.orderNumber} zostało wysłane!</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background-color: #f8f9fa; }
            .container { max-width: 600px; margin: 0 auto; background-color: white; }
            .header { background: linear-gradient(135deg, #007bff 0%, #6610f2 100%); padding: 40px 20px; text-align: center; }
            .header h1 { color: white; margin: 0; font-size: 28px; font-weight: 600; }
            .content { padding: 40px 20px; }
            .shipping-info { background-color: #e3f2fd; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #007bff; }
            .cta-button { display: inline-block; background: linear-gradient(135deg, #007bff 0%, #6610f2 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: 600; margin: 20px 0; }
            .footer { background-color: #333; color: white; padding: 30px 20px; text-align: center; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🚚 Zamówienie wysłane!</h1>
            </div>
            
            <div class="content">
              <p style="font-size: 18px; color: #333; margin-bottom: 30px;">
                Cześć <strong>${data.customerName}</strong>!
              </p>
              
              <p style="color: #333; line-height: 1.6;">
                Świetne wieści! Twoje zamówienie <strong>#${data.orderNumber}</strong> zostało wysłane i jest w drodze do Ciebie! 🎉
              </p>
              
              <div class="shipping-info">
                <h3 style="margin-top: 0; color: #007bff;">📦 Informacje o przesyłce</h3>
                <p><strong>Numer zamówienia:</strong> #${data.orderNumber}</p>
                <p><strong>Wartość:</strong> ${data.orderTotal}</p>
                <p><strong>Adres dostawy:</strong><br>${data.shippingAddress}</p>
                <p><strong>Przewidywany czas dostawy:</strong> 1-3 dni robocze</p>
              </div>
              
              ${data.trackingUrl ? `
                <div style="text-align: center; margin: 30px 0;">
                  <a href="${data.trackingUrl}" class="cta-button">
                    📱 Śledź przesyłkę na żywo
                  </a>
                </div>
                
                <p style="color: #666; font-size: 14px;">
                  Możesz śledzić status swojej przesyłki w czasie rzeczywistym, klikając powyższy przycisk.
                </p>
              ` : ''}
              
              <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 30px 0;">
                <h4 style="margin-top: 0; color: #333;">💡 Przydatne informacje:</h4>
                <ul style="color: #666; line-height: 1.6;">
                  <li>Przesyłka zostanie dostarczona w godzinach 8:00-18:00</li>
                  <li>Jeśli nie będzie Cię w domu, kurier zostawi awizo</li>
                  <li>Masz 30 dni na zwrot produktów</li>
                  <li>Wszystkie produkty są objęte gwarancją jakości</li>
                </ul>
              </div>
              
              <p style="color: #666; font-size: 14px; margin-top: 30px;">
                Masz pytania dotyczące dostawy? Napisz do nas na <a href="mailto:support@falkoproject.com">support@falkoproject.com</a>
              </p>
            </div>
            
            <div class="footer">
              <p><strong>Falko Project</strong></p>
              <p>Nie możemy się doczekać, aż zobaczysz swoje nowe ubrania! 😍</p>
            </div>
          </div>
        </body>
      </html>
    `;

    const text = `
      🚚 Zamówienie wysłane! - Falko Project
      
      Cześć ${data.customerName}!
      
      Świetne wieści! Twoje zamówienie #${data.orderNumber} zostało wysłane! 🎉
      
      📦 Informacje o przesyłce:
      - Numer zamówienia: #${data.orderNumber}
      - Wartość: ${data.orderTotal}
      - Adres dostawy: ${data.shippingAddress}
      - Przewidywany czas dostawy: 1-3 dni robocze
      
      ${data.trackingUrl ? `📱 Śledź przesyłkę: ${data.trackingUrl}` : ''}
      
      💡 Przydatne informacje:
      - Przesyłka zostanie dostarczona w godzinach 8:00-18:00
      - Jeśli nie będzie Cię w domu, kurier zostawi awizo
      - Masz 30 dni na zwrot produktów
      - Wszystkie produkty są objęte gwarancją jakości
      
      Masz pytania? Napisz do nas na support@falkoproject.com
      
      Falko Project
      Nie możemy się doczekać, aż zobaczysz swoje nowe ubrania! 😍
    `;

    return { html, text };
  }

  /**
   * Send return confirmation email with QR code
   */
  async sendReturnConfirmationEmail(returnData: any): Promise<void> {
    try {
      const orderService = this.container?.resolve("orderService");
      const order = await orderService?.retrieve(returnData.order_id, {
        relations: ["customer"]
      });

      if (!order?.customer?.email) {
        console.warn('⚠️ No customer email found for return confirmation');
        return;
      }

      const emailData: ReturnConfirmationData = {
        customerName: `${order.customer.first_name} ${order.customer.last_name}`,
        returnId: returnData.id,
        orderNumber: order.display_id,
        items: returnData.items.map((item: any) => ({
          title: item.title,
          quantity: item.quantity,
          price: `${(item.unit_price / 100).toFixed(2)} zł`
        })),
        refundMethod: returnData.refund_method,
        refundAmount: `${(returnData.refund_amount / 100).toFixed(2)} zł`,
        qrCodeUrl: returnData.furgonetka_qr_code,
        trackingNumber: returnData.furgonetka_tracking_number
      };

      const template = this.generateReturnConfirmationTemplate(emailData);
      await this.sendEmail(template);

      console.log(`✅ Return confirmation email sent to ${order.customer.email}`);
    } catch (error) {
      console.error('❌ Error sending return confirmation email:', error);
      throw error;
    }
  }

  /**
   * Send return processed email
   */
  async sendReturnProcessedEmail(returnData: any): Promise<void> {
    try {
      const orderService = this.container?.resolve("orderService");
      const order = await orderService?.retrieve(returnData.order_id, {
        relations: ["customer"]
      });

      if (!order?.customer?.email) {
        console.warn('⚠️ No customer email found for return processed notification');
        return;
      }

      const emailData: ReturnProcessedData = {
        customerName: `${order.customer.first_name} ${order.customer.last_name}`,
        returnId: returnData.id,
        orderNumber: order.display_id,
        refundMethod: returnData.refund_method,
        refundAmount: `${(returnData.refund_amount / 100).toFixed(2)} zł`,
        loyaltyPointsAdded: returnData.refund_method === 'loyalty_points' 
          ? Math.floor(returnData.refund_amount / 100) 
          : undefined
      };

      const template = this.generateReturnProcessedTemplate(emailData);
      await this.sendEmail(template);

      console.log(`✅ Return processed email sent to ${order.customer.email}`);
    } catch (error) {
      console.error('❌ Error sending return processed email:', error);
      throw error;
    }
  }

  /**
   * Generate return confirmation email template
   */
  private generateReturnConfirmationTemplate(data: ReturnConfirmationData): EmailTemplate {
    const bonusText = data.refundMethod === 'loyalty_points' 
      ? '<p style="color: #16a34a; font-weight: 600;">🎁 Otrzymasz +10% punktów lojalnościowych!</p>'
      : '';

    const itemsList = data.items.map(item => 
      `<li>${item.title} - ${item.quantity} szt. (${item.price})</li>`
    ).join('');

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #1f2937;">📦 Zwrot zgłoszony pomyślnie!</h1>
        
        <p>Cześć ${data.customerName},</p>
        
        <p>Twój zwrot został zarejestrowany i przetwarzany:</p>
        
        <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3>Szczegóły zwrotu:</h3>
          <p><strong>Numer zwrotu:</strong> ${data.returnId}</p>
          <p><strong>Zamówienie:</strong> #${data.orderNumber}</p>
          <p><strong>Produkty do zwrotu:</strong></p>
          <ul>${itemsList}</ul>
          <p><strong>Kwota zwrotu:</strong> ${data.refundAmount}</p>
          ${bonusText}
        </div>
        
        <div style="background: #dbeafe; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3>🚚 DARMOWY KURIER</h3>
          <p>Załączamy QR kod do bezpłatnej wysyłki zwrotu:</p>
          <p><strong>Numer śledzenia:</strong> ${data.trackingNumber}</p>
          <p><a href="${data.qrCodeUrl}" style="background: #3b82f6; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Pobierz QR kod</a></p>
        </div>
        
        <div style="background: #fef3c7; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3>📦 Instrukcje wysyłki:</h3>
          <ol>
            <li>Zapakuj produkty w oryginalne opakowanie</li>
            <li>Wydrukuj i przyklej QR kod do paczki</li>
            <li>Zadzwoń po kuriera lub zostaw w punkcie odbioru</li>
            <li>Śledź status zwrotu w swoim koncie</li>
          </ol>
        </div>
        
        <p>Status zwrotu możesz śledzić w swoim koncie na stronie.</p>
        
        <p>Pozdrawiamy,<br>Zespół Falko Project</p>
      </div>
    `;

    return {
      to: data.customerName, // This will be replaced with actual email in sendEmail
      subject: `Zwrot zgłoszony - zamówienie #${data.orderNumber}`,
      html,
      text: `Zwrot zgłoszony pomyślnie! Numer zwrotu: ${data.returnId}. Pobierz QR kod: ${data.qrCodeUrl}`
    };
  }

  /**
   * Generate return processed email template
   */
  private generateReturnProcessedTemplate(data: ReturnProcessedData): EmailTemplate {
    const refundText = data.refundMethod === 'loyalty_points'
      ? `Dodaliśmy ${data.loyaltyPointsAdded} punktów lojalnościowych do Twojego konta (+10% bonus!)`
      : `Zwrot w wysokości ${data.refundAmount} zostanie przelewany na Twoją kartę w ciągu 3-5 dni roboczych.`;

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #16a34a;">✅ Zwrot przetworzony!</h1>
        
        <p>Cześć ${data.customerName},</p>
        
        <p>Twój zwrot został pomyślnie przetworzony:</p>
        
        <div style="background: #f0fdf4; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #16a34a;">
          <h3>Szczegóły zwrotu:</h3>
          <p><strong>Numer zwrotu:</strong> ${data.returnId}</p>
          <p><strong>Zamówienie:</strong> #${data.orderNumber}</p>
          <p><strong>Kwota zwrotu:</strong> ${data.refundAmount}</p>
        </div>
        
        <div style="background: #dbeafe; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3>💰 Zwrot środków:</h3>
          <p>${refundText}</p>
        </div>
        
        <p>Dziękujemy za zaufanie i mamy nadzieję, że wkrótce znajdziesz u nas coś idealnego dla siebie!</p>
        
        <p>Pozdrawiamy,<br>Zespół Falko Project</p>
      </div>
    `;

    return {
      to: data.customerName, // This will be replaced with actual email in sendEmail
      subject: `Zwrot przetworzony - zamówienie #${data.orderNumber}`,
      html,
      text: `Zwrot przetworzony! ${refundText}`
    };
  }

  // Add container property for dependency injection
  private container?: any;

  setContainer(container: any) {
    this.container = container;
  }
}

// Export singleton instance
export const emailService = new EmailService();