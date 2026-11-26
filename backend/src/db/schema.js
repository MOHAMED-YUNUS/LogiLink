export const SCHEMA = `
-- Users Table
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  phone_number TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  user_type TEXT CHECK(user_type IN ('seller', 'vendor', 'unknown')) DEFAULT 'unknown',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Sellers Table
CREATE TABLE IF NOT EXISTS sellers (
  id TEXT PRIMARY KEY,
  user_id TEXT UNIQUE NOT NULL,
  business_name TEXT,
  business_address TEXT,
  total_shipments INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Vendors Table
CREATE TABLE IF NOT EXISTS vendors (
  id TEXT PRIMARY KEY,
  user_id TEXT UNIQUE NOT NULL,
  company_name TEXT NOT NULL,
  vehicle_type TEXT NOT NULL,
  load_capacity_tonnes REAL NOT NULL,
  registration_number TEXT,
  operating_locations TEXT,
  operating_routes TEXT,
  availability TEXT,
  quotation_per_km REAL,
  base_quotation REAL,
  status TEXT CHECK(status IN ('active', 'inactive')) DEFAULT 'active',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Shipments Table
CREATE TABLE IF NOT EXISTS shipments (
  id TEXT PRIMARY KEY,
  reference_number TEXT UNIQUE NOT NULL,
  seller_id TEXT NOT NULL,
  pickup_location TEXT NOT NULL,
  delivery_location TEXT NOT NULL,
  goods_description TEXT NOT NULL,
  quantity TEXT,
  weight_tonnes REAL NOT NULL,
  dimensions TEXT,
  pickup_date TEXT NOT NULL,
  pickup_time TEXT,
  vehicle_type_required TEXT,
  special_requirements TEXT,
  status TEXT CHECK(status IN (
    'request_received',
    'finding_vendor',
    'quote_received',
    'awaiting_confirmation',
    'booking_confirmed',
    'vehicle_assigned',
    'picked_up',
    'in_transit',
    'delayed',
    'delivered',
    'cancelled'
  )) DEFAULT 'request_received',
  assigned_vendor_id TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (seller_id) REFERENCES sellers(id) ON DELETE CASCADE,
  FOREIGN KEY (assigned_vendor_id) REFERENCES vendors(id) ON DELETE SET NULL
);

-- Quotations Table
CREATE TABLE IF NOT EXISTS quotations (
  id TEXT PRIMARY KEY,
  shipment_id TEXT NOT NULL,
  vendor_id TEXT NOT NULL,
  amount REAL NOT NULL,
  currency TEXT DEFAULT 'INR',
  validity_days INTEGER,
  notes TEXT,
  status TEXT CHECK(status IN ('pending', 'accepted', 'rejected')) DEFAULT 'pending',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (shipment_id) REFERENCES shipments(id) ON DELETE CASCADE,
  FOREIGN KEY (vendor_id) REFERENCES vendors(id) ON DELETE CASCADE
);

-- Conversations Table
CREATE TABLE IF NOT EXISTS conversations (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  phone_number TEXT NOT NULL,
  user_type TEXT,
  shipment_id TEXT,
  status TEXT DEFAULT 'active',
  last_message_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (shipment_id) REFERENCES shipments(id) ON DELETE SET NULL
);

-- Messages Table
CREATE TABLE IF NOT EXISTS messages (
  id TEXT PRIMARY KEY,
  conversation_id TEXT NOT NULL,
  sender_type TEXT CHECK(sender_type IN ('user', 'bot', 'admin')) DEFAULT 'user',
  sender_id TEXT,
  message_text TEXT NOT NULL,
  message_type TEXT DEFAULT 'text',
  metadata TEXT,
  read_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
);

-- Knowledge Base / FAQ Table
CREATE TABLE IF NOT EXISTS knowledge_base (
  id TEXT PRIMARY KEY,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  category TEXT,
  keywords TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Shipment Activity Log Table
CREATE TABLE IF NOT EXISTS shipment_activities (
  id TEXT PRIMARY KEY,
  shipment_id TEXT NOT NULL,
  activity_type TEXT NOT NULL,
  description TEXT,
  status_changed_to TEXT,
  created_by TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (shipment_id) REFERENCES shipments(id) ON DELETE CASCADE
);

-- Create Indexes
CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone_number);
CREATE INDEX IF NOT EXISTS idx_conversations_user_id ON conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_shipments_seller_id ON shipments(seller_id);
CREATE INDEX IF NOT EXISTS idx_shipments_vendor_id ON shipments(assigned_vendor_id);
CREATE INDEX IF NOT EXISTS idx_quotations_shipment_id ON quotations(shipment_id);
CREATE INDEX IF NOT EXISTS idx_quotations_vendor_id ON quotations(vendor_id);
`;
