import { ExecArgs } from "@medusajs/framework/types";
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils";

/**
 * Skrypt do utworzenia test customer z pełną autoryzacją
 * Tworzy zarówno customer entity jak i auth identity
 */
export default async function createTestCustomerWithAuth({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  const customerModuleService = container.resolve(Modules.CUSTOMER);
  const authModuleService = container.resolve(Modules.AUTH);
  
  logger.info("Creating test customer with auth identity...");

  const testEmail = "test@test.com";
  const testPassword = "TestPass123";

  try {
    // 1. Sprawdź czy customer już istnieje
    const existingCustomers = await customerModuleService.listCustomers({
      email: testEmail,
    });

    let customer;
    if (existingCustomers.length === 0) {
      // 2. Utwórz customer entity
      customer = await customerModuleService.createCustomers({
        email: testEmail,
        first_name: "Test",
        last_name: "User",
        phone: "+48 123 456 789",
      });
      
      logger.info(`✅ Created customer entity: ${customer.email} (ID: ${customer.id})`);
    } else {
      customer = existingCustomers[0];
      logger.info(`Customer already exists: ${testEmail} (ID: ${customer.id})`);
    }

    // 3. Sprawdź czy auth identity już istnieje
    try {
      const existingAuth = await authModuleService.retrieveAuthIdentity({
        entity_id: testEmail,
        provider: "emailpass",
      });
      
      if (existingAuth) {
        logger.info(`Auth identity already exists for: ${testEmail}`);
      }
    } catch (error) {
      // Auth identity nie istnieje, utwórz nową
      logger.info("Creating auth identity...");
      
      const authIdentity = await authModuleService.createAuthIdentities({
        entity_id: testEmail,
        provider: "emailpass",
        provider_metadata: {
          email: testEmail,
          password_hash: testPassword, // W prawdziwej implementacji powinno być zahashowane
        },
        user_metadata: {},
        app_metadata: {
          customer_id: customer.id,
        },
      });
      
      logger.info(`✅ Created auth identity: ${authIdentity.id}`);
    }

    logger.info("✅ Test customer with auth completed!");
    logger.info("");
    logger.info("🎯 Test credentials:");
    logger.info(`   Email: ${testEmail}`);
    logger.info(`   Password: ${testPassword}`);
    logger.info("");
    logger.info("🔗 Customer ID: " + customer.id);
    logger.info("");
    logger.info("Now you can test login on: http://localhost:3000/login");

  } catch (error) {
    logger.error("❌ Error creating test customer with auth:", error);
    throw error;
  }
}
