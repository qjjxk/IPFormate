
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { IpEntry } from './types';
import { IpInput } from './components/IpInput';
import { IpList } from './components/IpList';
import { ShieldCheck, Loader2, ClipboardCheck, LayoutGrid, MapPinned, Trash2, AlertTriangle } from 'lucide-react';
import { fetchIpGeo } from './utils/geo';

const STORAGE_KEY = 'ip-manager-pro-v1.1';
const CONCURRENT_LIMIT = 8; // 稍微降低并发度以提高成功率

export default function App() {
  const [entries, setEntries] = useState<IpEntry[]>([]);
  const [copiedType, setCopiedType] = useState<'simple' | 'region' | null>(null);
  const [includeInactive, setIncludeInactive] = useState(false);
  const [isIdentifying, setIsIdentifying] = useState(false);
  const [isConfirmingClear, setIsConfirmingClear] = useState(false);
  
  const clearTimerRef = useRef<number | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) setEntries(parsed);
      } catch (e) {
        console.error("Storage corrupted", e);
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  }, [entries]);

  const handleIdentifyRegions = useCallback(async () => {
    const toIdentify = entries.filter(e => 
      !e.region || ['待识别', '未知', '识别中...', 'FAIL', ''].includes(e.region)
    );

    if (toIdentify.length === 0 || isIdentifying) return;

    setIsIdentifying(true);

    // 1. 将所有匹配项设为“识别中...”
    setEntries(prev => prev.map(e => 
      toIdentify.some(t => t.id === e.id) ? { ...e, region: '识别中...' } : e
    ));

    // 2. 准备任务队列（去重处理，避免同一批次重复查询相同 IP）
    // Fix: Explicitly type uniqueIps and taskQueue to prevent 'unknown' type inference
    const uniqueIps: string[] = Array.from(new Set(toIdentify.map(e => e.ip)));
    const ipToResults: Record<string, string> = {};
    const taskQueue: string[] = [...uniqueIps];

    // 3. 辅助函数：更新所有具有该 IP 的行
    const applyResultToEntries = (ip: string, region: string) => {
      setEntries(prev => prev.map(e => e.ip === ip && e.region === '识别中...' ? { ...e, region } : e));
    };

    // 4. 定义 Worker
    const runWorker = async () => {
      while (taskQueue.length > 0) {
        const ip = taskQueue.shift();
        if (!ip) break;

        // 加入微小的随机延迟 (50-150ms)，模拟人类请求节奏，降低被封几率
        await new Promise(r => setTimeout(r, 50 + Math.random() * 100));

        try {
          const region = await fetchIpGeo(ip);
          ipToResults[ip] = region;
          applyResultToEntries(ip, region);
        } catch (err) {
          applyResultToEntries(ip, 'FAIL');
        }
      }
    };

    // 5. 启动受控并发
    const workerCount = Math.min(CONCURRENT_LIMIT, uniqueIps.length);
    const workers = Array(workerCount).fill(null).map(() => runWorker());

    await Promise.all(workers);
    setIsIdentifying(false);
  }, [entries, isIdentifying]);

  const handleAdd = useCallback((newEntries: IpEntry[]) => {
    setEntries(prev => [...prev, ...newEntries.map(e => ({ ...e, region: e.region || '待识别' }))]);
  }, []);

  const handleClearClick = () => {
    if (!isConfirmingClear) {
      setIsConfirmingClear(true);
      if (clearTimerRef.current) window.clearTimeout(clearTimerRef.current);
      clearTimerRef.current = window.setTimeout(() => {
        setIsConfirmingClear(false);
      }, 3000);
    } else {
      setEntries([]);
      localStorage.setItem(STORAGE_KEY, '[]');
      setIsConfirmingClear(false);
      if (clearTimerRef.current) window.clearTimeout(clearTimerRef.current);
    }
  };

  const copyToClipboard = async (type: 'simple' | 'region') => {
    const targetEntries = includeInactive ? entries : entries.filter(e => e.active);
    if (targetEntries.length === 0) return;

    const text = targetEntries.map(e => {
      const base = `${e.ip}:${e.port}`;
      if (type === 'region') {
        const regText = e.region && !['待识别', '识别中...', '未知', 'FAIL', '识别成功', ''].includes(e.region) ? `#${e.region}` : '';
        return `${base}${regText}`;
      }
      return base;
    }).join(',');

    try {
      await navigator.clipboard.writeText(text);
      setCopiedType(type);
      setTimeout(() => setCopiedType(null), 2000);
    } catch (err) {
      console.error('Failed to copy', err);
    }
  };

  const needsIdentification = useMemo(() => 
    entries.some(e => ['待识别', '未知', 'FAIL', ''].includes(e.region || '')), 
  [entries]);

  return (
    <div className="min-h-screen py-8 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto selection:bg-indigo-100 selection:text-indigo-900">
      <div className="space-y-8">
        
        {/* Header */}
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 px-1">
          <div className="space-y-2">
            <div className="flex items-center space-x-3">
              <div className="p-3 bg-slate-900 rounded-2xl text-white shadow-xl flex items-center justify-center transform hover:rotate-2 transition-transform">
                <ShieldCheck size={28} />
              </div>
              <h1 className="text-3xl font-black text-slate-900 tracking-tight">IP Manager <span className="text-indigo-600">Pro</span></h1>
            </div>
            <p className="text-sm text-slate-400 font-semibold tracking-wide uppercase">节点高效配置与地理位置识别套件</p>
          </div>
        </header>

        {/* Input Section */}
        <section className="relative z-10">
           <IpInput onAdd={handleAdd} existingEntries={entries} />
        </section>

        {/* Content Area */}
        {entries.length > 0 && (
          <div className="space-y-6 animate-in fade-in duration-500">
            {/* Action Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <button
                onClick={() => copyToClipboard('simple')}
                className="group flex flex-col items-center justify-center p-6 bg-white border border-slate-200 hover:border-indigo-400 rounded-2xl transition-all active:scale-[0.98] hover:shadow-xl hover:shadow-indigo-500/5"
              >
                <div className="flex items-center space-x-2.5 mb-1">
                  {copiedType === 'simple' ? <ClipboardCheck className="text-emerald-500" size={20} /> : null}
                  <span className="font-black text-slate-800 group-hover:text-indigo-600 transition-colors uppercase tracking-wider text-sm">
                    {copiedType === 'simple' ? "复制成功" : "复制地址:端口"}
                  </span>
                </div>
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em] opacity-60">RAW 节点格式</span>
              </button>
              
              <button
                onClick={() => copyToClipboard('region')}
                className="group flex flex-col items-center justify-center p-6 bg-white border border-slate-200 hover:border-violet-400 rounded-2xl transition-all active:scale-[0.98] hover:shadow-xl hover:shadow-violet-500/5"
              >
                <div className="flex items-center space-x-2.5 mb-1">
                  {copiedType === 'region' ? <ClipboardCheck className="text-emerald-500" size={20} /> : null}
                  <span className="font-black text-slate-800 group-hover:text-violet-600 transition-colors uppercase tracking-wider text-sm">
                    {copiedType === 'region' ? "复制成功" : "复制地址:端口#地区"}
                  </span>
                </div>
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em] opacity-60">标注节点格式</span>
              </button>
            </div>

            {/* Toolbar */}
            <div className="sticky top-4 z-40">
                <div className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-center justify-between bg-white/95 backdrop-blur-md p-3 rounded-[1.5rem] border border-slate-200 shadow-xl shadow-slate-200/40">
                    <button
                      onClick={handleIdentifyRegions}
                      disabled={isIdentifying}
                      className={`flex-1 sm:flex-none flex items-center justify-center space-x-3 px-8 py-3.5 rounded-xl font-black text-sm transition-all shadow-md active:scale-95 ${
                        isIdentifying 
                        ? "bg-indigo-50 text-indigo-400 cursor-wait animate-pulse border border-indigo-100" 
                        : needsIdentification 
                          ? "bg-indigo-600 text-white hover:bg-indigo-700 shadow-indigo-200" 
                          : "bg-slate-100 text-slate-400 cursor-not-allowed shadow-none"
                      }`}
                    >
                      {isIdentifying ? <Loader2 size={18} className="animate-spin" /> : <MapPinned size={18} />}
                      <span>{isIdentifying ? "智能轮询中..." : needsIdentification ? "智能识别地理位置" : "节点已全部识别"}</span>
                    </button>

                    <div className="flex items-center justify-between sm:justify-end gap-5 px-4">
                      <div className="flex items-center space-x-2 text-slate-400">
                        <LayoutGrid size={15} />
                        <span className="text-[10px] font-black uppercase tracking-[0.2em]">{entries.length} 负载就绪</span>
                      </div>
                      <div className="h-4 w-px bg-slate-200 hidden sm:block" />
                      <label className="flex items-center space-x-2 text-xs text-slate-500 cursor-pointer hover:text-indigo-600 transition-colors">
                        <input
                          type="checkbox"
                          checked={includeInactive}
                          onChange={(e) => setIncludeInactive(e.target.checked)}
                          className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
                        />
                        <span className="font-bold whitespace-nowrap select-none">显示全部</span>
                      </label>
                    </div>
                </div>
            </div>

            {/* List */}
            <IpList entries={includeInactive ? entries : entries.filter(e => e.active)} setEntries={setEntries} />

            <div className="flex justify-center pt-8 pb-16 relative z-[999]">
               <button
                  type="button"
                  onClick={handleClearClick}
                  className={`
                    flex items-center space-x-3 px-12 py-4 rounded-full shadow-2xl transition-all font-black active:scale-90 group border-4
                    ${isConfirmingClear 
                      ? "bg-amber-500 border-amber-200 text-white animate-pulse scale-110" 
                      : "bg-[#f84c4c] border-red-300/30 text-white hover:bg-red-600 shadow-red-200"
                    }
                  `}
                >
                  {isConfirmingClear ? <AlertTriangle size={24} className="animate-bounce" /> : <Trash2 size={24} />}
                  <span className="text-lg tracking-wider">
                    {isConfirmingClear ? "请再次点击以确认清空" : "彻底清空当前列表"}
                  </span>
                </button>
            </div>
          </div>
        )}
      </div>
      
      <footer className="mt-12 mb-10 text-center space-y-2 opacity-50">
        <p className="text-slate-400 font-black text-[10px] tracking-[0.4em] uppercase">Security First · Local Process Only</p>
      </footer>
    </div>
  );
}
