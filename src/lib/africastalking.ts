// Africa's Talking SMS API Integration
// Documentation: https://africastalking.com/docs/sms

const AFRICASTALKING_API_KEY = process.env.AFRICASTALKING_API_KEY;
const AFRICASTALKING_USERNAME = process.env.AFRICASTALKING_USERNAME || 'sandbox';

// Africa's Talking API endpoints
const AFRICASTALKING_API_URL = 'https://api.africastalking.com/version1/messaging';
const AFRICASTALKING_SANDBOX_URL = 'https://sandbox.africastalking.com/version1/messaging';

interface AfricasTalkingSMSOptions {
  to: string | string[]; // Phone number(s) in international format (e.g., +2348012345678)
  message: string;
  from?: string; // Sender ID (optional)
}

export async function sendSMS({ to, message, from }: AfricasTalkingSMSOptions): Promise<{
  success: boolean;
  messageId?: string;
  recipients?: any[];
  error?: string;
}> {
  if (!AFRICASTALKING_API_KEY) {
    console.error('AFRICASTALKING_API_KEY is not configured');
    return { success: false, error: 'SMS service not configured' };
  }

  try {
    // Format phone numbers
    const recipients = Array.isArray(to) ? to : [to];
    const formattedRecipients = recipients.map(phone => {
      let formatted = phone.replace(/\s+/g, '');
      if (formatted.startsWith('0')) {
        formatted = '+234' + formatted.substring(1);
      }
      if (!formatted.startsWith('+')) {
        formatted = '+' + formatted;
      }
      return formatted;
    });

    // Use sandbox URL for testing, production URL for live
    const apiUrl = AFRICASTALKING_USERNAME === 'sandbox' 
      ? AFRICASTALKING_SANDBOX_URL 
      : AFRICASTALKING_API_URL;

    // Prepare form data
    const formData = new URLSearchParams();
    formData.append('username', AFRICASTALKING_USERNAME);
    formData.append('to', formattedRecipients.join(','));
    formData.append('message', message);
    
    if (from) {
      formData.append('from', from);
    }

    console.log('Sending SMS via Africa\'s Talking:', {
      username: AFRICASTALKING_USERNAME,
      to: formattedRecipients,
      messageLength: message.length,
      apiUrl
    });

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'apiKey': AFRICASTALKING_API_KEY,
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json',
      },
      body: formData.toString(),
    });

    // Check if response is JSON
    const contentType = response.headers.get('content-type');
    let data: any;
    
    if (contentType && contentType.includes('application/json')) {
      data = await response.json();
    } else {
      // If not JSON, get as text and try to parse
      const text = await response.text();
      console.log('Africa\'s Talking response (not JSON):', text);
      
      try {
        data = JSON.parse(text);
      } catch {
        // If still can't parse, return error
        return { 
          success: false, 
          error: `API returned non-JSON response: ${text.substring(0, 200)}` 
        };
      }
    }

    console.log('Africa\'s Talking response:', data);

    if (data.SMSMessageData && data.SMSMessageData.Recipients) {
      const recipients = data.SMSMessageData.Recipients;
      const allSuccess = recipients.every((r: any) => r.status === 'Success');
      
      if (allSuccess) {
        return { 
          success: true, 
          messageId: recipients[0]?.messageId,
          recipients: recipients 
        };
      } else {
        const failedRecipients = recipients.filter((r: any) => r.status !== 'Success');
        return { 
          success: false, 
          error: `Failed to send to ${failedRecipients.length} recipient(s): ${failedRecipients.map((r: any) => r.status).join(', ')}`,
          recipients: recipients 
        };
      }
    } else if (data.SMSMessageData && data.SMSMessageData.Message) {
      return { success: false, error: data.SMSMessageData.Message };
    } else {
      return { success: false, error: 'Unexpected response format from Africa\'s Talking' };
    }
  } catch (error: any) {
    console.error('Africa\'s Talking SMS Error:', error);
    return { success: false, error: error.message };
  }
}

// Predefined SMS templates
export const SMS_TEMPLATES = {
  attendancePresent: (studentName: string, date: string) =>
    `Dear Parent, ${studentName} was marked PRESENT at Ditmur Academy on ${date}. Thank you.`,

  attendanceAbsent: (studentName: string, date: string, isExcused: boolean, reason?: string) =>
    isExcused
      ? `Dear Parent, ${studentName} was absent from Ditmur Academy on ${date}. This absence has been excused${reason ? ` - ${reason}` : ''}.`
      : `Dear Parent, ${studentName} was marked ABSENT from Ditmur Academy on ${date}. This is an unexcused absence. Please contact the school if this is unexpected.`,

  attendanceLate: (studentName: string, date: string) =>
    `Dear Parent, ${studentName} arrived LATE to Ditmur Academy on ${date}. Please ensure timely arrival.`,

  resultPublished: (studentName: string, term: string) =>
    `Dear Parent, ${studentName}'s results for ${term} have been published. Please log in to the parent portal to view.`,

  feeReminder: (studentName: string, amount: string, dueDate: string) =>
    `Dear Parent, this is a reminder that ${studentName}'s school fees of ₦${amount} is due on ${dueDate}. Please make payment via the parent portal.`,

  announcement: (message: string) =>
    `Ditmur Academy Announcement: ${message}`,
};
