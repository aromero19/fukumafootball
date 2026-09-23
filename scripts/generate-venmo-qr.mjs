import QRCode from 'qrcode';
import { fileURLToPath } from 'node:url';

// Keep this destination in sync with the link on /PlayForMoney.
await QRCode.toFile(fileURLToPath(new URL('../public/venmo-angelo-romero-2.svg', import.meta.url)),
  'https://account.venmo.com/u/angelo-romero-2',
  { type: 'svg', errorCorrectionLevel: 'M', margin: 4, width: 280 });
