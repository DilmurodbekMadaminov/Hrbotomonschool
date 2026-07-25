import React, { useEffect, useState } from 'react';
import { 
  Bot, 
  CheckCircle2, 
  AlertCircle, 
  Building2, 
  School, 
  Link as LinkIcon, 
  Users, 
  RefreshCw, 
  Save, 
  ExternalLink, 
  ShieldCheck,
  Zap,
  ChevronRight
} from 'lucide-react';

interface Stats {
  usersCount: number;
  totalHdp: number;
  totalOmonUrganch: number;
  totalOmonGurlan: number;
  totalOmonShovot: number;
  totalOmonAll: number;
}

interface Settings {
  channel_username: string;
  hdp_link: string;
  omon_urganch_link: string;
  omon_gurlan_link: string;
  omon_shovot_link: string;
}

interface Status {
  ok: boolean;
  botActive: boolean;
  hasToken: boolean;
  adminIdConfigured: boolean;
  channelUsername: string;
}

export default function App() {
  const [status, setStatus] = useState<Status | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [settings, setSettings] = useState<Settings>({
    channel_username: '',
    hdp_link: '',
    omon_urganch_link: '',
    omon_gurlan_link: '',
    omon_shovot_link: ''
  });
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [resStatus, resStats, resSettings] = await Promise.all([
        fetch('/api/status').then(r => r.json()).catch(() => null),
        fetch('/api/stats').then(r => r.json()).catch(() => null),
        fetch('/api/settings').then(r => r.json()).catch(() => null)
      ]);

      if (resStatus) setStatus(resStatus);
      if (resStats) setStats(resStats);
      if (resSettings) setSettings(resSettings);
    } catch (e) {
      console.error("Error fetching dashboard data:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 10000); // refresh stats every 10s
    return () => clearInterval(interval);
  }, []);

  const handleSaveSetting = async (key: keyof Settings, value: string) => {
    setSavingKey(key);
    setMessage(null);
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, value })
      });
      const data = await res.json();
      if (data.ok) {
        setMessage(`✅ ${key} muvaffaqiyatli saqlandi!`);
        setTimeout(() => setMessage(null), 3000);
      } else {
        setMessage(`❌ Xatolik yuz berdi`);
      }
    } catch (err) {
      setMessage(`❌ Xatolik: Aloqa yo'qolgan`);
    } finally {
      setSavingKey(null);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="bg-white rounded-2xl p-6 shadow-xs border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-100">
              <Bot className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">HR Bot & Omon School Boshqaruv Paneli</h1>
              <p className="text-sm text-slate-500">Telegram Bot tezkor tugmalari va filiallar arizalar ma'lumotlari</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <button 
              onClick={fetchData} 
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium rounded-xl transition cursor-pointer"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Yangilash
            </button>
          </div>
        </div>

        {/* System Status Alert */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${status?.botActive ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600'}`}>
                {status?.botActive ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Bot Holati</p>
                <p className="text-sm font-semibold text-slate-800">
                  {status?.botActive ? 'Faol & Ultra-Tez' : 'Faol Emas (Token kiriting)'}
                </p>
              </div>
            </div>
            <span className="flex h-2.5 w-2.5 relative">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${status?.botActive ? 'bg-emerald-400' : 'bg-amber-400'}`}></span>
              <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${status?.botActive ? 'bg-emerald-500' : 'bg-amber-500'}`}></span>
            </span>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Javob Tezligi</p>
              <p className="text-sm font-semibold text-slate-800">Optimallashtirilgan (&lt;10ms cache)</p>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Majburiy Kanal</p>
              <p className="text-sm font-semibold text-slate-800 truncate max-w-[160px]">
                {status?.channelUsername || 'Sozlanmagan'}
              </p>
            </div>
          </div>
        </div>

        {/* Message Banner */}
        {message && (
          <div className="p-4 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-800 text-sm font-medium animate-fade-in">
            {message}
          </div>
        )}

        {/* Analytics Statistics Grid */}
        <div>
          <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
            <Users className="w-5 h-5 text-indigo-600" />
            Filiallar Bo'yicha Ariza Bosish Statistikasi
          </h2>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            
            {/* Total Users */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 space-y-2">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-xs font-semibold uppercase tracking-wider">Foydalanuvchilar</span>
                <Users className="w-4 h-4 text-slate-400" />
              </div>
              <p className="text-3xl font-extrabold text-slate-900">{stats?.usersCount ?? 0}</p>
              <p className="text-xs text-slate-500">Botga kirgan jami foydalanuvchilar</p>
            </div>

            {/* HDP LC */}
            <div className="bg-white p-5 rounded-2xl border border-indigo-100 bg-linear-to-b from-indigo-50/30 to-white space-y-2">
              <div className="flex items-center justify-between text-indigo-600">
                <span className="text-xs font-semibold uppercase tracking-wider">HDP LC</span>
                <Building2 className="w-4 h-4" />
              </div>
              <p className="text-3xl font-extrabold text-indigo-900">{stats?.totalHdp ?? 0}</p>
              <p className="text-xs text-indigo-600/70">Arizalar bosilishi</p>
            </div>

            {/* Omon Urganch */}
            <div className="bg-white p-5 rounded-2xl border border-emerald-100 bg-linear-to-b from-emerald-50/30 to-white space-y-2">
              <div className="flex items-center justify-between text-emerald-600">
                <span className="text-xs font-semibold uppercase tracking-wider">Urganch filiali</span>
                <School className="w-4 h-4" />
              </div>
              <p className="text-3xl font-extrabold text-emerald-900">{stats?.totalOmonUrganch ?? 0}</p>
              <p className="text-xs text-emerald-600/70">Omon school Urganch</p>
            </div>

            {/* Omon Gurlan */}
            <div className="bg-white p-5 rounded-2xl border border-sky-100 bg-linear-to-b from-sky-50/30 to-white space-y-2">
              <div className="flex items-center justify-between text-sky-600">
                <span className="text-xs font-semibold uppercase tracking-wider">Gurlan filiali</span>
                <School className="w-4 h-4" />
              </div>
              <p className="text-3xl font-extrabold text-sky-900">{stats?.totalOmonGurlan ?? 0}</p>
              <p className="text-xs text-sky-600/70">Omon school Gurlan</p>
            </div>

            {/* Omon Shovot */}
            <div className="bg-white p-5 rounded-2xl border border-purple-100 bg-linear-to-b from-purple-50/30 to-white space-y-2">
              <div className="flex items-center justify-between text-purple-600">
                <span className="text-xs font-semibold uppercase tracking-wider">Shovot filiali</span>
                <School className="w-4 h-4" />
              </div>
              <p className="text-3xl font-extrabold text-purple-900">{stats?.totalOmonShovot ?? 0}</p>
              <p className="text-xs text-purple-600/70">Omon school Shovot</p>
            </div>

          </div>
        </div>

        {/* Link Management Section */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-6">
          <div>
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <LinkIcon className="w-5 h-5 text-indigo-600" />
              Ariza Silkalarini Sozlash
            </h2>
            <p className="text-sm text-slate-500">Telegram botda har bir tugma bosilganda yuboriladigan ariza formasi havolalarini shu yerdan ozgartirishingiz mumkin.</p>
          </div>

          <div className="space-y-4">
            
            {/* Channel Username */}
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">Majburiy Obuna Kanali</label>
              <div className="flex gap-2">
                <input 
                  type="text"
                  value={settings.channel_username}
                  onChange={(e) => setSettings({ ...settings, channel_username: e.target.value })}
                  placeholder="https://t.me/Xorazm_ish_bozor1"
                  className="flex-1 bg-white border border-slate-300 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                />
                <button
                  onClick={() => handleSaveSetting('channel_username', settings.channel_username)}
                  disabled={savingKey === 'channel_username'}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold flex items-center gap-1.5 transition cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  Saqlash
                </button>
              </div>
            </div>

            {/* HDP LC Link */}
            <div className="p-4 rounded-xl border border-slate-200 space-y-2">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-indigo-700 uppercase tracking-wider">HDP LC Ariza Silkasini Sozlash</label>
                {settings.hdp_link && (
                  <a href={settings.hdp_link} target="_blank" rel="noreferrer" className="text-xs text-indigo-600 flex items-center gap-1 hover:underline">
                    Tekshirib ko'rish <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
              <div className="flex gap-2">
                <input 
                  type="text"
                  value={settings.hdp_link}
                  onChange={(e) => setSettings({ ...settings, hdp_link: e.target.value })}
                  placeholder="https://forms.gle/..."
                  className="flex-1 bg-white border border-slate-300 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                />
                <button
                  onClick={() => handleSaveSetting('hdp_link', settings.hdp_link)}
                  disabled={savingKey === 'hdp_link'}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold flex items-center gap-1.5 transition cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  Saqlash
                </button>
              </div>
            </div>

            {/* Omon Urganch Link */}
            <div className="p-4 rounded-xl border border-slate-200 space-y-2">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-emerald-700 uppercase tracking-wider">Omon School (Urganch filiali) Ariza Silkasini Sozlash</label>
                {settings.omon_urganch_link && (
                  <a href={settings.omon_urganch_link} target="_blank" rel="noreferrer" className="text-xs text-emerald-600 flex items-center gap-1 hover:underline">
                    Tekshirib ko'rish <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
              <div className="flex gap-2">
                <input 
                  type="text"
                  value={settings.omon_urganch_link}
                  onChange={(e) => setSettings({ ...settings, omon_urganch_link: e.target.value })}
                  placeholder="https://forms.gle/..."
                  className="flex-1 bg-white border border-slate-300 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                />
                <button
                  onClick={() => handleSaveSetting('omon_urganch_link', settings.omon_urganch_link)}
                  disabled={savingKey === 'omon_urganch_link'}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold flex items-center gap-1.5 transition cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  Saqlash
                </button>
              </div>
            </div>

            {/* Omon Gurlan Link */}
            <div className="p-4 rounded-xl border border-slate-200 space-y-2">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-sky-700 uppercase tracking-wider">Omon School (Gurlan filiali) Ariza Silkasini Sozlash</label>
                {settings.omon_gurlan_link && (
                  <a href={settings.omon_gurlan_link} target="_blank" rel="noreferrer" className="text-xs text-sky-600 flex items-center gap-1 hover:underline">
                    Tekshirib ko'rish <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
              <div className="flex gap-2">
                <input 
                  type="text"
                  value={settings.omon_gurlan_link}
                  onChange={(e) => setSettings({ ...settings, omon_gurlan_link: e.target.value })}
                  placeholder="https://forms.gle/..."
                  className="flex-1 bg-white border border-slate-300 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                />
                <button
                  onClick={() => handleSaveSetting('omon_gurlan_link', settings.omon_gurlan_link)}
                  disabled={savingKey === 'omon_gurlan_link'}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold flex items-center gap-1.5 transition cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  Saqlash
                </button>
              </div>
            </div>

            {/* Omon Shovot Link */}
            <div className="p-4 rounded-xl border border-slate-200 space-y-2">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-purple-700 uppercase tracking-wider">Omon School (Shovot filiali) Ariza Silkasini Sozlash</label>
                {settings.omon_shovot_link && (
                  <a href={settings.omon_shovot_link} target="_blank" rel="noreferrer" className="text-xs text-purple-600 flex items-center gap-1 hover:underline">
                    Tekshirib ko'rish <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
              <div className="flex gap-2">
                <input 
                  type="text"
                  value={settings.omon_shovot_link}
                  onChange={(e) => setSettings({ ...settings, omon_shovot_link: e.target.value })}
                  placeholder="https://forms.gle/..."
                  className="flex-1 bg-white border border-slate-300 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                />
                <button
                  onClick={() => handleSaveSetting('omon_shovot_link', settings.omon_shovot_link)}
                  disabled={savingKey === 'omon_shovot_link'}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold flex items-center gap-1.5 transition cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  Saqlash
                </button>
              </div>
            </div>

          </div>
        </div>

        {/* Telegram Layout Preview Component */}
        <div className="bg-slate-900 text-slate-100 rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bot className="w-5 h-5 text-indigo-400" />
              <h3 className="font-bold text-white">Telegram Bot Tugmalari Strukturasi (Simulyatsiya)</h3>
            </div>
            <span className="px-2.5 py-1 bg-indigo-500/20 text-indigo-300 text-xs font-medium rounded-md">Ultra-Fast Engine Active</span>
          </div>

          <div className="max-w-md mx-auto bg-slate-800 rounded-xl p-4 border border-slate-700 space-y-3">
            <p className="text-xs text-slate-400 text-center font-medium">Telegram Bot Menyusi:</p>
            <div className="grid grid-cols-1 gap-2">
              <div className="p-3 bg-slate-700/80 hover:bg-slate-700 text-center font-semibold text-sm rounded-lg text-indigo-300 cursor-default flex items-center justify-center gap-2 border border-slate-600">
                <Building2 className="w-4 h-4" /> HDP LC
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="p-2.5 bg-slate-700/80 text-center font-semibold text-xs rounded-lg text-emerald-300 flex items-center justify-center gap-1 border border-slate-600">
                  <School className="w-3.5 h-3.5" /> Urganch filiali
                </div>
                <div className="p-2.5 bg-slate-700/80 text-center font-semibold text-xs rounded-lg text-sky-300 flex items-center justify-center gap-1 border border-slate-600">
                  <School className="w-3.5 h-3.5" /> Gurlan filiali
                </div>
              </div>
              <div className="p-3 bg-slate-700/80 text-center font-semibold text-sm rounded-lg text-purple-300 flex items-center justify-center gap-2 border border-slate-600">
                <School className="w-4 h-4" /> Shovot filiali
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
