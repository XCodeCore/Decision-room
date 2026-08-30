import type { Decision } from "./types";

export const demoDecision = (): Decision => ({
  id: "apartment-demo",
  title: "Choose My Next Apartment",
  updatedAt: new Date().toISOString(),
  criteria: [
    { id: "rent", name: "Annual rent", weight: 24, type: "cost", unit: "₦" },
    { id: "security", name: "Security", weight: 20, type: "benefit", unit: "/10" },
    { id: "location", name: "Location convenience", weight: 17, type: "benefit", unit: "/10" },
    { id: "power", name: "Power reliability", weight: 14, type: "benefit", unit: "/10" },
    { id: "internet", name: "Internet quality", weight: 10, type: "benefit", unit: "/10" },
    { id: "space", name: "Space", weight: 8, type: "benefit", unit: "m²" },
    { id: "transport", name: "Transportation", weight: 7, type: "benefit", unit: "/10" },
  ],
  options: [
    { id: "lekki", name: "Lekki Heights", values: { rent: 4200000, security: 9, location: 7, power: 8, internet: 9, space: 82, transport: 6 } },
    { id: "yaba", name: "Yaba Central", values: { rent: 3100000, security: 7, location: 9, power: 7, internet: 9, space: 61, transport: 9 } },
    { id: "ikeja", name: "Ikeja Gardens", values: { rent: 3500000, security: 8, location: 8, power: 9, internet: 8, space: 74, transport: 8 } },
  ],
});
