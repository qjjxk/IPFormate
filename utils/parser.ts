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
  'UK': '🇬🇧',
  'GB': '🇬🇧',
  'DE': '🇩🇪',
  'FR': '🇫🇷',
  'CA': '🇨🇦',
};

const parseCompactEntry = (text: string): IpEntry | null => {
  // Format: IP:Port or IP:Port#Region
  const hashSplit = text.split('#');
  const ipPort = hashSplit[0];
  const regionRaw = hashSplit[1]; 
  
  const lastColon = ipPort.lastIndexOf(':');
  if (lastColon === -1) return null;
  
  const ip = ipPort.substring(0, lastColon).trim();
  const port = ipPort.substring(lastColon + 1).trim();
  
  if (!ip || !port || isNaN(Number(port))) return null;

  const region = regionRaw ? (REGION_MAP[regionRaw.trim().toUpperCase()] || regionRaw.trim()) : '';

  return {
      id: uuidv4(),
      ip,
      port,
      region,
      active: true
  };
};

const parsePipeEntry = (line: string): IpEntry | null => {
  // Format: 150.230.204.21:10243 | JP | Inzai | 0ms
  const parts = line.split('|').map(p => p.trim());
  if (parts.length < 1) return null;

  const ipPortPart = parts[0];
  const lastColon = ipPortPart.lastIndexOf(':');
  if (lastColon === -1) return null;

  const ip = ipPortPart.substring(0, lastColon).trim();
  const port = ipPortPart.substring(lastColon + 1).trim();
  
  if (!ip || !port || isNaN(Number(port))) return null;

  let region = '';
  if (parts.length >= 2) {
    const regionCode = parts[1].toUpperCase();
    region = REGION_MAP[regionCode] || parts[1];
  }

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

    // New Priority: Pipe format (|)
    if (trimmed.includes('|')) {
      const entry = parsePipeEntry(trimmed);
      if (entry) {
        entries.push(entry);
        continue;
      }
    }

    // Comma separated values
    if (trimmed.includes(',')) {
        const parts = trimmed.split(',');
        for (const part of parts) {
            const cleanPart = part.trim();
            if (!cleanPart) continue;
            const entry = parseCompactEntry(cleanPart);
            if (entry) entries.push(entry);
        }
    } else {
        // Table or Compact
        if (trimmed.includes(' ') || trimmed.includes('\t')) {
             const entry = parseTableEntry(trimmed);
             if (entry) entries.push(entry);
        } else {
             const entry = parseCompactEntry(trimmed);
             if (entry) {
                 entries.push(entry);
             } else {
                 const tableEntry = parseTableEntry(trimmed);
                 if (tableEntry) entries.push(tableEntry);
             }
        }
    }
  }

  return entries;
};