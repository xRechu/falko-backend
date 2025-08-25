/*
 * Copyright 2025 Falko Team
 *
 * MIT License
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { MedusaError } from "@medusajs/utils";

type FurgonetkaAuthResponse = {
  token: string,
  expiresIn: number
}

type FurgonetkaShipmentData = {
  senderAddress: any;
  receiverAddress: any;
  packages: any[];
  service: string;
  additionalServices?: any[];
}

type FurgonetkaShipmentResponse = {
  id: string;
  trackingNumber: string;
  labelUrl: string;
  status: string;
}

export default class FurgonetkaAuthService {

  protected readonly options: any;
  private readonly logger: any;
  private readonly apiKey: string;
  private readonly apiUrl: string;

  constructor(
    container,
    options
  ) {
    this.options = options;
    this.logger = container.logger || console;
    this.apiUrl = options.apiUrl || 'https://api.furgonetka.pl';
    
    if (options.apiKey) {
      this.apiKey = options.apiKey;
    } else {
      throw new MedusaError(
        MedusaError.Types.NOT_FOUND,
        `Furgonetka API key is not set`
      )
    }
  }

  /**
   * Generates OAuth token for Furgonetka API
   */
  async generateToken() : Promise<FurgonetkaAuthResponse> {
    const url = `${this.apiUrl}/oauth/token`;
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          grant_type: "client_credentials",
          scope: "shipping"
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      return {
        token: result.access_token,
        expiresIn: result.expires_in
      };
    } catch (error) {
      this.logger.error('Error fetching Furgonetka authorization token', error);
      throw error;
    }
  }

  /**
   * Creates shipment in Furgonetka API
   */
  async createShipment(shipmentData: FurgonetkaShipmentData): Promise<FurgonetkaShipmentResponse> {
    const authToken = await this.generateToken();
    const url = `${this.apiUrl}/api/v1/shipments`;
    
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken.token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(shipmentData)
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      
      return {
        id: result.id,
        trackingNumber: result.tracking_number,
        labelUrl: result.label_url,
        status: result.status
      };
    } catch (error) {
      this.logger.error('Error creating Furgonetka shipment', error);
      throw error;
    }
  }

  /**
   * Gets tracking information for shipment
   */
  async trackShipment(trackingNumber: string): Promise<any> {
    const authToken = await this.generateToken();
    const url = `${this.apiUrl}/api/v1/shipments/track/${trackingNumber}`;
    
    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${authToken.token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      this.logger.error('Error tracking Furgonetka shipment', error);
      throw error;
    }
  }

  /**
   * Downloads shipping label as PDF
   */
  async downloadLabel(labelId: string): Promise<Buffer> {
    const authToken = await this.generateToken();
    const url = `${this.apiUrl}/api/v1/labels/${labelId}/pdf`;
    
    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${authToken.token}`
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return Buffer.from(await response.arrayBuffer());
    } catch (error) {
      this.logger.error('Error downloading Furgonetka label', error);
      throw error;
    }
  }
}
