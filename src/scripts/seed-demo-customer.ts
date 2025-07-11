import { ExecArgs } from "@medusajs/framework/types";
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils";

/**
 * Skrypt do utworzenia przykładowego użytkownika do testów
 * Hasło będzie ustawione przez system rejestracji frontendowej
 */
export default async function seedDemoCustomer({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  const customerModuleService = container.resolve(Modules.CUSTOMER);
  
  logger.info("Creating demo customer for testing...");

  const demoEmail = "demo@falkoproject.com";

  try {
    // Sprawdź czy klient już istnieje
    const existingCustomers = await customerModuleService.listCustomers({
      email: demoEmail,
    });

    if (existingCustomers.length === 0) {
      // Utwórz nowego klienta
      const customer = await customerModuleService.createCustomers({
        email: demoEmail,
        first_name: "Demo",
        last_name: "User",  
        phone: "+48 555 123 456",
      });
      
      logger.info(`✅ Created demo customer: ${customer.email}`);
    } else {
      logger.info(`Demo customer already exists: ${demoEmail}`);
    }

    logger.info("✅ Demo customer setup completed!");
    logger.info("");
    logger.info("🎯 How to test the authentication system:");
    logger.info("");
    logger.info("1. 📝 REGISTRATION TEST:");
    logger.info("   • Go to: http://localhost:3000/register");
    logger.info("   • Use email: demo@falkoproject.com");
    logger.info("   • Set password: DemoPassword123!");
    logger.info("   • Fill other fields and submit");
    logger.info("");
    logger.info("2. 🔐 LOGIN TEST:");
    logger.info("   • Go to: http://localhost:3000/login");
    logger.info("   • Use: demo@falkoproject.com / DemoPassword123!");
    logger.info("");
    logger.info("3. 🔄 PASSWORD RESET TEST:");
    logger.info("   • Go to: http://localhost:3000/forgot-password");
    logger.info("   • Use email: demo@falkoproject.com");
    logger.info("");
    logger.info("4. 🛒 SHOPPING TEST:");
    logger.info("   • Browse products");
    logger.info("   • Add to cart");
    logger.info("   • Checkout as logged in user");
    logger.info("");
    logger.info("Alternative test user (if needed):");
    logger.info("  Email: test@falkoproject.com (created by main seed script)");
    
  } catch (error) {
    logger.error("Failed to setup demo customer:", error);
  }

  logger.info("Finished setting up demo customer.");
}
