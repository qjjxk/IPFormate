import { IpEntry } from '../types';
import { v4 as uuidv4 } from 'uuid';

/**
 * 极简健壮的解析逻辑：
 * 采用全局正则扫描模式，不再依赖 split 分隔符。
 * 只要文本中包含 IP:Port 模式（IPv4 或 IPv6），就能被精准抓取。
 */
export const parseBatchInput = (text: string): IpEntry[] => {
  if (!text) return [];

  // 全局匹配 IP:Port。
  // 支持标准 IPv4 和 带方括号的 IPv6
  const globalPattern = /((?:\d{1,3}\.){3}\d{1,3}|\[?[a-fA-F0-9:]+\]?):(\d+)/g;
  
  const entries: IpEntry[] = [];
  const seen = new Set<string>();
  
  let match;
  const matches = [];
  
  // 第一阶段：扫描所有核心节点
  while ((match = globalPattern.exec(text)) !== null) {
    matches.push({
      index: match.index,
      full: match[0],
      ip: match[1],
      port: match[2],
      nextIndex: globalPattern.lastIndex
    });
  }

  // 第二阶段：提取节点间的备注信息
  for (let i = 0; i < matches.length; i++) {
    const current = matches[i];
    const next = matches[i + 1];
    
    // 提取当前节点后到下一个节点前的内容
    const endPos = next ? next.index : text.length;
    let suffix = text.substring(current.nextIndex, endPos).trim();
    
    // 过滤掉分隔符（逗号、井号等），提取第一行有效文本作为地区/备注
    const region = suffix
      .replace(/^[\s,;#|#-]+/, '') 
      .split(/[\n,;]/)[0]         
      .trim();

    const key = `${current.ip}:${current.port}`;
    if (!seen.has(key)) {
      seen.add(key);
      entries.push({
        id: uuidv4(),
        ip: current.ip,
        port: current.port,
        region: region.toUpperCase(),
        active: true
      });
    }
  }

  return entries;
};