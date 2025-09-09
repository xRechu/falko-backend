/*
 * Copyright 2025 Falko Team
 *
 * MIT License
 */

import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import FurgonetkaAuthService from "../../../../../services/furgonetkaAuth";

export const POST = async (
  req: MedusaRequest,
  res: MedusaResponse
) => {
  try {
    const furgonetkaAuthService = req.scope.resolve<FurgonetkaAuthService>(
      "furgonetkaAuthService"
    );
    
    const { orderData } = (req.body as { orderData: any });
    
    // Map Medusa order to Furgonetka shipment format
    const shipmentData = {
      senderAddress: {
        name: "Falko Store",
        street: "ul. Główna 1",
        city: "Warszawa",
        postalCode: "00-001",
        country: "PL"
      },
      receiverAddress: {
        name: `${orderData.shipping_address.first_name} ${orderData.shipping_address.last_name}`,
        street: orderData.shipping_address.address_1,
        city: orderData.shipping_address.city,
        postalCode: orderData.shipping_address.postal_code,
        country: orderData.shipping_address.country_code
      },
      packages: orderData.items.map(item => ({
        weight: item.variant.weight || 500, // default 500g
        description: item.variant.product.title
      })),
      service: "inpost_paczkomaty" // default service
    };
    
    const result = await furgonetkaAuthService.createShipment(shipmentData);
    res.status(200).json(result); 
  } catch (e) {
    res.status(400).json({
        message: e.message
    })
  }
}
