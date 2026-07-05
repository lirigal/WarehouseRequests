import { WarehouseItem, AttributeType, ItemAttributeMapping, WarehouseRequest, AuditLogEntry } from "../types";

export const initialWarehouseItems: WarehouseItem[] = [
  {
    sku: "000000000002000024",
    nameHe: "צינור טפטוף חקלאי 16 מ\"מ - 30 ס\"מ רווח",
    nameEn: "Agricultural Drip Line Hose 16mm - 30cm spacing",
    stock: 12,
    price: 54.27,
    shelf: "2",
    categoryHe: "ציוד מילוט והשקיה",
    categoryEn: "Water & Irrigation Gear",
    unitHe: "מטר",
    unitEn: "Meter"
  }
];

export const getProductImageUrl = (sku: string, nameEn: string, categoryEn: string): string => {
  const name = (nameEn || "").toLowerCase();
  const cat = (categoryEn || "").toLowerCase();

  // Drip Line Hose / Drip Irrigation / Dripper
  if (name.includes("drip") || name.includes("dripper") || name.includes("hose") || name.includes("pipe") || name.includes("טפט") || name.includes("צינור")) {
    if (name.includes("sprinkler") || name.includes("ממטרה")) {
      return "https://images.unsplash.com/photo-1563514227147-6d2ff665a6a0?w=200&auto=format&fit=crop&q=70";
    }
    return "https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=200&auto=format&fit=crop&q=70";
  }
  if (name.includes("sprinkler") || name.includes("ממטרה")) {
    return "https://images.unsplash.com/photo-1563514227147-6d2ff665a6a0?w=200&auto=format&fit=crop&q=70";
  }
  if (name.includes("valve") || name.includes("fitting") || name.includes("joiner") || name.includes("plug") || name.includes("splitter") || name.includes("mount") || name.includes("ברז") || name.includes("מחבר") || name.includes("שסתום") || name.includes("שיבר")) {
    return "https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=200&auto=format&fit=crop&q=70";
  }
  if (name.includes("water meter") || name.includes("מד מים") || name.includes("שעון")) {
    return "https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=200&auto=format&fit=crop&q=70";
  }
  if (name.includes("pen") || name.includes("markers") || name.includes("עט") || name.includes("טושים")) {
    return "https://images.unsplash.com/photo-1586075010923-2dd4570fb338?w=200&auto=format&fit=crop&q=70";
  }
  if (name.includes("notebook") || name.includes("folder") || name.includes("מחברת") || name.includes("קלסר")) {
    return "https://images.unsplash.com/photo-1544816155-12df9643f363?w=200&auto=format&fit=crop&q=70";
  }
  if (name.includes("stapler") || name.includes("שדכן")) {
    return "https://images.unsplash.com/photo-1586075010923-2dd4570fb338?w=200&auto=format&fit=crop&q=70";
  }
  if (name.includes("disc") || name.includes("dvd") || name.includes("cd") || name.includes("תקליטור")) {
    return "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=200&auto=format&fit=crop&q=70";
  }
  if (name.includes("bulb") || name.includes("נורה") || name.includes("ליבון")) {
    return "https://images.unsplash.com/photo-1550684848-fac1c5b4e853?w=200&auto=format&fit=crop&q=70";
  }
  if (name.includes("coat") || name.includes("חלוק")) {
    return "https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=200&auto=format&fit=crop&q=70";
  }
  if (name.includes("syringe") || name.includes("מזרק")) {
    return "https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=200&auto=format&fit=crop&q=70";
  }
  if (name.includes("bags") || name.includes("שקיות")) {
    return "https://images.unsplash.com/photo-1530587191325-3db32d826c18?w=200&auto=format&fit=crop&q=70";
  }

  // Category based matching
  if (cat.includes("chemical") || cat.includes("lab") || name.includes("reagent") || name.includes("solvent") || name.includes("acid") || name.includes("pure") || name.includes("medium") || name.includes("כלור") || name.includes("אצטון") || name.includes("חומצ")) {
    return "https://images.unsplash.com/photo-1617155093730-a8bf47be792d?w=200&auto=format&fit=crop&q=70";
  }
  if (cat.includes("paper") || cat.includes("office") || cat.includes("משרד")) {
    return "https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?w=200&auto=format&fit=crop&q=70";
  }
  if (cat.includes("water") || cat.includes("irrigation") || cat.includes("השק")) {
    return "https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=200&auto=format&fit=crop&q=70";
  }
  if (cat.includes("packaging") || cat.includes("container") || cat.includes("אריז")) {
    return "https://images.unsplash.com/photo-1530587191325-3db32d826c18?w=200&auto=format&fit=crop&q=70";
  }

  return `https://picsum.photos/seed/${sku}/200/200`;
};

// Enrich all initial items on startup
initialWarehouseItems.forEach((item) => {
  item.imageUrl = getProductImageUrl(item.sku, item.nameEn, item.categoryEn);
});

export const initialAttributeTypes: AttributeType[] = [
  {
    id: "attr_size",
    nameHe: "מידה",
    nameEn: "Size",
    isActive: true,
    isDeleted: false,
    values: [
      { id: "val_s", typeId: "attr_size", valueHe: "S (קטן)", valueEn: "Small (S)", isActive: true, isDeleted: false },
      { id: "val_m", typeId: "attr_size", valueHe: "M (בינוני)", valueEn: "Medium (M)", isActive: true, isDeleted: false },
      { id: "val_l", typeId: "attr_size", valueHe: "L (גדול)", valueEn: "Large (L)", isActive: true, isDeleted: false },
      { id: "val_xl", typeId: "attr_size", valueHe: "XL (גדול מאוד)", valueEn: "Extra Large (XL)", isActive: true, isDeleted: false },
      { id: "val_xs", typeId: "attr_size", valueHe: "XS", valueEn: "Extra Small (XS)", isActive: true, isDeleted: false }
    ]
  },
  {
    id: "attr_color",
    nameHe: "צבע",
    nameEn: "Color",
    isActive: true,
    isDeleted: false,
    values: [
      { id: "val_black", typeId: "attr_color", valueHe: "שחור", valueEn: "Black", isActive: true, isDeleted: false },
      { id: "val_blue", typeId: "attr_color", valueHe: "כחול", valueEn: "Blue", isActive: true, isDeleted: false },
      { id: "val_red", typeId: "attr_color", valueHe: "אדום", valueEn: "Red", isActive: true, isDeleted: false },
      { id: "val_green", typeId: "attr_color", valueHe: "ירוק", valueEn: "Green", isActive: true, isDeleted: false },
      { id: "val_white", typeId: "attr_color", valueHe: "לבן", valueEn: "White", isActive: true, isDeleted: false },
      { id: "val_transparent", typeId: "attr_color", valueHe: "שקוף", valueEn: "Transparent", isActive: true, isDeleted: false }
    ]
  },
  {
    id: "attr_packaging",
    nameHe: "תצורת אריזה",
    nameEn: "Packaging Type",
    isActive: true,
    isDeleted: false,
    values: [
      { id: "val_pkg1", typeId: "attr_packaging", valueHe: "בקבוק זכוכית כהה", valueEn: "Amber Glass Bottle", isActive: true, isDeleted: false },
      { id: "val_pkg2", typeId: "attr_packaging", valueHe: "בקבוק פלסטיק HDPE", valueEn: "HDPE Plastic Bottle", isActive: true, isDeleted: false },
      { id: "val_pkg3", typeId: "attr_packaging", valueHe: "אריזת חיסכון מוסדית", valueEn: "Corporate Bulk Pack", isActive: true, isDeleted: false }
    ]
  }
];

export const initialItemAttributeMappings: ItemAttributeMapping[] = [];

export const initialRequests: WarehouseRequest[] = [
  {
    requestId: "WR-2026-6401",
    sku: "000000000002032526",
    itemNameHe: "חלוק מעבדה לבן כותנה סטרילי",
    itemNameEn: "White Laboratory Protective Cotton Coat",
    quantityRequested: 10,
    attributeTypeId: "attr_size",
    attributeTypeNameHe: "מידה",
    attributeTypeNameEn: "Size",
    attributeValueId: "val_l",
    attributeValueNameHe: "L (גדול)",
    attributeValueNameEn: "Large (L)",
    requestDate: "2026-05-26T14:30:00Z",
    requestedBy: "dr.cohen@volcani.agri.gov.il",
    statusHe: "אושר - ממתין לניפוק במחסן",
    statusEn: "Approved - Awaiting Dispatch"
  },
  {
    requestId: "WR-2026-6402",
    sku: "000000000002000110",
    itemNameHe: "עט רולר כחול פיילוט 0.5-0.7 מ\"מ",
    itemNameEn: "Pilot Blue Rollerball Pen 0.5-0.7mm",
    quantityRequested: 50,
    attributeTypeId: "attr_color",
    attributeTypeNameHe: "צבע",
    attributeTypeNameEn: "Color",
    attributeValueId: "val_blue",
    attributeValueNameHe: "כחול",
    attributeValueNameEn: "Blue",
    requestDate: "2026-05-27T09:15:00Z",
    requestedBy: "sarah.levy@volcani.agri.gov.il",
    statusHe: "בוצע - נופק וסופק בהצלחה",
    statusEn: "Dispatched & Delivered Successfully"
  }
];

export const initialAuditLogs: AuditLogEntry[] = [
  {
    id: "log-1",
    userId: "svetlana@volcani.agri.gov.il",
    userName: "סבטלנה - מנהלת מחסן ראשית",
    actionType: "CREATE",
    tableName: "AttributeTypes",
    oldValue: "",
    newValue: "Type: 'Packaging Type' / 'תצורת אריזה'",
    actionDate: "2026-05-26T10:00:00Z"
  },
  {
    id: "log-2",
    userId: "svetlana@volcani.agri.gov.il",
    userName: "סבטלנה - מנהלת מחסן ראשית",
    actionType: "ASSIGN",
    tableName: "ItemAttributeMapping",
    oldValue: "",
    newValue: "Mapped Size (attr_size) with Mandatory=true to SKU: 000000000002032526 (חלוק מעבדה)",
    actionDate: "2026-05-26T11:20:00Z"
  }
];
