export interface GeoInfo {
  ipAddress: string;
  countryCode: string;
}

/**
 * 核心识别逻辑：带有重试机制和多源 fallback 的单 IP 查询
 */
export async function fetchIpGeo(ip: string): Promise<string> {
  if (!ip) return '';
  
  // 过滤内网 IP
  if (ip.startsWith('127.') || ip.startsWith('192.168.') || ip.startsWith('10.') || ip.startsWith('172.')) {
    return 'LOCAL';
  }

  const apis = [
    {
      // 轻量级接口，通常对 CORS 较友好
      url: `https://api.country.is/${ip}`,
      parser: (data: any) => data.country
    },
    {
      url: `https://freeipapi.com/api/json/${ip}`,
      parser: (data: any) => data.countryCode
    },
    {
      url: `https://ipapi.co/${ip}/json/`,
      parser: (data: any) => data.country_code
    }
  ];

  for (const api of apis) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000); // 3秒超时

      const response = await fetch(api.url, { 
        signal: controller.signal,
        headers: { 'Accept': 'application/json' }
      });
      clearTimeout(timeoutId);

      if (response.ok) {
        const data = await response.json();
        const code = api.parser(data);
        if (code && code !== '-' && code !== 'None') {
          return String(code).toUpperCase();
        }
      }
    } catch (e) {
      // 捕获网络错误（如跨域、DNS拦截），尝试下一个 API
      continue;
    }
  }

  // 如果所有 API 都失败，返回空字符串以便用户手动填写或显示未知
  return ''; 
}

/**
 * 批量获取地理位置
 */
export async function fetchBatchGeo(ips: string[]): Promise<Record<string, string>> {
  const results: Record<string, string> = {};
  if (ips.length === 0) return results;

  // 为了稳定性，限制并发请求数量
  for (const ip of ips) {
    results[ip] = await fetchIpGeo(ip);
    // 稍微延迟，尊重 API 速率限制
    await new Promise(resolve => setTimeout(resolve, 200));
  }
  
  return results;
}
