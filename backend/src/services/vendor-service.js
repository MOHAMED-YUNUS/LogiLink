import { v4 as uuidv4 } from 'uuid';
import { dbRun, dbGet, dbAll } from '../db/connection.js';

export async function getOrCreateVendor(userId, vendorData) {
  try {
    // Check if vendor already exists for this user
    let vendor = await dbGet('SELECT * FROM vendors WHERE user_id = ?', [userId]);

    if (vendor) {
      // Update existing vendor
      await dbRun(
        `UPDATE vendors SET
         company_name = ?, vehicle_type = ?, load_capacity_tonnes = ?,
         registration_number = ?, operating_locations = ?, operating_routes = ?,
         availability = ?, quotation_per_km = ?, base_quotation = ?,
         updated_at = CURRENT_TIMESTAMP
         WHERE user_id = ?`,
        [
          vendorData.companyName,
          vendorData.vehicleType,
          vendorData.loadCapacity,
          vendorData.registrationNumber,
          vendorData.operatingLocations,
          vendorData.operatingRoutes,
          vendorData.availability,
          vendorData.quotationPerKm,
          vendorData.baseQuotation,
          userId,
        ]
      );
      return vendor.id;
    } else {
      // Create new vendor
      const vendorId = uuidv4();
      await dbRun(
        `INSERT INTO vendors (
          id, user_id, company_name, vehicle_type, load_capacity_tonnes,
          registration_number, operating_locations, operating_routes,
          availability, quotation_per_km, base_quotation, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          vendorId,
          userId,
          vendorData.companyName,
          vendorData.vehicleType,
          vendorData.loadCapacity,
          vendorData.registrationNumber,
          vendorData.operatingLocations,
          vendorData.operatingRoutes,
          vendorData.availability,
          vendorData.quotationPerKm,
          vendorData.baseQuotation,
          'active',
        ]
      );
      return vendorId;
    }
  } catch (error) {
    console.error('Error in getOrCreateVendor:', error);
    throw error;
  }
}

export async function getVendorById(vendorId) {
  try {
    return await dbGet(
      `SELECT v.*, u.name, u.phone_number
       FROM vendors v
       JOIN users u ON v.user_id = u.id
       WHERE v.id = ?`,
      [vendorId]
    );
  } catch (error) {
    console.error('Error getting vendor:', error);
    throw error;
  }
}

export async function getVendorByUserId(userId) {
  try {
    return await dbGet(
      `SELECT v.*, u.name, u.phone_number
       FROM vendors v
       JOIN users u ON v.user_id = u.id
       WHERE v.user_id = ?`,
      [userId]
    );
  } catch (error) {
    console.error('Error getting vendor:', error);
    throw error;
  }
}

export async function getAllVendors(filters = {}) {
  try {
    let query = `
      SELECT v.*, u.name, u.phone_number
      FROM vendors v
      JOIN users u ON v.user_id = u.id
      WHERE 1=1
    `;
    const params = [];

    if (filters.status) {
      query += ' AND v.status = ?';
      params.push(filters.status);
    }

    if (filters.vehicleType) {
      query += ' AND v.vehicle_type LIKE ?';
      params.push(`%${filters.vehicleType}%`);
    }

    if (filters.route) {
      query += ' AND (v.operating_routes LIKE ? OR v.operating_locations LIKE ?)';
      params.push(`%${filters.route}%`, `%${filters.route}%`);
    }

    query += ' ORDER BY v.created_at DESC';

    return await dbAll(query, params);
  } catch (error) {
    console.error('Error getting vendors:', error);
    throw error;
  }
}

export async function submitQuotation(shipmentId, vendorId, amount) {
  try {
    const quotationId = uuidv4();

    // Check if quotation already exists
    const existing = await dbGet(
      'SELECT * FROM quotations WHERE shipment_id = ? AND vendor_id = ?',
      [shipmentId, vendorId]
    );

    if (existing) {
      // Update existing quotation
      await dbRun(
        'UPDATE quotations SET amount = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [amount, existing.id]
      );
      return existing.id;
    }

    // Create new quotation
    await dbRun(
      `INSERT INTO quotations (id, shipment_id, vendor_id, amount, status)
       VALUES (?, ?, ?, ?, ?)`,
      [quotationId, shipmentId, vendorId, amount, 'pending']
    );

    // Update shipment status to quote_received if not already
    await dbRun(
      'UPDATE shipments SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND status = ?',
      ['quote_received', shipmentId, 'finding_vendor']
    );

    return quotationId;
  } catch (error) {
    console.error('Error submitting quotation:', error);
    throw error;
  }
}

export async function getQuotationsForShipment(shipmentId) {
  try {
    return await dbAll(
      `SELECT q.*, v.company_name, v.load_capacity_tonnes, v.vehicle_type,
              u.name as vendor_name, u.phone_number as vendor_phone
       FROM quotations q
       JOIN vendors v ON q.vendor_id = v.id
       JOIN users u ON v.user_id = u.id
       WHERE q.shipment_id = ?
       ORDER BY q.amount ASC`,
      [shipmentId]
    );
  } catch (error) {
    console.error('Error getting quotations:', error);
    throw error;
  }
}

export async function acceptQuotation(quotationId, shipmentId) {
  try {
    // Update quotation status
    const quotation = await dbGet('SELECT * FROM quotations WHERE id = ?', [quotationId]);

    await dbRun(
      'UPDATE quotations SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      ['accepted', quotationId]
    );

    // Reject other quotations for same shipment
    await dbRun(
      'UPDATE quotations SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE shipment_id = ? AND id != ?',
      ['rejected', shipmentId, quotationId]
    );

    // Update shipment
    await dbRun(
      `UPDATE shipments
       SET assigned_vendor_id = ?, status = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [quotation.vendor_id, 'booking_confirmed', shipmentId]
    );

    return true;
  } catch (error) {
    console.error('Error accepting quotation:', error);
    throw error;
  }
}

export async function rejectQuotation(quotationId) {
  try {
    await dbRun(
      'UPDATE quotations SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      ['rejected', quotationId]
    );
    return true;
  } catch (error) {
    console.error('Error rejecting quotation:', error);
    throw error;
  }
}

export async function getVendorStats() {
  try {
    const stats = {};

    // Active vendors
    const active = await dbGet('SELECT COUNT(*) as count FROM vendors WHERE status = ?', ['active']);
    stats.activeVendors = active?.count || 0;

    // Total quotations
    const quotations = await dbGet('SELECT COUNT(*) as count FROM quotations');
    stats.totalQuotations = quotations?.count || 0;

    // Accepted quotations
    const accepted = await dbGet("SELECT COUNT(*) as count FROM quotations WHERE status = ?", [
      'accepted',
    ]);
    stats.acceptedQuotations = accepted?.count || 0;

    // Pending quotations
    const pending = await dbGet("SELECT COUNT(*) as count FROM quotations WHERE status = ?", [
      'pending',
    ]);
    stats.pendingQuotations = pending?.count || 0;

    return stats;
  } catch (error) {
    console.error('Error getting vendor stats:', error);
    throw error;
  }
}
