import type { FastifyInstance } from "fastify";
import { registerAuthRoutes } from "./auth.routes.js";
import { registerPublicRoutes } from "./public.routes.js";
import { registerPatientRoutes } from "./patient.routes.js";
import { registerProviderRoutes } from "./provider.routes.js";
import { registerAdminRoutes } from "./admin.routes.js";
import { registerWebhookRoutes } from "./webhooks.routes.js";

export async function registerRoutes(app: FastifyInstance) {
  await registerAuthRoutes(app);
  await registerPublicRoutes(app);
  await registerPatientRoutes(app);
  await registerProviderRoutes(app);
  await registerAdminRoutes(app);
  await registerWebhookRoutes(app);
}
