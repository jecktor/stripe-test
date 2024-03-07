import "dotenv/config";

interface Plans {
  [key: number]: Plan;
}

export type Plan = {
  name: string;
  price: string;
};

export const plans: Plans = {
  0: {
    name: "Basic",
    price: process.env.STRIPE_PLAN_BASIC || "",
  },
  1: {
    name: "Pro",
    price: process.env.STRIPE_PLAN_PRO || "",
  },
};
