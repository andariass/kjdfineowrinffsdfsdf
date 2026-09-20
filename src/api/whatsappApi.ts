export const BOTSAILOR_DEFAULT_API_TOKEN = '23554|jPN2BOmfK2izqxzHMuZ6GAdMeFFju4TWCedCrm5fad0ac045';
export const BOTSAILOR_DEFAULT_PHONE_NUMBER_ID = '1240239752513619';

export interface SendWhatsAppParams {
  phone_number: string;
  message: string;
  apiToken?: string;
  phone_number_id?: string;
}

export interface SendWhatsAppResult {
  success: boolean;
  status: string;
  message: string;
  raw?: unknown;
}

/**
 * Sends a WhatsApp message via BotSailor API (proxied via /api/whatsapp/send)
 */
export async function sendWhatsAppMessage(params: SendWhatsAppParams): Promise<SendWhatsAppResult> {
  const token = params.apiToken?.trim() || BOTSAILOR_DEFAULT_API_TOKEN;
  const phoneId = params.phone_number_id?.trim() || BOTSAILOR_DEFAULT_PHONE_NUMBER_ID;
  const cleanPhone = params.phone_number.replace(/\D/g, '');

  if (!cleanPhone) {
    return {
      success: false,
      status: '0',
      message: 'Nombor telefon tidak sah.',
    };
  }

  if (!params.message.trim()) {
    return {
      success: false,
      status: '0',
      message: 'Sila masukkan mesej.',
    };
  }

  // 1. Try local server middleware proxy
  try {
    const response = await fetch('/api/whatsapp/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        apiToken: token,
        phone_number_id: phoneId,
        message: params.message.trim(),
        phone_number: cleanPhone,
      }),
    });

    if (response.ok) {
      const data = await response.json();
      const isSuccess = String(data.status) === '1' || data.success === true;
      return {
        success: isSuccess,
        status: String(data.status ?? (isSuccess ? '1' : '0')),
        message: data.message || (isSuccess ? 'Mesej berjaya dihantar!' : 'Gagal menghantar mesej.'),
        raw: data,
      };
    }
  } catch {
    // Continue to fallback
  }

  // 2. Fallback: Vite proxy /api/botsailor
  try {
    const formData = new URLSearchParams();
    formData.append('apiToken', token);
    formData.append('phone_number_id', phoneId);
    formData.append('message', params.message.trim());
    formData.append('phone_number', cleanPhone);

    const response = await fetch('/api/botsailor/api/v1/whatsapp/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData.toString(),
    });

    if (response.ok) {
      const data = await response.json();
      const isSuccess = String(data.status) === '1' || data.success === true;
      return {
        success: isSuccess,
        status: String(data.status ?? (isSuccess ? '1' : '0')),
        message: data.message || (isSuccess ? 'Mesej berjaya dihantar!' : 'Gagal menghantar mesej.'),
        raw: data,
      };
    }
  } catch {
    // Continue to fallback
  }

  // 3. Direct attempt
  try {
    const formData = new URLSearchParams();
    formData.append('apiToken', token);
    formData.append('phone_number_id', phoneId);
    formData.append('message', params.message.trim());
    formData.append('phone_number', cleanPhone);

    const response = await fetch('https://botsailor.com/api/v1/whatsapp/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData.toString(),
    });

    const data = await response.json();
    const isSuccess = String(data.status) === '1' || data.success === true;
    return {
      success: isSuccess,
      status: String(data.status ?? (isSuccess ? '1' : '0')),
      message: data.message || (isSuccess ? 'Mesej berjaya dihantar!' : 'Gagal menghantar mesej.'),
      raw: data,
    };
  } catch (err) {
    return {
      success: false,
      status: '0',
      message: err instanceof Error ? err.message : 'Gagal menyambung ke BotSailor WhatsApp API.',
    };
  }
}
