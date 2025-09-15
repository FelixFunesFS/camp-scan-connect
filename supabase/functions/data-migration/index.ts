import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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

    console.log('Starting data migration for Phase 3...');

    // Fetch all attendees with existing notes
    const { data: attendees, error: fetchError } = await supabase
      .from('attendees')
      .select('id, notes, emergency_contact_name, emergency_contact_phone')
      .not('notes', 'is', null);

    if (fetchError) {
      throw new Error(`Failed to fetch attendees: ${fetchError.message}`);
    }

    console.log(`Found ${attendees.length} attendees with notes to migrate`);

    let migratedCount = 0;
    const migrationResults = [];

    // Process each attendee's notes to extract emergency contact info
    for (const attendee of attendees) {
      try {
        // Skip if emergency contact fields are already populated
        if (attendee.emergency_contact_name || attendee.emergency_contact_phone) {
          continue;
        }

        const notes = attendee.notes;
        let emergencyContactName = null;
        let emergencyContactPhone = null;

        // Parse emergency contact from various note formats
        if (notes) {
          // Pattern 1: "Emergency Contact: Name Phone"
          const pattern1 = notes.match(/Emergency Contact:\s*(.+)/i);
          if (pattern1) {
            const contactInfo = pattern1[1].trim();
            
            // Extract phone number using regex
            const phoneRegex = /(\+?1?[-.\s]?\(?[0-9]{3}\)?[-.\s]?[0-9]{3}[-.\s]?[0-9]{4})/;
            const phoneMatch = contactInfo.match(phoneRegex);
            
            if (phoneMatch) {
              emergencyContactPhone = phoneMatch[1];
              // Remove phone from contact info to get name
              emergencyContactName = contactInfo.replace(phoneMatch[1], '')
                .replace(/[,-]$/, '')  // Remove trailing comma or dash
                .trim();
            } else {
              // No phone found, treat entire string as name
              emergencyContactName = contactInfo;
            }
          }

          // Pattern 2: Direct phone number extraction for cases like "Emergency Contact: 4047551542"
          if (!emergencyContactName && !emergencyContactPhone) {
            const phoneOnlyMatch = notes.match(/Emergency Contact:\s*(\+?1?[0-9]{10,})/i);
            if (phoneOnlyMatch) {
              emergencyContactPhone = phoneOnlyMatch[1];
            }
          }

          // Clean up extracted data
          if (emergencyContactName) {
            emergencyContactName = emergencyContactName
              .replace(/^[-,\s]+|[-,\s]+$/g, '')  // Remove leading/trailing punctuation
              .replace(/\s+/g, ' ')  // Normalize whitespace
              .trim();
              
            // If name is empty after cleaning, set to null
            if (!emergencyContactName) {
              emergencyContactName = null;
            }
          }

          if (emergencyContactPhone) {
            // Normalize phone number format
            emergencyContactPhone = emergencyContactPhone.replace(/[\s\-\(\)\.]/g, '');
            if (emergencyContactPhone.length === 10) {
              emergencyContactPhone = `+1${emergencyContactPhone}`;
            } else if (emergencyContactPhone.length === 11 && emergencyContactPhone.startsWith('1')) {
              emergencyContactPhone = `+${emergencyContactPhone}`;
            }
          }
        }

        // Update attendee if we extracted any emergency contact info
        if (emergencyContactName || emergencyContactPhone) {
          const { error: updateError } = await supabase
            .from('attendees')
            .update({
              emergency_contact_name: emergencyContactName,
              emergency_contact_phone: emergencyContactPhone
            })
            .eq('id', attendee.id);

          if (updateError) {
            console.error(`Failed to update attendee ${attendee.id}:`, updateError.message);
            migrationResults.push({
              id: attendee.id,
              status: 'error',
              error: updateError.message,
              extracted: { emergencyContactName, emergencyContactPhone }
            });
          } else {
            migratedCount++;
            migrationResults.push({
              id: attendee.id,
              status: 'success',
              extracted: { emergencyContactName, emergencyContactPhone }
            });
            console.log(`Migrated attendee ${attendee.id}: name="${emergencyContactName}", phone="${emergencyContactPhone}"`);
          }
        }
      } catch (error) {
        console.error(`Error processing attendee ${attendee.id}:`, error.message);
        migrationResults.push({
          id: attendee.id,
          status: 'error',
          error: error.message
        });
      }
    }

    console.log(`Migration completed. Successfully migrated ${migratedCount} attendees.`);

    // Generate data completeness report
    const { data: allAttendees, error: reportError } = await supabase
      .from('attendees')
      .select(`
        id, first_name, last_name, 
        street_address, city, state, postal_code, country,
        date_of_birth, gender, marital_status,
        t_shirt_size, dietary_restrictions, special_accommodations,
        emergency_contact_name, emergency_contact_phone,
        custom_fields
      `);

    if (reportError) {
      throw new Error(`Failed to generate report: ${reportError.message}`);
    }

    // Calculate completeness statistics
    const totalAttendees = allAttendees.length;
    const completenessStats = {
      address: {
        street_address: allAttendees.filter(a => a.street_address).length,
        city: allAttendees.filter(a => a.city).length,
        state: allAttendees.filter(a => a.state).length,
        postal_code: allAttendees.filter(a => a.postal_code).length,
        country: allAttendees.filter(a => a.country).length
      },
      demographics: {
        date_of_birth: allAttendees.filter(a => a.date_of_birth).length,
        gender: allAttendees.filter(a => a.gender).length,
        marital_status: allAttendees.filter(a => a.marital_status).length
      },
      preferences: {
        t_shirt_size: allAttendees.filter(a => a.t_shirt_size).length,
        dietary_restrictions: allAttendees.filter(a => a.dietary_restrictions).length,
        special_accommodations: allAttendees.filter(a => a.special_accommodations).length
      },
      emergency: {
        contact_name: allAttendees.filter(a => a.emergency_contact_name).length,
        contact_phone: allAttendees.filter(a => a.emergency_contact_phone).length
      },
      custom_fields: allAttendees.filter(a => a.custom_fields && Object.keys(a.custom_fields).length > 0).length
    };

    const response = {
      success: true,
      migration: {
        attendees_processed: attendees.length,
        attendees_migrated: migratedCount,
        details: migrationResults
      },
      completeness_report: {
        total_attendees: totalAttendees,
        statistics: completenessStats,
        percentages: {
          address: {
            street_address: Math.round((completenessStats.address.street_address / totalAttendees) * 100),
            city: Math.round((completenessStats.address.city / totalAttendees) * 100),
            state: Math.round((completenessStats.address.state / totalAttendees) * 100),
            postal_code: Math.round((completenessStats.address.postal_code / totalAttendees) * 100),
            country: Math.round((completenessStats.address.country / totalAttendees) * 100)
          },
          demographics: {
            date_of_birth: Math.round((completenessStats.demographics.date_of_birth / totalAttendees) * 100),
            gender: Math.round((completenessStats.demographics.gender / totalAttendees) * 100),
            marital_status: Math.round((completenessStats.demographics.marital_status / totalAttendees) * 100)
          },
          preferences: {
            t_shirt_size: Math.round((completenessStats.preferences.t_shirt_size / totalAttendees) * 100),
            dietary_restrictions: Math.round((completenessStats.preferences.dietary_restrictions / totalAttendees) * 100),
            special_accommodations: Math.round((completenessStats.preferences.special_accommodations / totalAttendees) * 100)
          },
          emergency: {
            contact_name: Math.round((completenessStats.emergency.contact_name / totalAttendees) * 100),
            contact_phone: Math.round((completenessStats.emergency.contact_phone / totalAttendees) * 100)
          },
          custom_fields: Math.round((completenessStats.custom_fields / totalAttendees) * 100)
        }
      },
      recommendations: [
        totalAttendees > 0 && completenessStats.address.street_address === 0 ? "Run full RegFox re-sync to capture address data" : null,
        totalAttendees > 0 && completenessStats.demographics.date_of_birth === 0 ? "Run full RegFox re-sync to capture demographic data" : null,
        totalAttendees > 0 && completenessStats.preferences.t_shirt_size === 0 ? "Run full RegFox re-sync to capture preference data" : null,
        totalAttendees > 0 && completenessStats.custom_fields === 0 ? "Run full RegFox re-sync to capture custom field data" : null
      ].filter(Boolean)
    };

    return new Response(JSON.stringify(response, null, 2), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in data-migration function:', error);
    return new Response(JSON.stringify({ 
      success: false,
      error: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});