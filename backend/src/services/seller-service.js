import { v4 as uuidv4 } from 'uuid';
import { dbRun, dbGet, dbAll } from '../db/connection.js';

export async function getOrCreateSeller(userId, sellerData) {
  try {
    // Check if seller already exists for this user
    let seller = await dbGet('SELECT * FROM sellers WHERE user_id = ?', [userId]);

    if (seller) {
      // Update existing seller
      await dbRun(
        `UPDATE sellers SET
         business_name = ?, business_address = ?,
         updated_at = CURRENT_TIMESTAMP
         WHERE user_id = ?`,
        [sellerData.businessName, sellerData.businessAddress, userId]
      );
      return seller.id;
    } else {
      // Create new seller
      const sellerId = uuidv4();
      await dbRun(
        `INSERT INTO sellers (id, user_id, business_name, business_address, status)
         VALUES (?, ?, ?, ?, ?)`,
        [sellerId, userId, sellerData.businessName, sellerData.businessAddress, 'active']
      );
      return sellerId;
    }
  } catch (error) {
    console.error('Error in getOrCreateSeller:', error);
    throw error;
  }
}

export async function getSellerById(sellerId) {
  try {
    return await dbGet(
      `SELECT s.*, u.name, u.phone_number
       FROM sellers s
       JOIN users u ON s.user_id = u.id
       WHERE s.id = ?`,
      [sellerId]
    );
  } catch (error) {
    console.error('Error getting seller:', error);
    throw error;
  }
}

export async function getSellerByUserId(userId) {
  try {
    return await dbGet(
      `SELECT s.*, u.name, u.phone_number
       FROM sellers s
       JOIN users u ON s.user_id = u.id
       WHERE s.user_id = ?`,
      [userId]
    );
  } catch (error) {
    console.error('Error getting seller:', error);
    throw error;
  }
}

export async function getAllSellers(filters = {}) {
  try {
    let query = `
      SELECT s.*, u.name, u.phone_number,
             (SELECT COUNT(*) FROM shipments WHERE seller_id = s.id) as shipment_count
      FROM sellers s
      JOIN users u ON s.user_id = u.id
      WHERE 1=1
    `;
    const params = [];

    if (filters.status) {
      query += ' AND s.status = ?';
      params.push(filters.status);
    }

    query += ' ORDER BY s.created_at DESC';

    return await dbAll(query, params);
  } catch (error) {
    console.error('Error getting sellers:', error);
    throw error;
  }
}

export async function getSellerShipments(sellerId) {
  try {
    return await dbAll(
      `SELECT s.*, v.company_name as vendor_company
       FROM shipments s
       LEFT JOIN vendors v ON s.assigned_vendor_id = v.id
       WHERE s.seller_id = ?
       ORDER BY s.created_at DESC`,
      [sellerId]
    );
  } catch (error) {
    console.error('Error getting seller shipments:', error);
    throw error;
  }
}

export async function getSellerStats() {
  try {
    const stats = {};

    // Total sellers
    const total = await dbGet('SELECT COUNT(*) as count FROM sellers');
    stats.totalSellers = total?.count || 0;

    // Active sellers
    const active = await dbGet('SELECT COUNT(*) as count FROM sellers WHERE status = ?', ['active']);
    stats.activeSellers = active?.count || 0;

    // Total shipment requests
    const shipments = await dbGet('SELECT COUNT(*) as count FROM shipments');
    stats.totalShipments = shipments?.count || 0;

    // Active shipments
    const activeShipments = await dbGet(
      "SELECT COUNT(*) as count FROM shipments WHERE status IN (?, ?, ?)",
      ['in_transit', 'picked_up', 'vehicle_assigned']
    );
    stats.activeShipments = activeShipments?.count || 0;

    return stats;
  } catch (error) {
    console.error('Error getting seller stats:', error);
    throw error;
  }
}
