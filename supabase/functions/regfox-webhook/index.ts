import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RegFoxWebhookPayload {
  event?: string;
  eventType?: string;
  data: {
    id?: string;
    firstName?: string;
    lastName?: string;
    email?: string;
    phone?: string;
    registrationPath?: string;
    registrationDate?: string;
    status?: string;
    // New format fields
    registrants?: Array<{
      id: string;
      data: Array<{
        fieldId?: number;
        fieldName?: string;
        fieldValue?: string;
      }>;
    }>;
    registrationTimestamp?: string;
    billing?: {
      name?: {
        first?: string;
        last?: string;
      };
      email?: string;
      phone?: string;
    };
    tickets?: Array<{
      ticketKey?: string;
      ticketLabel?: string;
    }>;
  };
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

    console.log('RegFox webhook received');

    const payload: RegFoxWebhookPayload = await req.json();
    console.log('Webhook payload:', payload);

    // Create sync log entry for webhook
    const { data: syncLog, error: syncLogError } = await supabase
      .from('regfox_sync_log')
      .insert({
        sync_type: 'webhook',
        status: 'in_progress',
        sync_started_at: new Date().toISOString()
      })
      .select()
      .single();

    if (syncLogError) {
      console.error('Error creating sync log:', syncLogError);
      throw syncLogError;
    }

    let result = {
      newRecords: 0,
      updatedRecords: 0,
      errors: [] as string[]
    };

    try {
      // Determine event type and process accordingly
      const eventType = payload.event || payload.eventType;
      console.log('Processing event type:', eventType);

      if (eventType === 'registration.created' || eventType === 'registration.updated' || eventType === 'registration') {
        let attendeeData: any = null;
        let attendeeId: string | null = null;

        // Handle original format (direct data structure)
        if (payload.data.firstName && payload.data.lastName) {
          console.log('Processing original format');
          attendeeData = {
            first_name: payload.data.firstName,
            last_name: payload.data.lastName,
            email: payload.data.email,
            phone: payload.data.phone || null,
            regfox_id: payload.data.id
          };
          attendeeId = payload.data.id;
        } 
        // Handle new format (registrants array)
        else if (payload.data.registrants && payload.data.registrants.length > 0) {
          console.log('Processing new format with registrants');
          const registrant = payload.data.registrants[0];
          
          // Extract name and email from billing or registrant data
          const firstName = payload.data.billing?.name?.first || 
                          registrant.data?.find(d => d.fieldName?.toLowerCase().includes('first'))?.fieldValue || 'Unknown';
          const lastName = payload.data.billing?.name?.last || 
                         registrant.data?.find(d => d.fieldName?.toLowerCase().includes('last'))?.fieldValue || 'User';
          const email = payload.data.billing?.email || 
                       registrant.data?.find(d => d.fieldName?.toLowerCase().includes('email'))?.fieldValue;
          const phone = payload.data.billing?.phone || 
                       registrant.data?.find(d => d.fieldName?.toLowerCase().includes('phone'))?.fieldValue;

          // Enhanced field extraction for comprehensive data capture
          const extractFieldValue = (fieldPatterns: string[]) => {
            for (const pattern of fieldPatterns) {
              const field = registrant.data?.find(d => 
                d.fieldName?.toLowerCase().includes(pattern.toLowerCase())
              );
              if (field?.fieldValue) return field.fieldValue;
            }
            return null;
          };

          // Address information
          const streetAddress = extractFieldValue(['street', 'address line 1', 'address']);
          const city = extractFieldValue(['city']);
          const state = extractFieldValue(['state', 'province']);
          const postalCode = extractFieldValue(['zip', 'postal', 'postal code']);
          const country = extractFieldValue(['country']);
          
          // Personal demographics
          const dateOfBirth = extractFieldValue(['date of birth', 'birthday', 'birth date']);
          const gender = extractFieldValue(['gender']);
          const maritalStatus = extractFieldValue(['marital', 'status', 'relationship status']);
          
          // Event preferences
          const tShirtSize = extractFieldValue(['shirt size', 't-shirt', 'tshirt size']);
          const dietaryRestrictions = extractFieldValue(['dietary', 'allergies', 'food allergies', 'restrictions']);
          const specialAccommodations = extractFieldValue(['accommodation', 'accessibility', 'special needs']);
          const howDidYouHear = extractFieldValue(['how did you hear', 'referral', 'source']);
          const mealPlan = extractFieldValue(['meal plan', 'meal']);
          
          // Emergency contact - try to extract name and phone separately
          let emergencyContactName = extractFieldValue(['emergency contact name', 'emergency name']);
          let emergencyContactPhone = extractFieldValue(['emergency contact phone', 'emergency phone', 'emergency number']);
          
          // If combined field exists, try to parse it
          const emergencyContactCombined = extractFieldValue(['emergency contact', 'emergency']);
          if (emergencyContactCombined && !emergencyContactName && !emergencyContactPhone) {
            const phoneRegex = /(\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4})/;
            const phoneMatch = emergencyContactCombined.match(phoneRegex);
            
            if (phoneMatch) {
              emergencyContactPhone = phoneMatch[1];
              emergencyContactName = emergencyContactCombined.replace(phoneMatch[1], '').trim().replace(/[,-]$/, '');
            } else {
              emergencyContactName = emergencyContactCombined;
            }
          }
          
          // Collect unhandled custom fields
          const customFields: Record<string, any> = {};
          const handledPatterns = [
            'first', 'last', 'email', 'phone', 'street', 'address', 'city', 'state', 
            'province', 'zip', 'postal', 'country', 'date of birth', 'birthday', 
            'gender', 'marital', 'status', 'shirt', 't-shirt', 'dietary', 'allergies', 
            'accommodation', 'accessibility', 'how did you hear', 'referral', 'meal', 
            'emergency', 'veteran', 'military', 'branch', 'additional night', 'thursday'
          ];
          
          // Store fields not handled by standard patterns
          registrant.data?.forEach(field => {
            if (field.fieldName && field.fieldValue) {
              const isHandled = handledPatterns.some(pattern => 
                field.fieldName.toLowerCase().includes(pattern)
              );
              if (!isHandled) {
                customFields[field.fieldName] = field.fieldValue;
              }
            }
          });

          attendeeData = {
            first_name: firstName,
            last_name: lastName,
            email: email,
            phone: phone || null,
            regfox_id: registrant.id,
            order_id: payload.data.id || null
          };
          attendeeId = registrant.id;
        }

        if (attendeeData && attendeeId) {
          // ===== COMPREHENSIVE FIELD DISCOVERY LOGGING =====
          console.log(`=== WEBHOOK FIELD DISCOVERY - ID: ${attendeeId} ===`);
          if (payload.data.registrants && payload.data.registrants.length > 0) {
            const registrant = payload.data.registrants[0];
            console.log('Webhook registrant field names:', registrant.data?.map(d => d.fieldName) || []);
            console.log('Webhook registrant full data:', JSON.stringify(registrant.data, null, 2));
          }
          console.log('Webhook billing data:', JSON.stringify(payload.data.billing, null, 2));
          console.log('Webhook tickets data:', JSON.stringify(payload.data.tickets, null, 2));
          console.log('Webhook full payload:', JSON.stringify(payload.data, null, 2));
          console.log('=== END WEBHOOK FIELD DISCOVERY ===');
          // Enhanced ticket type mapping to match database enum and sync function logic
          const ticketTypeMap: Record<string, string> = {
            'Premium Power Site': 'premium_power',
            'Dry Site': 'dry_site',
            'RV Site': 'rv_site',
            'Glamping': 'glamping',
            'Glamping Tent': 'glamping',
            'Cabin': 'cabin',
            'Day Pass': 'day_pass',
            'Staff': 'staff',
            'Vendor': 'vendor'
          };

          // Enhanced ticket type determination logic matching sync function
          let ticketType = 'dry_site';
          
          // Helper function to determine ticket type from RegFox data (matching sync function)
          const determineTicketTypeFromPayload = (payloadData: any) => {
            console.log('Webhook - Determining ticket type from payload data...');
            
            // Define accommodation field patterns and their corresponding ticket types
            const accommodationMappings = [
              { patterns: ['glamping'], ticketType: 'glamping' },
              { patterns: ['rv', 'recreational vehicle'], ticketType: 'rv_site' },
              { patterns: ['cabin', 'lodge'], ticketType: 'cabin' },
              { patterns: ['tent', 'camping', 'dry'], ticketType: 'dry_site' }
            ];
            
            // Check for accommodation type in registrant data
            if (payloadData.registrants && payloadData.registrants.length > 0) {
              const registrant = payloadData.registrants[0];
              console.log('Webhook - Registrant data fields:', registrant.data?.map(d => `${d.fieldName}: ${d.fieldValue}`));
              
              for (const field of (registrant.data || [])) {
                if (!field.fieldValue) continue;
                
                const searchText = `${field.fieldName} ${field.fieldValue}`.toLowerCase();
                console.log(`Webhook - Checking field: ${field.fieldName} = ${field.fieldValue}`);
                
                for (const mapping of accommodationMappings) {
                  if (mapping.patterns.some(pattern => searchText.includes(pattern))) {
                    console.log(`Webhook - Found ticket type "${mapping.ticketType}" from pattern "${mapping.patterns[0]}" in "${searchText}"`);
                    return mapping.ticketType;
                  }
                }
              }
            }
            
            // Fallback to registration path mapping
            if (payloadData.registrationPath && ticketTypeMap[payloadData.registrationPath]) {
              console.log(`Webhook - Found ticket type from registration path: ${payloadData.registrationPath} -> ${ticketTypeMap[payloadData.registrationPath]}`);
              return ticketTypeMap[payloadData.registrationPath];
            }
            
            // Fallback to ticket mapping
            if (payloadData.tickets && payloadData.tickets.length > 0) {
              const ticket = payloadData.tickets[0];
              const ticketLabel = ticket.ticketLabel || ticket.ticketKey || '';
              if (ticketTypeMap[ticketLabel]) {
                console.log(`Webhook - Found ticket type from ticket label: ${ticketLabel} -> ${ticketTypeMap[ticketLabel]}`);
                return ticketTypeMap[ticketLabel];
              }
            }
            
            console.log('Webhook - No specific accommodation found, defaulting to dry_site');
            return 'dry_site'; // Safe default
          };

          ticketType = determineTicketTypeFromPayload(payload.data);

          // Helper function to detect veteran status
          const detectVeteranStatus = (payloadData: any) => {
            if (payloadData.registrants && payloadData.registrants.length > 0) {
              const registrant = payloadData.registrants[0];
              const veteranField = registrant.data?.find(d => 
                d.fieldName?.toLowerCase().includes('veteran') || 
                d.fieldName?.toLowerCase().includes('military') ||
                d.fieldName?.toLowerCase().includes('service member') ||
                d.fieldName?.toLowerCase().includes('armed forces')
              );
              
              if (veteranField && veteranField.fieldValue) {
                const value = veteranField.fieldValue.toLowerCase();
                return value.includes('yes') || value.includes('true') || value === 'veteran';
              }
            }
            return false;
          };

          // Helper function to extract military branch
          const extractMilitaryBranch = (payloadData: any) => {
            if (payloadData.registrants && payloadData.registrants.length > 0) {
              const registrant = payloadData.registrants[0];
              const branchField = registrant.data?.find(d => 
                d.fieldName?.toLowerCase().includes('branch') || 
                d.fieldName?.toLowerCase().includes('service branch') ||
                d.fieldName?.toLowerCase().includes('military branch')
              );
              
              if (branchField && branchField.fieldValue) {
                return branchField.fieldValue;
              }
            }
            return null;
          };

          // Map RegFox status to our enum
          const mapRegistrationStatus = (status: string | undefined) => {
            if (!status) return 'registered';
            
            const statusLower = status.toLowerCase();
            if (statusLower.includes('cancel')) return 'cancelled';
            if (statusLower.includes('refund')) return 'refunded';
            if (statusLower.includes('pending')) return 'pending';
            if (statusLower.includes('waitlist')) return 'waitlisted';
            return 'registered';
          };

          const isVeteran = detectVeteranStatus(payload.data);
          const militaryBranch = extractMilitaryBranch(payload.data);
          const registrationStatus = mapRegistrationStatus(payload.data.status);

          // Helper function to detect "Additional Night" purchase (Thursday early access)
          const detectAdditionalNight = (payloadData: any) => {
            console.log('Webhook - Detecting additional night from payload data...');
            console.log('Webhook - Full payload data:', JSON.stringify(payloadData, null, 2));
            
            // Exact field names from RegFox form for Thursday Additional Night purchases
            const exactAdditionalNightFields = [
              'Additional Night (Thursday) (Tent or Van/Roof Top)',
              'Additional Night (Thursday) (RV)',
              'Additional Night (Thursday) (Glamping Tent)',
              'Additional Night (Thursday) (Cabin)'
            ];
            
            if (payloadData.registrants && payloadData.registrants.length > 0) {
              const registrant = payloadData.registrants[0];
              console.log('Webhook - Registrant data fields:', registrant.data?.map(d => d.fieldName));
              
              // Check for exact field matches first
              for (const exactField of exactAdditionalNightFields) {
                const field = registrant.data?.find(d => d.fieldName === exactField);
                if (field && field.fieldValue) {
                  console.log(`Webhook - Found exact Additional Night field "${exactField}": ${field.fieldValue}`);
                  
                  // Check if the value indicates a purchase
                  const value = field.fieldValue.trim();
                  // Handle "X of Y" patterns (e.g., "0 of 1", "1 of 1") as purchases
                  const ofPattern = /^\d+\s+of\s+\d+$/i.test(value);
                  if (value !== '' && (ofPattern || (value !== '0' && value.toLowerCase() !== 'false'))) {
                    console.log(`Webhook - Additional Night detected via exact field: ${exactField} = ${value}`);
                    return true;
                  }
                }
              }
              
              // Fallback: Check for fields containing "Additional Night" and "Thursday"
              const additionalNightField = registrant.data?.find(d => {
                if (!d.fieldName) return false;
                const fieldName = d.fieldName.toLowerCase();
                return fieldName.includes('additional night') && fieldName.includes('thursday');
              });
              
              if (additionalNightField && additionalNightField.fieldValue) {
                console.log(`Webhook - Found Additional Night field (fallback): ${additionalNightField.fieldName} = ${additionalNightField.fieldValue}`);
                const stringValue = String(additionalNightField.fieldValue).toLowerCase().trim();
                const hasValue = stringValue !== '0' && 
                       stringValue !== 'false' && 
                       stringValue !== 'no' && 
                       stringValue !== '' && 
                       stringValue !== 'null' &&
                       stringValue !== 'undefined';
                
                if (hasValue) {
                  console.log(`Webhook - Additional Night detected via fallback pattern matching`);
                  return true;
                }
              }
            }
            
            // Check direct payload fields for Additional Night with exact matches first
            for (const exactField of exactAdditionalNightFields) {
              if (payloadData[exactField]) {
                const value = payloadData[exactField];
                console.log(`Webhook - Found exact Additional Night in payload: ${exactField} = ${value}`);
                if (value && value.toString().trim() !== '' && value !== '0' && value.toString().toLowerCase() !== 'false') {
                  console.log(`Webhook - Additional Night detected via exact payload field: ${exactField} = ${value}`);
                  return true;
                }
              }
            }
            
            return false;
          };

          // Early access determination based on "Additional Night" purchase ONLY
          const earlyAccess = detectAdditionalNight(payload.data);
          
          // Arrival window based on early access (Additional Night purchase)
          const arrivalWindow = earlyAccess ? 'early' : 'standard';
          
          console.log(`Webhook RegFox ID ${attendeeId}: earlyAccess=${earlyAccess}, arrivalWindow=${arrivalWindow}`);

          // Complete attendee data with all enhanced fields
          const completeAttendeeData = {
            ...attendeeData,
            order_id: payload.data.id || attendeeData.order_id || null,
            ticket_type: ticketType,
            registration_status: registrationStatus,
            is_veteran: isVeteran,
            military_branch: militaryBranch,
            early_access: earlyAccess,
            arrival_window: arrivalWindow,
            
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
            meal_plan: mealPlan,
            t_shirt_size: tShirtSize,
            dietary_restrictions: dietaryRestrictions,
            special_accommodations: specialAccommodations,
            how_did_you_hear: howDidYouHear,
            
            // Emergency contact
            emergency_contact_name: emergencyContactName,
            emergency_contact_phone: emergencyContactPhone,
            
            // Custom fields and metadata
            custom_fields: customFields,
            
            waiver_signed: false,
            checked_in_at: null,
            created_at: payload.data.registrationDate || payload.data.registrationTimestamp || new Date().toISOString()
          };
          
          // Validate ticket_type against enum values before database operation
          const validTicketTypes = ['dry_site', 'rv_site', 'glamping', 'cabin'];
          if (!validTicketTypes.includes(completeAttendeeData.ticket_type)) {
            console.error(`Webhook - Invalid ticket_type detected: "${completeAttendeeData.ticket_type}". Available types: ${validTicketTypes.join(', ')}`);
            console.error(`Webhook - RegFox ID: ${attendeeId}, Payload data:`, JSON.stringify(payload.data, null, 2));
            completeAttendeeData.ticket_type = 'dry_site';
          }
          
          // Validate registration_status against enum values
          const validRegistrationStatuses = ['registered', 'cancelled', 'refunded', 'pending', 'waitlisted'];
          if (!validRegistrationStatuses.includes(completeAttendeeData.registration_status)) {
            console.error(`Webhook - Invalid registration_status detected: "${completeAttendeeData.registration_status}". Available statuses: ${validRegistrationStatuses.join(', ')}`);
            completeAttendeeData.registration_status = 'registered';
          }

          // Check if attendee already exists
          const { data: existingAttendee } = await supabase
            .from('attendees')
            .select('id')
            .eq('regfox_id', attendeeId)
            .maybeSingle();

          if (existingAttendee && (eventType === 'registration.updated' || eventType === 'registration')) {
            console.log('Updating existing attendee:', attendeeId);
            // Update existing attendee (removed manual updated_at field)
            const { error: updateError } = await supabase
              .from('attendees')
              .update(completeAttendeeData)
              .eq('id', existingAttendee.id);

            if (updateError) {
              console.error('Update error:', updateError);
              result.errors.push(`Error updating attendee: ${updateError.message}`);
            } else {
              result.updatedRecords = 1;
              console.log('Successfully updated attendee');
            }
          } else if (!existingAttendee) {
            console.log('Creating new attendee:', attendeeId);
            // Insert new attendee
            const { error: insertError } = await supabase
              .from('attendees')
              .insert(completeAttendeeData);

            if (insertError) {
              console.error('Insert error:', insertError);
              result.errors.push(`Error inserting attendee: ${insertError.message}`);
            } else {
              result.newRecords = 1;
              console.log('Successfully created attendee');
            }
          } else {
            console.log('Attendee already exists, no action needed');
          }
        } else {
          result.errors.push('Unable to extract attendee data from webhook payload');
          console.error('Failed to extract attendee data from payload');
        }
      } else {
        console.log('Unhandled event type:', eventType);
        result.errors.push(`Unhandled event type: ${eventType}`);
      }

      // Update sync log with results
      const { error: updateSyncLogError } = await supabase
        .from('regfox_sync_log')
        .update({
          status: result.errors.length > 0 ? 'error' : 'success',
          total_records: 1,
          new_records: result.newRecords,
          updated_records: result.updatedRecords,
          error_message: result.errors.length > 0 ? result.errors.join('; ') : null,
          sync_completed_at: new Date().toISOString()
        })
        .eq('id', syncLog.id);

      if (updateSyncLogError) {
        console.error('Error updating sync log:', updateSyncLogError);
      }

      console.log('Webhook processed successfully:', result);

      return new Response(JSON.stringify({
        success: true,
        syncId: syncLog.id,
        result
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
    console.error('Error in regfox-webhook function:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      success: false
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});