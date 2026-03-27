const BTC_ADDRESS_REGEX = /^((bc1)|[13])[a-zA-HJ-NP-Z0-9]{25,62}$/;
const BECH32_REGEX = /^bc1[a-z0-9]{25,90}$/;
const LEGACY_REGEX = /^[13][a-km-zA-HJ-NP-Z1-9]{25,34}$/;

export function isValidBitcoinAddress(address: string): boolean {
  if (!address || typeof address !== 'string') {
    return false;
  }

  const trimmed = address.trim();
  
  if (trimmed.length < 26 || trimmed.length > 62) {
    return false;
  }

  return BTC_ADDRESS_REGEX.test(trimmed);
}

export function isValidLegacyAddress(address: string): boolean {
  return LEGACY_REGEX.test(address);
}

export function isValidBech32Address(address: string): boolean {
  return BECH32_REGEX.test(address);
}

export function normalizeBitcoinAddress(address: string): string {
  return address.trim().toLowerCase();
}
