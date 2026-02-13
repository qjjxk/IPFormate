export interface GeoInfo {
  ipAddress: string;
  countryCode: string;
}

/**
 * 健壮的识别逻辑：
 * 1. 多源 Fallback
 * 2. 自动处理 429 频率限制
 * 3. 随机化 API 顺序以延长服务寿命
 */
export async function fetchIpGeo(ip: string): Promise<string> {
  if (!ip) return '';
  
  const privatePatterns = [
    /^127\./, /^192\.168\./, /^10\./, /^172\.(1[6-9]|2[0-9]|3[0-1])\./,
    /^::1$/, /^fc00:/, /^fe80:/
  ];
  
  if (privatePatterns.some(pattern => pattern.test(ip))) {
    return 'LOCAL';
  }

  // 更多、更分散的 API 来源
  const apis = [
    {
      name: 'Country.is',
      url: `https://api.country.is/${ip}`,
      parser: (data: any) => data.country
    },
    {
      name: 'IpWhoIs',
      url: `https://ipwho.is/${ip}`,
      parser: (data: any) => data.country_code
    },
    {
      name: 'FreeIpApi',
      url: `https://freeipapi.com/api/json/${ip}`,
      parser: (data: any) => data.countryCode
    },
    {
      name: 'IpLocation',
      url: `https://api.iplocation.net/?ip=${ip}`,
      parser: (data: any) => data.country_code2
    },
    {
      name: 'IpApiCo',
      url: `https://ipapi.co/${ip}/json/`,
      parser: (data: any) => data.country_code
    }
  ];

  // 随机化顺序，防止总是压榨第一个 API
  const shuffledApis = [...apis].sort(() => Math.random() - 0.5);

  for (const api of shuffledApis) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3500);

      const response = await fetch(api.url, { 
        signal: controller.signal,
        headers: { 'Accept': 'application/json' }
      });
      clearTimeout(timeoutId);

      // 如果碰到 429 频率限制，记录并尝试下一个 API
      if (response.status === 429) {
        console.warn(`API ${api.name} rate limited. Trying next...`);
        continue;
      }

      if (response.ok) {
        const data = await response.json();
        const code = api.parser(data);
        if (code && code !== '-' && code !== 'None' && code !== '??') {
          return String(code).toUpperCase();
        }
      }
    } catch (e) {
      continue;
    }
  }

  return 'FAIL'; 
}