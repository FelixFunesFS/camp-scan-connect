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

    console.log('Starting RegFox sync...');

    // Create sync log entry
    const { data: syncLog, error: syncLogError } = await supabase
      .from('regfox_sync_log')
      .insert({
        sync_type: 'initial_sync',
        status: 'in_progress',
        sync_started_at: new Date().toISOString()
      })
      .select()
      .single();

    if (syncLogError) {
      console.error('Error creating sync log:', syncLogError);
      throw syncLogError;
    }

    const syncResult: SyncResult = {
      totalRecords: 0,
      newRecords: 0,
      updatedRecords: 0,
      errors: []
    };

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
      let startingAfter: string | null = null;
      let hasMore = true;
      
      try {
        // Use pagination to fetch all registrants
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

      // Helper function to detect "Additional Night" purchase (Thursday early access)
      const detectAdditionalNight = (fields: Record<string, string>) => {
        console.log('Sync - All field names:', Object.keys(fields));
        console.log('Sync - All field values:', JSON.stringify(fields, null, 2));
        
        // Exact field names from RegFox form for Thursday Additional Night purchases
        const exactAdditionalNightFields = [
          'Additional Night (Thursday) (Tent or Van/Roof Top)',
          'Additional Night (Thursday) (RV)',
          'Additional Night (Thursday) (Glamping Tent)',
          'Additional Night (Thursday) (Cabin)'
        ];
        
        // Check for exact field matches first
        for (const fieldName of exactAdditionalNightFields) {
          if (fields[fieldName]) {
            const value = fields[fieldName];
            console.log(`Sync - Found exact Additional Night field "${fieldName}": ${value}`);
            
            // Check if the value indicates a purchase
            // Handle "X of Y" patterns (e.g., "0 of 1", "1 of 1") as purchases
            const ofPattern = /^\d+\s+of\s+\d+$/i.test(value.trim());
            if (value && value.trim() !== '' && (ofPattern || (value !== '0' && value.toLowerCase() !== 'false'))) {
              console.log(`Sync - Additional Night detected via exact field: ${fieldName} = ${value}`);
              return true;
            }
          }
        }
        
        // Fallback: Check for fields containing "Additional Night" and "Thursday"
        const additionalNightFields = Object.keys(fields).filter(key => {
          const keyLower = key.toLowerCase();
          return keyLower.includes('additional night') && keyLower.includes('thursday');
        });
        
        console.log('Sync - Additional night fields found (fallback):', additionalNightFields);
        
        // Check if any additional night field has a truthy value
        const hasAdditionalNight = additionalNightFields.some(field => {
          const value = fields[field];
          console.log(`Sync - Fallback field "${field}": ${value}`);
          
          if (!value) return false;
          const stringValue = String(value).toLowerCase().trim();
          return stringValue !== '0' && 
                 stringValue !== 'false' && 
                 stringValue !== 'no' && 
                 stringValue !== '' && 
                 stringValue !== 'null' &&
                 stringValue !== 'undefined';
        });
        
        if (hasAdditionalNight) {
          console.log('Sync - Additional Night detected via fallback pattern matching');
        }
        
        return hasAdditionalNight;
      };

      // Helper function to determine ticket type from RegFox data
      const determineTicketType = (fields: Record<string, string>) => {
        console.log('Sync - Determining ticket type from field data...');
        
        // Define accommodation field patterns and their corresponding ticket types
        const accommodationMappings = [
          { patterns: ['glamping'], ticketType: 'glamping' },
          { patterns: ['rv', 'recreational vehicle'], ticketType: 'rv_site' },
          { patterns: ['cabin', 'lodge'], ticketType: 'cabin' },
          { patterns: ['tent', 'camping', 'dry'], ticketType: 'dry_site' }
        ];
        
        // Check all field names and values for accommodation indicators
        for (const [fieldName, fieldValue] of Object.entries(fields)) {
          if (!fieldValue) continue;
          
          const searchText = `${fieldName} ${fieldValue}`.toLowerCase();
          console.log(`Sync - Checking field: ${fieldName} = ${fieldValue}`);
          
          for (const mapping of accommodationMappings) {
            if (mapping.patterns.some(pattern => searchText.includes(pattern))) {
              console.log(`Sync - Found ticket type "${mapping.ticketType}" from pattern "${mapping.patterns[0]}" in "${searchText}"`);
              return mapping.ticketType;
            }
          }
        }
        
        console.log('Sync - No specific accommodation found, defaulting to dry_site');
        return 'dry_site'; // default fallback
      };

      syncResult.totalRecords = regfoxAttendees.length;
      console.log(`Processing ${syncResult.totalRecords} attendees from RegFox`);

      // Process each attendee from RegFox
      for (const regfoxAttendee of regfoxAttendees) {
        try {
          // Parse the fieldData array into a searchable object
          const fieldData = regfoxAttendee.fieldData || [];
          const fields = parseFieldData(fieldData);
          
          // ===== COMPREHENSIVE FIELD DISCOVERY LOGGING =====
          console.log(`=== REGFOX FIELD DISCOVERY - ID: ${regfoxAttendee.id} ===`);
          console.log('All RegFox field labels:', Object.keys(fields).filter(k => !k.includes('.')));
          console.log('All RegFox field paths:', Object.keys(fields).filter(k => k.includes('.')));
          console.log('Complete field mapping:', JSON.stringify(fields, null, 2));
          console.log('Raw fieldData array:', JSON.stringify(fieldData, null, 2));
          console.log('=== END FIELD DISCOVERY ===');
          
          // Log all field names for debugging Additional Night detection
          console.log(`RegFox ID ${regfoxAttendee.id} fields:`, Object.keys(fields));
          
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
          
          // Event preferences and custom fields
          const tShirtSize = fields['tShirtSize'] || fields['T-Shirt Size'] || 
                           fields['shirt size'] || fields['Shirt Size'] || null;
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
          
          // Meal plan information
          const mealPlan = fields['mealPlan'] || fields['Meal Plan-'] || fields['Meal Plan'] || null;
          
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
          
          // Store any fields not explicitly handled
          for (const [fieldName, fieldValue] of Object.entries(fields)) {
            if (!handledFields.includes(fieldName) && fieldValue) {
              customFields[fieldName] = fieldValue;
            }
          }
          
          // Enhanced veteran detection
          const isVeteran = fields['areYouVeteran'] === 'yes' || 
                           fields['Are you a veteran?'] === 'yes' ||
                           fields['military'] === 'yes' ||
                           fields['Military Service'] === 'yes' ||
                           fields['veteran'] === 'yes';
          
          // Extract military branch
          const militaryBranch = fields['militaryBranch'] || 
                               fields['Military Branch'] || 
                               fields['serviceBranch'] ||
                               fields['Service Branch'] || null;
          
          // Map RegFox status to our enum
          const mapRegistrationStatus = (status: string) => {
            const statusLower = status.toLowerCase();
            if (statusLower.includes('cancel')) return 'cancelled';
            if (statusLower.includes('refund')) return 'refunded';
            if (statusLower.includes('pending')) return 'pending';
            if (statusLower.includes('waitlist')) return 'waitlisted';
            return 'registered';
          };
          
          const registrationStatus = mapRegistrationStatus(regfoxAttendee.status);
          
          // Determine ticket type based on accommodation and features
          const ticketType = determineTicketType(fields);
          
          // Early access determination based on "Additional Night" purchase ONLY
          const earlyAccess = detectAdditionalNight(fields);
          
          // Arrival window based on early access (Additional Night purchase)
          const arrivalWindow = earlyAccess ? 'early' : 'standard';
          
          console.log(`Sync - RegFox ID ${regfoxAttendee.id}: ticketType=${ticketType}, earlyAccess=${earlyAccess}, arrivalWindow=${arrivalWindow}`);

          // Check if attendee already exists by regfox_id
          const { data: existingAttendee } = await supabase
            .from('attendees')
            .select('id, updated_at')
            .eq('regfox_id', regfoxAttendee.id)
            .single();

          const attendeeData = {
            regfox_id: regfoxAttendee.id,
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
            t_shirt_size: tShirtSize,
            dietary_restrictions: dietaryRestrictions,
            special_accommodations: specialAccommodations,
            how_did_you_hear: howDidYouHear,
            
            // Emergency contact
            emergency_contact_name: emergencyContactName,
            emergency_contact_phone: emergencyContactPhone,
            
            // Custom fields and metadata
            custom_fields: customFields,
            
            waiver_signed: false, // Will be updated when waiver is actually signed
            checked_in_at: regfoxAttendee.checkedIn ? new Date().toISOString() : null,
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
          
          // Validate registration_status against enum values
          const validRegistrationStatuses = ['registered', 'cancelled', 'refunded', 'pending', 'waitlisted'];
          if (!validRegistrationStatuses.includes(attendeeData.registration_status)) {
            console.error(`Sync - Invalid registration_status detected: "${attendeeData.registration_status}". Available statuses: ${validRegistrationStatuses.join(', ')}`);
            attendeeData.registration_status = 'registered';
          }

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
      }

      // Update sync log with results
      const { error: updateSyncLogError } = await supabase
        .from('regfox_sync_log')
        .update({
          status: syncResult.errors.length > 0 ? 'error' : 'success',
          total_records: syncResult.totalRecords,
          new_records: syncResult.newRecords,
          updated_records: syncResult.updatedRecords,
          error_message: syncResult.errors.length > 0 ? syncResult.errors.join('; ') : null,
          sync_completed_at: new Date().toISOString()
        })
        .eq('id', syncLog.id);

      if (updateSyncLogError) {
        console.error('Error updating sync log:', updateSyncLogError);
      }

      console.log('RegFox sync completed:', syncResult);

      return new Response(JSON.stringify({
        success: true,
        syncId: syncLog.id,
        result: syncResult
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });

    } catch (error) {
      // Update sync log with error
      await supabase
        .from('regfox_sync_log')
        .update({
          status: 'error',
          error_message: error.message,
          sync_completed_at: new Date().toISOString()
        })
        .eq('id', syncLog.id);

      throw error;
    }

  } catch (error) {
    console.error('Error in regfox-sync function:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      success: false
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});