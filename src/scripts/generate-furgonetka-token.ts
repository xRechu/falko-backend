/**
 * Script do generowania tokenu autoryzacyjnego dla Furgonetka.pl
 */

import { randomBytes } from "crypto";

function generateFurgonetkaToken(): string {
  // Generuj 32-bajtowy losowy token
  const token = randomBytes(32).toString('hex');
  return `furgonetka_${token}`;
}

function generateApiKey(): string {
  // Generuj 16-bajtowy API key
  const key = randomBytes(16).toString('hex');
  return `fk_${key}`;
}

console.log("🔑 Tokeny dla integracji Furgonetka.pl:");
console.log("================================");
console.log("Authorization Token:", generateFurgonetkaToken());
console.log("API Key:", generateApiKey());
console.log("================================");
console.log("💡 Dodaj te wartości do zmiennych środowiskowych:");
console.log("FURGONETKA_AUTH_TOKEN=<Authorization Token>");
console.log("FURGONETKA_API_KEY=<API Key>");
