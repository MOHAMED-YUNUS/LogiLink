import { v4 as uuidv4 } from 'uuid';
import { dbRun, dbGet, dbAll } from '../db/connection.js';

function generateReferenceNumber() {
  const prefix = 'LL';
  const timestamp = Date.now().toString().slice(-6);
  const random = Math.floor(Math.random() * 1000)
    .toString()
    .padStart(3, '0');
  return `${prefix}-${timestamp}${random}`;
}

export async function createShipment(sellerData) {
  try {
    const shipmentId = uuidv4();
    const referenceNumber = generateReferenceNumber();

    const {
      sellerId,
      pickupLocation,
      deliveryLocation,
      goodsDescription,
      quantity,
      weight,
      dimensions,
      pickupDate,
      pickupTime,
      vehicleTypeRequired,
      specialRequirements,
    } = sellerData;

    await dbRun(
      `INSERT INTO shipments (
        id, reference_number, seller_id, pickup_location, delivery_location,
        goods_description, quantity, weight_tonnes, dimensions, pickup_date,
        pickup_time, vehicle_type_required, special_requirements, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        shipmentId,
        referenceNumber,
        sellerId,
        pickupLocation,
        deliveryLocation,
        goodsDescription,
        quantity,
        weight,
        dimensions,
        pickupDate,
        pickupTime,
        vehicleTypeRequired,
        specialRequirements,
        'request_received',
      ]
    );

    // Log activity
    await logShipmentActivity(shipmentId, 'request_received', 'Shipment request received from seller', null);

    return { shipmentId, referenceNumber };
  } catch (error) {
    console.error('Error creating shipment:', error);
    throw error;
  }
}

export async function getShipmentByReference(referenceNumber) {
  try {
    return await dbGet(
      `SELECT s.*, u.name as seller_name, u.phone_number as seller_phone
       FROM shipments s
       JOIN sellers sel ON s.seller_id = sel.id
       JOIN users u ON sel.user_id = u.id
       WHERE s.reference_number = ?`,
      [referenceNumber]
    );
  } catch (error) {
    console.error('Error getting shipment:', error);
    throw error;
  }
}

export async function getShipmentById(shipmentId) {
  try {
    return await dbGet(
      `SELECT s.*, u.name as seller_name, u.phone_number as seller_phone
       FROM shipments s
       JOIN sellers sel ON s.seller_id = sel.id
       JOIN users u ON sel.user_id = u.id
       WHERE s.id = ?`,
      [shipmentId]
    );
  } catch (error) {
    console.error('Error getting shipment:', error);
    throw error;
  }
}

export async function updateShipmentStatus(shipmentId, newStatus) {
  try {
    await dbRun(
      'UPDATE shipments SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [newStatus, shipmentId]
    );

    // Log activity
    await logShipmentActivity(shipmentId, 'status_updated', `Status changed to ${newStatus}`, newStatus);

    return true;
  } catch (error) {
    console.error('Error updating shipment status:', error);
    throw error;
  }
}

export async function getAllShipments(filters = {}) {
  try {
    let query = `
      SELECT s.*, u.name as seller_name, u.phone_number as seller_phone,
             v.company_name as vendor_company, v.user_id as vendor_user_id
      FROM shipments s
      JOIN sellers sel ON s.seller_id = sel.id
      JOIN users u ON sel.user_id = u.id
      LEFT JOIN vendors v ON s.assigned_vendor_id = v.id
      WHERE 1=1
    `;
    const params = [];

    if (filters.status) {
      query += ' AND s.status = ?';
      params.push(filters.status);
    }

    if (filters.sellerId) {
      query += ' AND s.seller_id = ?';
      params.push(filters.sellerId);
    }

    if (filters.vendorId) {
      query += ' AND s.assigned_vendor_id = ?';
      params.push(filters.vendorId);
    }

    query += ' ORDER BY s.created_at DESC';

    return await dbAll(query, params);
  } catch (error) {
    console.error('Error getting shipments:', error);
    throw error;
  }
}

export async function assignVendorToShipment(shipmentId, vendorId) {
  try {
    await dbRun(
      'UPDATE shipments SET assigned_vendor_id = ?, status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [vendorId, 'vehicle_assigned', shipmentId]
    );

    await logShipmentActivity(shipmentId, 'vendor_assigned', 'Vendor has been assigned to shipment', null);

    return true;
  } catch (error) {
    console.error('Error assigning vendor:', error);
    throw error;
  }
}

export async function logShipmentActivity(shipmentId, activityType, description, statusChangedTo) {
  try {
    const activityId = uuidv4();
    await dbRun(
      `INSERT INTO shipment_activities (id, shipment_id, activity_type, description, status_changed_to)
       VALUES (?, ?, ?, ?, ?)`,
      [activityId, shipmentId, activityType, description, statusChangedTo]
    );
  } catch (error) {
    console.error('Error logging activity:', error);
  }
}

export async function getShipmentActivities(shipmentId) {
  try {
    return await dbAll(
      'SELECT * FROM shipment_activities WHERE shipment_id = ? ORDER BY created_at DESC',
      [shipmentId]
    );
  } catch (error) {
    console.error('Error getting activities:', error);
    throw error;
  }
}

export async function getDashboardStats() {
  try {
    const stats = {};

    // Total sellers
    const sellers = await dbGet('SELECT COUNT(*) as count FROM sellers');
    stats.totalSellers = sellers?.count || 0;

    // Total vendors
    const vendors = await dbGet('SELECT COUNT(*) as count FROM vendors WHERE status = ?', ['active']);
    stats.totalVendors = vendors?.count || 0;

    // Total shipments
    const shipments = await dbGet('SELECT COUNT(*) as count FROM shipments');
    stats.totalShipments = shipments?.count || 0;

    // Pending shipments
    const pending = await dbGet('SELECT COUNT(*) as count FROM shipments WHERE status IN (?, ?)', [
      'request_received',
      'finding_vendor',
    ]);
    stats.pendingShipments = pending?.count || 0;

    // Confirmed bookings
    const confirmed = await dbGet('SELECT COUNT(*) as count FROM shipments WHERE status = ?', [
      'booking_confirmed',
    ]);
    stats.confirmedBookings = confirmed?.count || 0;

    // Active shipments (in transit)
    const active = await dbGet('SELECT COUNT(*) as count FROM shipments WHERE status = ?', [
      'in_transit',
    ]);
    stats.activeShipments = active?.count || 0;

    // Delivered shipments
    const delivered = await dbGet('SELECT COUNT(*) as count FROM shipments WHERE status = ?', [
      'delivered',
    ]);
    stats.deliveredShipments = delivered?.count || 0;

    return stats;
  } catch (error) {
    console.error('Error getting dashboard stats:', error);
    throw error;
  }
}

export async function findMatchingVendors(shipmentData) {
  try {
    const {
      pickupLocation,
      deliveryLocation,
      weight_tonnes,
      vehicleTypeRequired,
    } = shipmentData;

    // Simple rule-based matching
    let query = `
      SELECT v.*, u.name as vendor_name, u.phone_number as vendor_phone
      FROM vendors v
      JOIN users u ON v.user_id = u.id
      WHERE v.status = 'active'
      AND v.load_capacity_tonnes >= ?
    `;
    const params = [weight_tonnes];

    // Match by vehicle type if specified
    if (vehicleTypeRequired) {
      query += ' AND v.vehicle_type LIKE ?';
      params.push(`%${vehicleTypeRequired}%`);
    }

    // Match by location (simple substring match for demo)
    if (pickupLocation && deliveryLocation) {
      query += ' AND (v.operating_routes LIKE ? OR v.operating_locations LIKE ?)';
      params.push(`%${pickupLocation}%`, `%${deliveryLocation}%`);
    }

    query += ' ORDER BY v.load_capacity_tonnes DESC LIMIT 10';

    return await dbAll(query, params);
  } catch (error) {
    console.error('Error finding matching vendors:', error);
    throw error;
  }
}
