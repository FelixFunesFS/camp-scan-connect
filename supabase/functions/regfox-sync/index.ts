import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RegFoxFieldData {
  label: string;
  path: string;
  value: string;
  amount?: string;
}

interface RegFoxAttendee {
  id: string;
  displayId?: string;
  formId: string;
  orderId?: string;
  status: string;
  amount?: number;
  currency?: string;
  fieldData: RegFoxFieldData[];
  checkedIn?: boolean;
  dateCreated: string;
  dateUpdated: string;
}

interface SyncResult {
  totalRecords: number;
  newRecords: number;
  updatedRecords: number;
  errors: string[];
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Parse request body to check if webhook triggered
    let requestBody: any = {};
    try {
      const bodyText = await req.text();
      if (bodyText) {
        requestBody = JSON.parse(bodyText);
      }
    } catch (e) {
      // Ignore body parse errors for GET requests
    }

    const isWebhookTriggered = requestBody.webhook_triggered === true;
    const manualSyncType = requestBody.sync_type; // 'manual_sync' or 'initial_sync'
    const eventType = requestBody.event_type;
    const registrantId = requestBody.registrant_id;

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get RegFox API key and Form ID
    const regfoxApiKey = Deno.env.get('REGFOX_API_KEY');
    const regfoxFormId = Deno.env.get('REGFOX_FORM_ID');
    
    if (!regfoxApiKey) {
      throw new Error('RegFox API key not configured');
    }
    
    if (!regfoxFormId) {
      throw new Error('RegFox Form ID not configured');
    }

    console.log(`Starting RegFox ${isWebhookTriggered ? 'webhook-triggered' : (manualSyncType || 'manual')} sync...`);
    if (isWebhookTriggered) {
      console.log(`Webhook details - Event: ${eventType}, Registrant ID: ${registrantId}`);
    }

    // First, run cleanup to clear any stuck syncs
    console.log('Running pre-sync cleanup...');
    await supabase.functions.invoke('regfox-cleanup');

    // Check if sync can start (no active syncs or locks)
    const { data: canStart, error: lockCheckError } = await supabase.rpc('can_start_sync');
    
    if (lockCheckError) {
      throw new Error(`Failed to check sync status: ${lockCheckError.message}`);
    }

    if (!canStart) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Another sync is already in progress. Please wait for it to complete or cancel it first.',
        code: 'SYNC_IN_PROGRESS'
      }), {
        status: 409,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Create sync log entry
    const { data: syncLog, error: syncLogError } = await supabase
      .from('regfox_sync_log')
      .insert({
        sync_type: isWebhookTriggered ? 'webhook_triggered_sync' : (manualSyncType || 'initial_sync'),
        status: 'in_progress',
        sync_started_at: new Date().toISOString(),
        heartbeat_at: new Date().toISOString(),
        sync_timeout_minutes: isWebhookTriggered ? 1 : 3 // Shorter timeout for webhook syncs
      })
      .select()
      .single();

    if (syncLogError) {
      console.error('Error creating sync log:', syncLogError);
      throw syncLogError;
    }

    // Skip lock acquisition for webhook-triggered syncs (they should be fast and incremental)
    let lockId = null;
    if (!isWebhookTriggered) {
      // Acquire sync lock for manual syncs only
      const { data: acquiredLockId, error: lockError } = await supabase.rpc('acquire_sync_lock', {
        p_sync_id: syncLog.id,
        p_timeout_minutes: 3
      });

      if (lockError || !acquiredLockId) {
        // Failed to acquire lock, mark sync as failed
        await supabase
          .from('regfox_sync_log')
          .update({
            status: 'error',
            error_message: 'Failed to acquire sync lock - another sync may be running',
            sync_completed_at: new Date().toISOString()
          })
          .eq('id', syncLog.id);
        
        throw new Error('Failed to acquire sync lock - another sync may be running');
      }
      
      lockId = acquiredLockId;
      console.log(`Acquired sync lock: ${lockId}`);
    } else {
      console.log('Webhook-triggered sync - skipping lock acquisition for fast processing');
    }

    const syncResult: SyncResult = {
      totalRecords: 0,
      newRecords: 0,
      updatedRecords: 0,
      errors: []
    };

    // Helper function to check if sync is cancelled
    const checkCancellation = async () => {
      const { data: syncStatus } = await supabase
        .from('regfox_sync_log')
        .select('cancelled_at')
        .eq('id', syncLog.id)
        .single();
      
      return syncStatus?.cancelled_at != null;
    };

    // Helper function to update heartbeat
    const updateHeartbeat = async (progressInfo?: any) => {
      await supabase
        .from('regfox_sync_log')
        .update({
          heartbeat_at: new Date().toISOString(),
          progress_info: progressInfo || {}
        })
        .eq('id', syncLog.id);
    };

    let lastHeartbeat = Date.now();

    // Self-cleanup background task that runs even if function crashes
    const selfCleanupTask = async () => {
      await new Promise(resolve => setTimeout(resolve, 3 * 60 * 1000)); // Wait 3 minutes
      try {
        console.log('Self-cleanup task triggered for sync:', syncLog.id);
        await supabase.functions.invoke('regfox-cleanup');
      } catch (error) {
        console.error('Self-cleanup task error:', error);
      }
    };

    // Start the self-cleanup background task
    // @ts-ignore - EdgeRuntime.waitUntil is available in Supabase edge functions
    if (typeof EdgeRuntime !== 'undefined' && EdgeRuntime.waitUntil) {
      // @ts-ignore
      EdgeRuntime.waitUntil(selfCleanupTask());
    }

    // Heartbeat monitoring - update every 30 seconds
    const heartbeatInterval = setInterval(async () => {
      try {
        await updateHeartbeat();
        console.log('Heartbeat updated for sync:', syncLog.id);
      } catch (error) {
        console.error('Heartbeat update error:', error);
      }
    }, 30000);

    try {
      // First, test API key with ping endpoint
      console.log('Testing API key with ping endpoint...');
      
      try {
        const pingResponse = await fetch('https://api.webconnex.com/v2/public/ping', {
          method: 'GET',
          headers: {
            'apiKey': regfoxApiKey,
            'Content-Type': 'application/json'
          }
        });

        console.log('Ping response status:', pingResponse.status);
        const pingData = await pingResponse.json();
        console.log('Ping response data:', pingData);

        if (!pingResponse.ok) {
          throw new Error(`API key validation failed: ${pingResponse.status} ${pingResponse.statusText}`);
        }

        console.log('API key validation successful');
      } catch (pingError) {
        console.error('API key ping test failed:', pingError.message);
        syncResult.errors.push(`API key validation error: ${pingError.message}`);
        throw pingError;
      }

      // Fetch attendees from RegFox API with pagination
      console.log('Fetching attendees from RegFox API...');
      
      let regfoxAttendees: RegFoxAttendee[] = [];
      
      try {
      let startingAfter: string | null = null;
      let hasMore = true;
      
      // For webhook-triggered syncs, fetch only the specific registrant if provided
      if (isWebhookTriggered && registrantId) {
        console.log(`Webhook sync - fetching specific registrant: ${registrantId}`);
        
        let requestUrl = `https://api.webconnex.com/v2/public/search/registrants?product=regfox.com&formId=${encodeURIComponent(regfoxFormId)}&registrantIds=${encodeURIComponent(registrantId)}`;
        
        console.log(`Making targeted RegFox API call: ${requestUrl}`);
        
        const regfoxResponse = await fetch(requestUrl, {
          method: 'GET',
          headers: {
            'apiKey': regfoxApiKey,
            'Content-Type': 'application/json'
          }
        });

        if (!regfoxResponse.ok) {
          const errorText = await regfoxResponse.text();
          console.error(`RegFox API error response:`, errorText);
          throw new Error(`RegFox API error: ${regfoxResponse.status} ${regfoxResponse.statusText} - ${errorText}`);
        }

        const responseData = await regfoxResponse.json();
        regfoxAttendees = responseData.data || responseData || [];
        
        if (!Array.isArray(regfoxAttendees)) {
          regfoxAttendees = [regfoxAttendees];
        }
        
        console.log(`Webhook sync fetched ${regfoxAttendees.length} specific attendee(s)`);
      } else {
        // Full sync - use pagination to fetch all registrants
        while (hasMore) {
          let requestUrl = `https://api.webconnex.com/v2/public/search/registrants?product=regfox.com&formId=${encodeURIComponent(regfoxFormId)}&limit=250&sort=asc`;
          if (startingAfter) {
            requestUrl += `&startingAfter=${encodeURIComponent(startingAfter)}`;
          }
          
          console.log(`Making RegFox API call to: ${requestUrl}`);
          console.log(`Request headers: apiKey=[MASKED], Content-Type=application/json`);

          const regfoxResponse = await fetch(requestUrl, {
            method: 'GET',
            headers: {
              'apiKey': regfoxApiKey,
              'Content-Type': 'application/json'
            }
          });

          console.log(`Response status:`, regfoxResponse.status);

          if (!regfoxResponse.ok) {
            const errorText = await regfoxResponse.text();
            console.error(`RegFox API error response:`, errorText);
            throw new Error(`RegFox API error: ${regfoxResponse.status} ${regfoxResponse.statusText} - ${errorText}`);
          }

          const responseData = await regfoxResponse.json();
          console.log(`RegFox API response (page):`, {
            totalResults: responseData.totalResults,
            hasMore: responseData.hasMore,
            dataLength: responseData.data?.length || 0,
            startingAfter: responseData.startingAfter
          });

          // Handle WebConnex API response format
          const pageAttendees = responseData.data || [];
          
          if (!Array.isArray(pageAttendees)) {
            throw new Error('Invalid RegFox API response format: expected array of attendees');
          }
          
          regfoxAttendees.push(...pageAttendees);
          
          // Check pagination
          hasMore = responseData.hasMore === true;
          startingAfter = responseData.startingAfter || null;
          
          console.log(`Fetched ${pageAttendees.length} attendees from this page. Total so far: ${regfoxAttendees.length}`);
          
          // Safety check to prevent infinite loops
          if (regfoxAttendees.length > 10000) {
            console.warn('Reached safety limit of 10,000 attendees. Stopping pagination.');
            break;
          }
        }
      }
        
      console.log(`Successfully retrieved ${regfoxAttendees.length} total attendees`);
        
      } catch (apiError) {
        console.error('RegFox API call failed:', apiError.message);
        syncResult.errors.push(`RegFox API error: ${apiError.message}`);
        regfoxAttendees = []; // Empty array means no new data to sync
      }

      // Helper function to parse RegFox fieldData array
      const parseFieldData = (fieldDataArray: RegFoxFieldData[]) => {
        const parsed: Record<string, string> = {};
        
        if (!Array.isArray(fieldDataArray)) {
          return parsed;
        }
        
        for (const field of fieldDataArray) {
          // Index by both label and path for flexible lookup
          if (field.label) {
            parsed[field.label] = field.value || '';
          }
          if (field.path) {
            parsed[field.path] = field.value || '';
          }
        }
        
        return parsed;
      };

      // Helper function to extract t-shirt size from product purchases
      const extractTShirtSize = (fields: Record<string, string>) => {
        let tShirtSize = null;
        const tShirtProducts: Array<{field: string, value: string, size?: string}> = [];
        
        // Look for t-shirt related fields
        for (const [fieldName, fieldValue] of Object.entries(fields)) {
          if (!fieldValue || fieldValue === '0' || fieldValue.toLowerCase() === 'false') continue;
          
          const fieldLower = fieldName.toLowerCase();
          const valueLower = fieldValue.toLowerCase();
          
          // Check if this is a t-shirt product field
          if (fieldLower.includes('t-shirt') || fieldLower.includes('tshirt') || 
              fieldLower.includes('shirt') || valueLower.includes('unisex') ||
              (fieldLower.includes('souvenir') && fieldLower.includes('2025'))) {
            
            // Extract size from field name or value
            let extractedSize = null;
            const sizeText = `${fieldName} ${fieldValue}`;
            
            // Try to match size patterns (prioritize from most specific to least)
            const sizePatterns = [
              /\bunisex\s+(small|med|medium|large|xl|xxl|2x|3x|4x|5x)\b/i,
              /\b(women's|men's|ladies)\s+.*?(small|med|medium|large|xl|xxl|2x|3x|4x|5x)\b/i,
              /\b(small|med|medium|large|xl|xxl|2x|3x|4x|5x)\b/i,
              /\b(s|m|l|xl|xxl)\b/i
            ];
            
            for (const pattern of sizePatterns) {
              const match = sizeText.match(pattern);
              if (match) {
                extractedSize = match[match.length - 1].toLowerCase(); // Get the size part
                break;
              }
            }
            
            // Normalize size names
            if (extractedSize) {
              switch (extractedSize) {
                case 'small': extractedSize = 'S'; break;
                case 'med': case 'medium': extractedSize = 'M'; break;
                case 'large': extractedSize = 'L'; break;
                case 'xl': extractedSize = 'XL'; break;
                case 'xxl': case '2x': extractedSize = '2X'; break;
                case '3x': extractedSize = '3X'; break;
                case '4x': extractedSize = '4X'; break;
                case '5x': extractedSize = '5X'; break;
                case 's': extractedSize = 'S'; break;
                case 'm': extractedSize = 'M'; break;
                case 'l': extractedSize = 'L'; break;
              }
            }
            
            tShirtProducts.push({
              field: fieldName,
              value: fieldValue,
              size: extractedSize
            });
            
            // Use the first valid size found as the primary t-shirt size
            if (extractedSize && !tShirtSize) {
              tShirtSize = extractedSize;
            }
          }
        }
        
        return {
          size: tShirtSize,
          products: tShirtProducts
        };
      };

      // Helper function to detect "Additional Night" purchase (Thursday early access)
      const detectAdditionalNight = (fields: Record<string, string>) => {
        // Check for the simple "Additional Night (Thursday)" field
        const simpleThursdayField = fields['Additional Night (Thursday)'];
        if (simpleThursdayField) {
          const qty = parseInt(simpleThursdayField);
          if (!isNaN(qty) && qty > 0) {
            return true;
          }
        }
        
        // Check for accommodation-specific Thursday fields
        const exactAdditionalNightFields = [
          'Additional Night (Thursday) (Tent or Van/Roof Top)',
          'Additional Night (Thursday) (RV)',
          'Additional Night (Thursday) (Glamping Tent)',
          'Additional Night (Thursday) (Cabin)'
        ];
        
        for (const fieldName of exactAdditionalNightFields) {
          const value = fields[fieldName];
          if (value && value.trim() !== '' && value !== '0' && value.toLowerCase() !== 'false') {
            return true;
          }
        }
        
        // Check for any field with "Thursday" that has a truthy value
        const thursdayFields = Object.keys(fields).filter(key => {
          const keyLower = key.toLowerCase();
          return (keyLower.includes('thursday') || keyLower.includes('additional night')) &&
                 keyLower.includes('thursday');
        });
        
        for (const field of thursdayFields) {
          const value = fields[field];
          if (value && value !== '0' && value.toLowerCase() !== 'false' && value.trim() !== '') {
            return true;
          }
        }
        
        return false;
      };

      // Helper function to determine ticket type from RegFox data
      const determineTicketType = (fields: Record<string, string>) => {
        // Primary accommodation field - This is the main field that determines accommodation type
        const primaryAccommodationField = 'Are you staying in a Tent, Van/Rooftop,  RV, Glamping Tent, or Cabin??';
        const accommodationType = fields[primaryAccommodationField]?.toLowerCase();
        
        if (accommodationType) {
          if (accommodationType.includes('glamping')) return 'glamping';
          if (accommodationType.includes('rv')) return 'rv_site';
          if (accommodationType.includes('cabin')) return 'cabin';
          if (accommodationType.includes('tent') || accommodationType.includes('van')) return 'dry_site';
        }
        
        // Fallback: Check for registration options that indicate ticket type
        const registrationFields = [
          'RV Registration Options',
          'Tent Registration Options', 
          'Glamping Registration Options',
          'Cabin Registration Options'
        ];
        
        for (const field of registrationFields) {
          if (fields[field]) {
            if (field.includes('RV')) return 'rv_site';
            if (field.includes('Glamping')) return 'glamping';
            if (field.includes('Cabin')) return 'cabin';
            if (field.includes('Tent')) return 'dry_site';
          }
        }
        
        // Final fallback: Check multipleChoice field
        const multipleChoice = fields['multipleChoice']?.toLowerCase();
        if (multipleChoice) {
          if (multipleChoice.includes('glamping')) return 'glamping';
          if (multipleChoice.includes('rv')) return 'rv_site';
          if (multipleChoice.includes('cabin')) return 'cabin';
          if (multipleChoice.includes('tent')) return 'dry_site';
        }
        
        return 'dry_site';
      };

      // ============= PHASE 1: UPDATE EXISTING RECORD STATUSES =============
      // Before processing new records, update existing records that may have changed status in RegFox
      const updateExistingRecordStatuses = async () => {
        console.log('Phase 1: Updating status of existing records...');
        let statusUpdateCount = 0;
        
        // Process in smaller batches for status updates
        const STATUS_BATCH_SIZE = 20;
        for (let i = 0; i < regfoxAttendees.length; i += STATUS_BATCH_SIZE) {
          const statusBatch = regfoxAttendees.slice(i, i + STATUS_BATCH_SIZE);
          
          for (const regfoxAttendee of statusBatch) {
            try {
              // Map the RegFox status using the same logic as main sync
              const mapRegistrationStatus = (status: string) => {
                const statusLower = status.toLowerCase();
                
                // Explicit handling for statuses that should NOT be synced
                if (statusLower.includes('abandon')) return 'abandoned';
                if (statusLower.includes('transfer')) return 'transferred';
                if (statusLower.includes('incomplete')) return 'incomplete';
                if (statusLower.includes('draft')) return 'draft';
                
                // Statuses for staff hub visibility but not RFID assignment
                if (statusLower.includes('cancel')) return 'cancelled';
                if (statusLower.includes('refund')) return 'refunded';
                if (statusLower.includes('pending')) return 'pending';
                if (statusLower.includes('waitlist')) return 'waitlisted';
                
                // Only registered attendees get RFID assignment
                if (statusLower.includes('complete') || statusLower.includes('paid') || statusLower === 'registered') {
                  return 'registered';
                }
                
                return 'unknown';
              };
              
              const currentRegFoxStatus = mapRegistrationStatus(regfoxAttendee.status);
              
              // Only update existing records that have changed to abandoned/cancelled/etc
              if (['abandoned', 'cancelled', 'transferred', 'incomplete', 'draft', 'pending', 'waitlisted'].includes(currentRegFoxStatus)) {
                const { data: existingRecord, error: fetchError } = await supabase
                  .from('attendees')
                  .select('id, registration_status')
                  .eq('regfox_id', regfoxAttendee.id)
                  .eq('registration_status', 'registered') // Only update records that are currently registered
                  .single();
                
                if (!fetchError && existingRecord) {
                  // Update the existing record's status
                  const { error: updateError } = await supabase
                    .from('attendees')
                    .update({
                      registration_status: currentRegFoxStatus,
                      updated_at: new Date().toISOString()
                    })
                    .eq('id', existingRecord.id);
                  
                  if (!updateError) {
                    statusUpdateCount++;
                    console.log(`Status Update - RegFox ID ${regfoxAttendee.id}: registered -> ${currentRegFoxStatus}`);
                  } else {
                    console.error(`Error updating status for RegFox ID ${regfoxAttendee.id}:`, updateError.message);
                  }
                }
              }
            } catch (error) {
              console.error(`Error in status update for RegFox ID ${regfoxAttendee.id}:`, error.message);
            }
          }
        }
        
        console.log(`Phase 1 Complete: Updated ${statusUpdateCount} existing record statuses`);
        return statusUpdateCount;
      };
      
      // Execute Phase 1: Status Updates
      const statusUpdates = await updateExistingRecordStatuses();
      
      // ============= PHASE 2: PROCESS NEW/UPDATED RECORDS =============
      syncResult.totalRecords = regfoxAttendees.length;
      console.log(`Phase 2: Processing ${syncResult.totalRecords} attendees from RegFox (${statusUpdates} statuses updated in Phase 1)`);

      // Process attendees in batches to prevent CPU timeouts
      const BATCH_SIZE = 50; // Process 50 attendees at a time
      const batches = [];
      
      for (let i = 0; i < regfoxAttendees.length; i += BATCH_SIZE) {
        batches.push(regfoxAttendees.slice(i, i + BATCH_SIZE));
      }
      
      console.log(`Processing ${batches.length} batches of up to ${BATCH_SIZE} attendees each`);

      // Process each batch with CPU timeout protection
      const startTime = Date.now();
      const MAX_EXECUTION_TIME = 15 * 60 * 1000; // 15 minutes max execution time
      
      for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
        // Check for CPU timeout before each batch
        const elapsedTime = Date.now() - startTime;
        if (elapsedTime > MAX_EXECUTION_TIME) {
          console.warn(`Approaching CPU timeout limit. Processed ${batchIndex} of ${batches.length} batches.`);
          syncResult.errors.push(`Sync stopped early due to CPU timeout. Processed ${syncResult.newRecords + syncResult.updatedRecords} of ${syncResult.totalRecords} attendees.`);
          break;
        }
        
        const batch = batches[batchIndex];
        console.log(`Processing batch ${batchIndex + 1}/${batches.length} (${batch.length} attendees)`);
        
        // Check for cancellation before each batch
        if (await checkCancellation()) {
          throw new Error('Sync cancelled by user');
        }
        
        // Update heartbeat with batch progress
        await updateHeartbeat({
          batch: batchIndex + 1,
          totalBatches: batches.length,
          processed: syncResult.newRecords + syncResult.updatedRecords,
          total: syncResult.totalRecords
        });

        // Process attendees in current batch
        for (const regfoxAttendee of batch) {
        try {
          // Parse the fieldData array into a searchable object
          const fieldData = regfoxAttendee.fieldData || [];
          const fields = parseFieldData(fieldData);
          
          // Lightweight logging (removed CPU-intensive comprehensive field discovery)
          if (batchIndex === 0 && batch.indexOf(regfoxAttendee) === 0) {
            // Only log field discovery for the first attendee to help with debugging
            console.log(`=== SAMPLE FIELD DISCOVERY - ID: ${regfoxAttendee.id} ===`);
            console.log('Sample field labels:', Object.keys(fields).filter(k => !k.includes('.')).slice(0, 10));
            console.log('Sample field paths:', Object.keys(fields).filter(k => k.includes('.')).slice(0, 10));
            console.log('=== END SAMPLE FIELD DISCOVERY ===');
          }
          
          // Extract attendee information using the parsed fields
          const firstName = fields['name2.first'] || fields['First Name'] || '';
          const lastName = fields['name2.last'] || fields['Last Name'] || '';
          const email = fields['email'] || fields['Email'] || '';
          const phone = fields['phone'] || fields['Phone Number'] || null;
          
          // Address information - comprehensive field mapping
          const streetAddress = fields['address.street1'] || fields['Street Address'] || 
                               fields['address'] || fields['Address'] || null;
          const city = fields['address.city'] || fields['City'] || null;
          const state = fields['address.state'] || fields['State'] || fields['Province'] || null;
          const postalCode = fields['address.postalCode'] || fields['ZIP/Postal Code'] || 
                            fields['zipCode'] || fields['Zip Code'] || null;
          const country = fields['address.country'] || fields['Country'] || null;
          
          // Personal demographics
          const dateOfBirth = fields['dateOfBirth'] || fields['Date of Birth'] || 
                             fields['birthday'] || fields['Birthday'] || null;
          const gender = fields['gender'] || fields['Gender'] || null;
          const maritalStatus = fields['status'] || fields['Status?'] || fields['Marital Status'] || null;
          
          // Extract t-shirt information from product purchases
          const tShirtData = extractTShirtSize(fields);
          const tShirtSize = tShirtData.size;
          
          // Event preferences and custom fields (keeping existing logic as fallback)
          const legacyTShirtSize = fields['tShirtSize'] || fields['T-Shirt Size'] || 
                                 fields['shirt size'] || fields['Shirt Size'] || null;
          
          // Use extracted t-shirt size from products, fallback to legacy field
          const finalTShirtSize = tShirtSize || legacyTShirtSize;
          const dietaryRestrictions = fields['dietaryRestrictions'] || fields['Dietary Restrictions'] || 
                                    fields['dietary'] || fields['Food Allergies'] || 
                                    fields['allergies'] || fields['Allergies'] || null;
          
          // Emergency contact information - enhanced parsing
          const emergencyContactRaw = fields['emergencyContactNameNumber'] || 
                                    fields['Emergency Contact Name & Number?'] || 
                                    fields['emergencyContact'] || fields['Emergency Contact'] || null;
          
          let emergencyContactName = null;
          let emergencyContactPhone = null;
          
          if (emergencyContactRaw) {
            // Try to parse name and phone from combined field
            const phoneRegex = /(\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4})/;
            const phoneMatch = emergencyContactRaw.match(phoneRegex);
            
            if (phoneMatch) {
              emergencyContactPhone = phoneMatch[1];
              emergencyContactName = emergencyContactRaw.replace(phoneMatch[1], '').trim().replace(/[,-]$/, '');
            } else {
              emergencyContactName = emergencyContactRaw;
            }
          }
          
          // Override with separate fields if available
          emergencyContactName = fields['Emergency Contact Name'] || emergencyContactName;
          emergencyContactPhone = fields['Emergency Contact Phone'] || 
                                 fields['Emergency Phone'] || emergencyContactPhone;
          
          // Special accommodations and preferences
          const specialAccommodations = fields['specialAccommodations'] || 
                                      fields['Special Accommodations'] || 
                                      fields['accessibility'] || fields['Accessibility Needs'] || null;
          
          const howDidYouHear = fields['howDidYouHear'] || fields['How did you hear about us?'] || 
                              fields['referral'] || fields['Referral Source'] || null;
          
          // Meal plan information - Enhanced detection
          let mealPlan = fields['mealPlan'] || fields['Meal Plan-'] || fields['Meal Plan'] || null;
          
          // Look for meal plan in field names containing "meal"
          if (!mealPlan) {
            const mealFields = Object.keys(fields).filter(key => 
              key.toLowerCase().includes('meal') && fields[key]
            );
            if (mealFields.length > 0) {
              mealPlan = fields[mealFields[0]];
              console.log(`Sync - Found meal plan via pattern matching: ${mealFields[0]} = ${mealPlan}`);
            }
          }
          
          // Collect all unhandled custom fields
          const customFields: Record<string, any> = {};
          const handledFields = [
            'name2.first', 'First Name', 'name2.last', 'Last Name', 'email', 'Email',
            'phone', 'Phone Number', 'address.street1', 'Street Address', 'address',
            'Address', 'address.city', 'City', 'address.state', 'State', 'Province',
            'address.postalCode', 'ZIP/Postal Code', 'zipCode', 'Zip Code',
            'address.country', 'Country', 'dateOfBirth', 'Date of Birth', 'birthday',
            'Birthday', 'gender', 'Gender', 'status', 'Status?', 'Marital Status',
            'tShirtSize', 'T-Shirt Size', 'shirt size', 'Shirt Size',
            'dietaryRestrictions', 'Dietary Restrictions', 'dietary', 'Food Allergies',
            'allergies', 'Allergies', 'emergencyContactNameNumber', 
            'Emergency Contact Name & Number?', 'emergencyContact', 'Emergency Contact',
            'Emergency Contact Name', 'Emergency Contact Phone', 'Emergency Phone',
            'specialAccommodations', 'Special Accommodations', 'accessibility',
            'Accessibility Needs', 'howDidYouHear', 'How did you hear about us?',
            'referral', 'Referral Source', 'mealPlan', 'Meal Plan-', 'Meal Plan',
            'areYouVeteran', 'Are you a veteran?', 'military', 'Military Service',
            'veteran', 'militaryBranch', 'Military Branch', 'serviceBranch', 'Service Branch'
          ];
          
          // Detect waiver status - Enhanced detection
          let waiverSigned = false;
          const waiverFields = ['waiver', 'Waiver', 'agreement', 'Agreement', 'waiver_signed'];
          
          for (const field of waiverFields) {
            const value = fields[field];
            if (value) {
              // Check for various waiver signature indicators
              const valueStr = String(value).toLowerCase();
              if (valueStr.includes('.pdf') || valueStr.includes('signed') || 
                  valueStr === 'yes' || valueStr === 'true' || valueStr === '1' ||
                  valueStr.includes('agree')) {
                waiverSigned = true;
                break;
              }
            }
          }
          
          // Store any fields not explicitly handled
          for (const [fieldName, fieldValue] of Object.entries(fields)) {
            if (!handledFields.includes(fieldName) && fieldValue) {
              customFields[fieldName] = fieldValue;
            }
          }
          
          // Add t-shirt product information to custom fields for inventory tracking
          if (tShirtData.products.length > 0) {
            customFields['t_shirt_products'] = tShirtData.products;
            customFields['t_shirt_inventory'] = {
              primary_size: tShirtData.size,
              total_products: tShirtData.products.length,
              product_details: tShirtData.products.map(p => ({
                field: p.field,
                value: p.value,
                extracted_size: p.size
              }))
            };
          }
          
          // Enhanced veteran detection - Check multiple field patterns
          let isVeteran = false;
          const veteranFields = ['areYouVeteran', 'Are you a veteran?', 'military', 'Military Service', 'veteran'];
          
          for (const field of veteranFields) {
            const value = fields[field];
            if (value && (value.toLowerCase() === 'yes' || value === 'true' || value === '1')) {
              isVeteran = true;
              break;
            }
          }
          
          // Also check for veteran-related field patterns
          if (!isVeteran) {
            const veteranPatternFields = Object.keys(fields).filter(key => 
              key.toLowerCase().includes('veteran') && fields[key]
            );
            for (const field of veteranPatternFields) {
              const value = fields[field];
              if (value && value.toLowerCase() === 'yes') {
                isVeteran = true;
                break;
              }
            }
          }
          
          // Extract military branch - Enhanced detection
          let militaryBranch = fields['militaryBranch'] || 
                               fields['Military Branch'] || 
                               fields['serviceBranch'] ||
                               fields['Service Branch'] || null;
          
          // Look for branch in field names containing "branch" or "service"
          if (!militaryBranch && isVeteran) {
            const branchFields = Object.keys(fields).filter(key => {
              const keyLower = key.toLowerCase();
              return (keyLower.includes('branch') || keyLower.includes('service')) && 
                     fields[key] && fields[key] !== 'yes' && fields[key] !== 'no';
            });
            if (branchFields.length > 0) {
              militaryBranch = fields[branchFields[0]];
              console.log(`Sync - Military branch detected via pattern: ${branchFields[0]} = ${militaryBranch}`);
            }
          }
          
          // Enhanced RegFox status mapping with filtering
          const mapRegistrationStatus = (status: string) => {
            const statusLower = status.toLowerCase();
            
            // Explicit handling for statuses that should NOT be synced
            if (statusLower.includes('abandon')) return 'abandoned';
            if (statusLower.includes('transfer')) return 'transferred';
            if (statusLower.includes('incomplete')) return 'incomplete';
            if (statusLower.includes('draft')) return 'draft';
            
            // Statuses for staff hub visibility but not RFID assignment
            if (statusLower.includes('cancel')) return 'cancelled';
            if (statusLower.includes('refund')) return 'refunded';
            if (statusLower.includes('pending')) return 'pending';
            if (statusLower.includes('waitlist')) return 'waitlisted';
            
            // Only registered attendees get RFID assignment
            if (statusLower.includes('complete') || statusLower.includes('paid') || statusLower === 'registered') {
              return 'registered';
            }
            
            // Unknown status - log and skip
            console.log(`Unknown RegFox status: "${status}" for attendee ${regfoxAttendee.id} - SKIPPING`);
            return 'unknown';
          };
          
          const registrationStatus = mapRegistrationStatus(regfoxAttendee.status);
          
          // Log all status mappings for transparency
          console.log(`Sync - RegFox ID ${regfoxAttendee.id}: status=${regfoxAttendee.status} -> ${registrationStatus}`);
          
          // Skip abandoned/incomplete records - they should not be in the system
          if (registrationStatus === 'abandoned' || registrationStatus === 'incomplete' || registrationStatus === 'draft') {
            console.log(`Skipping attendee ${regfoxAttendee.id} with status: ${regfoxAttendee.status} -> ${registrationStatus} (invalid for sync)`);
            continue;
          }
          
          // Determine ticket type based on accommodation and features
          const ticketType = determineTicketType(fields);
          
          // Early access determination based on "Additional Night" purchase ONLY
          const earlyAccess = detectAdditionalNight(fields);
          
          // Arrival window based on early access (Additional Night purchase)
          const arrivalWindow = earlyAccess ? 'early' : 'standard';
          
          console.log(`Sync - RegFox ID ${regfoxAttendee.id}: ticketType=${ticketType}, earlyAccess=${earlyAccess}, arrivalWindow=${arrivalWindow}`);
          
          // Log t-shirt detection for debugging
          if (finalTShirtSize) {
            console.log(`Sync - RegFox ID ${regfoxAttendee.id}: T-shirt size detected: ${finalTShirtSize} (from ${tShirtData.products.length > 0 ? 'product purchases' : 'legacy field'})`);
          }

          // Enhanced duplicate detection using multiple criteria
          let existingAttendee = null;
          
          // Primary check: Look for existing attendee by regfox_id
          const { data: primaryMatch } = await supabase
            .from('attendees')
            .select('id, updated_at, regfox_id')
            .eq('regfox_id', regfoxAttendee.id)
            .single();
          
          if (primaryMatch) {
            existingAttendee = primaryMatch;
          } else {
            // Secondary check: Look for same person by order_id + name + email
            const orderId = regfoxAttendee.orderId || regfoxAttendee.displayId;
            if (orderId && firstName && lastName && email) {
              const { data: secondaryMatch } = await supabase
                .from('attendees')
                .select('id, updated_at, regfox_id')
                .eq('order_id', orderId)
                .eq('first_name', firstName)
                .eq('last_name', lastName)
                .eq('email', email)
                .single();
              
              if (secondaryMatch) {
                existingAttendee = secondaryMatch;
                console.log(`Duplicate detected: RegFox ID change from ${secondaryMatch.regfox_id} to ${regfoxAttendee.id} for ${firstName} ${lastName}`);
              }
            }
          }

          const attendeeData = {
            regfox_id: regfoxAttendee.id,
            order_id: regfoxAttendee.orderId || regfoxAttendee.displayId || null,
            first_name: firstName,
            last_name: lastName,
            email: email,
            phone: phone,
            ticket_type: ticketType,
            registration_status: registrationStatus,
            is_veteran: isVeteran,
            military_branch: militaryBranch,
            early_access: earlyAccess,
            arrival_window: arrivalWindow,
            meal_plan: mealPlan,
            
            // Address information
            street_address: streetAddress,
            city: city,
            state: state,
            postal_code: postalCode,
            country: country,
            
            // Personal demographics
            date_of_birth: dateOfBirth ? new Date(dateOfBirth).toISOString().split('T')[0] : null,
            gender: gender,
            marital_status: maritalStatus,
            
            // Event preferences
            t_shirt_size: finalTShirtSize,
            dietary_restrictions: dietaryRestrictions,
            special_accommodations: specialAccommodations,
            how_did_you_hear: howDidYouHear,
            
            // Emergency contact
            emergency_contact_name: emergencyContactName,
            emergency_contact_phone: emergencyContactPhone,
            
            // Custom fields and metadata
            custom_fields: customFields,
            
            // Extract parking assignment using enhanced function
            parking_assignment: customFields ? await supabase.rpc('extract_parking_assignment', { custom_fields_data: customFields }).then(result => result.data) : 'Not Assigned',
            
            waiver_signed: waiverSigned,
            activated_at: regfoxAttendee.checkedIn ? new Date().toISOString() : null,
            notes: null, // Keep notes separate from emergency contact
            created_at: regfoxAttendee.dateCreated
          };
          
          // Validate ticket_type against enum values before database operation
          const validTicketTypes = ['dry_site', 'rv_site', 'glamping', 'cabin'];
          if (!validTicketTypes.includes(attendeeData.ticket_type)) {
            console.error(`Sync - Invalid ticket_type detected: "${attendeeData.ticket_type}". Available types: ${validTicketTypes.join(', ')}`);
            console.error(`Sync - RegFox ID: ${regfoxAttendee.id}, Original ticket determination from fields:`, JSON.stringify(fields, null, 2));
            attendeeData.ticket_type = 'dry_site';
          }
          
          // At this point, we only process 'registered' attendees
          // So no need to validate or default registration_status

          if (existingAttendee) {
            // Update existing attendee
            const { error: updateError } = await supabase
              .from('attendees')
              .update({
                ...attendeeData,
                updated_at: new Date().toISOString()
              })
              .eq('id', existingAttendee.id);

            if (updateError) {
              syncResult.errors.push(`Error updating attendee ${regfoxAttendee.id}: ${updateError.message}`);
            } else {
              syncResult.updatedRecords++;
            }
          } else {
            // Insert new attendee
            const { error: insertError } = await supabase
              .from('attendees')
              .insert(attendeeData);

            if (insertError) {
              syncResult.errors.push(`Error inserting attendee ${regfoxAttendee.id}: ${insertError.message}`);
            } else {
              syncResult.newRecords++;
            }
          }
        } catch (error) {
          syncResult.errors.push(`Error processing attendee ${regfoxAttendee.id}: ${error.message}`);
        }
      } // End of attendee processing loop
      
      console.log(`Completed batch ${batchIndex + 1}/${batches.length}`);
    } // End of batch iteration loop

    // Update sync log with results
    const { error: updateSyncLogError } = await supabase
      .from('regfox_sync_log')
      .update({
        status: syncResult.errors.length > 0 ? 'error' : 'success',
        total_records: syncResult.totalRecords,
        new_records: syncResult.newRecords,
        updated_records: syncResult.updatedRecords,
        error_message: syncResult.errors.length > 0 ? syncResult.errors.join('; ') : null,
        sync_completed_at: new Date().toISOString(),
        heartbeat_at: new Date().toISOString()
      })
      .eq('id', syncLog.id);

    if (updateSyncLogError) {
      console.error('Error updating sync log:', updateSyncLogError);
    }

    // Clear heartbeat interval and release sync lock
    clearInterval(heartbeatInterval);
    await supabase.rpc('release_sync_lock', { p_sync_id: syncLog.id });

    console.log('RegFox sync completed:', syncResult);

    return new Response(JSON.stringify({
      success: true,
      syncId: syncLog.id,
      result: syncResult
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

    } catch (innerError) {
      console.error('Inner sync process error:', innerError);
      throw innerError;
    }

  } catch (error) {
    console.error('Error in regfox-sync function:', error);
    
    // Cleanup in error case
    clearInterval(heartbeatInterval);
    
    // Update sync log with error
    try {
      await supabase
        .from('regfox_sync_log')
        .update({
          status: 'error',
          error_message: error.message,
          sync_completed_at: new Date().toISOString()
        })
        .eq('id', syncLog.id);
    } catch (logError) {
      console.error('Error updating sync log with error:', logError);
    }
    
    // Release sync lock
    try {
      await supabase.rpc('release_sync_lock', { p_sync_id: syncLog.id });
    } catch (lockError) {
      console.error('Error releasing sync lock:', lockError);
    }
    
    return new Response(JSON.stringify({ 
      error: error.message,
      success: false
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});