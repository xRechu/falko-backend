import { ExecArgs } from "@medusajs/framework/types";
import {
  ContainerRegistrationKeys,
  Modules,
} from "@medusajs/framework/utils";
import {
  createShippingOptionsWorkflow,
  createShippingProfilesWorkflow,
  createStockLocationsWorkflow,
  linkSalesChannelsToStockLocationWorkflow,
} from "@medusajs/medusa/core-flows";

export default async function seedPolandShipping({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  const link = container.resolve(ContainerRegistrationKeys.LINK);
  const query = container.resolve(ContainerRegistrationKeys.QUERY);
  const fulfillmentModuleService = container.resolve(Modules.FULFILLMENT);
  const salesChannelModuleService = container.resolve(Modules.SALES_CHANNEL);
  const regionModuleService = container.resolve(Modules.REGION);

  logger.info("Seeding Poland shipping data...");

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

  // Znajdź sales channel
  let defaultSalesChannel = await salesChannelModuleService.listSalesChannels({
    name: "Default Sales Channel",
  });

  if (!defaultSalesChannel.length) {
    logger.error("Default Sales Channel not found!");
    return;
  }

  // Sprawdź czy są fulfillment sets
  const fulfillmentSets = await fulfillmentModuleService.listFulfillmentSets();
  let fulfillmentSet = fulfillmentSets[0];

  if (!fulfillmentSet) {
    logger.info("Creating fulfillment set...");
    fulfillmentSet = await fulfillmentModuleService.createFulfillmentSets({
      name: "Default",
      type: "shipping",
    });
  }

  logger.info(`Using fulfillment set: ${fulfillmentSet.id}`);

  // Sprawdź czy są service zones dla Polish region
  if (!fulfillmentSet.service_zones?.length) {
    logger.info("Creating service zone for Poland...");
    
    const serviceZone = await fulfillmentModuleService.createServiceZones({
      name: "Poland Zone",
      fulfillment_set_id: fulfillmentSet.id,
      geo_zones: [
        {
          type: "country",
          country_code: "pl",
        },
      ],
    });

    logger.info(`Created service zone: ${serviceZone.id}`);
    
    // Refresh fulfillment set
    fulfillmentSet = await fulfillmentModuleService.retrieveFulfillmentSet(
      fulfillmentSet.id,
      { relations: ["service_zones"] }
    );
  }

  // Sprawdź czy są shipping profiles
  let shippingProfiles = await query.graph({
    entity: "shipping_profile",
    fields: ["id", "name"],
  });

  let shippingProfile = shippingProfiles.data[0];

  if (!shippingProfile) {
    logger.info("Creating shipping profile...");
    const { result: shippingProfileResult } = await createShippingProfilesWorkflow(container).run({
      input: {
        data: [
          {
            name: "Default",
            type: "default",
          },
        ],
      },
    });
    shippingProfile = shippingProfileResult[0] as any;
  }

  logger.info(`Using shipping profile: ${shippingProfile.id}`);

  // Sprawdź czy stock location istnieje
  let stockLocations = await query.graph({
    entity: "stock_location",
    fields: ["id", "name"],
  });

  let stockLocation = stockLocations.data[0];

  if (!stockLocation) {
    logger.info("Creating stock location...");
    const { result: stockLocationResult } = await createStockLocationsWorkflow(container).run({
      input: {
        locations: [
          {
            name: "Main Warehouse",
            address: {
              address_1: "Główna 1",
              city: "Warszawa",
              country_code: "pl",
              postal_code: "00-001",
            },
          },
        ],
      },
    });
    stockLocation = stockLocationResult[0] as any;

    // Link to sales channel
    await linkSalesChannelsToStockLocationWorkflow(container).run({
      input: {
        id: stockLocation.id,
        add: [defaultSalesChannel[0].id],
      },
    });
  }

  logger.info(`Using stock location: ${stockLocation.id}`);

  // Sprawdź czy już istnieją shipping options dla Polski
  const existingOptions = await query.graph({
    entity: "shipping_option",
    fields: ["id", "name"],
    filters: {
      service_zone_id: fulfillmentSet.service_zones[0].id,
    },
  });

  if (existingOptions.data.length > 0) {
    logger.info("Shipping options already exist for Poland region.");
    logger.info(`Found ${existingOptions.data.length} shipping options:`);
    existingOptions.data.forEach(opt => logger.info(`${opt.id}: ${opt.name}`));
    return;
  }

  // Stwórz shipping options dla Polski
  logger.info("Creating shipping options for Poland...");

  await createShippingOptionsWorkflow(container).run({
    input: [
      {
        name: "Furgonetka Paczkomat",
        price_type: "flat",
        provider_id: "manual_manual",
        service_zone_id: fulfillmentSet.service_zones[0].id,
        shipping_profile_id: shippingProfile.id,
        type: {
          label: "Paczkomat",
          description: "Dostawa do paczkomatu przez Furgonetka",
          code: "furgonetka_paczkomat",
        },
        prices: [
          {
            currency_code: "pln",
            amount: 999, // 9.99 PLN
          },
          {
            region_id: polandRegion.id,
            amount: 999,
          },
        ],
        rules: [
          {
            attribute: "enabled_in_store",
            value: "true",
            operator: "eq",
          },
          {
            attribute: "is_return",
            value: "false",
            operator: "eq",
          },
        ],
      },
      {
        name: "Furgonetka Punkt Odbioru",
        price_type: "flat",
        provider_id: "manual_manual",
        service_zone_id: fulfillmentSet.service_zones[0].id,
        shipping_profile_id: shippingProfile.id,
        type: {
          label: "Punkt Odbioru",
          description: "Dostawa do punktu odbioru przez Furgonetka",
          code: "furgonetka_pickup_point",
        },
        prices: [
          {
            currency_code: "pln",
            amount: 1099, // 10.99 PLN
          },
          {
            region_id: polandRegion.id,
            amount: 1099,
          },
        ],
        rules: [
          {
            attribute: "enabled_in_store",
            value: "true",
            operator: "eq",
          },
          {
            attribute: "is_return",
            value: "false",
            operator: "eq",
          },
        ],
      },
      {
        name: "Furgonetka Kurier",
        price_type: "flat",
        provider_id: "manual_manual",
        service_zone_id: fulfillmentSet.service_zones[0].id,
        shipping_profile_id: shippingProfile.id,
        type: {
          label: "Kurier",
          description: "Dostawa kurierem do domu przez Furgonetka",
          code: "furgonetka_courier",
        },
        prices: [
          {
            currency_code: "pln",
            amount: 1499, // 14.99 PLN
          },
          {
            region_id: polandRegion.id,
            amount: 1499,
          },
        ],
        rules: [
          {
            attribute: "enabled_in_store",
            value: "true",
            operator: "eq",
          },
          {
            attribute: "is_return",
            value: "false",
            operator: "eq",
          },
        ],
      },
      {
        name: "Odbiór Osobisty",
        price_type: "flat",
        provider_id: "manual_manual",
        service_zone_id: fulfillmentSet.service_zones[0].id,
        shipping_profile_id: shippingProfile.id,
        type: {
          label: "Odbiór Osobisty",
          description: "Bezpłatny odbiór osobisty w sklepie",
          code: "pickup",
        },
        prices: [
          {
            currency_code: "pln",
            amount: 0, // Bezpłatny
          },
          {
            region_id: polandRegion.id,
            amount: 0,
          },
        ],
        rules: [
          {
            attribute: "enabled_in_store",
            value: "true",
            operator: "eq",
          },
          {
            attribute: "is_return",
            value: "false",
            operator: "eq",
          },
        ],
      },
    ],
  });

  logger.info("✅ Finished seeding Poland shipping data.");
}
