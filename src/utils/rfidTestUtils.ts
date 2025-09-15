// Synthetic RFID Testing Utilities
import { supabase } from "@/integrations/supabase/client";

export interface TestAttendee {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  ticket_type: 'dry_site' | 'wet_site' | 'volunteer';
  registration_status: 'registered' | 'checked_in' | 'cancelled';
  is_veteran?: boolean;
}

export interface TestScenario {
  name: string;
  description: string;
  attendee: TestAttendee;
  rfidUid?: string;
  expectedOutcome: 'success' | 'error' | 'warning';
  setupSteps: string[];
}

// Generate realistic RFID UIDs
export const generateTestRfidUid = (type: 'valid' | 'short' | 'long' | 'special' | 'duplicate' = 'valid'): string => {
  const chars = 'ABCDEF0123456789';
  
  switch (type) {
    case 'short':
      return Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
    case 'long':
      return Array.from({ length: 20 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
    case 'special':
      return 'TEST-' + Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
    case 'duplicate':
      return 'DUPLICATE123';
    default:
      return Array.from({ length: 10 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  }
};

// Generate test attendees with various states
export const generateTestAttendee = (type: 'standard' | 'veteran' | 'volunteer' | 'checked_in' | 'cancelled' = 'standard'): TestAttendee => {
  const baseId = crypto.randomUUID();
  const names = [
    ['John', 'Smith'], ['Jane', 'Doe'], ['Mike', 'Johnson'], 
    ['Sarah', 'Wilson'], ['Chris', 'Brown'], ['Lisa', 'Davis']
  ];
  const [firstName, lastName] = names[Math.floor(Math.random() * names.length)];

  const base: TestAttendee = {
    id: baseId,
    first_name: firstName,
    last_name: lastName,
    email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@test.com`,
    ticket_type: 'dry_site',
    registration_status: 'registered'
  };

  switch (type) {
    case 'veteran':
      return { ...base, is_veteran: true };
    case 'volunteer':
      return { ...base, ticket_type: 'volunteer' };
    case 'checked_in':
      return { ...base, registration_status: 'checked_in' };
    case 'cancelled':
      return { ...base, registration_status: 'cancelled' };
    default:
      return base;
  }
};

// Pre-defined test scenarios
export const TEST_SCENARIOS: TestScenario[] = [
  {
    name: 'New Attendee RFID Assignment',
    description: 'Assign RFID to a new attendee without existing tag',
    attendee: generateTestAttendee('standard'),
    expectedOutcome: 'success',
    setupSteps: ['Create attendee in database', 'Verify no existing RFID']
  },
  {
    name: 'Veteran Activation',
    description: 'Activate RFID for veteran attendee',
    attendee: generateTestAttendee('veteran'),
    rfidUid: generateTestRfidUid('valid'),
    expectedOutcome: 'success',
    setupSteps: ['Create veteran attendee', 'Assign RFID tag', 'Test activation flow']
  },
  {
    name: 'Duplicate RFID Assignment',
    description: 'Attempt to assign already-used RFID UID',
    attendee: generateTestAttendee('standard'),
    rfidUid: generateTestRfidUid('duplicate'),
    expectedOutcome: 'error',
    setupSteps: ['Create attendee', 'Pre-assign RFID to another attendee', 'Attempt duplicate assignment']
  },
  {
    name: 'Station Access Without Activation',
    description: 'Try to use stations before completing activation',
    attendee: generateTestAttendee('standard'),
    rfidUid: generateTestRfidUid('valid'),
    expectedOutcome: 'warning',
    setupSteps: ['Create attendee', 'Assign RFID', 'Skip activation', 'Attempt station access']
  },
  {
    name: 'Meal Window Edge Case',
    description: 'Test meal access outside of defined windows',
    attendee: generateTestAttendee('standard'),
    rfidUid: generateTestRfidUid('valid'),
    expectedOutcome: 'warning',
    setupSteps: ['Complete normal setup', 'Test outside meal windows', 'Verify restrictions']
  }
];

// Database test utilities
export class RfidTestDatabase {
  static async createTestAttendee(attendee: TestAttendee): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('attendees')
        .insert({
          first_name: attendee.first_name,
          last_name: attendee.last_name,
          email: attendee.email,
          ticket_type: attendee.ticket_type,
          registration_status: attendee.registration_status,
          is_veteran: attendee.is_veteran || false,
          regfox_id: `TEST_${attendee.id.slice(0, 8)}`
        } as any);
      
      return !error;
    } catch (error) {
      console.error('Failed to create test attendee:', error);
      return false;
    }
  }

  static async createTestRfidTag(uid: string, attendeeId?: string, status: 'active' | 'assigned' | 'deactivated' = 'active'): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('rfid_tags')
        .insert({
          uid,
          attendee_id: attendeeId,
          status,
          issued_at: attendeeId ? new Date().toISOString() : null
        } as any);
      
      return !error;
    } catch (error) {
      console.error('Failed to create test RFID tag:', error);
      return false;
    }
  }

  static async createTestTransaction(
    attendeeId: string, 
    stationType: 'activation' | 'meal' | 'drinks' | 'headphones',
    transactionType: 'activate' | 'deactivate' | 'drink' | 'headphone_checkout' | 'headphone_checkin',
    rfidUid?: string
  ): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('station_transactions')
        .insert({
          attendee_id: attendeeId,
          station_type: stationType,
          transaction_type: transactionType,
          rfid_uid: rfidUid,
          extra_data: { test: true, timestamp: new Date().toISOString() }
        } as any);
      
      return !error;
    } catch (error) {
      console.error('Failed to create test transaction:', error);
      return false;
    }
  }

  static async cleanupTestData(): Promise<void> {
    try {
      // Clean up test attendees (those with TEST_ prefix in regfox_id)
      await supabase
        .from('attendees')
        .delete()
        .like('regfox_id', 'TEST_%');

      // Clean up test RFID tags
      await supabase
        .from('rfid_tags')
        .delete()
        .like('uid', 'TEST%');

      // Clean up test transactions
      await supabase
        .from('station_transactions')
        .delete()
        .contains('extra_data', { test: true });

      console.log('Test data cleanup completed');
    } catch (error) {
      console.error('Failed to cleanup test data:', error);
    }
  }
}

// Performance testing utilities
export const performanceTests = {
  async testRapidScanning(count: number = 10): Promise<number[]> {
    const times: number[] = [];
    
    for (let i = 0; i < count; i++) {
      const start = performance.now();
      
      // Simulate RFID scan processing
      const uid = generateTestRfidUid('valid');
      const { data } = await supabase
        .from('rfid_tags')
        .select('*, attendees(*)')
        .eq('uid', uid)
        .maybeSingle();
      
      const end = performance.now();
      times.push(end - start);
      
      // Small delay between scans
      await new Promise(resolve => setTimeout(resolve, 50));
    }
    
    return times;
  },

  analyzePerformance(times: number[]) {
    const avg = times.reduce((a, b) => a + b, 0) / times.length;
    const min = Math.min(...times);
    const max = Math.max(...times);
    
    return {
      average: Math.round(avg * 100) / 100,
      minimum: Math.round(min * 100) / 100,
      maximum: Math.round(max * 100) / 100,
      total: times.length
    };
  }
};