// Termii SMS API Integration
// Documentation: https://developers.termii.com/

const TERMII_API_KEY = process.env.TERMII_API_KEY;
const TERMII_SENDER_ID = process.env.TERMII_SENDER_ID || 'DitmurAcad';
const TERMII_API_URL = 'https://api.ng.termii.com/api/sms/send';

interface TermiiSMSOptions {
  to: string; // Phone number in international format (e.g., 2348012345678)
  message: string;
  type?: 'plain' | 'unicode';
}

export async function sendSMS({ to, message, type = 'plain' }: TermiiSMSOptions): Promise<{
  success: boolean;
  messageId?: string;
  error?: string;
}> {
  if (!TERMII_API_KEY) {
    console.error('TERMII_API_KEY is not configured');
    return { success: false, error: 'SMS service not configured' };
  }

  try {
    // Format phone number (remove leading 0 or +234)
    let formattedPhone = to.replace(/\s+/g, '');
    if (formattedPhone.startsWith('+')) {
      formattedPhone = formattedPhone.substring(1);
    }
    if (formattedPhone.startsWith('0')) {
      formattedPhone = '234' + formattedPhone.substring(1);
    }

    const response = await fetch(TERMII_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        api_key: TERMII_API_KEY,
        to: formattedPhone,
        from: TERMII_SENDER_ID,
        sms: message,
        type: type,
        channel: 'generic',
      }),
    });

    const data = await response.json();

    if (data.message_id) {
      return { success: true, messageId: data.message_id };
    } else {
      return { success: false, error: data.message || 'Failed to send SMS' };
    }
  } catch (error: any) {
    console.error('Termii SMS Error:', error);
    return { success: false, error: error.message };
  }
}

// Predefined SMS templates
export const SMS_TEMPLATES = {
  attendancePresent: (studentName: string, date: string) =>
    `Dear Parent, ${studentName} was marked PRESENT at Ditmur Academy on ${date}. Thank you.`,

  attendanceAbsent: (studentName: string, date: string) =>
    `Dear Parent, ${studentName} was marked ABSENT from Ditmur Academy on ${date}. Please contact the school if this is unexpected.`,

  attendanceLate: (studentName: string, date: string) =>
    `Dear Parent, ${studentName} arrived LATE to Ditmur Academy on ${date}. Please ensure timely arrival.`,

  resultPublished: (studentName: string, term: string) =>
    `Dear Parent, ${studentName}'s results for ${term} have been published. Please log in to the parent portal to view.`,

  feeReminder: (studentName: string, amount: string, dueDate: string) =>
    `Dear Parent, this is a reminder that ${studentName}'s school fees of ₦${amount} is due on ${dueDate}. Please make payment via the parent portal.`,

  announcement: (message: string) =>
    `Ditmur Academy Announcement: ${message}`,
};
