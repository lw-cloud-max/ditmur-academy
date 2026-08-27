// Africa's Talking SMS API Integration using Official SDK
// Documentation: https://africastalking.com/docs/sms

import AfricasTalking from 'africastalking';

const AFRICASTALKING_API_KEY = process.env.AFRICASTALKING_API_KEY;
const AFRICASTALKING_USERNAME = process.env.AFRICASTALKING_USERNAME || 'sandbox';

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
    // Initialize Africa's Talking SDK
    const at = AfricasTalking({
      apiKey: AFRICASTALKING_API_KEY,
      username: AFRICASTALKING_USERNAME,
    });

    const sms = at.SMS;

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

    console.log('Sending SMS via Africa\'s Talking SDK:', {
      username: AFRICASTALKING_USERNAME,
      to: formattedRecipients,
      messageLength: message.length
    });

    // Send SMS
    const result = await sms.send({
      to: formattedRecipients,
      message: message,
      from: from || undefined,
    });

    console.log('Africa\'s Talking SDK response:', result);

    if (result.SMSMessageData && result.SMSMessageData.Recipients) {
      const recipients = result.SMSMessageData.Recipients;
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
    } else if (result.SMSMessageData && result.SMSMessageData.Message) {
      return { success: false, error: result.SMSMessageData.Message };
    } else {
      return { success: false, error: 'Unexpected response format from Africa\'s Talking' };
    }
  } catch (error: any) {
    console.error('Africa\'s Talking SDK Error:', error);
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
