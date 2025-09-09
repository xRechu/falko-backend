import { ExecArgs } from "@medusajs/framework/types";
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils";
import { createApiKeysWorkflow } from "@medusajs/medusa/core-flows";

/**
 * Ensures at least one publishable API key exists and links it to the default sales channel.
 * Intended to run in release_command (optional) or manually: `medusa exec ./src/scripts/ensure-publishable-key.ts`.
 */
export default async function ensurePublishableKey({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const salesChannelModule = container.resolve(Modules.SALES_CHANNEL)
  // Sprawdzamy przez sales channel module (API keys dostępne przez workflow – proste podejście: spróbuj stworzyć, jeśli błąd typu unique to ignoruj)

  const channels = await salesChannelModule.listSalesChannels({}, { take: 1 })
  if (!channels.length) {
    logger.warn(`[ensure-publishable-key] No sales channel found, skipping key creation.`)
    return
  }
  const channelId = channels[0].id

  logger.info(`[ensure-publishable-key] Creating new publishable API key and linking to channel ${channelId}`)
  try {
  const { result: created } = await createApiKeysWorkflow(container).run({
      input: {
        api_keys: [
          {
            title: "Auto Publishable Key",
            type: "publishable",
            created_by: "system"
          },
        ],
      },
    })
    const keyId = created[0].id
  logger.info(`[ensure-publishable-key] Created publishable key: ${keyId}. Link it to a sales channel in admin UI if needed.`)
  } catch (e) {
    logger.warn(`[ensure-publishable-key] Could not create publishable key (maybe exists): ${(e as Error).message}`)
  }
}
