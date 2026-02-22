import React, { useState } from 'react';
import { Plus, Upload, AlertCircle, Terminal, FileCode, Sparkles, Wand2, Monitor } from 'lucide-react';
import { IpEntry } from '../types';
import { v4 as uuidv4 } from 'uuid';
import { parseBatchInput } from '../utils/parser';
import { cn } from '../utils/cn';

interface IpInputProps {
  onAdd: (entries: IpEntry[]) => void;
  existingEntries: IpEntry[];
}

export const IpInput: React.FC<IpInputProps> = ({ onAdd, existingEntries }) => {
  const [mode, setMode] = useState<'single' | 'batch'>('batch');
  const [singleIp, setSingleIp] = useState('');
  const [singlePort, setSinglePort] = useState('');
  const [singleRegion, setSingleRegion] = useState('');
  const [batchText, setBatchText] = useState('');
  const [error, setError] = useState<{ msg: string; type: 'error' | 'success' } | null>(null);

  const isDuplicate = (ip: string, port: string) => {
    return existingEntries.some(e => e.ip === ip && e.port === port);
  };

  const fillExample = () => {
    const example = `8.8.8.8:53 #Google DNS\n1.1.1.1:443 #Cloudflare\n208.67.222.222:80 #Will be ignored\n[2001:4860:4860::8888]:8080 #Will be ignored`;
    setBatchText(example);
  };

  const handleSingleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!singleIp || !singlePort) { setError({ msg: 'IP 和端口是必填项', type: 'error' }); return; }
    
    // 同时也对手动添加做限制
    if (singlePort === '80' || singlePort === '8080') {
      setError({ msg: '系统策略：禁止添加 80 或 8080 端口的节点', type: 'error' });
      return;
    }

    if (isDuplicate(singleIp, singlePort)) { setError({ msg: `IP ${singleIp}:${singlePort} 已存在`, type: 'error' }); return; }

    onAdd([{ id: uuidv4(), ip: singleIp, port: singlePort, region: singleRegion, active: true }]);
    setSingleIp(''); setSinglePort(''); setSingleRegion('');
    setError({ msg: '添加成功', type: 'success' });
    setTimeout(() => setError(null), 2000);
  };

  const handleBatchAdd = () => {
    setError(null);
    if (!batchText.trim()) return;
    const parsed = parseBatchInput(batchText);
    const newEntries: IpEntry[] = [];
    let dups = 0;
    let forbiddenPortsCount = 0;

    parsed.forEach(entry => {
      // 忽略 80 和 8080 端口
      if (entry.port === '80' || entry.port === '8080') {
        forbiddenPortsCount++;
        return;
      }

      if (!isDuplicate(entry.ip, entry.port) && !newEntries.some(ne => ne.ip === entry.ip && ne.port === entry.port)) {
        newEntries.push(entry);
      } else { 
        dups++; 
      }
    });

    if (newEntries.length === 0 && parsed.length > 0) { 
      let msg = '没有有效的 IP 可导入。';
      if (forbiddenPortsCount > 0) msg += ` (已过滤 ${forbiddenPortsCount} 个 80/8080 端口)`;
      setError({ msg, type: 'error' }); 
      return; 
    }

    onAdd(newEntries);
    setBatchText('');
    const successMsg = `成功导入 ${newEntries.length} 条数据${dups > 0 ? `，忽略 ${dups} 条重复` : ''}${forbiddenPortsCount > 0 ? `，已自动忽略 ${forbiddenPortsCount} 个 80/8080 端口节点` : ''}`;
    setError({ msg: successMsg, type: 'success' });
    setTimeout(() => setError(null), 4000);
  };

  return (
    <div className="bg-white/40 backdrop-blur-xl rounded-[2.5rem] shadow-2xl shadow-slate-200/50 border border-white/80 overflow-hidden transition-all duration-500">
      <div className="p-3 bg-slate-50/50 border-b border-slate-100 flex items-center justify-between">
        <div className="flex bg-slate-200/50 rounded-2xl p-1 relative w-full sm:w-auto">
          <button
            onClick={() => setMode('batch')}
            className={cn(
              "px-8 py-2.5 text-xs font-black uppercase tracking-widest transition-all duration-300 rounded-xl flex items-center space-x-2 z-10",
              mode === 'batch' ? "text-indigo-600 bg-white shadow-sm ring-1 ring-slate-200/50" : "text-slate-400 hover:text-slate-600"
            )}
          >
            <Upload size={14} /> <span>智能解析</span>
          </button>
          <button
            onClick={() => setMode('single')}
            className={cn(
              "px-8 py-2.5 text-xs font-black uppercase tracking-widest transition-all duration-300 rounded-xl flex items-center space-x-2 z-10",
              mode === 'single' ? "text-indigo-600 bg-white shadow-sm ring-1 ring-slate-200/50" : "text-slate-400 hover:text-slate-600"
            )}
          >
            <Plus size={14} /> <span>手动添加</span>
          </button>
        </div>
        
        <div className="hidden sm:flex items-center space-x-3 text-[10px] font-black text-slate-300 uppercase tracking-widest px-4">
          <Monitor size={14} />
          <span>解析引擎 v2.1 (Port Filtered)</span>
        </div>
      </div>

      <div className="p-8 md:p-10">
        {error && (
          <div className={cn(
            "mb-8 p-4 rounded-2xl text-sm font-bold flex items-center animate-in fade-in slide-in-from-top-1 duration-300",
            error.type === 'error' ? "bg-red-50 text-red-600 border border-red-100" : "bg-emerald-50 text-emerald-600 border border-emerald-100"
          )}>
            <div className={cn("p-1.5 rounded-lg mr-3 shadow-sm", error.type === 'error' ? "bg-white text-red-500" : "bg-white text-emerald-500")}>
                <AlertCircle size={16} />
            </div>
            {error.msg}
          </div>
        )}

        {mode === 'single' ? (
          <form onSubmit={handleSingleAdd} className="grid grid-cols-1 md:grid-cols-4 gap-6 items-end">
            <div className="space-y-3">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1 block">IP 地址</label>
              <input value={singleIp} onChange={e => setSingleIp(e.target.value)} className="w-full px-5 py-4 bg-white/50 border border-slate-200 rounded-2xl focus:bg-white focus:ring-4 focus:ring-indigo-100/50 transition-all font-mono text-slate-700 shadow-sm outline-none" placeholder="1.1.1.1" />
            </div>
            <div className="space-y-3">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1 block">端口</label>
              <input value={singlePort} onChange={e => setSinglePort(e.target.value)} className="w-full px-5 py-4 bg-white/50 border border-slate-200 rounded-2xl focus:bg-white focus:ring-4 focus:ring-indigo-100/50 transition-all font-mono text-slate-700 shadow-sm outline-none" placeholder="443" />
            </div>
            <div className="space-y-3">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1 block">备注/地区</label>
              <input value={singleRegion} onChange={e => setSingleRegion(e.target.value)} className="w-full px-5 py-4 bg-white/50 border border-slate-200 rounded-2xl focus:bg-white focus:ring-4 focus:ring-indigo-100/50 transition-all text-slate-700 shadow-sm outline-none" placeholder="例如: HK-01" />
            </div>
            <button type="submit" className="h-[58px] bg-slate-900 text-white rounded-2xl hover:bg-black shadow-lg shadow-slate-200 flex items-center justify-center transition-all font-black active:scale-[0.97] group">
              <Plus size={18} className="mr-2 group-hover:rotate-90 transition-transform" /> 添加节点
            </button>
          </form>
        ) : (
          <div className="space-y-8">
            <div className="relative group rounded-3xl overflow-hidden border border-slate-200 bg-slate-50/50 focus-within:ring-4 focus-within:ring-indigo-50/50 transition-all shadow-inner">
              <div className="absolute left-0 top-0 bottom-0 w-12 bg-slate-100/50 border-r border-slate-200/50 flex flex-col items-center pt-5 space-y-2 select-none pointer-events-none">
                {[1,2,3,4,5,6,7,8].map(n => <span key={n} className="text-[10px] font-mono font-bold text-slate-300">{n}</span>)}
              </div>
              
              <textarea
                value={batchText}
                onChange={e => setBatchText(e.target.value)}
                className="w-full h-64 pl-16 pr-6 py-5 bg-transparent text-slate-700 border-none focus:ring-0 font-mono text-[14px] leading-relaxed placeholder:text-slate-300 resize-none selection:bg-indigo-100 outline-none"
                placeholder={`在此粘贴包含 IP 的文本数据，例如：\n127.0.0.1:8080 #将被忽略\n8.8.8.8:53 - 美国谷歌\n203.239.100.72 , 2095\n网页上直接复制的数据也可以识别...`}
              />

              <div className="absolute right-4 top-4">
                <button 
                  onClick={fillExample}
                  className="px-4 py-2 bg-white hover:bg-slate-50 text-[10px] font-black text-indigo-500 rounded-xl shadow-sm border border-slate-100 transition-all flex items-center space-x-2 active:scale-95"
                >
                  <Wand2 size={12} />
                  <span>载入解析范例</span>
                </button>
              </div>
            </div>

            <div className="flex flex-col md:flex-row items-center justify-between gap-8 pt-2">
              <div className="flex items-start space-x-4 max-w-lg">
                <div className="mt-1 p-2.5 bg-indigo-50 rounded-2xl text-indigo-500 shrink-0 shadow-sm border border-indigo-100/50">
                  <Sparkles size={16} />
                </div>
                <div>
                  <h4 className="text-xs font-black text-slate-700 uppercase tracking-widest mb-1">AI 智能识别 (策略过滤开启)</h4>
                  <p className="text-[11px] leading-relaxed text-slate-400 font-medium italic">
                    支持各种格式的模糊输入，系统将自动清洗重复项，并根据安全策略<span className="text-indigo-600 font-bold">自动忽略 80/8080 端口</span>。
                  </p>
                </div>
              </div>
              
              <button
                onClick={handleBatchAdd}
                className="w-full md:w-auto px-16 py-4.5 bg-indigo-600 text-white rounded-[1.5rem] hover:bg-indigo-700 shadow-xl shadow-indigo-200 transition-all font-black active:scale-[0.98] group flex items-center justify-center"
              >
                <FileCode size={18} className="mr-3 group-hover:-translate-y-0.5 transition-transform" />
                <span className="tracking-widest uppercase text-sm">开始解析并导入</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};