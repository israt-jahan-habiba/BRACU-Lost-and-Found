import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'uploads');

export const CATEGORIES = [
  'ID / Cards', 'Wallet', 'Keys', 'Phone', 'Laptop / Tablet', 'Charger / Cable',
  'Headphones', 'Bag', 'Books / Notes', 'Calculator', 'Water bottle', 'Clothing',
  'Umbrella', 'Jewelry / Watch', 'Other',
];
export const URGENT_CATEGORIES = ['ID / Cards', 'Wallet', 'Keys', 'Phone'];

// Predefined campus locations (BRAC University, Merul Badda campus)
export const LOCATIONS = [
  'UB1 (Main Building)', 'UB2', 'UB3', 'Library', 'Cafeteria', 'Auditorium',
  'Computer Lab', 'Engineering Lab', 'Admission / Registrar Office', 'Security Desk',
  'Prayer Room', 'Student Lounge', 'Playground / Field', 'Gate / Entrance', 'Bus / Transport Point', 'Other',
];
export const STATUSES = ['open', 'claimed', 'resolved', 'removed'];
