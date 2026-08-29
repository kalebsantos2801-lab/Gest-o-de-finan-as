/**
 * Helper to generate valid Brazilian PIX EMV ("Copia e Cola" / BR Code) payload
 */
function crc16(payload: string): string {
  let crc = 0xffff;
  for (let i = 0; i < payload.length; i++) {
    crc ^= payload.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      if ((crc & 0x8000) !== 0) {
        crc = ((crc << 1) ^ 0x1021) & 0xffff;
      } else {
        crc = (crc << 1) & 0xffff;
      }
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
}

function formatEmv(id: string, value: string): string {
  const len = value.length.toString().padStart(2, '0');
  return `${id}${len}${value}`;
}

export interface PixPayloadOptions {
  key: string;
  name?: string;
  city?: string;
  amount?: number;
  txId?: string;
  description?: string;
}

export function generatePixPayload({
  key,
  name = 'LIBERACAO ACESSO',
  city = 'SAO PAULO',
  amount = 5.0,
  txId = 'LIBERACAO',
  description = 'Liberacao Sistema',
}: PixPayloadOptions): string {
  const sanitizedKey = key.trim();
  const sanitizedName = name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').substring(0, 25).toUpperCase();
  const sanitizedCity = city.normalize('NFD').replace(/[\u0300-\u036f]/g, '').substring(0, 15).toUpperCase();
  const formattedAmount = amount.toFixed(2);
  const sanitizedTxId = (txId || '***').replace(/[^a-zA-Z0-9]/g, '').substring(0, 25) || 'LIBER';

  // 26: Merchant Account Information
  let merchantAccount = formatEmv('00', 'br.gov.bcb.pix');
  merchantAccount += formatEmv('01', sanitizedKey);
  if (description) {
    merchantAccount += formatEmv('02', description.substring(0, 40));
  }

  // 62: Additional Data Field (TxID)
  const additionalData = formatEmv('05', sanitizedTxId);

  let raw = '';
  raw += formatEmv('00', '01'); // Payload format indicator
  raw += formatEmv('26', merchantAccount);
  raw += formatEmv('52', '0000'); // Merchant Category Code
  raw += formatEmv('53', '986'); // Currency (BRL)
  raw += formatEmv('54', formattedAmount); // Transaction Amount
  raw += formatEmv('58', 'BR'); // Country Code
  raw += formatEmv('59', sanitizedName); // Merchant Name
  raw += formatEmv('60', sanitizedCity); // Merchant City
  raw += formatEmv('62', additionalData);
  raw += '6304'; // CRC16 indicator

  const crc = crc16(raw);
  return `${raw}${crc}`;
}

export const PIX_CONFIG = {
  key: '13036942637',
  beneficiary: 'Gestao de finas LTDA',
  description: 'Liberação de Acesso',
  plans: {
    monthly: {
      amount: 7.0,
      formattedAmount: 'R$ 7,00',
      copiaECola: '00020126330014br.gov.bcb.pix01111303694263752040000530398654047.005802BR5901N6001C62210517GestaodefinasLTDA630456E1',
      label: '1 Mês'
    },
    yearly: {
      amount: 75.0,
      formattedAmount: 'R$ 75,00',
      copiaECola: '00020126330014br.gov.bcb.pix011113036942637520400005303986540575.005802BR5901N6001C62210517gestaodefinasLTDA63041FEC',
      label: '1 Ano'
    }
  },
  // Default values for backward compatibility
  copiaECola: '00020126330014br.gov.bcb.pix01111303694263752040000530398654047.005802BR5901N6001C62210517GestaodefinasLTDA630456E1',
  amount: 7.0,
  formattedAmount: 'R$ 7,00',
};
