import { dbRun } from './connection.js';
import { FAQ_DATABASE } from './knowledge-base.js';
import { v4 as uuidv4 } from 'uuid';

export async function seedDatabase() {
  try {
    console.log('Starting database seed...');

    // Check if FAQ already seeded
    const { dbGet } = await import('./connection.js');
    const existing = await dbGet('SELECT COUNT(*) as count FROM knowledge_base');

    if (existing && existing.count > 0) {
      console.log(`✓ Knowledge base already contains ${existing.count} entries, skipping seed`);
      return;
    }

    // Seed FAQ
    for (const faq of FAQ_DATABASE) {
      await dbRun(
        `INSERT INTO knowledge_base (id, question, answer, category, keywords)
         VALUES (?, ?, ?, ?, ?)`,
        [faq.id, faq.question, faq.answer, faq.category, faq.keywords.join(', ')]
      );
    }

    console.log(`✓ Seeded ${FAQ_DATABASE.length} FAQ entries`);

    // Seed sample data for demo
    const sellerId = uuidv4();
    const sellerUserId = uuidv4();
    const vendorId = uuidv4();
    const vendorUserId = uuidv4();

    // Sample seller
    await dbRun(
      `INSERT INTO users (id, phone_number, name, user_type)
       VALUES (?, ?, ?, ?)`,
      [sellerUserId, '+91 9876543210', 'Ramesh Kumar', 'seller']
    );

    await dbRun(
      `INSERT INTO sellers (id, user_id, business_name, business_address)
       VALUES (?, ?, ?, ?)`,
      [sellerId, sellerUserId, 'Kumar Textiles', '123 Main Street, Chennai']
    );

    // Sample vendor
    await dbRun(
      `INSERT INTO users (id, phone_number, name, user_type)
       VALUES (?, ?, ?, ?)`,
      [vendorUserId, '+91 9876543211', 'Arjun Transport', 'vendor']
    );

    await dbRun(
      `INSERT INTO vendors (id, user_id, company_name, vehicle_type, load_capacity_tonnes, operating_routes, availability, quotation_per_km)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [vendorId, vendorUserId, 'Arjun Transport Services', '14-foot truck', 4.5, 'Chennai to Bangalore', 'Available', 150]
    );

    console.log('✓ Seeded sample seller and vendor data');
  } catch (error) {
    console.error('✗ Seed failed:', error.message);
    throw error;
  }
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  seedDatabase().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
