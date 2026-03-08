import { getUncachableStripeClient } from './stripeClient';

async function createProducts() {
  const stripe = await getUncachableStripeClient();

  const existingProducts = await stripe.products.list({ limit: 100 });
  const existingNames = existingProducts.data.map(p => p.name);

  if (!existingNames.includes('HomeBase Agent Plan')) {
    const agentProduct = await stripe.products.create({
      name: 'HomeBase Agent Plan',
      description: 'Full access to HomeBase transaction management, client portal, communications, and more.',
      metadata: { role: 'agent', tier: 'standard' },
    });
    await stripe.prices.create({
      product: agentProduct.id,
      unit_amount: 4900,
      currency: 'usd',
      recurring: { interval: 'month' },
    });
    console.log('Created Agent Plan:', agentProduct.id);
  } else {
    console.log('Agent Plan already exists, skipping');
  }

  if (!existingNames.includes('HomeBase Vendor Plan')) {
    const vendorProduct = await stripe.products.create({
      name: 'HomeBase Vendor Plan',
      description: 'Vendor portal access with bid management, profile listing on HomeBase Pros marketplace.',
      metadata: { role: 'vendor', tier: 'standard' },
    });
    await stripe.prices.create({
      product: vendorProduct.id,
      unit_amount: 2900,
      currency: 'usd',
      recurring: { interval: 'month' },
    });
    console.log('Created Vendor Plan:', vendorProduct.id);
  } else {
    console.log('Vendor Plan already exists, skipping');
  }

  console.log('Done! Products will sync via webhook.');
}

createProducts().catch(console.error);
