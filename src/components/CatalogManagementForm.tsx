import React, { useState, useEffect, useRef } from "react";
import { WarehouseItem, Language, AccessRole, AttributeType, ItemAttributeMapping, AuditLogEntry, AppUser } from "../types";
import {
  Search,
  Upload,
  FileSpreadsheet,
  Layers,
  Info,
  Check,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Camera,
  Sliders,
  X,
  ImageIcon,
  Save,
  Trash2,
  AlertTriangle,
  MoreVertical,
  Eye,
  Copy,
  History,
  Sparkles,
  FileText,
  Droplet,
  FlaskConical,
  Beaker,
  Settings,
  Plus,
  Compass,
  Database,
  Calendar,
  User,
  ExternalLink,
  Tag,
  Star
} from "lucide-react";
import { initialWarehouseItems, getProductImageUrl } from "../data/mockItems";
import { ItemPictureUrl } from "../types";
import { GetItemPrimaryImageBySku } from "../lib/imageService";

const clientSearchCache = new Map<string, any>();

interface CatalogManagementFormProps {
  currentLanguage: Language;
  currentRole: AccessRole;
  warehouseItems: WarehouseItem[];
  setWarehouseItems?: React.Dispatch<React.SetStateAction<WarehouseItem[]>>;
  attributeTypes?: AttributeType[];
  itemMappings?: ItemAttributeMapping[];
  itemPictureUrls?: ItemPictureUrl[];
  onAddPictureUrl?: (sku: string, url: string, isPrimary: boolean, source?: string) => void;
  onUpdatePictureUrl?: (id: string, url: string, isPrimary: boolean, isActive: boolean) => void;
  onDeletePictureUrl?: (id: string) => void;
  onSkuClick?: (sku: string) => void;
  currentUser?: AppUser | null;
}

export const CatalogManagementForm: React.FC<CatalogManagementFormProps> = ({
  currentLanguage,
  currentRole,
  warehouseItems,
  setWarehouseItems,
  attributeTypes = [],
  itemMappings = [],
  itemPictureUrls = [],
  onAddPictureUrl,
  onUpdatePictureUrl,
  onDeletePictureUrl,
  onSkuClick,
  currentUser,
}) => {
  const isRtl = currentLanguage === "HE";
  const isAuthorized = currentRole === "ADMIN" || currentRole === "MANAGER";

  // Search, loading, and layout states
  const [searchTerm, setSearchTerm] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isSearchingGrid, setIsSearchingGrid] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [detectedEncodingMsg, setDetectedEncodingMsg] = useState<string>("");
  const [errorFeedback, setErrorFeedback] = useState<string | null>(null);
  const [successFeedback, setSuccessFeedback] = useState<string | null>(null);

  // Modals / Details states
  const [detailsItem, setDetailsItem] = useState<WarehouseItem | null>(null);
  const [attributesModalItem, setAttributesModalItem] = useState<WarehouseItem | null>(null);
  const [activeActionMenuSku, setActiveActionMenuSku] = useState<string | null>(null);
  const [hoveredAttributesSku, setHoveredAttributesSku] = useState<string | null>(null);

  // Code level item selection storage
  const [selectedSkus, setSelectedSkus] = useState<string[]>(() => {
    const saved = localStorage.getItem("volcani_catalog_selected_skus");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error("Error parsing selected SKUs", e);
      }
    }
    return [];
  });

  // Custom interactive product picture selection and editing states
  const [editingItem, setEditingItem] = useState<WarehouseItem | null>(null);
  const [tempImageUrl, setTempImageUrl] = useState<string>("");
  const [brightness, setBrightness] = useState<number>(100);
  const [contrast, setContrast] = useState<number>(100);
  const [saturation, setSaturation] = useState<number>(100);
  const [grayscale, setGrayscale] = useState<number>(0);
  const [sepia, setSepia] = useState<number>(0);
  const [blur, setBlur] = useState<number>(0);
  const [modalDragging, setModalDragging] = useState<boolean>(false);

  // Expanded editor fields & interactive gallery search
  const [editedItemNameHe, setEditedItemNameHe] = useState<string>("");
  const [editedItemNameEn, setEditedItemNameEn] = useState<string>("");
  const [itemNameError, setItemNameError] = useState<string | null>(null);
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [searchResults, setSearchResults] = useState<{ url: string; titleHe: string; titleEn: string }[]>([]);
  const [lastSearchedName, setLastSearchedName] = useState<string>("");
  const [hasSearched, setHasSearched] = useState<boolean>(false);
  const [singlePhotoUrl, setSinglePhotoUrl] = useState<string>("");
  const [multiplePhotoUrls, setMultiplePhotoUrls] = useState<string>("");

  // Mobile collapsed attributes toggle sets
  const [expandedMobileCards, setExpandedMobileCards] = useState<string[]>([]);

  // Simulated initial mount delay for layout polish
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsInitialLoading(false);
    }, 600);
    return () => clearTimeout(timer);
  }, []);

  // Debounced search input mechanism
  useEffect(() => {
    setIsSearchingGrid(true);
    const handler = setTimeout(() => {
      setSearchTerm(searchInput);
      setCurrentPage(1);
      setIsSearchingGrid(false);
    }, 320);
    return () => clearTimeout(handler);
  }, [searchInput]);

  // Sync rowsPerPage preference to localStorage
  const [rowsPerPage, setRowsPerPage] = useState<number>(() => {
    try {
      const userKey = `volcani_catalog_rows_per_page_${currentUser?.email || "guest"}`;
      const saved = localStorage.getItem(userKey) || localStorage.getItem("volcani_catalog_rows_per_page");
      if (saved) {
        const parsed = parseInt(saved, 10);
        if (!isNaN(parsed) && [5, 10, 20, 30, 50].includes(parsed)) {
          return parsed;
        }
      }
    } catch (e) {}
    return 10;
  });

  // Automatically restore page size when user changes
  useEffect(() => {
    try {
      const userKey = `volcani_catalog_rows_per_page_${currentUser?.email || "guest"}`;
      const saved = localStorage.getItem(userKey) || localStorage.getItem("volcani_catalog_rows_per_page");
      if (saved) {
        const parsed = parseInt(saved, 10);
        if (!isNaN(parsed) && [5, 10, 20, 30, 50].includes(parsed)) {
          setRowsPerPage(parsed);
          setCurrentPage(1);
          return;
        }
      }
    } catch (e) {}
    setRowsPerPage(10);
    setCurrentPage(1);
  }, [currentUser]);

  useEffect(() => {
    try {
      const userKey = `volcani_catalog_rows_per_page_${currentUser?.email || "guest"}`;
      localStorage.setItem(userKey, String(rowsPerPage));
      localStorage.setItem("volcani_catalog_rows_per_page", String(rowsPerPage));
    } catch (e) {}
  }, [rowsPerPage, currentUser]);

  // Save selection choices when they change
  useEffect(() => {
    localStorage.setItem("volcani_catalog_selected_skus", JSON.stringify(selectedSkus));
  }, [selectedSkus]);

  // Sorting columns states (SKU, Name, Stock, Price, Shelf)
  const [sortField, setSortField] = useState<"sku" | "name" | "stock" | "price" | "shelf" | null>(null);
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [currentPage, setCurrentPage] = useState(1);
  const [inventoryFilter, setInventoryFilter] = useState<"all" | "in_stock" | "out_of_stock">(() => {
    return (localStorage.getItem("volcani_catalog_inventory_filter") as any) || "all";
  });

  useEffect(() => {
    localStorage.setItem("volcani_catalog_inventory_filter", inventoryFilter);
    setCurrentPage(1);
  }, [inventoryFilter]);

  // Toggle selection for individual items
  const toggleSelectSku = (sku: string) => {
    setSelectedSkus((prev) =>
      prev.includes(sku) ? prev.filter((s) => s !== sku) : [...prev, sku]
    );
  };

  // Toggle selection for all items currently visible on the active page
  const toggleSelectAll = () => {
    const currentItemSkus = currentItems.map((item) => item.sku);
    const allSelectedOnPage =
      currentItemSkus.length > 0 && currentItemSkus.every((sku) => selectedSkus.includes(sku));

    if (allSelectedOnPage) {
      setSelectedSkus((prev) => prev.filter((sku) => !currentItemSkus.includes(sku)));
    } else {
      setSelectedSkus((prev) => {
        const newSkus = [...prev];
        currentItemSkus.forEach((sku) => {
          if (!newSkus.includes(sku)) {
            newSkus.push(sku);
          }
        });
        return newSkus;
      });
    }
  };

  // Filter items in the grid based on sanitized query parameters and inventory status
  const filteredItems = warehouseItems.filter((item) => {
    const term = searchTerm.toLowerCase().trim();
    let matchesSearch = true;
    if (term) {
      matchesSearch = (
        item.sku.toLowerCase().includes(term) ||
        item.nameHe.toLowerCase().includes(term) ||
        item.nameEn.toLowerCase().includes(term) ||
        (item.categoryHe && item.categoryHe.toLowerCase().includes(term)) ||
        (item.categoryEn && item.categoryEn.toLowerCase().includes(term)) ||
        (item.shelf && item.shelf.toLowerCase().includes(term))
      );
    }

    let matchesInventory = true;
    if (inventoryFilter === "in_stock") {
      matchesInventory = item.stock > 0;
    } else if (inventoryFilter === "out_of_stock") {
      matchesInventory = item.stock === 0;
    }

    return matchesSearch && matchesInventory;
  });

  // Sort filtered items list dynamically
  const sortedItems = [...filteredItems].sort((a, b) => {
    if (!sortField) return 0;

    let comparison = 0;
    if (sortField === "sku") {
      comparison = a.sku.localeCompare(b.sku, isRtl ? "he" : "en", { numeric: true });
    } else if (sortField === "name") {
      const valA = isRtl ? a.nameHe : a.nameEn;
      const valB = isRtl ? b.nameHe : b.nameEn;
      comparison = valA.localeCompare(valB, isRtl ? "he" : "en", { numeric: true });
    } else if (sortField === "stock") {
      comparison = a.stock - b.stock;
    } else if (sortField === "price") {
      comparison = a.price - b.price;
    } else if (sortField === "shelf") {
      comparison = a.shelf.localeCompare(b.shelf, isRtl ? "he" : "en", { numeric: true });
    }

    return sortOrder === "asc" ? comparison : -comparison;
  });

  // Pagination bounds checks
  const totalPages = Math.ceil(sortedItems.length / rowsPerPage) || 1;
  const safeCurrentPage = Math.min(currentPage, totalPages);

  const indexOfLastItem = safeCurrentPage * rowsPerPage;
  const indexOfFirstItem = indexOfLastItem - rowsPerPage;
  const currentItems = sortedItems.slice(indexOfFirstItem, indexOfLastItem);

  const fromItem = sortedItems.length === 0 ? 0 : indexOfFirstItem + 1;
  const toItem = Math.min(indexOfLastItem, sortedItems.length);

  const handleSort = (field: "sku" | "name" | "stock" | "price" | "shelf") => {
    if (sortField === field) {
      if (sortOrder === "asc") {
        setSortOrder("desc");
      } else {
        setSortField(null); // Return to unsorted state
      }
    } else {
      setSortField(field);
      setSortOrder("asc");
    }
    setCurrentPage(1);
  };

  const renderSortIndicator = (field: "sku" | "name" | "stock" | "price" | "shelf") => {
    if (sortField !== field) {
      return <ArrowUpDown className="h-3 w-3 inline-block opacity-40 shrink-0 ltr:ml-1 rtl:mr-1 align-middle transition-transform duration-200" />;
    }
    return sortOrder === "asc" ? (
      <ArrowUp className="h-3 w-3 inline-block text-blue-400 shrink-0 ltr:ml-1 rtl:mr-1 align-middle animate-bounce" />
    ) : (
      <ArrowDown className="h-3 w-3 inline-block text-blue-400 shrink-0 ltr:ml-1 rtl:mr-1 align-middle animate-bounce" />
    );
  };

  // Interactive Live Images Retrieval Search Service
  const handleImageSearch = async (queryNameHe: string, queryNameEn: string) => {
    const mainQuery = queryNameHe.trim();
    if (!mainQuery) {
      setItemNameError(
        isRtl
          ? "שדה חובה: שם הפריט אינו יכול להיות ריק לביצוע חיפוש תמונות."
          : "Required field: Item Name cannot be empty."
      );
      setSearchResults([]);
      setHasSearched(false);
      return;
    }

    if (lastSearchedName.toLowerCase() === mainQuery.toLowerCase() && hasSearched) {
      return;
    }

    setItemNameError(null);
    setIsSearching(true);
    setHasSearched(true);
    setLastSearchedName(mainQuery);

    const cacheKey = mainQuery.toLowerCase();

    if (clientSearchCache.has(cacheKey)) {
      setSearchResults(clientSearchCache.get(cacheKey));
      setIsSearching(false);
      return;
    }

    try {
      const response = await fetch(`/api/image-search?q=${encodeURIComponent(mainQuery)}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();

      if (data && data.success && Array.isArray(data.images)) {
        if (data.images.length === 0) {
          setItemNameError(
            isRtl
              ? "לא נמצאו תמונות עבור שם הפריט"
              : "No online references found for this item."
          );
          setSearchResults([]);
        } else {
          setSearchResults(data.images);
          clientSearchCache.set(cacheKey, data.images);
        }
      } else {
        throw new Error(data.error || "No images returned");
      }
    } catch (err: any) {
      console.error("Client side search error:", err);
      // Fail back gracefully with realistic matching preset fallbacks
      const fallbackSet = presetImages.filter(item => 
        item.nameHe.toLowerCase().includes(mainQuery.toLowerCase()) || 
        mainQuery.toLowerCase().includes(item.nameHe.toLowerCase())
      );
      if (fallbackSet.length > 0) {
        const dummyQuery = fallbackSet.map(v => ({ url: v.url, titleHe: v.nameHe, titleEn: v.nameEn }));
        setSearchResults(dummyQuery);
      } else {
        // Feed random 4 mock photos
        const shuffle = [...presetImages].sort(() => 0.5 - Math.random()).slice(0, 4);
        setSearchResults(shuffle.map(v => ({ url: v.url, titleHe: v.nameHe, titleEn: v.nameEn })));
      }
    } finally {
      setIsSearching(false);
    }
  };

  const presetImages = [
    { nameHe: "צינור טפטפת", nameEn: "Drip Hose", url: "https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=350&auto=format&fit=crop&q=70" },
    { nameHe: "ממטרה חקלאית", nameEn: "Sprinkler Gear", url: "https://images.unsplash.com/photo-1563514227147-6d2ff665a6a0?w=350&auto=format&fit=crop&q=70" },
    { nameHe: "ברז/מחבר פליז", nameEn: "Brass Fitting/Valve", url: "https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=350&auto=format&fit=crop&q=70" },
    { nameHe: "בקבוק נוזל מעבדה", nameEn: "Laboratory Reagent", url: "https://images.unsplash.com/photo-1617155093730-a8bf47be792d?w=350&auto=format&fit=crop&q=70" },
    { nameHe: "מד מים/שסתום בקרה", nameEn: "Water Meter Control", url: "https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=350&auto=format&fit=crop&q=70" },
    { nameHe: "ציוד כתיבה משרדי", nameEn: "Markers / Pens", url: "https://images.unsplash.com/photo-1586075010923-2dd4570fb338?w=350&auto=format&fit=crop&q=70" },
    { nameHe: "חלוק ומחקר מעבדה", nameEn: "Research Coat", url: "https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=350&auto=format&fit=crop&q=70" },
    { nameHe: "אריזות ושקיות ניילון", nameEn: "Packaging Plastic Bags", url: "https://images.unsplash.com/photo-1530587191325-3db32d826c18?w=350&auto=format&fit=crop&q=70" },
  ];

  const startEditImage = (item: WarehouseItem) => {
    setEditingItem(item);
    const resolvedPrimary = GetItemPrimaryImageBySku(item.sku, itemPictureUrls, currentLanguage === "HE");
    setTempImageUrl(resolvedPrimary);
    setSinglePhotoUrl("");
    setMultiplePhotoUrls("");
    const initNameHe = item.nameHe || "";
    const initNameEn = item.nameEn || "";
    setEditedItemNameHe(initNameHe);
    setEditedItemNameEn(initNameEn);
    setItemNameError(null);
    setIsSearching(false);
    setSearchResults([]);

    let b = 100, c = 100, s = 100, g = 0, sp = 0, bl = 0;
    if (item.imageFilter) {
      const bMatch = item.imageFilter.match(/brightness\((\d+)%\)/);
      const cMatch = item.imageFilter.match(/contrast\((\d+)%\)/);
      const sMatch = item.imageFilter.match(/saturate\((\d+)%\)/);
      const gMatch = item.imageFilter.match(/grayscale\((\d+)%\)/);
      const spMatch = item.imageFilter.match(/sepia\((\d+)%\)/);
      const blMatch = item.imageFilter.match(/blur\((\d+)px\)/);

      if (bMatch) b = parseInt(bMatch[1], 10);
      if (cMatch) c = parseInt(cMatch[1], 10);
      if (sMatch) s = parseInt(sMatch[1], 10);
      if (gMatch) g = parseInt(gMatch[1], 10);
      if (spMatch) sp = parseInt(spMatch[1], 10);
      if (blMatch) bl = parseInt(blMatch[1], 10);
    }
    setBrightness(b);
    setContrast(c);
    setSaturation(s);
    setGrayscale(g);
    setSepia(sp);
    setBlur(bl);

    if (initNameHe.trim()) {
      setTimeout(() => {
        handleImageSearch(initNameHe, initNameEn);
      }, 50);
    }
  };

  const currentSkuPics = editingItem ? itemPictureUrls.filter(p => p.sku === editingItem.sku) : [];

  const handleAddSinglePhoto = (url: string, selectAsPrimary: boolean = false) => {
    if (!editingItem || !url.trim()) return;
    if (!isAuthorized) {
      setErrorFeedback(isRtl ? "גישה נדחתה. הרשאות כתיבה נדרשות לעדכון נתוני תמונות." : "Access denied: administration privileges required to update image data.");
      return;
    }
    if (onAddPictureUrl) {
      onAddPictureUrl(editingItem.sku, url.trim(), selectAsPrimary || currentSkuPics.length === 0, "Manual Interface Input");
      setSinglePhotoUrl("");
      setTempImageUrl(url.trim());
    }
  };

  const handleAddBatchPhotos = () => {
    if (!editingItem || !multiplePhotoUrls.trim()) return;
    if (!isAuthorized) {
      setErrorFeedback(isRtl ? "גישה נדחתה. הרשאות כתיבה נדרשות לעדכון נתוני תמונות." : "Access denied: administration privileges required to update image data.");
      return;
    }
    const lines = multiplePhotoUrls.split(/\r?\n/);
    let count = 0;
    if (onAddPictureUrl) {
      lines.forEach((line) => {
        const cleanUrl = line.trim();
        if (cleanUrl) {
          onAddPictureUrl(editingItem.sku, cleanUrl, false, "Batch List Paste");
          if (count === 0) {
            setTempImageUrl(cleanUrl);
          }
          count++;
        }
      });
      setMultiplePhotoUrls("");
      setSuccessFeedback(isRtl ? `נרשמו בהצלחה ${count} תמונות עבור פריט זה.` : `Successfully registered ${count} images for this item SKU.`);
      setTimeout(() => setSuccessFeedback(null), 4000);
    }
  };

  const handleSaveImageEdit = () => {
    if (!editingItem || !setWarehouseItems) return;
    if (!editedItemNameHe.trim()) {
      setItemNameError(
        isRtl
          ? "שדה חובה: שם הפריט אינו יכול להיות ריק לשמירת השינויים בקטלוג."
          : "Required: Item Name cannot be empty to save catalog updates."
      );
      const container = document.getElementById("product-image-editor-modal");
      if (container) container.scrollTop = 0;
      return;
    }

    if (!isAuthorized) {
      setErrorFeedback(
        isRtl
          ? "שגיאה: אין לך הרשאות ניהול (מנהל/אדמין) לעדכון פריטי הקטלוג."
          : "Error: You do not have sufficient permissions to update catalog files."
      );
      setEditingItem(null);
      setTimeout(() => setErrorFeedback(null), 4000);
      return;
    }

    const filterString = `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%) grayscale(${grayscale}%) sepia(${sepia}%) blur(${blur}px)`;

    setWarehouseItems((prevItems) =>
      prevItems.map((item) =>
        item.sku === editingItem.sku
          ? {
              ...item,
              nameHe: editedItemNameHe.trim(),
              nameEn: editedItemNameEn.trim(),
              imageFilter: filterString,
            }
          : item
      )
    );

    setEditingItem(null);
    setSuccessFeedback(
      isRtl
        ? `פרטי הפריט בקטלוג עודכנו בהצלחה!`
        : `Product settings for SKU ${editingItem.sku} saved successfully!`
    );
    setTimeout(() => setSuccessFeedback(null), 4000);
  };

  const handleModalImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      if (base64 && editingItem) {
        setTempImageUrl(base64);
        if (isAuthorized && onAddPictureUrl) {
          onAddPictureUrl(editingItem.sku, base64, currentSkuPics.length === 0, "Local Upload");
        }
      }
    };
    reader.readAsDataURL(file);
  };

  const handleModalImageDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setModalDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setErrorFeedback(isRtl ? "אנא בחר קובץ תמונה תקין בלבד." : "Please select a valid image file only.");
      setTimeout(() => setErrorFeedback(null), 3500);
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      if (base64 && editingItem) {
        setTempImageUrl(base64);
        if (isAuthorized && onAddPictureUrl) {
          onAddPictureUrl(editingItem.sku, base64, currentSkuPics.length === 0, "Drag-and-Drop Upload");
        }
      }
    };
    reader.readAsDataURL(file);
  };

  // CSV parsing core functionality
  const processCsvText = (text: string) => {
    try {
      if (!setWarehouseItems) {
        setErrorFeedback(
          isRtl
            ? "שגיאת מערכת: מנגנון עדכון המלאי אינו מאותחל."
            : "System Error: Inventory updater mechanism is not initialized."
        );
        return;
      }
      const lines = text.split(/\r?\n/);
      if (lines.length <= 1) {
        setErrorFeedback(
          isRtl ? "קובץ CSV ריק או חסר שורות נתונים." : "CSV file is empty or missing data rows."
        );
        return;
      }

      const headers = lines[0].split(",");
      const paritIdx = headers.findIndex((h) => {
        const val = h.trim().toLowerCase().replace(/^\uFEFF/, "");
        return val === "parit" || val === "sku" || val.includes("מק\"ט") || val.includes("מקט");
      });
      const teurIdx = headers.findIndex((h) => {
        const val = h.trim().toLowerCase().replace(/^\uFEFF/, "");
        return val.includes("teur") || val.includes("name") || val.includes("desc") || val.includes("תיאור") || val.includes("חומר");
      });
      const qtyIdx = headers.findIndex((h) => {
        const val = h.trim().toLowerCase().replace(/^\uFEFF/, "");
        return (
          val.includes("quantity") ||
          val.includes("qty") ||
          val.includes("stock") ||
          val.includes("כמות") ||
          val.includes("מלאי")
        );
      });
      const priceIdx = headers.findIndex((h) => {
        const val = h.trim().toLowerCase().replace(/^\uFEFF/, "");
        return val.includes("price") || val.includes("cost") || val.includes("מחיר");
      });
      const shelfIdx = headers.findIndex((h) => {
        const val = h.trim().toLowerCase().replace(/^\uFEFF/, "");
        return val.includes("shelf") || val.includes("מדף") || val.includes("מיקום");
      });
      const catIdx = headers.findIndex((h) => {
        const val = h.trim().toLowerCase().replace(/^\uFEFF/, "");
        return val.includes("category") || val.includes("cat") || val.includes("קטגור");
      });

      if (paritIdx === -1) {
        setErrorFeedback(
          isRtl
            ? "פורמט קובץ שגוי: עמודת המפתח 'Parit' (מק\"ט) אינה קיימת בשורה הראשונה."
            : "Invalid file format: Primary 'Parit' (SKU) key column is missing in first row headers."
        );
        return;
      }

      const parsedItems: WarehouseItem[] = [];

      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        const cols = line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/);
        const sku = cols[paritIdx]?.trim().replace(/^"|"$/g, "") || "";
        if (!sku) continue;

        const existingTemplate = initialWarehouseItems.find((itm) => itm.sku === sku);

        let nameHe = teurIdx !== -1 && cols[teurIdx] ? cols[teurIdx].trim().replace(/^"|"$/g, "") : "";
        if (!nameHe || nameHe === " " || nameHe === "  ") {
          nameHe = existingTemplate?.nameHe || `פריט קטלוג ${sku.slice(-6)}`;
        }

        const nameEn = existingTemplate?.nameEn || `Catalog Item ${sku.slice(-6)}`;

        const stockCol = qtyIdx !== -1 ? cols[qtyIdx]?.trim() : "";
        const stock = stockCol ? parseInt(stockCol, 10) || 0 : existingTemplate?.stock || 0;

        const priceCol = priceIdx !== -1 ? cols[priceIdx]?.trim() : "";
        const price = priceCol ? parseFloat(priceCol) || 0.0 : existingTemplate?.price || 0.0;

        const shelfCol = shelfIdx !== -1 ? cols[shelfIdx]?.trim() : "";
        const shelf = shelfCol ? shelfCol.replace(/^"|"$/g, "") : existingTemplate?.shelf || "1";

        const categoryId = catIdx !== -1 ? cols[catIdx]?.trim() || "1" : "1";
        let categoryHe = "כללי";
        let categoryEn = "General";

        if (categoryId === "1" || categoryId === "32") {
          categoryHe = "ציוד מילוט והשקיה";
          categoryEn = "Water & Irrigation Gear";
        } else if (categoryId === "3" || categoryId === "24") {
          categoryHe = "חומרים כימיים ומעבדה";
          categoryEn = "Chemicals & Lab Supplies";
        } else if (categoryId === "11" || categoryId === "13") {
          categoryHe = "ציוד משרדי ונייר";
          categoryEn = "Office Supplies & Paper";
        } else {
          categoryHe = existingTemplate?.categoryHe || "ציוד טכני וחלקי חילוף";
          categoryEn = existingTemplate?.categoryEn || "Technical Gear & Batteries";
        }

        parsedItems.push({
          sku,
          nameHe,
          nameEn,
          stock,
          price,
          shelf,
          categoryHe,
          categoryEn,
          unitHe: existingTemplate?.unitHe || "יחידה",
          unitEn: existingTemplate?.unitEn || "Piece",
          imageUrl: getProductImageUrl(sku, nameEn, categoryEn),
        });
      }

      if (parsedItems.length === 0) {
        setErrorFeedback(
          isRtl ? "לא פוענחו שורות קטלוג תקינות בקובץ." : "No valid catalog row records parsed from the given file."
        );
        return;
      }

      setWarehouseItems(parsedItems);
      setErrorFeedback(null);
      setSuccessFeedback(
        isRtl
          ? `הקטלוג נטען בהצלחה! ${parsedItems.length} פריטים פעילים עודענו במערכת.`
          : `Extended Catalog processed! ${parsedItems.length} parsed items injected.`
      );

      setTimeout(() => setSuccessFeedback(null), 5000);
    } catch (err: any) {
      setErrorFeedback(isRtl ? "קרסה שגיאה בפענוח קובץ ה-CSV." : "An error crashed during CSV parsing.");
      console.error(err);
    }
  };

  const handleFileContent = (file: File) => {
    const readerUtf8 = new FileReader();
    readerUtf8.onload = (event) => {
      const textUtf8 = event.target?.result as string;
      const hasReplacementChars = textUtf8.includes("\uFFFD");
      const hasHebrewRange = /[\u0590-\u05FF]/.test(textUtf8);
      const hasHighLatinRange = /[à-ÿ]/.test(textUtf8);

      if (hasReplacementChars || (!hasHebrewRange && hasHighLatinRange)) {
        const readerWin = new FileReader();
        readerWin.onload = (evWin) => {
          const textWin = evWin.target?.result as string;
          setDetectedEncodingMsg(
            isRtl
              ? "זוהה ועובד בקידוד: Windows-1255 (עברית קוד סגור)"
              : "Detected and processed using Windows-1255 encoding"
          );
          processCsvText(textWin);
        };
        readerWin.readAsText(file, "windows-1255");
      } else {
        setDetectedEncodingMsg(isRtl ? "זוהה ועובד בקידוד: UTF-8" : "Detected and processed using UTF-8");
        processCsvText(textUtf8);
      }
    };
    readerUtf8.readAsText(file, "utf-8");
  };

  const handleCsvUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    handleFileContent(file);
  };

  const handleCsvDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    handleFileContent(file);
  };

  const handleResetCatalog = () => {
    if (setWarehouseItems) {
      setWarehouseItems(initialWarehouseItems);
      setDetectedEncodingMsg("");
      setErrorFeedback(null);
      setSuccessFeedback(isRtl ? "נשחזר קטלוג ברירת מחדל בהצלחה." : "Default store catalog reset successfully.");
      setTimeout(() => setSuccessFeedback(null), 3000);
    }
  };

  // Duplicate item workflow
  const handleDuplicateItem = (item: WarehouseItem) => {
    if (!setWarehouseItems) return;
    const baseSkuNum = item.sku.replace(/-DUP\d*$/, "");
    let dupIndex = 1;
    let newSku = `${baseSkuNum}-DUP${dupIndex}`;
    while (warehouseItems.some((itm) => itm.sku === newSku)) {
      dupIndex++;
      newSku = `${baseSkuNum}-DUP${dupIndex}`;
    }

    const newItem: WarehouseItem = {
      ...item,
      sku: newSku,
      nameHe: `${item.nameHe} (שכפול דמו)`,
      nameEn: `${item.nameEn} (Sample Copy)`,
    };

    setWarehouseItems((prev) => [newItem, ...prev]);
    setSuccessFeedback(
      isRtl
        ? `פרט ${item.sku} שוכפל בהצלחה למק״ט חדש: ${newSku}!`
        : `Item ${item.sku} duplicated successfully to new SKU: ${newSku}!`
    );
    setTimeout(() => setSuccessFeedback(null), 4000);
  };

  // Toggle mobile card expansion
  const toggleMobileCardExpand = (sku: string) => {
    setExpandedMobileCards((prev) =>
      prev.includes(sku) ? prev.filter((s) => s !== sku) : [...prev, sku]
    );
  };

  // Custom Category Display Config & Icons mapping mapper
  const getCategoryTheme = (category: string) => {
    const norm = category.toLowerCase().trim();
    if (norm.includes("מילוט") || norm.includes("השקיה") || norm.includes("irrigation") || norm.includes("water")) {
      return {
        bg: "bg-radial bg-blue-50/80 hover:bg-blue-100 text-blue-700 border border-blue-200",
        icon: <Droplet className="h-3 w-3 inline shrink-0 ltr:mr-1 rtl:ml-1" />,
      };
    } else if (norm.includes("כימיים") || norm.includes("מעבדה") || norm.includes("chemical") || norm.includes("lab")) {
      return {
        bg: "bg-radial bg-amber-50/80 hover:bg-amber-100 text-amber-800 border border-amber-200",
        icon: <FlaskConical className="h-3 w-3 inline shrink-0 ltr:mr-1 rtl:ml-1" />,
      };
    } else if (norm.includes("משרדי") || norm.includes("נייר") || norm.includes("office") || norm.includes("paper")) {
      return {
        bg: "bg-radial bg-indigo-50/80 hover:bg-indigo-100 text-indigo-700 border border-indigo-200",
        icon: <FileText className="h-3 w-3 inline shrink-0 ltr:mr-1 rtl:ml-1" />,
      };
    } else {
      return {
        bg: "bg-radial bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200",
        icon: <Settings className="h-3 w-3 inline shrink-0 ltr:mr-1 rtl:ml-1" />,
      };
    }
  };

  // Custom Inventory Badge Logic
  const renderInventoryBadge = (stock: number, unitText: string, forceText: boolean = false) => {
    let dot = "🟢";
    let bg = "bg-emerald-50 text-emerald-800 border-emerald-150";
    let tooltip = isRtl ? `${stock} ${unitText} במלאי` : `${stock} ${unitText} in stock`;

    if (stock === 0) {
      dot = "🔴";
      bg = "bg-rose-50/70 text-rose-800 border-rose-200";
      tooltip = isRtl ? "אזל מהמלאי" : "Out of stock";
    } else if (stock > 0 && stock < 10) {
      dot = "🟡";
      bg = "bg-amber-50/75 text-amber-800 border-amber-200";
      tooltip = isRtl ? `${stock} ${unitText} - מלאי נמוך` : `${stock} ${unitText} - Low stock`;
    }

    return (
      <span 
        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-black border ${bg} shadow-3xs cursor-help select-none`}
        title={tooltip}
      >
        <span className="text-[10px] leading-none shrink-0">{dot}</span>
        <span className="font-mono text-xs font-black">{stock}</span>
        {forceText && <span className="text-[10px] font-semibold opacity-85"> {unitText}</span>}
      </span>
    );
  };

  return (
    <div
      id="catalog_management_form_container"
      className="space-y-6 select-text relative"
      style={{ direction: isRtl ? "rtl" : "ltr" }}
    >
      {/* Dynamic alerts rendering bar */}
      {errorFeedback && (
        <div className="p-4 bg-rose-50 border-r-4 border-rose-650 text-rose-900 rounded-lg shadow-sm flex items-center justify-between gap-2.5 animate-slideDown max-w-4xl mx-auto">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-rose-600 shrink-0" />
            <span className="text-xs sm:text-sm font-medium">{errorFeedback}</span>
          </div>
          <button onClick={() => setErrorFeedback(null)} className="text-rose-500 hover:text-rose-750 cursor-pointer">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {successFeedback && (
        <div className="p-4 bg-emerald-50 border-r-4 border-emerald-600 text-emerald-950 rounded-lg shadow-sm flex items-center justify-between gap-2.5 animate-slideDown max-w-4xl mx-auto">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-emerald-600 shrink-0 animate-pulse" />
            <span className="text-xs sm:text-sm font-bold">{successFeedback}</span>
          </div>
          <button onClick={() => setSuccessFeedback(null)} className="text-emerald-500 hover:text-emerald-700 cursor-pointer">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-5 flex flex-col md:flex-row gap-4 items-center justify-between shadow-xs mb-6 transition-all duration-300 text-right">
        <div className="flex items-center gap-3.5 w-full md:w-auto text-right">
          <span className="p-2.5 rounded-xl bg-gradient-to-tr from-slate-100 to-slate-200 border border-slate-300 shadow-3xs shrink-0 text-slate-700">
            <Database className="h-6 w-6" id="catalog-form-main-icon" />
          </span>
          <div className="space-y-0.5">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg sm:text-xl font-extrabold text-slate-905 tracking-tight">
                {isRtl ? "ניהול קטלוג פריטים מורחב" : "Extended Inventory Catalog Management"}
              </h2>
              <span className="inline-flex items-center gap-1.5 bg-slate-100 text-slate-700 text-[11px] font-bold px-3 py-1 border border-slate-200 rounded-full">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-ping" />
                <span>
                  {isRtl ? `סה"כ ${filteredItems.length} פריטים פעילים` : `${filteredItems.length} active items`}
                </span>
              </span>
            </div>
            <p className="text-xs text-slate-500">
              {isRtl
                ? "טעינה דינמית, חיפוש מהיר ופיקוח על פריטי המלאי היומיים המיובאים מקובץ במערכת"
                : "Dynamic ingestion, rapid diagnostics and lookup of imported daily warehouse catalog records"}
            </p>
          </div>
        </div>

        {/* SEARCH WORKFLOW */}
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto shrink-0">
          <div className="relative w-full sm:w-80 md:w-96">
            <div className={`absolute top-1/2 -translate-y-1/2 flex items-center gap-1.5 ${isRtl ? "right-3.5" : "left-3.5"}`}>
              {isSearchingGrid ? (
                <RefreshCw className="h-4 w-4 text-blue-500 animate-spin" />
              ) : (
                <Search className="h-4 w-4 text-slate-400 shrink-0" />
              )}
            </div>

            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder={
                isRtl
                  ? "חיפוש לפי מק״ט, שם פריט, קטגוריה או מילת מפתח..."
                  : "Search SKU, item name, category or shelf place..."
              }
              className={`w-full text-xs bg-slate-50/50 hover:bg-slate-50 border border-slate-250 focus:border-blue-600 focus:bg-white rounded-xl py-3 outline-none ${
                isRtl ? "pr-10 pl-10 text-right" : "pl-10 pr-10 text-left"
              } transition-all duration-200 focus:ring-4 focus:ring-blue-100 shadow-2xs font-medium`}
            />

            {(searchInput || searchTerm) && (
              <button
                onClick={() => {
                  setSearchInput("");
                  setSearchTerm("");
                }}
                className={`absolute top-1/2 -translate-y-1/2 p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-200/80 transition cursor-pointer ${
                  isRtl ? "left-3" : "right-3"
                }`}
                title={isRtl ? "נקה חיפוש" : "Clear Query"}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* QUICK REBUILD & RESET TOOLS */}
          <div className="flex items-center gap-2 w-full sm:w-auto shrink-0 justify-end">
            {/* Real Hidden HTML File Input for CSV Upload */}
            <input
              type="file"
              id="master-csv-file-trigger"
              accept=".csv"
              className="hidden"
              onChange={handleCsvUpload}
            />

            <label
              htmlFor="master-csv-file-trigger"
              className="px-3.5 py-2.5 rounded-xl border border-blue-200 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer select-none shadow-3xs"
              title={isRtl ? "לחץ להעלאת קובץ CSV" : "Click to load arbitrary CSV data"}
            >
              <Upload className="h-4 w-4 text-blue-600" />
              <span>{isRtl ? "ייבוא CSV" : "Import Catalog"}</span>
            </label>


          </div>
        </div>
      </div>

      {/* PRODUCT AVAILABILITY FILTER SEGMENTS */}
      <div 
        id="inventory-availability-filter-bar"
        className="bg-white border border-slate-200/80 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-3xs text-right animate-fadeIn"
      >
        <div className="flex items-center gap-2 select-none w-full sm:w-auto">
          <span className="p-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-500 shadow-3xs flex items-center justify-center shrink-0">
            <Layers className="h-4 w-4 text-slate-550" />
          </span>
          <div className="space-y-0.5">
            <h3 className="text-xs font-black text-slate-800 tracking-tight">
              {isRtl ? "זמינות מוצרים" : "Inventory Availability"}
            </h3>
            <p className="text-[10px] text-slate-400 font-semibold leading-tight">
              {isRtl ? "סנן פריטים לפי רמות מלאי נוכחיות בקטלוג" : "Filter warehouse records by exact inventory count"}
            </p>
          </div>
        </div>

        {/* Modern Segmented tab selector */}
        <div className="flex items-center bg-slate-100 p-1.5 rounded-xl w-full sm:w-auto relative border border-slate-205">
          <button
            type="button"
            onClick={() => setInventoryFilter("all")}
            className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-xs font-bold transition-all duration-150 select-none cursor-pointer whitespace-nowrap outline-none ${
              inventoryFilter === "all"
                ? "bg-slate-900 text-white shadow-sm"
                : "text-slate-600 hover:bg-slate-200 hover:text-slate-800"
            }`}
          >
            {isRtl ? "כל הפריטים" : "All Items"}
          </button>
          <button
            type="button"
            onClick={() => setInventoryFilter("in_stock")}
            className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-xs font-bold transition-all duration-150 select-none cursor-pointer whitespace-nowrap outline-none ${
              inventoryFilter === "in_stock"
                ? "bg-emerald-600 text-white shadow-sm font-black"
                : "text-slate-600 hover:bg-slate-200 hover:text-slate-800"
            }`}
          >
            <span className="inline-flex items-center gap-1.5 justify-center">
              <span className={`w-1.5 h-1.5 rounded-full ${inventoryFilter === "in_stock" ? "bg-white" : "bg-emerald-500"} shrink-0`} />
              <span>{isRtl ? "זמין במלאי" : "Available in Stock"}</span>
            </span>
          </button>
          <button
            type="button"
            onClick={() => setInventoryFilter("out_of_stock")}
            className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-xs font-bold transition-all duration-150 select-none cursor-pointer whitespace-nowrap outline-none ${
              inventoryFilter === "out_of_stock"
                ? "bg-rose-600 text-white shadow-sm font-black"
                : "text-slate-600 hover:bg-slate-205 hover:text-slate-800"
            }`}
          >
            <span className="inline-flex items-center gap-1.5 justify-center">
              <span className={`w-1.5 h-1.5 rounded-full ${inventoryFilter === "out_of_stock" ? "bg-white" : "bg-rose-500"} shrink-0`} />
              <span>{isRtl ? "אזל מהמלאי" : "Out of Stock"}</span>
            </span>
          </button>
        </div>
      </div>

      {/* DRAG AND DROP CSV OVERLAY WRAPPER */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleCsvDrop}
        className={`rounded-2xl border-2 transition-all duration-200 overflow-hidden bg-white shadow-xs ${
          isDragging
            ? "border-blue-500 bg-blue-50/40 opacity-80 scale-[0.995]"
            : "border-slate-200/80"
        }`}
      >
        {isDragging ? (
          <div className="p-16 text-center space-y-3 flex flex-col items-center justify-center">
            <span className="p-4 rounded-full bg-blue-100 text-blue-600 animate-bounce">
              <FileSpreadsheet className="h-10 w-10 text-blue-600" />
            </span>
            <h3 className="text-base font-extrabold text-blue-900">
              {isRtl ? "שחרר את קובץ ה-CSV המלא לקטלוג כאן!" : "Drop the catalog CSV file anywhere here!"}
            </h3>
            <p className="text-xs text-blue-600 font-medium">
              {isRtl ? "זיהוי אוטומטי של קידוד תווים (WIN-1255 / UTF-8)" : "Supports active Windows-1255 / UTF-8 detection"}
            </p>
          </div>
        ) : (
          <div>
            {/* Detected Encoding notice */}
            {detectedEncodingMsg && (
              <div className="px-5 py-2.5 bg-blue-50/50 border-b border-blue-150 text-[11px] font-bold text-blue-800 flex items-center gap-1.5">
                <Info className="h-3.5 w-3.5 text-blue-600 shrink-0" />
                <span>{detectedEncodingMsg}</span>
              </div>
            )}

            {/* SKELETON LOADER FOR GRID OR RENDER CONTENT */}
            {isInitialLoading ? (
              <div className="divide-y divide-slate-100 flex flex-col w-full animate-pulse">
                {Array.from({ length: 6 }).map((_, sIdx) => (
                  <div key={sIdx} className="p-5 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-slate-200 rounded-lg shrink-0" />
                      <div className="space-y-1.5 w-48">
                        <div className="h-4 bg-slate-200 rounded w-full" />
                        <div className="h-3 bg-slate-150 rounded w-2/3" />
                      </div>
                    </div>
                    <div className="h-6 bg-slate-200 rounded w-16" />
                    <div className="h-6 bg-slate-200 rounded w-24" />
                    <div className="h-8 w-12 bg-slate-200 rounded-full" />
                  </div>
                ))}
              </div>
            ) : (
              <>
                {/* MAIN DESKTOP GRID TABLE */}
                <div className="hidden md:block w-full overflow-x-auto border border-slate-200/80 rounded-xl">
                  <table className="w-full table-fixed border-collapse align-middle animate-fadeIn" style={{ minWidth: "100%", width: "100%" }}>
                  <colgroup>
                    <col style={{ width: "13%" }} />
                    <col style={{ width: "6%" }} />
                    <col style={{ width: "22%" }} />
                    <col style={{ width: "9%" }} />
                    <col style={{ width: "10%" }} />
                    <col style={{ width: "32%" }} />
                    <col style={{ width: "8%" }} />
                  </colgroup>
                  <thead className="bg-[#1F2937] text-white text-[11px] font-bold uppercase tracking-wider select-none shrink-0 border-b border-[#1F2937]">
                    <tr>
                      <th
                        onClick={() => handleSort("sku")}
                        className="px-4 py-3.5 text-right cursor-pointer hover:bg-slate-700 transition-colors"
                      >
                        <div className="flex items-center justify-start gap-1.5">
                          <span>{isRtl ? "מק״ט, קטגוריה ומדף" : "SKU, Category & Shelf"}</span>
                          {renderSortIndicator("sku")}
                        </div>
                      </th>
                      <th className="px-4 py-3.5 text-center">{isRtl ? "תמונה" : "Photo"}</th>
                      <th
                        onClick={() => handleSort("name")}
                        className="px-4 py-3.5 text-right cursor-pointer hover:bg-slate-700 transition-colors"
                      >
                        <div className="flex items-center justify-start gap-1.5">
                          <span>{isRtl ? "שם פריט" : "Item Display Name"}</span>
                          {renderSortIndicator("name")}
                        </div>
                      </th>
                      <th
                        onClick={() => handleSort("stock")}
                        className="px-4 py-3.5 text-center cursor-pointer hover:bg-slate-700 transition-colors"
                      >
                        <div className="flex items-center justify-center gap-1.5">
                          <span>{isRtl ? "מלאי" : "Inventory"}</span>
                          {renderSortIndicator("stock")}
                        </div>
                      </th>
                      <th
                        onClick={() => handleSort("price")}
                        className="px-4 py-3.5 text-right cursor-pointer hover:bg-slate-700 transition-colors"
                      >
                        <div className="flex items-center justify-start gap-1.5">
                          <span>{isRtl ? "מחיר" : "Price"}</span>
                          {renderSortIndicator("price")}
                        </div>
                      </th>
                      <th className="px-4 py-3.5 text-right">{isRtl ? "מאפיינים" : "Attributes"}</th>
                      <th className="px-4 py-3.5 text-center">{isRtl ? "פעולות" : "Actions"}</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-150/80 bg-white">
                    {currentItems.map((item, index) => {
                      // Fetch item linked attribute mappings
                      const itemLinkedMappings = itemMappings.filter((m) => m.itemId === item.sku);
                      const mappingsWithValues = itemLinkedMappings.filter((mapping) => {
                        const type = attributeTypes.find(
                          (t) => t.id === mapping.typeId && t.isActive && !t.isDeleted
                        );
                        if (!type) return false;
                        const allowedValsCount = type.values.filter(
                          (v) => v.isActive && !v.isDeleted && mapping.allowedValueIds.includes(v.id)
                        ).length;
                        return allowedValsCount > 0;
                      });

                      // Flatten values to render as elegant individual chips
                      const flatValues = mappingsWithValues.flatMap((mapping) => {
                        const type = attributeTypes.find((t) => t.id === mapping.typeId);
                        if (!type) return [];
                        return type.values
                          .filter((v) => mapping.allowedValueIds.includes(v.id) && v.isActive && !v.isDeleted)
                          .map((v) => ({
                            id: v.id,
                            label: isRtl ? v.valueHe : v.valueEn,
                            typeName: isRtl ? type.nameHe : type.nameEn,
                            isMandatory: mapping.isMandatory
                          }));
                      });

                      const maxChips = 15;
                      const visibleChips = flatValues.slice(0, maxChips);
                      const overflowCount = flatValues.length - maxChips;

                      const isSelected = selectedSkus.includes(item.sku);
                      const catTheme = getCategoryTheme(isRtl ? item.categoryHe : item.categoryEn);

                      return (
                        <tr
                          key={item.sku}
                          className={`group h-[76px] transition-all duration-150 align-middle hover:bg-slate-50 hover:shadow-2xs cursor-pointer ${
                            isSelected ? "bg-blue-50/15" : index % 2 === 0 ? "bg-white" : "bg-slate-50/25"
                          }`}
                        >
                          {/* SKU CODE, SHELF & CATEGORY (NO CROPPING) */}
                          <td className="px-4 py-3 align-middle text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                            <div className="flex flex-col items-start gap-1">
                              {onSkuClick ? (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onSkuClick(item.sku);
                                  }}
                                  className="font-mono text-blue-600 hover:text-blue-800 hover:underline font-bold text-xs cursor-pointer inline-block border border-blue-200/50 hover:border-blue-300 bg-blue-50/50 hover:bg-blue-50 rounded px-1.5 py-0.5 text-right tracking-wider shadow-3xs whitespace-nowrap"
                                  title={isRtl ? "לחץ להגדרת שיוך מאפיינים לפריט זה" : "Click to manage attribute mappings for this item"}
                                >
                                  {item.sku}
                                </button>
                              ) : (
                                <span className="font-mono text-slate-800 font-bold text-xs bg-slate-100 rounded px-1.5 py-0.5 border border-slate-205 whitespace-nowrap">
                                  {item.sku}
                                </span>
                              )}
                              <div className="flex items-center gap-1 text-[10px] text-slate-455 font-semibold whitespace-nowrap select-none">
                                <span className="font-bold shrink-0">{isRtl ? `מדף: ${item.shelf}` : `Shelf: ${item.shelf}`}</span>
                                <span className="text-slate-300">|</span>
                                <span className={`inline-flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] font-bold leading-none ${catTheme.bg} truncate max-w-[95px]`} title={isRtl ? item.categoryHe : item.categoryEn}>
                                  <span className="shrink-0">🏷️</span>
                                  <span className="truncate">{isRtl ? item.categoryHe : item.categoryEn}</span>
                                </span>
                              </div>
                            </div>
                          </td>

                          {/* PRODUCT BEAUTIFUL MINI IMAGE */}
                          <td className="px-4 py-3 text-center align-middle whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                            <div
                              onClick={() => {
                                if (!isAuthorized) {
                                  setErrorFeedback(
                                    isRtl
                                      ? "שגיאה: אין לך הרשאות ניהול (מנהל/אדמין) לעדכון פריטי הקטלוג."
                                      : "Error: You do not have sufficient permissions to update catalog files."
                                  );
                                  setTimeout(() => setErrorFeedback(null), 4000);
                                  return;
                                }
                                startEditImage(item);
                              }}
                              className="w-12 h-12 rounded-lg bg-slate-50 border border-slate-200 overflow-hidden flex items-center justify-center shrink-0 shadow-3xs relative group cursor-pointer hover:ring-2 hover:ring-blue-500 hover:scale-[1.03] transition-all duration-150 mx-auto"
                              title={isRtl ? "ערוך תמונת פריט" : "Edit product picture"}
                            >
                              <img
                                src={GetItemPrimaryImageBySku(item.sku, itemPictureUrls, isRtl)}
                                alt={isRtl ? item.nameHe : item.nameEn}
                                className="w-full h-full object-cover"
                                style={{ filter: item.imageFilter }}
                                referrerPolicy="no-referrer"
                                loading="lazy"
                              />
                              {isAuthorized && (
                                <div className="absolute inset-0 bg-slate-950/45 flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity">
                                  <Camera className="h-4.5 w-4.5 text-white" />
                                </div>
                              )}
                            </div>
                          </td>

                          {/* ITEM NAME */}
                          <td 
                            className="px-4 py-3 align-middle text-right truncate max-w-0"
                            title={`${isRtl ? item.nameHe : item.nameEn} | ${isRtl ? item.nameEn : item.nameHe}`}
                          >
                            <div className="font-extrabold text-xs sm:text-xs text-slate-900 truncate">
                              {isRtl ? item.nameHe : item.nameEn}
                            </div>
                            <div className="text-[10px] text-slate-455 mt-0.5 truncate font-medium flex items-center justify-end gap-1">
                              <span className="truncate">{isRtl ? item.nameEn : item.nameHe}</span>
                            </div>
                          </td>

                          {/* INVENTORY COUNT STATUS */}
                          <td className="px-4 py-3 text-center align-middle whitespace-nowrap">
                            {renderInventoryBadge(item.stock, isRtl ? item.unitHe : item.unitEn)}
                          </td>

                          {/* PRICE */}
                          <td className="px-4 py-3 align-middle whitespace-nowrap text-right">
                            <strong className="font-mono text-slate-900 text-xs sm:text-sm tracking-tight font-black">
                              ₪{item.price.toFixed(2)}
                            </strong>
                            <span className="text-[9px] text-slate-400 block font-semibold leading-tight">
                              {isRtl ? "מע\"מ כלול" : "VAT incl."}
                            </span>
                          </td>

                          {/* SPECIAL COMPACT ATTRIBUTES CHIPS (NO CROPPING) */}
                          <td 
                            className="px-4 py-3 align-middle relative text-right cursor-pointer hover:bg-slate-50/70 transition-colors select-none"
                            onClick={() => setAttributesModalItem(item)}
                          >
                            {flatValues.length > 0 ? (
                              <div className="flex flex-wrap items-center gap-1.5 justify-end">
                                {visibleChips.map((chip) => (
                                  <span
                                    key={chip.id}
                                    className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9.5px] font-bold bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-205 transition-colors shadow-3xs cursor-default whitespace-nowrap shrink-0"
                                    title={`${chip.typeName}: ${chip.label}`}
                                  >
                                    <span>{chip.label}</span>
                                  </span>
                                ))}

                                {overflowCount > 0 && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setAttributesModalItem(item);
                                    }}
                                    type="button"
                                    className="px-1.5 py-0.5 text-[10px] font-black bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-700 rounded shadow-3xs transition cursor-pointer select-none"
                                    title={isRtl ? "הצג את כל המאפיינים ששוייכו" : "Click to view all configuration parameters"}
                                  >
                                    +{overflowCount}
                                  </button>
                                )}
                              </div>
                            ) : null}


                          </td>

                          {/* ROW ACTIONS MENU DROPDOWN */}
                          <td className="px-4 py-3 text-center align-middle whitespace-nowrap relative" onClick={(e) => e.stopPropagation()}>
                            <div className="relative flex items-center justify-center">
                              {/* Show menu trigger (MoreVertical) always */}
                              <div className="transition-opacity duration-150 opacity-100">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setActiveActionMenuSku(activeActionMenuSku === item.sku ? null : item.sku);
                                  }}
                                  className="p-1 px-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 transition cursor-pointer shadow-3xs"
                                  title={isRtl ? "פעולות" : "Actions"}
                                >
                                  <span className="font-bold text-xs select-none">⋮</span>
                                </button>
                              </div>

                              {/* Action List Popover */}
                              {activeActionMenuSku === item.sku && (
                                <>
                                  <div
                                    className="fixed inset-0 z-40 bg-transparent"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setActiveActionMenuSku(null);
                                    }}
                                  />
                                  <div className={`absolute z-50 mt-1 w-44 rounded-xl bg-white border border-slate-200 shadow-xl py-1.5 space-y-0.5 text-right ${isRtl ? "left-0" : "right-0"} text-slate-705 animate-fadeIn`}>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setDetailsItem(item);
                                        setActiveActionMenuSku(null);
                                      }}
                                      className="w-full font-semibold text-right px-3 py-2 text-xs hover:bg-slate-50 flex items-center gap-2 text-slate-705 cursor-pointer"
                                    >
                                      <Eye className="h-3.5 w-3.5 text-slate-450" />
                                      <span>{isRtl ? "פרטי פריט" : "View Details"}</span>
                                    </button>

                                    {isAuthorized && (
                                      <>
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            startEditImage(item);
                                            setActiveActionMenuSku(null);
                                          }}
                                          className="w-full font-semibold text-right px-3 py-2 text-xs hover:bg-slate-50 flex items-center gap-2 text-slate-705 cursor-pointer"
                                        >
                                          <Camera className="h-3.5 w-3.5 text-slate-450" />
                                          <span>{isRtl ? "עריכת תמונה ושם" : "Edit Photo & Name"}</span>
                                        </button>

                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setDetailsItem(item); // opens in modal triggers history view
                                            setActiveActionMenuSku(null);
                                          }}
                                          className="w-full font-semibold text-right px-3 py-2 text-xs hover:bg-slate-50 flex items-center gap-2 text-slate-755 cursor-pointer hidden"
                                        >
                                          <History className="h-3.5 w-3.5 text-slate-450" />
                                          <span>{isRtl ? "היסטוריית שינויים" : "View History"}</span>
                                        </button>

                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleDuplicateItem(item);
                                            setActiveActionMenuSku(null);
                                          }}
                                          className="w-full font-semibold text-right px-3 py-2 text-xs hover:bg-slate-50 flex items-center gap-2 text-slate-705 hover:text-blue-700 cursor-pointer"
                                        >
                                          <Copy className="h-3.5 w-3.5 text-slate-450" />
                                          <span>{isRtl ? "שכפל פריט" : "Duplicate Item"}</span>
                                        </button>
                                      </>
                                    )}
                                  </div>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* MOBILE VIEW CARD-BASED LAYOUT */}
            <div className="block md:hidden divide-y divide-slate-150">
              {currentItems.map((item) => {
                const itemLinkedMappings = itemMappings.filter((m) => m.itemId === item.sku);
                const mappingsWithValues = itemLinkedMappings.filter((mapping) => {
                  const type = attributeTypes.find((t) => t.id === mapping.typeId);
                  if (!type) return false;
                  return type.values.some((v) => mapping.allowedValueIds.includes(v.id));
                });

                const isExpanded = expandedMobileCards.includes(item.sku);
                const catTheme = getCategoryTheme(isRtl ? item.categoryHe : item.categoryEn);

                return (
                  <div key={item.sku} className="p-4 space-y-3 bg-white hover:bg-slate-50/50 transition duration-150">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        {onSkuClick ? (
                          <button
                            type="button"
                            onClick={() => onSkuClick(item.sku)}
                            className="font-mono text-blue-600 hover:underline font-bold text-xs bg-blue-50/60 rounded border border-blue-100 px-2 py-0.5 text-right shrink-0"
                          >
                            {item.sku}
                          </button>
                        ) : (
                          <span className="font-mono text-slate-800 font-bold text-xs bg-slate-100 rounded px-2 py-0.5">
                            {item.sku}
                          </span>
                        )}
                        <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-semibold ${catTheme.bg}`}>
                          {catTheme.icon}
                          <span>{isRtl ? item.categoryHe : item.categoryEn}</span>
                        </span>
                      </div>

                      {/* Item Stock status */}
                      {renderInventoryBadge(item.stock, isRtl ? item.unitHe : item.unitEn)}
                    </div>

                    <div className="flex gap-3 justify-between items-start">
                      <div className="flex-1 min-w-0">
                        <h4 className="font-extrabold text-sm text-slate-900 leading-snug text-right break-words pt-1">
                          {isRtl ? item.nameHe : item.nameEn}
                        </h4>
                        <span className="text-[10px] font-mono text-slate-400 block mt-1">
                          {isRtl ? "שם משני:" : "Subtitle name:"} {isRtl ? item.nameEn : item.nameHe}
                        </span>
                        <div className="mt-2 text-right">
                          <span className="text-slate-400 block text-[10px]">{isRtl ? "מיקום מדף" : "Shelf Space"}</span>
                          <strong className="text-slate-700 font-mono text-xs">{item.shelf}</strong>
                        </div>
                      </div>

                      {/* Product mobile circular action image */}
                      <button
                        onClick={() => {
                          if (!isAuthorized) {
                            setErrorFeedback(
                              isRtl
                                ? "שגיאה: אין לך הרשאות ניהול (מנהל/אדמין) לעדכון פריטי הקטלוג."
                                : "Error: You do not have sufficient permissions to update catalog files."
                            );
                            setTimeout(() => setErrorFeedback(null), 4000);
                            return;
                          }
                          startEditImage(item);
                        }}
                        className={`w-14 h-14 rounded-xl bg-slate-100 border border-slate-205 overflow-hidden flex items-center justify-center shrink-0 shadow-3xs relative group ${
                          isAuthorized ? "cursor-pointer" : "cursor-not-allowed opacity-95"
                        }`}
                      >
                        <img
                          src={GetItemPrimaryImageBySku(item.sku, itemPictureUrls, isRtl)}
                          alt={isRtl ? item.nameHe : item.nameEn}
                          className="w-full h-full object-cover"
                          style={{ filter: item.imageFilter }}
                          referrerPolicy="no-referrer"
                        />
                        {isAuthorized && (
                          <div className="absolute inset-0 bg-black/45 flex items-center justify-center text-white opacity-40">
                            <Camera className="h-3.5 w-3.5" />
                          </div>
                        )}
                      </button>
                    </div>

                    <div className="flex items-center justify-between border-t border-slate-100 pt-2 text-xs">
                      <div>
                        <span className="text-slate-400 block text-[10px]">{isRtl ? "מחיר יחידה" : "Unit Price"}</span>
                        <strong className="font-mono text-slate-950 text-sm">₪{item.price.toFixed(2)}</strong>
                      </div>

                      <div className="flex gap-2">
                        {isAuthorized && (
                          <button
                            onClick={() => handleDuplicateItem(item)}
                            className="px-2.5 py-1 rounded bg-slate-100 text-slate-600 text-[11px] font-semibold border border-slate-205 flex items-center gap-1 cursor-pointer"
                          >
                            <Copy className="h-3 w-3" />
                            <span>{isRtl ? "שכפל" : "Duplicate"}</span>
                          </button>
                        )}
                        <button
                          onClick={() => setDetailsItem(item)}
                          className="px-2.5 py-1 rounded bg-slate-100 text-slate-600 text-[11px] font-semibold border border-slate-205 flex items-center gap-1 cursor-pointer"
                        >
                          <Eye className="h-3 w-3" />
                          <span>{isRtl ? "פרטים" : "Details"}</span>
                        </button>
                      </div>
                    </div>

                    {/* ATTRIBUTES EXPANDABLE TRAY IN MOBILE */}
                    {mappingsWithValues.length > 0 && (
                      <div className="bg-slate-50 rounded-xl p-2.5 border border-slate-150">
                        <button
                          type="button"
                          onClick={() => toggleMobileCardExpand(item.sku)}
                          className="w-full flex items-center justify-between text-[11px] font-extrabold text-slate-800"
                        >
                          <span>{isRtl ? "מאפיינים ונתוני שיוך פריט" : "Linked Product Attributes"}</span>
                          <span className="text-blue-600">
                            {isExpanded ? (isRtl ? "הצג פחות" : "Collapse") : `(הצג ${mappingsWithValues.length})`}
                          </span>
                        </button>

                        {isExpanded && (
                          <div className="mt-2.5 space-y-1.5 pt-2 border-t border-dashed border-slate-200">
                            {mappingsWithValues.map((mapping) => {
                              const type = attributeTypes.find((t) => t.id === mapping.typeId);
                              if (!type) return null;
                              const allowedVals = type.values
                                .filter((v) => mapping.allowedValueIds.includes(v.id))
                                .map((v) => (isRtl ? v.valueHe : v.valueEn));

                              return (
                                <div key={mapping.typeId} className="p-2 bg-white rounded border border-slate-150 text-[11px] text-slate-700 leading-snug">
                                  <div className="font-bold text-slate-900 flex items-center gap-1 justify-end">
                                    <span>{isRtl ? type.nameHe : type.nameEn}</span>
                                    {mapping.isMandatory && <span className="text-rose-500 font-bold">*</span>}
                                  </div>
                                  <p className="mt-0.5 font-semibold text-slate-600 text-right leading-relaxed">
                                    {allowedVals.join(", ")}
                                  </p>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}

        {/* EMPTY STATE COMPONENT */}
            {sortedItems.length === 0 && (
              <div className="px-5 py-20 text-center space-y-4 max-w-md mx-auto animate-fadeIn">
                <span className="p-4 rounded-full bg-slate-50 border border-slate-100 text-slate-300 inline-block shadow-inner">
                  <Search className="h-10 w-10 text-slate-350" />
                </span>
                <div className="space-y-1">
                  <h3 className="text-base font-extrabold text-slate-805">
                    {isRtl ? "אין פריטים תואמים!" : "No warehouse records matches"}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {isRtl
                      ? "לא מצאנו פריטי קטלוג עבור החיפוש שלך. נסה לשנות את מילת המפתח או לנקות את המסנן."
                      : "No items match your constraints. Please check spellings or refresh inputs."}
                  </p>
                </div>
                {(searchInput || searchTerm) && (
                  <button
                    onClick={() => {
                      setSearchInput("");
                      setSearchTerm("");
                    }}
                    className="px-4 py-2 bg-slate-900 hover:bg-slate-805 text-white text-xs font-bold rounded-xl transition shadow-sm cursor-pointer"
                  >
                    {isRtl ? "נקה את מסנן החיפוש" : "Clear Active Filters"}
                  </button>
                )}
              </div>
            )}

            {/* LOWER PAGINATION COMPONENT BAR */}
            <div className="bg-slate-50/70 px-5 py-3.5 border-t border-slate-200 flex flex-col sm:flex-row justify-between items-center gap-4 text-xs text-slate-700 select-none">
              {/* Rows limits picker */}
              <div className="flex items-center gap-1.5">
                <span className="font-semibold text-slate-450">{isRtl ? "פריטים לעמוד:" : "Rows limit size:"}</span>
                <select
                  value={rowsPerPage}
                  onChange={(e) => {
                    setRowsPerPage(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-blue-100 cursor-pointer text-slate-800 shadow-sm transition"
                >
                  <option value={5}>5</option>
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={30}>30</option>
                  <option value={50}>50</option>
                </select>
              </div>

              {/* Statistics elements range */}
              <div className="font-bold text-slate-600">
                {isRtl ? (
                  <span>
                    מציג <span className="font-mono text-blue-700 font-extrabold">{fromItem}-{toItem}</span> מתוך{" "}
                    <span className="font-mono text-slate-900 font-extrabold">{sortedItems.length}</span> פריטים קטלוגיים
                  </span>
                ) : (
                  <span>
                    Showing <span className="font-mono text-blue-700 font-extrabold">{fromItem}-{toItem}</span> of{" "}
                    <span className="font-mono text-slate-930 font-extrabold">{sortedItems.length}</span> catalog rows
                  </span>
                )}
              </div>

              {/* Navigation button toggles */}
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  onClick={() => setCurrentPage(1)}
                  disabled={safeCurrentPage === 1}
                  className="p-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-650 disabled:opacity-45 disabled:hover:bg-white disabled:cursor-not-allowed transition cursor-pointer flex items-center justify-center shadow-3xs"
                  title={isRtl ? "לעמוד הראשון" : "First Page"}
                >
                  {isRtl ? <ChevronsRight className="h-4 w-4" /> : <ChevronsLeft className="h-4 w-4" />}
                </button>

                <button
                  onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                  disabled={safeCurrentPage === 1}
                  className="p-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-650 disabled:opacity-45 disabled:hover:bg-white disabled:cursor-not-allowed transition cursor-pointer flex items-center justify-center shadow-3xs"
                  title={isRtl ? "לעמוד הקודם" : "Previous Page"}
                >
                  {isRtl ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
                </button>

                <div className="flex items-center gap-1 select-none">
                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter((page) => {
                      return page === 1 || page === totalPages || Math.abs(page - safeCurrentPage) <= 1;
                    })
                    .map((page, idx, arr) => {
                      const elements = [];
                      if (idx > 0 && page - arr[idx - 1] > 1) {
                        elements.push(
                          <span key={`ellipse-${page}`} className="px-1.5 text-slate-400 font-bold select-none">
                            ...
                          </span>
                        );
                      }
                      elements.push(
                        <button
                          key={page}
                          onClick={() => setCurrentPage(page)}
                          className={`w-8 h-8 flex items-center justify-center rounded-lg border text-xs font-bold transition select-none cursor-pointer ${
                            safeCurrentPage === page
                              ? "bg-slate-900 text-white border-slate-900 shadow-sm"
                              : "bg-white border-slate-300 hover:bg-slate-50 text-slate-700 hover:text-slate-900"
                          }`}
                        >
                          {page}
                        </button>
                      );
                      return elements;
                    })}
                </div>

                <button
                  onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                  disabled={safeCurrentPage === totalPages}
                  className="p-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-650 disabled:opacity-45 disabled:hover:bg-white disabled:cursor-not-allowed transition cursor-pointer flex items-center justify-center shadow-3xs"
                  title={isRtl ? "לעמוד הבא" : "Next Page"}
                >
                  {isRtl ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                </button>

                <button
                  onClick={() => setCurrentPage(totalPages)}
                  disabled={safeCurrentPage === totalPages}
                  className="p-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-650 disabled:opacity-45 disabled:hover:bg-white disabled:cursor-not-allowed transition cursor-pointer flex items-center justify-center shadow-3xs"
                  title={isRtl ? "לעמוד האחרון" : "Last Page"}
                >
                  {isRtl ? <ChevronsLeft className="h-4 w-4" /> : <ChevronsRight className="h-4 w-4" />}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* RICH DYNAMIC PRODUCT DETAILS MODAL */}
      {detailsItem && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/65 backdrop-blur-xs overflow-y-auto animate-fadeIn"
          style={{ direction: isRtl ? "rtl" : "ltr" }}
        >
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="bg-[#1F2937] text-white p-4.5 flex justify-between items-center shrink-0">
              <div className="flex items-center gap-2.5">
                <Compass className="h-5 w-5 text-blue-400 shrink-0" />
                <h3 className="font-extrabold text-base sm:text-lg tracking-tight">
                  {isRtl ? "כרטיס מידע טכני מורחב לפריט" : "Extended Technical Product Sheet"}
                </h3>
              </div>
              <button
                onClick={() => setDetailsItem(null)}
                className="p-1.5 rounded-full hover:bg-slate-700 text-slate-300 hover:text-white transition cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1 space-y-6 bg-slate-50">
              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-3xs sm:flex gap-5 items-start">
                {/* Product large photo view */}
                <div className="w-24 h-24 rounded-2xl border border-slate-205 overflow-hidden justify-center items-center flex shrink-0 bg-slate-100 shadow-3xs mx-auto mb-4 sm:mb-0">
                  <img
                    src={GetItemPrimaryImageBySku(detailsItem.sku, itemPictureUrls, isRtl)}
                    alt={detailsItem.nameEn}
                    className="w-full h-full object-cover"
                    style={{ filter: detailsItem.imageFilter }}
                    referrerPolicy="no-referrer"
                  />
                </div>

                <div className="flex-1 space-y-1.5 text-right sm:text-right">
                  <span className="font-mono text-xs font-extrabold bg-blue-50 text-blue-800 border border-blue-100 rounded-md px-2.5 py-1 tracking-wider inline-block">
                    {detailsItem.sku}
                  </span>
                  <h2 className="text-xl font-black text-slate-900 tracking-tight leading-snug break-words">
                    {isRtl ? detailsItem.nameHe : detailsItem.nameEn}
                  </h2>
                  <p className="text-xs text-slate-450 tracking-wide">
                    {isRtl ? "שם בלטינית / אנגלית:" : "Alternative description:"} <span className="font-medium text-slate-600">{isRtl ? detailsItem.nameEn : detailsItem.nameHe}</span>
                  </p>
                </div>
              </div>

              {/* Core technical specifications grid */}
              <div className="grid grid-cols-2 gap-4 text-right">
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-3xs">
                  <span className="text-slate-400 text-[10px] block font-bold uppercase">{isRtl ? "מלאי פעיל בקובץ" : "Active Stock"}</span>
                  <div className="mt-1.5">{renderInventoryBadge(detailsItem.stock, isRtl ? detailsItem.unitHe : detailsItem.unitEn)}</div>
                </div>

                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-3xs">
                  <span className="text-slate-400 text-[10px] block font-bold uppercase">{isRtl ? "קטגוריית מערכת" : "Category"}</span>
                  <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold mt-1 bg-radial ${getCategoryTheme(isRtl ? detailsItem.categoryHe : detailsItem.categoryEn).bg}`}>
                    {getCategoryTheme(isRtl ? detailsItem.categoryHe : detailsItem.categoryEn).icon}
                    <span>{isRtl ? detailsItem.categoryHe : detailsItem.categoryEn}</span>
                  </span>
                </div>

                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-3xs">
                  <span className="text-slate-400 text-[10px] block font-bold uppercase">{isRtl ? "מיקום מדף פיזי" : "Physical Locator"}</span>
                  <strong className="font-mono text-slate-800 text-base font-black tracking-tight mt-1.5 block">{detailsItem.shelf}</strong>
                </div>

                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-3xs">
                  <span className="text-slate-400 text-[10px] block font-bold uppercase">{isRtl ? "מחיר יחידה רשמי" : "Catalog Price"}</span>
                  <strong className="font-mono text-slate-950 text-base font-black tracking-tight mt-1.5 block">₪{detailsItem.price.toFixed(2)}</strong>
                </div>
              </div>

              {/* LIST ALL LINKED ATTRIBUTES FROM PARIT SKUS */}
              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-3xs text-right">
                <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-500 border-b border-slate-100 pb-2 mb-3.5">
                  {isRtl ? "מאפייני מוצר ששוייכו טכנולוגית בקטלוג" : "Active Associated Product Parameters"}
                </h4>

                {itemMappings.filter((m) => m.itemId === detailsItem.sku).length > 0 ? (
                  <div className="space-y-3">
                    {itemMappings
                      .filter((m) => m.itemId === detailsItem.sku)
                      .map((mapping) => {
                        const type = attributeTypes.find((t) => t.id === mapping.typeId);
                        if (!type) return null;
                        const allowedVals = type.values
                          .filter((v) => mapping.allowedValueIds.includes(v.id))
                          .map((v) => (isRtl ? v.valueHe : v.valueEn));

                        return (
                          <div
                            key={mapping.typeId}
                            className="p-3 bg-slate-50 hover:bg-slate-100/75 rounded-lg border border-slate-200 text-xs flex justify-between items-center transition"
                          >
                            <div className="text-left font-mono font-bold text-slate-900">
                              {allowedVals.join(", ")}
                            </div>
                            <div className="flex items-center gap-1.5">
                              {mapping.isMandatory && (
                                <span className="bg-rose-100 text-rose-705 px-1.5 py-0.5 font-bold rounded text-[10px]">
                                  {isRtl ? "חובה *" : "Mandatory *"}
                                </span>
                              )}
                              <span className="font-bold text-slate-700">{isRtl ? type.nameHe : type.nameEn}</span>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 italic font-semibold">
                    {isRtl
                      ? "לא נמצאו מאפיינים מוגדרים עבור פריט זה בקטלוג."
                      : "No descriptive parameters configured for this SKU."}
                  </p>
                )}
              </div>

              {/* SIMULATED AUDIT HISTORICAL MODIFIER TRAIL */}
              <div className="hidden bg-white p-5 rounded-xl border border-slate-200 shadow-3xs text-right">
                <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-500 border-b border-slate-100 pb-2 mb-3">
                  {isRtl ? "יומן היסטוריית שינויים ועדכונים לפריט" : "Associated Modification and Activity Feed"}
                </h4>

                <div className="space-y-3 font-medium">
                  <div className="flex gap-3 justify-between items-start text-xs text-slate-700 p-2.5 rounded bg-amber-50/55 border border-amber-100">
                    <span className="font-mono text-slate-400 flex items-center gap-1 select-none">
                      <Calendar className="h-3 w-3 inline shrink-0" />
                      <span>2026-06-15 09:32</span>
                    </span>
                    <div className="space-y-1 text-right">
                      <p className="font-bold text-slate-900">
                        {isRtl ? "עדכון תמונת מוצר ועריכת פילטר עיבוד" : "Re-assigned new base product image URL"}
                      </p>
                      <p className="text-[10px] text-slate-500 flex items-center gap-1 justify-end">
                        <span>{isRtl ? "עודכן על ידי: מנהל מחסן מורשה" : "Modified by: Approved Warehouse manager"}</span>
                        <User className="h-3 w-3 inline shrink-0" />
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-3 justify-between items-start text-xs text-slate-705 p-2.5 rounded bg-slate-50/80 border border-slate-200">
                    <span className="font-mono text-slate-400 flex items-center gap-1 select-none">
                      <Calendar className="h-3 w-3 inline shrink-0" />
                      <span>2026-06-10 11:15</span>
                    </span>
                    <div className="space-y-1 text-right">
                      <p className="font-bold text-slate-900 animate-pulse">
                        {isRtl ? `כוון מדף פיזי במחסן למיקום: ${detailsItem.shelf}` : `Shelf alignment revised to: ${detailsItem.shelf}`}
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-3 justify-between items-start text-xs text-slate-700 p-2.5 rounded bg-slate-50/80 border border-slate-200">
                    <span className="font-mono text-slate-400 flex items-center gap-1 select-none">
                      <Calendar className="h-3 w-3 inline shrink-0" />
                      <span>2026-06-01 08:00</span>
                    </span>
                    <div className="space-y-1 text-right">
                      <p className="font-bold text-slate-900">
                        {isRtl ? "טעינה ראשונית של רשומת קטלוג בייבוא CSV" : "First master catalog table records feed"}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-4 bg-slate-100 border-t border-slate-200 text-right flex justify-between items-center sm:gap-4 shrink-0">
              <span className="text-[11px] font-bold text-slate-400 font-mono tracking-wider">
                ID: {detailsItem.sku}-SYS
              </span>
              <button
                onClick={() => setDetailsItem(null)}
                className="px-5 py-2.5 bg-slate-900 hover:bg-slate-805 text-white rounded-xl text-xs font-bold cursor-pointer transition select-none flex items-center gap-1.5"
              >
                <Check className="h-4 w-4" />
                <span>{isRtl ? "אישור" : "Done"}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* VIEW EXTENDED DESCRIPTION & MULTI-ALLOWED ATTRIBUTES MODAL OVERLAY */}
      {attributesModalItem && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/65 backdrop-blur-xs overflow-y-auto animate-fadeIn"
          style={{ direction: isRtl ? "rtl" : "ltr" }}
          id="item-attributes-modal"
        >
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm sm:max-w-md w-full border border-slate-200 overflow-hidden flex flex-col max-h-[85vh]">
            {/* Modal Header */}
            <div className="bg-[#1F2937] text-white p-4.5 flex justify-between items-center shrink-0">
              <div className="flex items-center gap-2">
                <Tag className="h-5 w-5 text-blue-400 shrink-0" />
                <h3 className="font-extrabold text-base tracking-tight">
                  {isRtl ? "מאפייני פריט קטלוגי" : "Catalog Item Attributes"}
                </h3>
              </div>
              <button
                onClick={() => setAttributesModalItem(null)}
                className="p-1.5 rounded-full hover:bg-slate-700 text-slate-300 hover:text-white transition cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 overflow-y-auto flex-1 space-y-5 bg-slate-50 text-right">
              {/* Product Info Block */}
              <div className="bg-white p-4.5 rounded-2xl border border-slate-200 shadow-3xs flex flex-col gap-1.5 text-center">
                <span className="text-[10px] text-slate-400 font-bold tracking-widest uppercase font-mono">{attributesModalItem.sku}</span>
                <p className="font-extrabold text-sm text-slate-900 leading-relaxed">
                  {isRtl ? attributesModalItem.nameHe : attributesModalItem.nameEn}
                </p>
              </div>

              {/* Attributes Tags Grid */}
              <div className="space-y-4">
                {itemMappings
                  .filter((m) => m.itemId === attributesModalItem.sku)
                  .map((mapping) => {
                    const type = attributeTypes.find((t) => t.id === mapping.typeId);
                    if (!type) return null;
                    const allowedValuesList = type.values.filter(
                      (v) => mapping.allowedValueIds.includes(v.id) && v.isActive && !v.isDeleted
                    );
                    if (allowedValuesList.length === 0) return null;

                    return (
                      <div
                        key={mapping.typeId}
                        className="bg-[#EDF5FF] p-4 rounded-2xl border border-blue-100 text-center flex flex-col items-center shadow-3xs"
                      >
                        <div className="font-extrabold text-blue-900 text-sm mb-3 flex items-center justify-center gap-1.5 pb-2 border-b border-blue-200/40 w-full">
                          <span>{isRtl ? type.nameHe : type.nameEn}</span>
                          {mapping.isMandatory && (
                            <span className="text-rose-500 font-black" title={isRtl ? "חובה" : "Required"}>*</span>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-1.5 justify-center">
                          {allowedValuesList.map((val) => (
                            <span 
                              key={val.id} 
                              className="px-2.5 py-1 inline-flex items-center justify-center rounded-full border border-blue-200 bg-white text-blue-600 text-[10.5px] font-bold shadow-3xs"
                            >
                              {isRtl ? val.valueHe : val.valueEn}
                            </span>
                          ))}
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 bg-slate-100 border-t border-slate-200 text-center shrink-0">
              <button
                type="button"
                onClick={() => setAttributesModalItem(null)}
                className="w-full sm:w-auto px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl cursor-pointer transition select-none"
              >
                {isRtl ? "סגור חלון" : "Close Overlay"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MAGNIFICENT INTERACTIVE PRODUCT IMAGE EDITOR & MULTI-GALLERY DECISION WORKSPACE */}
      {editingItem && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xs overflow-y-auto animate-fadeIn"
          style={{ direction: isRtl ? "rtl" : "ltr" }}
          id="product-image-editor-modal"
        >
          <div className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full border border-slate-200 overflow-hidden flex flex-col my-4 max-h-[90vh] md:max-h-[95vh]">
            {/* Modal Header */}
            <div className="bg-[#1F2937] text-white p-4.5 flex justify-between items-center shrink-0">
              <div className="flex items-center gap-2">
                <Camera className="h-5 w-5 text-blue-400" />
                <h3 className="font-bold text-base sm:text-lg tracking-tight">
                  {isRtl ? `פרטי הפריט ומסד גלריית תמונות — מק"ט ${editingItem.sku}` : `Product Identifiers & Multi-image Gallery — SKU ${editingItem.sku}`}
                </h3>
              </div>
              <button
                onClick={() => setEditingItem(null)}
                className="p-1.5 rounded-full hover:bg-slate-700 text-slate-300 hover:text-white transition cursor-pointer"
                title={isRtl ? "סגור" : "Close"}
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Content - Dual Column Scroll Area */}
            <div className="p-4 sm:p-6 overflow-y-auto flex-1 bg-slate-50 flex flex-col gap-5">
              {/* TOP SECTION: Edit Item Description in Catalog */}
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-3xs space-y-4 text-slate-800">
                <div className="flex items-center gap-1.5 border-b border-slate-150 pb-2">
                  <Info className="h-4 w-4 text-blue-600 shrink-0" />
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    {isRtl ? "פרטים לזיהוי ועריכת פריט בקטלוג" : "Catalog Item Identifiers & Re-labeling"}
                  </h4>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5 text-right">
                    <label className="text-xs font-bold text-slate-500 block">{isRtl ? "תיאור פריט בעברית" : "Item Description (HE):"}</label>
                    <input
                      type="text"
                      disabled={!isAuthorized}
                      value={editedItemNameHe}
                      onChange={(e) => setEditedItemNameHe(e.target.value)}
                      className="w-full text-xs bg-slate-50 border border-slate-280 rounded-lg p-2.5 focus:outline-none focus:ring-2 focus:ring-blue-100 text-right font-medium disabled:opacity-70"
                      placeholder="הזן שם בעברית..."
                    />
                  </div>

                  <div className="space-y-1.5 text-right">
                    <label className="text-xs font-bold text-slate-500 block">{isRtl ? "תיאור פריט באנגלית" : "Item Description (EN):"}</label>
                    <input
                      type="text"
                      disabled={!isAuthorized}
                      value={editedItemNameEn}
                      onChange={(e) => setEditedItemNameEn(e.target.value)}
                      className="w-full text-xs bg-slate-50 border border-slate-280 rounded-lg p-2.5 focus:outline-none focus:ring-2 focus:ring-blue-100 text-left font-medium disabled:opacity-70"
                      style={{ direction: "ltr" }}
                      placeholder="Enter description in English..."
                    />
                  </div>
                </div>
              </div>

              {/* DUAL COLUMN GRID */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
                
                {/* LEFT COLUMN (4 Cols): Image Real-time Filter & Sliders Adjustments */}
                <div className="md:col-span-4 space-y-4">
                  <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-3xs space-y-3.5">
                    <div className="flex justify-between items-center">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-550">
                        {isRtl ? "תצוגה מקדימה" : "Photo Adjustments"}
                      </h4>
                      <span className="text-[10px] font-mono text-slate-400 font-bold bg-slate-100 px-2 py-0.5 rounded">
                        {isRtl ? "פעיל" : "Active"}
                      </span>
                    </div>

                    {/* Primary Image Preview Slot */}
                    <div className="relative aspect-square max-h-[220px] w-full rounded-xl bg-slate-100 border border-slate-200 overflow-hidden flex items-center justify-center shadow-inner group mx-auto">
                      {tempImageUrl ? (
                        <img
                          src={tempImageUrl}
                          alt="Product Preview"
                          className="w-full h-full object-cover transition-all"
                          style={{
                            filter: `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%) grayscale(${grayscale}%) sepia(${sepia}%) blur(${blur}px)`,
                          }}
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className="text-center p-4">
                          <ImageIcon className="h-10 w-10 text-slate-300 mx-auto mb-2" />
                          <span className="text-[11px] text-slate-450 block font-bold leading-relaxed">
                            {isRtl ? "גלריה ריקה. אנא בחר/הוסף תמונה" : "Empty gallery. Select/Add photo first."}
                          </span>
                        </div>
                      )}

                      <div className="absolute bottom-2 left-2 right-2 flex justify-between pointer-events-none">
                        <span className="text-[8px] font-bold bg-slate-900/75 text-white px-1.5 py-0.5 rounded backdrop-blur-xs font-mono uppercase tracking-wider">
                          {isRtl ? "וולקני חקלאות" : "Volcani Agri"}
                        </span>
                      </div>
                    </div>

                    {/* Fast Reset Controls */}
                    <div className="flex justify-between items-center gap-2 pt-1.5 border-t border-slate-100">
                      <button
                        type="button"
                        onClick={() => {
                          setBrightness(100);
                          setContrast(100);
                          setSaturation(100);
                          setGrayscale(0);
                          setSepia(0);
                          setBlur(0);
                        }}
                        className="w-full py-1.5 text-blue-700 hover:bg-blue-50 text-[10px] font-bold rounded-lg border border-slate-200 hover:border-blue-200 transition cursor-pointer flex items-center justify-center gap-1"
                      >
                        <RefreshCw className="h-3 w-3 shrink-0" />
                        <span>{isRtl ? "אפס אפקטים" : "Reset Sliders"}</span>
                      </button>
                    </div>

                    {/* Compact sliders adjustment */}
                    <div className="space-y-2 pt-1 text-[10px] text-slate-700">
                      <div>
                        <div className="flex justify-between font-bold">
                          <span>{isRtl ? "בהירות:" : "Brightness:"}</span>
                          <span className="font-mono">{brightness}%</span>
                        </div>
                        <input
                          type="range" min="55" max="185" value={brightness}
                          onChange={(e) => setBrightness(Number(e.target.value))}
                          className="w-full h-1 bg-slate-150 rounded"
                        />
                      </div>
                      <div>
                        <div className="flex justify-between font-bold">
                          <span>{isRtl ? "טשטוש:" : "Blur:"}</span>
                          <span className="font-mono">{blur}px</span>
                        </div>
                        <input
                          type="range" min="0" max="6" value={blur}
                          onChange={(e) => setBlur(Number(e.target.value))}
                          className="w-full h-1 bg-slate-150 rounded"
                        />
                      </div>
                    </div>

                  </div>
                </div>

                {/* RIGHT COLUMN (8 Cols): The Decoupled multi-image Workspace */}
                <div className="md:col-span-8 space-y-4">
                  
                  {/* WORKSPACE NAV CONTAINER */}
                  <div className="bg-white p-4.5 rounded-xl border border-slate-200 shadow-3xs space-y-4">
                    <div className="flex justify-between items-center border-b border-slate-150 pb-2">
                      <h4 className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                        <Database className="h-4 w-4 text-blue-600shrink-0" />
                        <span>{isRtl ? `ניהול גלריית תמונות פריט (${currentSkuPics.length})` : `Sku Image Database Manager (${currentSkuPics.length})`}</span>
                      </h4>
                      <span className="text-[10px] font-mono font-bold bg-slate-100 text-slate-500 px-2 py-0.5 rounded">
                        TABLE: itempictureurls
                      </span>
                    </div>

                    {/* LIVE VIEW TAB: THE MAPPED IMAGE RECORDS */}
                    <div className="space-y-3">
                      <div className="text-[11px] text-slate-500 leading-relaxed font-semibold">
                        {isRtl 
                          ? "תמונות אלו מקושרות לפריט דרך המק\"ט במחיצה נפרדת ואינן נמחקות בעת טעינת קטלוג חדש." 
                          : "These images are bound securely by SKU, stored independently, and survive any catalog imports."}
                      </div>

                      {/* Decoupled DB collection table layout */}
                      {currentSkuPics.length === 0 ? (
                        <div className="p-6 text-center border-2 border-dashed border-slate-200 rounded-xl bg-slate-50/50">
                          <ImageIcon className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                          <h5 className="text-xs font-bold text-slate-500">
                            {isRtl ? "לא נמצאו תמונות במסד עבור מק\"ט זה" : "No independent image URLs registered."}
                          </h5>
                          <p className="text-[10px] text-slate-400 mt-1">
                            {isRtl ? "ניתן להוסיף כתובות או לבצע סריקה מהירה מהאינטרנט." : "Add live URLs or perform automated search below."}
                          </p>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[190px] overflow-y-auto pr-1">
                          {currentSkuPics.map((pic) => {
                            const isSelected = tempImageUrl === pic.imageUrl;
                            return (
                              <div
                                key={pic.id}
                                className={`p-2 rounded-xl border transition-all flex gap-2.5 items-start relative ${
                                  isSelected 
                                    ? "border-blue-500 bg-blue-50/20 shadow-3xs" 
                                    : "border-slate-200 hover:border-slate-300 bg-white"
                                }`}
                              >
                                {/* Thumbnail preview callback */}
                                <button
                                  type="button"
                                  onClick={() => setTempImageUrl(pic.imageUrl)}
                                  className="w-12 h-12 rounded-lg overflow-hidden border border-slate-150 bg-slate-50 shrink-0 select-none cursor-pointer group"
                                  title={isRtl ? "להצגה מקדימה גדולה" : "Inspect full-size"}
                                >
                                  <img
                                    src={pic.imageUrl}
                                    alt="Thumb"
                                    className="w-full h-full object-cover group-hover:scale-105"
                                    referrerPolicy="no-referrer"
                                  />
                                </button>

                                <div className="flex-1 min-w-0 pr-1 text-right text-[10px] space-y-1">
                                  {/* Link string clipping */}
                                  <div className="font-mono text-slate-700 truncate font-semibold" title={pic.imageUrl}>
                                    {pic.imageUrl}
                                  </div>
                                  <div className="text-slate-400 font-medium">
                                    {isRtl ? "מקור" : "Source"}: <span className="text-slate-600 font-bold">{pic.imageSource || "Manual"}</span>
                                  </div>

                                  <div className="flex items-center gap-3 pt-1">
                                    {/* Primary toggle */}
                                    <button
                                      type="button"
                                      disabled={!isAuthorized}
                                      onClick={() => {
                                        if (onUpdatePictureUrl) {
                                          onUpdatePictureUrl(pic.id, pic.imageUrl, true, pic.isActive);
                                          setSuccessFeedback(isRtl ? "תמונה ראשית הוגדרה בהצלחה!" : "Primary image designated!");
                                          setTimeout(() => setSuccessFeedback(null), 2500);
                                        }
                                      }}
                                      className={`flex items-center gap-1 font-bold ${
                                        pic.isPrimary 
                                          ? "text-amber-600" 
                                          : isAuthorized 
                                          ? "text-slate-400 hover:text-amber-500" 
                                          : "text-slate-350"
                                      } disabled:cursor-not-allowed`}
                                      title={isRtl ? "הגדר כתמונה ראשית עבור המק\"ט" : "Designate as active primary image"}
                                    >
                                      <Star className={`h-3 w-3 ${pic.isPrimary ? "fill-amber-500" : ""}`} />
                                      <span>{pic.isPrimary ? (isRtl ? "ראשית" : "Primary") : (isRtl ? "קבע כראשית" : "Set Primary")}</span>
                                    </button>

                                    {/* Active state toggle */}
                                    <button
                                      type="button"
                                      disabled={!isAuthorized}
                                      onClick={() => {
                                        if (onUpdatePictureUrl) {
                                          onUpdatePictureUrl(pic.id, pic.imageUrl, pic.isPrimary, !pic.isActive);
                                        }
                                      }}
                                      className={`flex items-center gap-1 font-bold ${
                                        pic.isActive ? "text-emerald-600" : "text-rose-500 hover:text-rose-600"
                                      } disabled:cursor-not-allowed`}
                                      title={isRtl ? "ערוך סטטוס פעילות" : "Toggle active display status"}
                                    >
                                      <span>{pic.isActive ? (isRtl ? "● פעיל" : "● Active") : (isRtl ? "○ כבוי" : "○ Inactive")}</span>
                                    </button>
                                  </div>
                                </div>

                                {/* Delete URL from Database */}
                                {isAuthorized && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      if (confirm(isRtl ? "האם אתה בטוח שברצונך למחוק תמונה זו ממסד הנתונים של המק\"ט?" : "Are you sure you want to delete this decoupled SKU image record?")) {
                                        if (onDeletePictureUrl) {
                                          onDeletePictureUrl(pic.id);
                                          // set fallback temp URL
                                          const remaining = currentSkuPics.filter(p => p.id !== pic.id);
                                          if (remaining.length > 0) {
                                            setTempImageUrl(remaining[0].imageUrl);
                                          } else {
                                            setTempImageUrl("");
                                          }
                                        }
                                      }
                                    }}
                                    className="p-1 rounded text-slate-400 hover:text-red-650 hover:bg-slate-50 transition"
                                    title={isRtl ? "מחק קישור תמונה לגמרי" : "Delete picture address"}
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </button>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* MUTATIVE INPUT PANELS FOR ADMIN/MANAGER ONLY */}
                    {isAuthorized ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-slate-100">
                        {/* Panel 1: Single URL Quick Insert */}
                        <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-right space-y-2">
                          <h5 className="text-[11px] font-bold text-slate-700 flex items-center justify-start gap-1">
                            <span className="flex items-center justify-center w-4 h-4 rounded-full bg-blue-100 text-blue-800 text-[9px] font-bold">1</span>
                            <span>{isRtl ? "רישום קישור אינטרנט ישיר" : "Paste single direct remote URL"}</span>
                          </h5>
                          <div className="flex gap-2">
                            <input
                              type="url"
                              value={singlePhotoUrl}
                              onChange={(e) => setSinglePhotoUrl(e.target.value)}
                              placeholder="https://example.com/irrigation-part-valve.png"
                              className="flex-1 text-[10px] p-2 bg-white border border-slate-250 rounded focus:outline-none focus:ring-1 focus:ring-blue-100 text-left font-mono"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                if (!singlePhotoUrl.trim()) return;
                                handleAddSinglePhoto(singlePhotoUrl.trim(), currentSkuPics.length === 0);
                              }}
                              className="px-3 bg-blue-600 hover:bg-blue-700 text-white rounded text-[10px] font-extrabold cursor-pointer"
                            >
                              {isRtl ? "הוסף" : "Add"}
                            </button>
                          </div>
                          <p className="text-[9px] text-slate-400 block">
                            {isRtl ? "הדבק כתובת אינטרנט תקינה של תמונה קיימת עבור המק\"ט." : "Enter any web photo address, and press Add."}
                          </p>
                        </div>

                        {/* Panel 2: Multiple URLs Bulk Import Area */}
                        <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-right space-y-2">
                          <h5 className="text-[11px] font-bold text-slate-700 flex items-center justify-start gap-1">
                            <span className="flex items-center justify-center w-4 h-4 rounded-full bg-blue-150 text-blue-850 text-[9px] font-bold">2</span>
                            <span>{isRtl ? "העלאת קישורים מרובים (כתובת בכל שורה)" : "Bulk Upload New URLs (One per line)"}</span>
                          </h5>
                          <textarea
                            value={multiplePhotoUrls}
                            onChange={(e) => setMultiplePhotoUrls(e.target.value)}
                            placeholder="https://site.com/pic1.jpg&#10;https://site.com/pic2.png"
                            className="w-full text-[9px] font-mono leading-tight p-2 bg-white border border-slate-250 rounded focus:outline-none focus:ring-1 focus:ring-blue-100 text-left"
                            rows={2}
                          />
                          <div className="flex justify-between items-center">
                            <span className="text-[8px] text-slate-400">
                              {isRtl ? "תומך בהדבקת רשימות ארוכות" : "Supports appending multiple rows"}
                            </span>
                            <button
                              type="button"
                              onClick={handleAddBatchPhotos}
                              className="px-3.5 py-1 bg-slate-700 hover:bg-slate-800 text-white rounded text-[10px] font-extrabold cursor-pointer"
                            >
                              {isRtl ? "קלוט רשימה" : "Bulk Append"}
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="p-3 bg-amber-50 border border-amber-200 text-amber-900 text-xs font-semibold rounded-lg text-center">
                        {isRtl 
                          ? "חלון צפייה בלבד: אין הרשאות כתיבה (מנהל/אדמין). רק מאושרים יכולים להוסיף, לשנות או למחוק תמונות." 
                          : "Read-only access: only ADMINS and MANAGERS possess permissions to modify the central image registry."}
                      </div>
                    )}

                  </div>

                  {/* METHOD 3: Drag & Drop local file container */}
                  {isAuthorized && (
                    <div className="bg-white p-4.5 rounded-xl border border-slate-200 shadow-3xs space-y-2.5 text-right">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 border-b border-slate-100 pb-2 flex items-center gap-1.5 justify-start">
                        <span className="flex items-center justify-center w-5 h-5 rounded-full bg-blue-100 text-blue-800 text-[10px] font-bold">3</span>
                        <span>{isRtl ? "העלאת קובץ תמונה מקומי למסד" : "Upload Local Photo to independent records"}</span>
                      </h4>

                      <label
                        onDragOver={(e) => {
                          e.preventDefault();
                          setModalDragging(true);
                        }}
                        onDragLeave={() => setModalDragging(false)}
                        onDrop={handleModalImageDrop}
                        className={`cursor-pointer border-2 border-dashed rounded-xl p-3 flex flex-col items-center justify-center text-center transition select-none ${
                          modalDragging
                            ? "border-blue-600 bg-blue-50/60 text-blue-900 animate-pulse"
                            : "border-slate-300 hover:border-slate-400 bg-slate-50 hover:bg-white text-slate-850"
                        }`}
                      >
                        <Upload className="h-5 w-5 text-slate-500 mb-1 shrink-0" />
                        <span className="text-xs font-bold block text-slate-700">
                          {isRtl ? "לחץ כאן לבחירת קובץ או גרור תמונה לכאן" : "Click to select file or drag file here"}
                        </span>
                        <input type="file" accept="image/*" className="hidden" onChange={handleModalImageUpload} />
                      </label>
                    </div>
                  )}

                  {/* METHOD 4: Live Automated Cloud Search with click-to-bind */}
                  <div className="bg-white p-4.5 rounded-xl border border-slate-200 shadow-3xs space-y-3 text-right">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-150">
                      <span className="text-[10px] bg-blue-50 text-blue-800 px-2 py-0.5 rounded font-extrabold font-mono tracking-wider">
                        {isRtl ? "חיפוש רשת" : "Cloud Query"}
                      </span>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                        <span className="flex items-center justify-center w-5 h-5 rounded-full bg-blue-600 text-white text-[10px] font-bold">4</span>
                        <span>{isRtl ? "רובוט חיפוש גלריית תמונות אונליין" : "Google / Unsplash Cloud Search Robot"}</span>
                      </h4>
                    </div>

                    <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-150 space-y-2 text-right">
                      <div className="text-[10.5px] text-slate-600 font-semibold leading-relaxed">
                        {isRtl
                          ? "לחיצה על תמונה בתוצאות החיפוש הבאות תרשום אותה מיד כרשומה קבועה עבור פריט זה!"
                          : "Clicking any returned image below instantly streams and appends it to this SKU's database section!"}
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleImageSearch(editedItemNameHe, editedItemNameEn)}
                          disabled={isSearching}
                          className="w-full flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-xs font-bold transition disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer select-none"
                        >
                          <Search className={`h-3.5 w-3.5 shrink-0 ${isSearching ? "animate-spin" : ""}`} />
                          <span>
                            {isSearching
                              ? (isRtl ? "סורק שרתים..." : "Querying cloud...")
                              : (isRtl ? "חפש תמונות חופשיות ברשת" : "Search Cloud Matches")}
                          </span>
                        </button>
                      </div>
                    </div>

                    {/* Ingestion results search grid */}
                    <div className="space-y-1.5">
                      <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider">
                        {isRtl ? "תוצאות חיפוש מהירות" : "Cloud Results (Click to Append to Gallery)"}
                      </label>

                      {isSearching ? (
                        <div className="flex flex-col items-center justify-center p-6 bg-slate-50 rounded-xl border border-dashed">
                          <RefreshCw className="h-5 w-5 text-blue-600 animate-spin mb-1" />
                          <span className="text-[10px] font-bold text-slate-500">
                            {isRtl ? "שולף תוצאות רלוונטיות..." : "Querying image catalogs..."}
                          </span>
                        </div>
                      ) : searchResults.length > 0 ? (
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                          {searchResults.map((result, rIdx) => {
                            const isAlreadySaved = currentSkuPics.some(p => p.imageUrl === result.url);
                            return (
                              <button
                                key={rIdx}
                                type="button"
                                onClick={() => {
                                  if (!isAuthorized) {
                                    setTempImageUrl(result.url);
                                    return;
                                  }
                                  if (isAlreadySaved) {
                                    setTempImageUrl(result.url);
                                    setSuccessFeedback(isRtl ? "תמונה כבר נמצאת בגלריה" : "Image already present in gallery.");
                                    setTimeout(() => setSuccessFeedback(null), 2000);
                                    return;
                                  }
                                  handleAddSinglePhoto(result.url, currentSkuPics.length === 0);
                                  setSuccessFeedback(isRtl ? "תמונת רשת נוספה בהצלחה לגלריה!" : "Unsplash image appended to gallery!");
                                  setTimeout(() => setSuccessFeedback(null), 2500);
                                }}
                                className={`group rounded-xl border overflow-hidden p-1 bg-white relative hover:scale-105 transition cursor-pointer flex flex-col text-center w-full ${
                                  isAlreadySaved
                                    ? "border-emerald-600 ring-2 ring-emerald-500/15"
                                    : "border-slate-200 hover:border-slate-400"
                                }`}
                              >
                                <div className="aspect-square w-full rounded-lg bg-slate-50 overflow-hidden relative">
                                  <img
                                    src={result.url}
                                    alt={result.titleEn}
                                    className="w-full h-full object-cover"
                                    referrerPolicy="no-referrer"
                                  />
                                  {isAlreadySaved && (
                                    <div className="absolute inset-0 bg-emerald-950/10 flex items-center justify-center">
                                      <div className="bg-white text-emerald-700 p-1 rounded-full shadow">
                                        <Check className="h-2.5 w-2.5" />
                                      </div>
                                    </div>
                                  )}
                                </div>
                                <span className="text-[8px] font-bold text-slate-600 mt-1 truncate w-full block">
                                  {isRtl ? result.titleHe : result.titleEn}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="p-4 text-center bg-slate-50/50 rounded-xl border border-dashed text-slate-400 text-[10px]">
                          {isRtl
                            ? "לחץ על כפתור חיפוש לקבלת תמונות מותאמות אוטומטית מקטלוג וולקני והאינטרנט."
                            : "Press Search Cloud above to harvest free images from secure sources."}
                        </div>
                      )}
                    </div>

                  </div>

                </div>

              </div>
            </div>

            {/* Modal Actions Footer */}
            <div className="p-4 bg-slate-100 border-t border-slate-200 flex justify-between items-center sm:gap-4 shrink-0">
              <span className="text-[10px] font-bold text-slate-500 max-w-[50%] truncate font-mono">
                {isRtl ? `פריט נוכחי: ${editingItem.sku}` : `Active SKU: ${editingItem.sku}`}
              </span>

              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => setEditingItem(null)}
                  className="px-4 py-2 border border-slate-300 hover:bg-slate-50 rounded-lg text-xs font-bold text-slate-705 cursor-pointer transition select-none flex items-center gap-1.5"
                >
                  <X className="h-4 w-4 shrink-0" />
                  <span>{isRtl ? "ביטול" : "Cancel"}</span>
                </button>

                <button
                  type="button"
                  onClick={handleSaveImageEdit}
                  className="px-5 py-2 rounded-lg text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 cursor-pointer shadow-sm shadow-blue-900/10 transition select-none flex items-center gap-1.5"
                >
                  <Save className="h-4 w-4 shrink-0" />
                  <span>{isRtl ? "שמור הגדרות" : "Save Changes"}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
