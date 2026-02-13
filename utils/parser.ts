import { IpEntry } from '../types';
import { v4 as uuidv4 } from 'uuid';

/**
 * 核心清洗逻辑：只保留地区代码
 * 例如 "HK-8443-Trojan" -> "HK"
 * 例如 "JP_10443_SS" -> "JP"
 */
const sanitizeRegion = (text: string): string => {
  if (!text) return '';
  // 按照常见的分割符（减号、下划线、空格、正斜杠、竖线）拆分，取第一段
  const firstPart = text.split(/[-_ \/\|]/)[0];
  return firstPart.trim().toUpperCase();
};

/**
 * 增强型解析逻辑：
 * 1. 优先识别协议链接 (trojan://, ss://, vless://, vmess://)
 * 2. 识别标准 IP:Port 和 IP,Port 格式
 * 3. 兼容 IPv4、IPv6
 */
export const parseBatchInput = (text: string): IpEntry[] => {
  if (!text) return [];

  const entries: IpEntry[] = [];
  const seen = new Set<string>();

  /**
   * 引擎一：处理协议链接
   * 匹配格式: protocol://[auth@]host:port[path/query]#remark
   */
  const protocolPattern = /(\w+):\/\/([^@\s]+@)?([\w\.-]+|\[[a-fA-F0-9:]+\]):(\d+)[^#\s]*#?([^\s\n\r]*)/g;
  
  let match;
  let remainingText = text;

  while ((match = protocolPattern.exec(text)) !== null) {
    const rawHost = match[3];
    const ip = rawHost.replace(/[\[\]]/g, ''); // 移除 IPv6 的中括号以便统一显示
    const port = match[4];
    
    let remark = '';
    try {
      remark = match[5] ? decodeURIComponent(match[5]) : '';
    } catch (e) {
      remark = match[5] || '';
    }
    
    // 清洗备注，只保留地区
    const cleanRegion = sanitizeRegion(remark);
    
    const key = `${ip}:${port}`;
    if (!seen.has(key)) {
      seen.add(key);
      entries.push({
        id: uuidv4(),
        ip,
        port,
        region: cleanRegion,
        active: true
      });
    }
    remainingText = remainingText.replace(match[0], ' '.repeat(match[0].length));
  }

  /**
   * 引擎二：处理标准 IP:Port 格式 (Fallback)
   */
  const standardPattern = /((?:\d{1,3}\.){3}\d{1,3}|\[?[a-fA-F0-9:]+\]?)[:|,]\s*(\d{2,5})/g;
  const matches = [];
  
  let stdMatch;
  while ((stdMatch = standardPattern.exec(remainingText)) !== null) {
    matches.push({
      index: stdMatch.index,
      full: stdMatch[0],
      ip: stdMatch[1].replace(/[\[\]]/g, ''),
      port: stdMatch[2],
      nextIndex: standardPattern.lastIndex
    });
  }

  for (let i = 0; i < matches.length; i++) {
    const current = matches[i];
    const next = matches[i + 1];
    
    const endPos = next ? next.index : remainingText.length;
    let suffix = remainingText.substring(current.nextIndex, endPos).trim();
    
    let rawRegion = suffix
      .replace(/^[\s,;#|#-]+/, '') 
      .split(/[\n,;]/)[0]         
      .trim();

    const cleanRegion = sanitizeRegion(rawRegion);

    const key = `${current.ip}:${current.port}`;
    if (!seen.has(key)) {
      seen.add(key);
      entries.push({
        id: uuidv4(),
        ip: current.ip,
        port: current.port,
        region: cleanRegion,
        active: true
      });
    }
  }

  return entries;
};