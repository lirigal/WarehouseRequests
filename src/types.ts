export interface AttributeType {
  id: string;
  nameHe: string;
  nameEn: string;
  isActive: boolean;
  isDeleted: boolean;
  values: AttributeValue[];
}

export interface AttributeValue {
  id: string;
  typeId: string;
  valueHe: string;
  valueEn: string;
  isActive: boolean;
  isDeleted: boolean;
}

export interface ItemAttributeMapping {
  itemId: string; // SKU
  typeId: string;
  isMandatory: boolean;
  allowedValueIds: string[]; // List of selective allowed value IDs
}

export interface WarehouseItem {
  sku: string;
  nameHe: string;
  nameEn: string;
  stock: number;
  price: number;
  shelf: string;
  categoryHe: string;
  categoryEn: string;
  unitHe: string;
  unitEn: string;
  imageUrl?: string;
  imageFilter?: string;
}

export interface ItemPictureUrl {
  id: string;
  sku: string;
  imageUrl: string;
  imageSource: string;
  isPrimary: boolean;
  createdDate: string;
  updatedDate: string;
  createdBy: string;
  updatedBy: string;
  isActive: boolean;
}

export interface WarehouseRequest {
  requestId: string; // e.g. WR-2026-0001
  sku: string;
  itemNameHe: string;
  itemNameEn: string;
  quantityRequested: number;
  attributeTypeId: string;
  attributeTypeNameHe: string;
  attributeTypeNameEn: string;
  attributeValueId: string;
  attributeValueNameHe: string;
  attributeValueNameEn: string;
  requestDate: string;
  requestedBy: string;
  statusHe: string;
  statusEn: string;
}

export interface AuditLogEntry {
  id: string;
  userId: string;
  userName: string;
  actionType: "CREATE" | "UPDATE" | "DELETE" | "ASSIGN";
  tableName: string;
  oldValue: string;
  newValue: string;
  actionDate: string;
}

export interface NipukRecord {
  nipukId: string; // Unique NIPUK ID like NPK-2026-X
  dispatchDate: string; // e.g. "2026-06-01"
  dispatchTime: string; // e.g. "11:20"
  orderNumber?: string; // Optional order reference
  requestDate?: string; // Optional date of the original request
  sku?: string;         // Item Sku (Makat)
  itemNameHe?: string;  // Item Hebrew name (Teur)
  itemNameEn?: string;  // Item English name (Teur)
  quantity?: number;    // Quantity dispatched
  notes?: string;       // Optional remarks
  remark?: string;      // Optional item remark
  attributeTypeNameHe?: string;
  attributeValueNameHe?: string;
  attributeTypeNameEn?: string;
  attributeValueNameEn?: string;
  workerId: string;     // Dispatcher's ID
  workerName: string;   // Dispatcher's Name
  workerRole: string;   // Dispatcher's Role
  customerName: string;
  customerId?: string; // Optional ID
  customerPhone?: string; // Optional phone
  createdTimestamp: string;
  lastUpdateTimestamp: string;
}

export type AccessRole = "ADMIN" | "MANAGER" | "STOREKEEPER" | "STAFF";
export type Language = "HE" | "EN";

export interface AppUser {
  userId: string;       // Primary Key (Unique synthetic user identity)
  teudatZehut: string;  // Unique, exactly 9 digits, serves as the username
  firstName: string;
  lastName: string;
  jobTitle: string;
  phone: string;
  email: string;
  passwordHash: string;
  role: AccessRole;     // System Access Role
  isActive: boolean;
  createdDate: string;
  lastLoginDate: string;
}

