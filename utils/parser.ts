import { IpEntry } from '../types';
import { v4 as uuidv4 } from 'uuid';

// Helper to try and map common region codes to Emojis for better UX
const REGION_MAP: Record<string, string> = {
  'ICN': '🇰🇷', // Incheon -> Korea
  'KR': '🇰🇷',
  'JP': '🇯🇵',
  'NRT': '🇯🇵', // Narita
  'KIX': '🇯🇵', // Kansai
  'US': '🇺🇸',
  'LAX': '🇺🇸',
  'SJC': '🇺🇸',
  'HK': '🇭🇰',
  'HKG': '🇭🇰',
  'SG': '🇸🇬',
  'SIN': '🇸🇬',
  'TW': '🇹🇼',
  'TPE': '🇹🇼',
  'CN': '🇨🇳',
};

const parseCompactEntry = (text: string): IpEntry | null => {
  // Format: IP:Port or IP:Port#Region
  const hashSplit = text.split('#');
  const ipPort = hashSplit[0];
  const regionRaw = hashSplit[1]; 
  
  const lastColon = ipPort.lastIndexOf(':');
  if (lastColon === -1) return null;
  
  const ip = ipPort.substring(0, lastColon);
  const port = ipPort.substring(lastColon + 1);
  
  if (!ip || !port || isNaN(Number(port))) return null;

  // If region is provided in string (e.g. #🇺🇸), use it. 
  // If not, default to empty string.
  const region = regionRaw ? (REGION_MAP[regionRaw.toUpperCase()] || regionRaw) : '';

  return {
      id: uuidv4(),
      ip,
      port,
      region,
      active: true
  };
};

const parseTableEntry = (line: string): IpEntry | null => {
    // Split by whitespace
    const parts = line.split(/\s+/);
    
    // Basic validation: must have at least an IP and a Port
    if (parts.length >= 2) {
      const ip = parts[0];
      let port = parts[parts.length - 1];
      let region = '';

      // Logic specifically for the provided table format (8 columns)
      if (parts.length >= 8) {
        const regionCode = parts[6].toUpperCase();
        region = REGION_MAP[regionCode] || regionCode;
        port = parts[7];
      } else if (parts.length === 2) {
        port = parts[1];
      } else if (parts.length === 3) {
        port = parts[1];
        region = REGION_MAP[parts[2].toUpperCase()] || parts[2];
      }

      if (ip.length > 6 && !isNaN(Number(port))) {
        return {
          id: uuidv4(),
          ip,
          port,
          region,
          active: true
        };
      }
    }
    return null;
};

export const parseBatchInput = (text: string): IpEntry[] => {
  const lines = text.split('\n');
  const entries: IpEntry[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    
    // Skip header lines
    if (trimmed.startsWith('IP') || trimmed.includes('已发送') || trimmed.includes('丢包率')) {
      continue;
    }

    // Check for comma separated values first
    if (trimmed.includes(',')) {
        const parts = trimmed.split(',');
        for (const part of parts) {
            const cleanPart = part.trim();
            if (!cleanPart) continue;
            // Recursively try to parse chunks
            // A chunk in CSV implies compact format, not table format
            const entry = parseCompactEntry(cleanPart);
            if (entry) entries.push(entry);
        }
    } else {
        // No commas. 
        // If it has spaces/tabs, it's likely a table row or "IP Port"
        // If it has no spaces, it might be a single "IP:Port" or "IP:Port#Region" on a new line
        
        if (trimmed.includes(' ') || trimmed.includes('\t')) {
             const entry = parseTableEntry(trimmed);
             if (entry) entries.push(entry);
        } else {
             // Try compact first
             const entry = parseCompactEntry(trimmed);
             if (entry) {
                 entries.push(entry);
             } else {
                 // Fallback to table parser just in case (e.g. edge case weird spacing)
                 const tableEntry = parseTableEntry(trimmed);
                 if (tableEntry) entries.push(tableEntry);
             }
        }
    }
  }

  return entries;
};