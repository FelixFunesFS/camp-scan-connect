import { supabase } from "@/integrations/supabase/client";

export interface TShirtInfo {
  size: string | null;
  type: string | null;
  hasAnyTShirt: boolean;
  purchaseDetails: Array<{
    product: string;
    size: string;
    type: string;
  }>;
}

export interface TShirtPickupData {
  id: string;
  attendeeName: string;
  phone: string | null;
  tshirtSize: string | null;
  tshirtType: string | null;
  pickedUp: boolean;
  pickupTime: string | null;
  rfidUid: string;
}

export interface TShirtStats {
  totalOrdered: number;
  pickedUp: number;
  remaining: number;
  sizeBreakdown: Record<string, { ordered: number; pickedUp: number; remaining: number }>;
}

export interface TShirtOrder {
  id: string;
  style: string;
  size: string;
  quantity: number;
  isPickedUp: boolean;
  pickupTime?: string;
}

export class TShirtService {
  static extractTShirtInfo(customFields: any): TShirtInfo {
    console.log('T-Shirt Debug - extractTShirtInfo called with customFields:', customFields);
    
    if (!customFields || typeof customFields !== 'object') {
      return {
        size: null,
        type: null,
        hasAnyTShirt: false,
        purchaseDetails: []
      };
    }

    const purchaseDetails: Array<{ product: string; size: string; type: string }> = [];
    let primarySize: string | null = null;
    let primaryType: string | null = null;

    // Priority 1: Parse detailed order strings from main fields
    const orderStringFields = [
      'Souvenir 2025 T-Shirt',
      'merchandise.tshirt',
      't_shirt_products'
    ];

    for (const fieldName of orderStringFields) {
      if (customFields[fieldName] && typeof customFields[fieldName] === 'string') {
        const orderString = customFields[fieldName];
        console.log(`T-Shirt Debug - Processing order string field "${fieldName}":`, orderString);
        const parsedOrders = this.parseOrderString(orderString);
        console.log(`T-Shirt Debug - Parsed orders from "${fieldName}":`, parsedOrders);
        purchaseDetails.push(...parsedOrders);
      }
    }

    // Priority 2: Parse individual style/size field names with enhanced filtering
    const tshirtFields = this.filterTShirtFields(customFields);
    console.log('T-Shirt Debug - Fields after filtering:', Object.keys(tshirtFields)); // Debug logging
    
    Object.entries(tshirtFields).forEach(([key, value]) => {
      if (typeof key === 'string' && value) {
        const { size, type } = this.parseTShirtProduct(key);
        if (size) {
          console.log(`T-Shirt Debug - BEFORE extractQuantityFromValue for field "${key}": value=${JSON.stringify(value)}, type=${typeof value}`);
          const quantity = this.extractQuantityFromValue(value);
          console.log(`T-Shirt Debug - AFTER extractQuantityFromValue for field "${key}": returned quantity=${quantity}`);
          console.log(`T-Shirt Debug - Processing field "${key}": size=${size}, type=${type}, value=${JSON.stringify(value)}, quantity=${quantity}`); // Enhanced debug logging
          // Add multiple entries for quantities > 1
          for (let i = 0; i < quantity; i++) {
            purchaseDetails.push({ product: key, size, type });
          }
        }
      }
    });

    // Set primary size/type from first order
    if (purchaseDetails.length > 0) {
      primarySize = purchaseDetails[0].size;
      primaryType = purchaseDetails[0].type;
    }

    console.log('T-Shirt Debug - Final purchase details:', purchaseDetails);
    console.log('T-Shirt Debug - Primary size/type:', { primarySize, primaryType });

    return {
      size: primarySize,
      type: primaryType,
      hasAnyTShirt: purchaseDetails.length > 0,
      purchaseDetails: this.consolidateOrders(purchaseDetails)
    };
  }

  /**
   * Parse detailed order strings like "1 Women's Fitted V-Neck X-Large $32.00" or comma-separated orders
   */
  private static parseOrderString(orderString: string): Array<{ product: string; size: string; type: string }> {
    const orders: Array<{ product: string; size: string; type: string }> = [];
    
    // Smart detection: Only parse strings that contain actual order details
    if (!this.isDetailedOrderString(orderString)) {
      return orders;
    }
    
    // Split by commas for multiple orders
    const orderItems = orderString.split(',').map(item => item.trim());
    
    for (const item of orderItems) {
      const parsedItem = this.extractItemDetails(item);
      if (parsedItem) {
        // Add multiple entries for quantities > 1
        for (let i = 0; i < parsedItem.quantity; i++) {
          orders.push({
            product: item,
            size: parsedItem.size,
            type: parsedItem.type
          });
        }
      }
    }
    
    return orders;
  }

  /**
   * Detect if a string contains detailed order information vs just quantities
   */
  private static isDetailedOrderString(str: string): boolean {
    if (!str || typeof str !== 'string') return false;
    
    // Skip simple numeric values or booleans
    if (/^\s*\d+\s*$/.test(str) || str.toLowerCase() === 'true' || str.toLowerCase() === 'false') {
      return false;
    }
    
    // Look for style indicators (Women's, Men's, Fitted, V-Neck, etc.)
    const styleKeywords = [
      "women's", "men's", "fitted", "v-neck", "vneck", "crew", "crewneck",
      "unisex", "small", "medium", "large", "extra", "xl", "2x", "3x"
    ];
    
    const lowerStr = str.toLowerCase();
    return styleKeywords.some(keyword => lowerStr.includes(keyword));
  }

  /**
   * Extract details from individual order items like "2 Women's Fitted V-Neck Large $60.00"
   */
  private static extractItemDetails(item: string): { quantity: number; size: string; type: string } | null {
    if (!item) return null;
    
    // Remove price information (anything with $ at the end)
    const cleanItem = item.replace(/\s*\$[\d,.]+\s*$/, '').trim();
    
    // Extract quantity from the beginning
    const quantityMatch = cleanItem.match(/^(\d+)\s+/);
    const quantity = quantityMatch ? parseInt(quantityMatch[1]) : 1;
    
    // Remove quantity from string for style/size parsing
    const styleString = cleanItem.replace(/^\d+\s+/, '');
    
    // Determine full style name
    let type = 'T-Shirt'; // default
    const normalized = styleString.toLowerCase();
    
    if (normalized.includes("women's fitted v-neck") || 
        (normalized.includes("women's") && normalized.includes("fitted") && normalized.includes("v-neck"))) {
      type = "Women's Fitted V-Neck";
    } else if (normalized.includes("unisex crew neck") || 
               (normalized.includes("unisex") && normalized.includes("crew"))) {
      type = "Unisex Crew Neck";
    } else if (normalized.includes("men's fitted v-neck") || 
               (normalized.includes("men's") && normalized.includes("fitted") && normalized.includes("v-neck"))) {
      type = "Men's Fitted V-Neck";
    } else if (normalized.includes("women's") || normalized.includes('fitted')) {
      type = "Women's Fitted V-Neck"; // Default women's style
    } else if (normalized.includes("men's")) {
      type = "Men's Fitted V-Neck"; // Default men's style
    } else if (normalized.includes("unisex") || normalized.includes("crew")) {
      type = "Unisex Crew Neck"; // Default unisex style
    }

    // Extract size using enhanced patterns
    const size = this.extractSizeFromString(styleString);
    
    if (!size) return null;
    
    return { quantity, size, type };
  }

  /**
   * Enhanced size extraction from strings
   */
  private static extractSizeFromString(text: string): string {
    const normalized = text.toLowerCase();
    
    // Size patterns with word boundaries for better matching
    const sizePatterns = [
      { pattern: /\b(?:extra\s*)?small\b|\bxs\b|\bs\b(?!\w)/i, size: 'Small' },
      { pattern: /\bmedium\b|\bmed\b|\bm\b(?!\w)/i, size: 'Medium' },
      { pattern: /\blarge\b|\blg\b|\bl\b(?!\w)/i, size: 'Large' },
      { pattern: /\b(?:x-?large|extra\s*large)\b|\bxl\b/i, size: 'X-Large' },
      { pattern: /\b(?:2x|2xl|xx-?large|double\s*x)\b/i, size: '2X-Large' },
      { pattern: /\b(?:3x|3xl|xxx-?large|triple\s*x)\b/i, size: '3X-Large' },
      { pattern: /\b(?:4x|4xl|xxxx-?large)\b/i, size: '4X-Large' },
      { pattern: /\b(?:5x|5xl)\b/i, size: '5X-Large' }
    ];

    for (const { pattern, size } of sizePatterns) {
      if (pattern.test(normalized)) {
        return size;
      }
    }

    return '';
  }

  /**
   * Extract quantity from field values - handles numbers, strings, and various formats
   */
  private static extractQuantityFromValue(value: any): number {
    console.log(`T-Shirt Debug - extractQuantityFromValue called with:`, { 
      value, 
      type: typeof value, 
      stringified: JSON.stringify(value) 
    });
    
    // Handle numbers directly
    if (typeof value === 'number') {
      const result = Math.max(1, Math.floor(value));
      console.log(`T-Shirt Debug - Extracted quantity ${result} from number ${value}`);
      return result;
    }
    
    // Handle strings that might contain numbers
    if (typeof value === 'string') {
      // Try to extract number from string
      const cleanValue = value.trim();
      const num = parseFloat(cleanValue);
      if (Number.isFinite(num) && num > 0) {
        const result = Math.max(1, Math.floor(num));
        console.log(`T-Shirt Debug - Extracted quantity ${result} from string "${value}"`);
        return result;
      }
    }
    
    // Handle boolean - if true, assume quantity 1
    if (typeof value === 'boolean' && value) {
      console.log(`T-Shirt Debug - Extracted quantity 1 from boolean true`);
      return 1;
    }
    
    // Handle objects that might have quantity properties
    if (typeof value === 'object' && value !== null) {
      if ('quantity' in value && typeof value.quantity === 'number') {
        const result = Math.max(1, Math.floor(value.quantity));
        console.log(`T-Shirt Debug - Extracted quantity ${result} from object.quantity`);
        return result;
      }
      
      // If object has numeric properties, try to use them
      const numKeys = Object.keys(value).filter(k => !isNaN(parseFloat(value[k])));
      if (numKeys.length > 0) {
        const result = Math.max(1, Math.floor(parseFloat(value[numKeys[0]])));
        console.log(`T-Shirt Debug - Extracted quantity ${result} from object property`);
        return result;
      }
    }
    
    console.log(`T-Shirt Debug - Defaulting to quantity 1 for value:`, value);
    return 1;
  }

  /**
   * Consolidate and deduplicate orders
   */
  private static consolidateOrders(orders: Array<{ product: string; size: string; type: string }>): Array<{ product: string; size: string; type: string }> {
    const consolidated = new Map<string, { product: string; size: string; type: string; count: number }>();
    
    orders.forEach(order => {
      const key = `${order.type}-${order.size}`;
      if (consolidated.has(key)) {
        consolidated.get(key)!.count++;
      } else {
        consolidated.set(key, { ...order, count: 1 });
      }
    });
    
    // Convert back to array format, expanding for quantities
    const result: Array<{ product: string; size: string; type: string }> = [];
    consolidated.forEach(item => {
      for (let i = 0; i < item.count; i++) {
        result.push({
          product: item.product,
          size: item.size,
          type: item.type
        });
      }
    });
    
    return result;
  }

  /**
   * Filter and prioritize t-shirt fields to avoid duplicates
   */
  private static filterTShirtFields(customFields: any): Record<string, any> {
    const tshirtFields: Record<string, any> = {};
    const allKeys = Object.keys(customFields).filter(key => this.isTShirtProduct(key));
    
    // Step 1: Identify descriptive fields first
    const descriptiveFields = allKeys.filter(key => this.isDescriptiveTShirtField(key));
    const descriptiveSizes = new Set<string>();
    
    // Collect sizes from descriptive fields
    descriptiveFields.forEach(key => {
      const { size } = this.parseTShirtProduct(key);
      if (size) {
        descriptiveSizes.add(size.toLowerCase());
      }
    });
    
    // Step 2: Pre-filter: Remove coded fields when descriptive alternatives exist for the same size
    const filteredKeys = allKeys.filter(key => {
      const normalized = key.toLowerCase();
      
      // Always skip generic quantity indicators
      if (normalized === 'souvenir 2025 t-shirt' || normalized === 't-shirt') {
        return false;
      }
      
      // Skip ALL merchandise.tshirt variations when descriptive alternatives exist
      if (normalized.startsWith('merchandise.tshirt')) {
        const { size } = this.parseTShirtProduct(key);
        if (size && descriptiveSizes.has(size.toLowerCase())) {
          console.log(`T-Shirt Debug - Excluding coded field "${key}" because descriptive field exists for size ${size}`);
          return false;
        }
      }
      
      return true;
    });
    
    console.log('T-Shirt Debug - Descriptive fields found:', descriptiveFields);
    console.log('T-Shirt Debug - Final filtered keys:', filteredKeys);
    
    // Step 3: Group fields by detected size AND type to avoid losing different products of same size
    const sizeTypeToFields = new Map<string, { descriptive: string[], coded: string[], generic: string[] }>();
    
    console.log('T-Shirt Debug - Starting field grouping process...');
    filteredKeys.forEach(key => {
      const { size, type } = this.parseTShirtProduct(key);
      const normalizedSize = size.toLowerCase() || 'unknown';
      const normalizedType = type.toLowerCase().replace(/[^a-z0-9]/g, '') || 'tshirt';
      const groupKey = `${normalizedSize}-${normalizedType}`;
      console.log(`T-Shirt Debug - Processing key "${key}": detected size="${size}", type="${type}", groupKey="${groupKey}"`);
      
      if (!sizeTypeToFields.has(groupKey)) {
        sizeTypeToFields.set(groupKey, { descriptive: [], coded: [], generic: [] });
      }
      
      const group = sizeTypeToFields.get(groupKey)!;
      const normalized = key.toLowerCase();
      
      // Categorize field type with improved coded field detection
      if (this.isDescriptiveTShirtField(key)) {
        console.log(`T-Shirt Debug - Categorized "${key}" as DESCRIPTIVE`);
        group.descriptive.push(key);
      } else if (normalized.startsWith('merchandise.') || normalized.match(/^\w+\.\w+\.\w+/)) {
        console.log(`T-Shirt Debug - Categorized "${key}" as CODED`);
        group.coded.push(key);
      } else {
        console.log(`T-Shirt Debug - Categorized "${key}" as GENERIC`);
        group.generic.push(key);
      }
    });
    
    console.log('T-Shirt Debug - Size groups created:', Array.from(sizeTypeToFields.entries()));
    
    // For each size-type combination, select the best representative field
    sizeTypeToFields.forEach((fieldGroups, groupKey) => {
      console.log(`T-Shirt Debug - Processing group "${groupKey}" with groups:`, fieldGroups);
      let selectedField: string | null = null;
      
      // Priority 1: Use descriptive field if available
      if (fieldGroups.descriptive.length > 0) {
        selectedField = fieldGroups.descriptive[0];
        console.log(`T-Shirt Debug - Selected descriptive field "${selectedField}" for group "${groupKey}"`);
      }
      // Priority 2: Use coded field only if no descriptive field exists
      else if (fieldGroups.coded.length > 0) {
        selectedField = fieldGroups.coded[0];
        console.log(`T-Shirt Debug - Selected coded field "${selectedField}" for group "${groupKey}"`);
      }
      // Priority 3: Use generic field as last resort
      else if (fieldGroups.generic.length > 0) {
        selectedField = fieldGroups.generic[0];
        console.log(`T-Shirt Debug - Selected generic field "${selectedField}" for group "${groupKey}"`);
      }
      
      if (selectedField) {
        console.log(`T-Shirt Debug - Adding to final fields: "${selectedField}" = ${JSON.stringify(customFields[selectedField])}`);
        tshirtFields[selectedField] = customFields[selectedField];
      } else {
        console.log(`T-Shirt Debug - No field selected for group "${groupKey}"`);
      }
    });
    
    // Fallback: if no size-specific fields found, include remaining generic fields
    if (Object.keys(tshirtFields).length === 0) {
      allKeys.filter(key => !this.isSpecificTShirtField(key)).forEach(key => {
        tshirtFields[key] = customFields[key];
      });
    }
    
    return tshirtFields;
  }

  /**
   * Check if a field name contains descriptive style information (human-readable)
   */
  private static isDescriptiveTShirtField(fieldName: string): boolean {
    const normalized = fieldName.toLowerCase();
    
    // Descriptive style indicators
    const descriptiveStyles = [
      "women's fitted v-neck", "women's fitted", "men's fitted", 
      "fitted v-neck", "v-neck", "vneck", "crew neck", "crewneck",
      "women's", "men's", "unisex", "ladies", "mens"
    ];
    
    // Check if it contains descriptive style terms (not just codes)
    const hasDescriptiveStyle = descriptiveStyles.some(style => 
      normalized.includes(style)
    );
    
    // Avoid code-like patterns
    const isCodeLike = normalized.includes('merchandise.') || 
                       normalized.match(/^\w+\.\w+(\.\w+)*$/);
    
    return hasDescriptiveStyle && !isCodeLike;
  }

  /**
   * Check if a field name contains specific style/size information
   */
  private static isSpecificTShirtField(fieldName: string): boolean {
    const normalized = fieldName.toLowerCase();
    
    // Contains style indicators
    const hasStyleInfo = ["women's", "men's", "fitted", "v-neck", "vneck", "crew", "unisex"].some(style => 
      normalized.includes(style)
    );
    
    // Contains size indicators
    const hasSizeInfo = ["small", "medium", "large", "extra", "xs", "sm", "med", "lg", "xl", "2x", "3x"].some(size => 
      normalized.includes(size)
    );
    
    return hasStyleInfo || hasSizeInfo;
  }

  private static isTShirtProduct(productName: string): boolean {
    const normalized = productName.toLowerCase();
    
    // Check for various t-shirt related keywords
    const tshirtKeywords = [
      't-shirt', 't shirt', 'tshirt',
      'souvenir', 'fitted', 'crew neck', 'v-neck',
      'vneck', 'crewneck', 'unisex', "women's", "men's",
      'merchandise.tshirt' // Include merchandise fields
    ];
    
    return tshirtKeywords.some(keyword => normalized.includes(keyword));
  }

  private static parseTShirtProduct(productName: string): { size: string; type: string } {
    console.log('Parsing T-shirt product:', productName);
    
    // First, clean up the product name by normalizing hyphens and spaces
    const cleanProduct = productName.toLowerCase().trim().replace(/[-_]/g, ' ').replace(/\s+/g, ' ');
    console.log('Cleaned product name:', cleanProduct);
    
    // Determine full style name from the product name
    let type = 'T-Shirt'; // default
    
    // Check for specific style patterns in order of specificity - improved to handle hyphens
    if (cleanProduct.includes("women's fitted v neck") || cleanProduct.includes("women's fitted vneck") ||
        (cleanProduct.includes("women's") && cleanProduct.includes("fitted") && cleanProduct.includes("v neck"))) {
      type = "Women's Fitted V-Neck";
    } else if (cleanProduct.includes("unisex crew neck") || cleanProduct.includes("unisex crewneck") ||
               (cleanProduct.includes("unisex") && cleanProduct.includes("crew"))) {
      type = "Unisex Crew Neck";
    } else if (cleanProduct.includes("men's fitted v neck") || cleanProduct.includes("men's fitted vneck") ||
               (cleanProduct.includes("men's") && cleanProduct.includes("fitted") && cleanProduct.includes("v neck"))) {
      type = "Men's Fitted V-Neck";
    } else if (cleanProduct.includes("women's") || cleanProduct.includes('fitted')) {
      type = "Women's Fitted V-Neck"; // Default women's style
    } else if (cleanProduct.includes("men's")) {
      type = "Men's Fitted V-Neck"; // Default men's style
    } else if (cleanProduct.includes("unisex") || cleanProduct.includes("crew")) {
      type = "Unisex Crew Neck"; // Default unisex style
    }

    console.log('Detected type:', type);

    // Extract size - improved patterns to handle "med" properly
    const sizePatterns = [
      { pattern: /\b(4x|4xl|xxxx large|xxxxl)\b/i, size: '4X-Large' },
      { pattern: /\b(3x|3xl|xxx large|xxxl)\b/i, size: '3X-Large' },
      { pattern: /\b(2x|2xl|xx large|xxl)\b/i, size: '2X-Large' },
      { pattern: /\b(x large|xl|extra large)\b/i, size: 'X-Large' },
      { pattern: /\b(large|lg)\b/i, size: 'Large' },
      { pattern: /\b(medium|med)\b/i, size: 'Medium' },
      { pattern: /\b(small|sm)\b/i, size: 'Small' },
      // Single letter patterns last, with word boundaries and space/end checks
      { pattern: /\b(l)\b(?!\w)/i, size: 'Large' },
      { pattern: /\b(m)\b(?!\w)/i, size: 'Medium' },
      { pattern: /\b(s)\b(?!\w)/i, size: 'Small' },
    ];

    let detectedSize = '';
    for (const { pattern, size } of sizePatterns) {
      const match = cleanProduct.match(pattern);
      if (match) {
        detectedSize = size;
        console.log('Detected size:', detectedSize);
        break;
      }
    }

    console.log('Final parsed result:', { size: detectedSize, type });
    return { size: detectedSize, type };
  }

  static async getTShirtPickupData(): Promise<{ pickups: TShirtPickupData[]; stats: TShirtStats }> {
    try {
      // Get all attendees with their RFID tags and pickup transactions
      const { data: attendees } = await supabase
        .from('attendees')
        .select(`
          id,
          first_name,
          last_name,
          phone,
          t_shirt_size,
          custom_fields,
          rfid_tags!inner(uid, status)
        `)
        .eq('registration_status', 'registered')
        .in('rfid_tags.status', ['assigned', 'active']);

      if (!attendees) return { pickups: [], stats: this.getEmptyStats() };

      // Get t-shirt pickup transactions
      const { data: transactions } = await supabase
        .from('station_transactions')
        .select('attendee_id, created_at, rfid_uid, extra_data')
        .eq('station_type', 'tshirts' as any)
        .eq('transaction_type', 'tshirt_pickup' as any);

      const pickups: TShirtPickupData[] = [];
      const sizeBreakdown: Record<string, { ordered: number; pickedUp: number; remaining: number }> = {};
      let totalItemsOrdered = 0;
      let totalItemsPickedUp = 0;

      // Process each attendee and their t-shirt orders
      for (const attendee of attendees) {
        const tshirtInfo = this.extractTShirtInfo(attendee.custom_fields);
        
        if (tshirtInfo.hasAnyTShirt) {
          // Group orders by style/size to get accurate quantities
          const orderGroups = new Map<string, { style: string; size: string; quantity: number }>();
          
          tshirtInfo.purchaseDetails.forEach(detail => {
            const key = `${detail.type}-${detail.size}`;
            if (orderGroups.has(key)) {
              orderGroups.get(key)!.quantity++;
            } else {
              orderGroups.set(key, {
                style: detail.type || 'Unisex',
                size: detail.size || 'Unknown',
                quantity: 1
              });
            }
          });

          // Count attendee's pickups
          const attendeePickups = transactions?.filter(t => t.attendee_id === attendee.id) || [];
          
          // Process each unique order group for this attendee
          orderGroups.forEach(group => {
            const size = group.size;
            const matchingPickups = attendeePickups.filter(t => {
              const extraData = t.extra_data as any;
              return extraData?.tshirt_style === group.style && 
                     extraData?.tshirt_size === size;
            });

            // Track each individual item
            for (let i = 0; i < group.quantity; i++) {
              const isPickedUp = i < matchingPickups.length;
              const pickupTime = isPickedUp ? matchingPickups[i]?.created_at : null;

              totalItemsOrdered++;
              if (isPickedUp) totalItemsPickedUp++;

              // Add to size breakdown (per item, not per person)
              if (!sizeBreakdown[size]) {
                sizeBreakdown[size] = { ordered: 0, pickedUp: 0, remaining: 0 };
              }
              sizeBreakdown[size].ordered++;
              if (isPickedUp) {
                sizeBreakdown[size].pickedUp++;
              } else {
                sizeBreakdown[size].remaining++;
              }

              // Only add to pickups list if not picked up (for pending list)
              if (!isPickedUp) {
                pickups.push({
                  id: `${attendee.id}-${group.style}-${size}-${i}`,
                  attendeeName: `${attendee.first_name} ${attendee.last_name}`,
                  phone: attendee.phone,
                  tshirtSize: size,
                  tshirtType: group.style,
                  pickedUp: false,
                  pickupTime: null,
                  rfidUid: attendee.rfid_tags[0]?.uid || 'Unknown'
                });
              }
            }
          });
        }
      }

      const stats: TShirtStats = {
        totalOrdered: totalItemsOrdered,
        pickedUp: totalItemsPickedUp,
        remaining: totalItemsOrdered - totalItemsPickedUp,
        sizeBreakdown
      };

      return { pickups, stats };
    } catch (error) {
      console.error('Error fetching t-shirt data:', error);
      return { pickups: [], stats: this.getEmptyStats() };
    }
  }

  private static getEmptyStats(): TShirtStats {
    return {
      totalOrdered: 0,
      pickedUp: 0,
      remaining: 0,
      sizeBreakdown: {}
    };
  }

  static async checkAttendeeHasTShirt(attendeeId: string): Promise<{ 
    hasTShirt: boolean; 
    size: string | null; 
    type: string | null;
    orders: Array<{
      id: string;
      style: string;
      size: string;
      quantity: number;
      isPickedUp: boolean;
      pickupTime?: string;
    }>;
  }> {
    try {
      const { data: attendee } = await supabase
        .from('attendees')
        .select('custom_fields, t_shirt_size')
        .eq('id', attendeeId)
        .single();

      if (!attendee) {
        return { hasTShirt: false, size: null, type: null, orders: [] };
      }

      const tshirtInfo = this.extractTShirtInfo(attendee.custom_fields);
      
      // Get pickup transactions for this attendee
      const { data: transactions } = await supabase
        .from('station_transactions')
        .select('extra_data, created_at')
        .eq('attendee_id', attendeeId)
        .eq('station_type', 'tshirts')
        .eq('transaction_type', 'tshirt_pickup');

      // Group orders by style/size and count quantities
      const orderGroups = new Map<string, {
        style: string;
        size: string;
        quantity: number;
        pickups: Array<{ created_at: string; extra_data: any }>;
      }>();

      tshirtInfo.purchaseDetails.forEach(detail => {
        const key = `${detail.type}-${detail.size}`;
        console.log(`T-Shirt Debug - checkAttendeeHasTShirt processing detail:`, {
          product: detail.product,
          type: detail.type,
          size: detail.size,
          key: key
        });
        if (orderGroups.has(key)) {
          orderGroups.get(key)!.quantity++;
        } else {
          orderGroups.set(key, {
            style: detail.type || 'T-Shirt',
            size: detail.size || 'Unknown',
            quantity: 1,
            pickups: []
          });
        }
      });

      console.log(`T-Shirt Debug - Order groups created:`, Array.from(orderGroups.entries()));

      // Match transactions with orders
      transactions?.forEach(transaction => {
        const extraData = transaction.extra_data as any;
        const style = extraData?.tshirt_style;
        const size = extraData?.tshirt_size;
        const key = `${style}-${size}`;
        
        if (orderGroups.has(key)) {
          orderGroups.get(key)!.pickups.push(transaction);
        }
      });

      // Create final orders array
      const orders = Array.from(orderGroups.entries()).map(([key, group], index) => {
        const orderId = `${attendeeId}-${index}`;
        const pickedUpCount = group.pickups.length;
        const isFullyPickedUp = pickedUpCount >= group.quantity;
        const latestPickup = group.pickups.sort((a, b) => 
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        )[0];
        
        return {
          id: orderId,
          style: group.style,
          size: group.size,
          quantity: group.quantity,
          isPickedUp: isFullyPickedUp,
          pickupTime: latestPickup?.created_at,
          pickedUpCount // Internal tracking
        };
      });

      console.log(`T-Shirt Debug - Final orders being returned:`, orders);

      return {
        hasTShirt: tshirtInfo.hasAnyTShirt,
        size: attendee.t_shirt_size || tshirtInfo.size,
        type: tshirtInfo.type,
        orders
      };
    } catch (error) {
      console.error('Error checking t-shirt info:', error);
      return { hasTShirt: false, size: null, type: null, orders: [] };
    }
  }

  static async recordTShirtPickups(attendeeId: string, selectedOrders: TShirtOrder[]): Promise<void> {
    if (!selectedOrders.length) return;

    const transactions = selectedOrders.map(order => ({
      attendee_id: attendeeId,
      station_type: 'tshirts' as any,
      transaction_type: 'tshirt_pickup' as any,
      current_status: 'picked_up',
      extra_data: {
        tshirt_style: order.style,
        tshirt_size: order.size,
        quantity: order.quantity,
        order_id: order.id
      }
    }));

    // Record all transactions
    const { error } = await supabase
      .from('station_transactions')
      .insert(transactions);

    if (error) {
      throw new Error(`Failed to record t-shirt pickups: ${error.message}`);
    }
  }
}