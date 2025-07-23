import { ExecArgs } from "@medusajs/framework/types";
import {
  ContainerRegistrationKeys,
  Modules,
  RuleOperator,
} from "@medusajs/framework/utils";
import {
  createShippingOptionsWorkflow,
} from "@medusajs/medusa/core-flows";

export default async function seedDetailedShipping({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  const fulfillmentModuleService = container.resolve(Modules.FULFILLMENT);
  const regionModuleService = container.resolve(Modules.REGION);
  
  logger.info("Seeding detailed shipping options for specific providers...");

  // Znajdź region Polski
  const regions = await regionModuleService.listRegions({
    name: "Polska"
  });

  if (!regions.length) {
    logger.error("Poland region not found!");
    return;
  }

  const polandRegion = regions[0];
  logger.info(`Found Poland region: ${polandRegion.id}`);

  // Znajdź fulfillment set
  const fulfillmentSets = await fulfillmentModuleService.listFulfillmentSets();
  let fulfillmentSet = fulfillmentSets[0];

  if (!fulfillmentSet) {
    logger.error("No fulfillment sets found!");
    return;
  }

  logger.info(`Using fulfillment set: ${fulfillmentSet.id}`);

  // Sprawdź istniejące service zones
  const serviceZones = await fulfillmentModuleService.listServiceZones();

  let serviceZone = serviceZones.find(sz => sz.name === "Poland");
  
  if (!serviceZone) {
    logger.error("Poland service zone not found! Please run seed-poland-shipping first.");
    return;
  }

  logger.info(`Using service zone: ${serviceZone.id}`);

  // Znajdź shipping profile
  const shippingProfiles = await fulfillmentModuleService.listShippingProfiles({
    type: "default"
  });

  if (!shippingProfiles.length) {
    logger.error("No default shipping profile found!");
    return;
  }

  const shippingProfile = shippingProfiles[0];
  logger.info(`Using shipping profile: ${shippingProfile.id}`);

  logger.info("Creating detailed shipping options for specific providers...");

  // Create shipping options workflow
  const createShippingOptionsWorkflow = await import("@medusajs/core-flows").then(
    mod => mod.createShippingOptionsWorkflow
  )

  // Define detailed shipping options for each provider
  const detailedShippingOptions = [
    // InPost Paczkomaty
    {
      name: "InPost Paczkomaty",
      service_zone_id: serviceZone.id,
      shipping_profile_id: shippingProfile.id,
      provider_id: "manual_manual",
      price_type: "flat" as const,
      type: {
        label: "InPost Paczkomaty",
        description: "Odbiór w Paczkomacie InPost 24/7",
        code: "inpost_paczkomat"
      },
      prices: [
        {
          currency_code: "pln",
          amount: 1299, // 12.99 PLN
        },
        {
          currency_code: "pln",
          amount: 1299,
          rules: [
            {
              attribute: "region_id",
              operator: RuleOperator.EQ,
              value: polandRegion.id,
            },
          ],
        },
      ],
      rules: [
        {
          attribute: "enabled_in_store",
          operator: RuleOperator.EQ,
          value: "true",
        },
        {
          attribute: "is_return",
          operator: RuleOperator.EQ,
          value: "false",
        },
      ],
    },
    // DHL ServicePoint
    {
      name: "DHL ServicePoint",
      service_zone_id: serviceZone.id,
      shipping_profile_id: shippingProfile.id,
      provider_id: "manual_manual",
      price_type: "flat" as const,
      type: {
        label: "DHL ServicePoint",
        description: "Odbiór w punkcie DHL",
        code: "dhl_servicepoint"
      },
      prices: [
        {
          currency_code: "pln",
          amount: 1399, // 13.99 PLN
        },
        {
          currency_code: "pln",
          amount: 1399,
          rules: [
            {
              attribute: "region_id",
              operator: RuleOperator.EQ,
              value: polandRegion.id,
            },
          ],
        },
      ],
      rules: [
        {
          attribute: "enabled_in_store",
          operator: RuleOperator.EQ,
          value: "true",
        },
        {
          attribute: "is_return",
          operator: RuleOperator.EQ,
          value: "false",
        },
      ],
    },
    // DPD Classic Courier
    {
      name: "DPD Classic Kurier",
      service_zone_id: serviceZone.id,
      shipping_profile_id: shippingProfile.id,
      provider_id: "manual_manual",
      price_type: "flat" as const,
      type: {
        label: "DPD Classic",
        description: "Dostawa kurierska DPD do drzwi",
        code: "dpd_classic"
      },
      prices: [
        {
          currency_code: "pln",
          amount: 1599, // 15.99 PLN
        },
        {
          currency_code: "pln",
          amount: 1599,
          rules: [
            {
              attribute: "region_id",
              operator: RuleOperator.EQ,
              value: polandRegion.id,
            },
          ],
        },
      ],
      rules: [
        {
          attribute: "enabled_in_store",
          operator: RuleOperator.EQ,
          value: "true",
        },
        {
          attribute: "is_return",
          operator: RuleOperator.EQ,
          value: "false",
        },
      ],
    },
    // UPS Standard
    {
      name: "UPS Standard",
      service_zone_id: serviceZone.id,
      shipping_profile_id: shippingProfile.id,
      provider_id: "manual_manual",
      price_type: "flat" as const,
      type: {
        label: "UPS Standard",
        description: "Dostawa kurierska UPS",
        code: "ups_standard"
      },
      prices: [
        {
          currency_code: "pln",
          amount: 1699, // 16.99 PLN
        },
        {
          currency_code: "pln",
          amount: 1699,
          rules: [
            {
              attribute: "region_id",
              operator: RuleOperator.EQ,
              value: polandRegion.id,
            },
          ],
        },
      ],
      rules: [
        {
          attribute: "enabled_in_store",
          operator: RuleOperator.EQ,
          value: "true",
        },
        {
          attribute: "is_return",
          operator: RuleOperator.EQ,
          value: "false",
        },
      ],
    },
    // GLS Punkty Odbioru
    {
      name: "GLS Punkty Odbioru",
      service_zone_id: serviceZone.id,
      shipping_profile_id: shippingProfile.id,
      provider_id: "manual_manual",
      price_type: "flat" as const,
      type: {
        label: "GLS Punkt Odbioru",
        description: "Odbiór w punkcie GLS",
        code: "gls_pickup_point"
      },
      prices: [
        {
          currency_code: "pln",
          amount: 1199, // 11.99 PLN
        },
        {
          currency_code: "pln",
          amount: 1199,
          rules: [
            {
              attribute: "region_id",
              operator: RuleOperator.EQ,
              value: polandRegion.id,
            },
          ],
        },
      ],
      rules: [
        {
          attribute: "enabled_in_store",
          operator: RuleOperator.EQ,
          value: "true",
        },
        {
          attribute: "is_return",
          operator: RuleOperator.EQ,
          value: "false",
        },
      ],
    },
  ]

  // Create shipping options
  const { result: shippingOptionsResult } = await createShippingOptionsWorkflow(container).run({
    input: detailedShippingOptions,
  });

  logger.info("✅ Finished seeding detailed shipping options.");
}
