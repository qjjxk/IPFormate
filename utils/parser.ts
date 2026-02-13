import { IpEntry } from '../types';
import { v4 as uuidv4 } from 'uuid';

/**
 * 健壮的解析逻辑：
 * 支持 IP:Port 和 IP,Port 两种主流格式。
 * 兼容 IPv4、IPv6（带括号或不带括号）。
 */
export const parseBatchInput = (text: string): IpEntry[] => {
  if (!text) return [];

  // 核心正则：匹配 IP 和 端口。
  // 分隔符支持 [ : | , ] 且允许空格。
  // 端口限制为 2-5 位数字。
  const globalPattern = /((?:\d{1,3}\.){3}\d{1,3}|\[?[a-fA-F0-9:]+\]?)[:|,]\s*(\d{2,5})/g;
  
  const entries: IpEntry[] = [];
  const seen = new Set<string>();
  
  let match;
  const matches = [];
  
  // 第一阶段：扫描所有 IP:Port 或 IP,Port 节点
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
    
    // 提取当前节点结尾到下一个节点开始前的内容作为备注
    const endPos = next ? next.index : text.length;
    let suffix = text.substring(current.nextIndex, endPos).trim();
    
    // 清洗备注：去掉开头的逗号、井号、中划线等，取第一行有效内容
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