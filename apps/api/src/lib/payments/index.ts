import { env } from "../../config.js";
import type { PaymentGateway } from "./gateway.js";
import { stripeGateway } from "./stripe.js";
import { testGateway } from "./test.js";

export function getPaymentGateway(): PaymentGateway {
  switch (env.PAYMENT_GATEWAY) {
    case "stripe":
      return stripeGateway;
    case "test":
      if (env.NODE_ENV === "production") {
        throw new Error("TestGateway must not be used in production");
      }
      return testGateway;
  }
}
