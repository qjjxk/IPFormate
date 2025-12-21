import React, { useState, useEffect } from 'react';
import { IpEntry } from './types';
import { IpInput } from './components/IpInput';
import { IpList } from './components/IpList';
import { Copy, CheckCircle2, ShieldCheck } from 'lucide-react';

const STORAGE_KEY = 'ip-manager-data';

export default function App() {
  const [entries, setEntries] = useState<IpEntry[]>([]);
  const [copiedType, setCopiedType] = useState<'simple' | 'region' | null>(null);

  // Load from local storage
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Migration: ensure active field exists if loading old data
        const migrated = parsed.map((e: any) => ({
            ...e,
            active: e.active !== undefined ? e.active : true
        }));
        setEntries(migrated);
      } catch (e) {
        console.error("Failed to parse saved data", e);
      }
    }
  }, []);

  // Save to local storage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  }, [entries]);

  const handleAdd = (newEntries: IpEntry[]) => {
    setEntries(prev => [...prev, ...newEntries]);
  };

  const copyToClipboard = async (type: 'simple' | 'region') => {
    let text = '';
    const activeEntries = entries.filter(e => e.active);

    if (activeEntries.length === 0) {
        alert("没有选中的可用 IP");
        return;
    }
    
    if (type === 'simple') {
      // Format: 23.106.143.6:443,8.209.232.49:8443
      text = activeEntries.map(e => `${e.ip}:${e.port}`).join(',');
    } else {
      // Format: 23.106.143.6:443#🇺🇸 or 23.106.143.6:443 (if no region)
      text = activeEntries.map(e => `${e.ip}:${e.port}${e.region ? '#' + e.region : ''}`).join(',');
    }

    try {
      await navigator.clipboard.writeText(text);
      setCopiedType(type);
      setTimeout(() => setCopiedType(null), 2000);
    } catch (err) {
      console.error('Failed to copy', err);
    }
  };

  const handleClear = () => {
    setEntries([]);
  }

  return (
    <div className="min-h-screen bg-slate-50 py-10 px-4 md:px-8 font-sans">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
            <div className="flex items-center space-x-3">
                <div className="p-3 bg-blue-600 rounded-lg text-white shadow-lg shadow-blue-200">
                    <ShieldCheck size={28} />
                </div>
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">IP 优选配置生成器</h1>
                    <p className="text-slate-500 text-sm">批量管理、去重、排序与格式化导出</p>
                </div>
            </div>
        </div>

        <IpInput onAdd={handleAdd} existingEntries={entries} />

        {entries.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <button
                type="button"
                onClick={() => copyToClipboard('simple')}
                className="group relative flex items-center justify-center space-x-2 w-full px-4 py-4 bg-white border-2 border-slate-200 hover:border-blue-500 text-slate-700 hover:text-blue-600 rounded-xl transition-all shadow-sm active:scale-[0.98]"
            >
                {copiedType === 'simple' ? <CheckCircle2 className="text-green-500" /> : <Copy size={18} />}
                <span className="font-semibold">复制格式一 (无地区)</span>
                <span className="absolute -bottom-6 text-[10px] text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity">
                    IP:Port,IP:Port...
                </span>
            </button>
            
            <button
                type="button"
                onClick={() => copyToClipboard('region')}
                className="group relative flex items-center justify-center space-x-2 w-full px-4 py-4 bg-white border-2 border-slate-200 hover:border-blue-500 text-slate-700 hover:text-blue-600 rounded-xl transition-all shadow-sm active:scale-[0.98]"
            >
                {copiedType === 'region' ? <CheckCircle2 className="text-green-500" /> : <Copy size={18} />}
                <span className="font-semibold">复制格式二 (含地区)</span>
                <span className="absolute -bottom-6 text-[10px] text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity">
                    IP:Port#Region,IP:Port...
                </span>
            </button>
            </div>
        )}

        <IpList entries={entries} setEntries={setEntries} onClear={handleClear} />
        
        <div className="mt-8 text-center text-xs text-slate-400">
            支持拖动左侧手柄排序 • 刷新页面数据自动保存
        </div>
      </div>
    </div>
  );
}