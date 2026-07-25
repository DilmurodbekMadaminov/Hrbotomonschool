import React, { useState, useEffect } from 'react';
import {
  Bot,
  Users,
  Building2,
  Send,
  Settings,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  ExternalLink,
  ShieldCheck,
  HelpCircle,
  Save,
  MessageSquare,
  School,
  Sparkles,
  ChevronRight,
  Info
} from 'lucide-react';

interface StatsData {
  botActive: boolean;
  adminConfigured: boolean;
  adminId: number | null;
  usersCount: number;
  totalHdp: number;
  totalOmon: number;
  totalOmonUrganch: number;
  totalOmonGurlan: number;
  totalOmonShovot: number;
  settings: {
    channel_username: string;
    hdp_link: string;
    omon_urganch_link: string;
    omon_gurlan_link: string;
    omon_shovot_link: string;
  };
}

export default function App() {
  const [stats, setStats] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'analytics' | 'settings' | 'broadcast' | 'guide'>('analytics');
  
  // Settings Form State
  const [settingsForm, setSettingsForm] = useState({
    channel_username: '',
    hdp_link: '',
    omon_urganch_link: '',
    omon_gurlan_link: '',
    omon_shovot_link: ''
  });
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<{ [key: string]: string }>({});

  // Broadcast Form State
  const [broadcastText, setBroadcastText] = useState('');
  const [sendingBroadcast, setSendingBroadcast] = useState(false);
  const [broadcastResult, setBroadcastResult] = useState<{ sent: number; fail: number } | null>(null);

  const fetchStats = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    try {
      const res = await fetch('/api/stats');
      if (res.ok) {
        const data: StatsData = await res.json();
        setStats(data);
        setSettingsForm({
          channel_username: data.settings.channel_username || '',
          hdp_link: data.settings.hdp_link || '',
          omon_urganch_link: data.settings.omon_urganch_link || '',
          omon_gurlan_link: data.settings.omon_gurlan_link || '',
          omon_shovot_link: data.settings.omon_shovot_link || ''
        });
      }
    } catch (err) {
      console.error("Error fetching stats:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchStats();
    const interval = setInterval(() => fetchStats(), 15000);
    return () => clearInterval(interval);
  }, []);

  const handleSaveSetting = async (key: keyof typeof settingsForm) => {
    setSavingKey(key);
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, value: settingsForm[key] })
      });
      if (res.ok) {
        setSaveStatus(prev => ({ ...prev, [key]: 'Muvaffaqiyatli saqlandi!' }));
        setTimeout(() => {
          setSaveStatus(prev => ({ ...prev, [key]: '' }));
        }, 3000);
        fetchStats();
      } else {
        setSaveStatus(prev => ({ ...prev, [key]: 'Xatolik yuz berdi' }));
      }
    } catch (err) {
      setSaveStatus(prev => ({ ...prev, [key]: 'Xatolik yuz berdi' }));
    } finally {
      setSavingKey(null);
    }
  };

  const handleSendBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!broadcastText.trim()) return;

    if (!confirm(`Xabarni barcha (${stats?.usersCount || 0} ta) foydalanuvchiga yuborishni tasdiqlaysizmi?`)) {
      return;
    }

    setSendingBroadcast(true);
    setBroadcastResult(null);

    try {
      const res = await fetch('/api/broadcast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messageText: broadcastText })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setBroadcastResult({ sent: data.sentCount, fail: data.failCount });
        setBroadcastText('');
      } else {
        alert(data.error || 'Xabar yuborishda xatolik yuz berdi');
      }
    } catch (err: any) {
      alert('Xatolik: ' + err.message);
    } finally {
      setSendingBroadcast(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans">
      {/* Top Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-200">
              <Bot className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">HDP LC & Omon School</h1>
              <p className="text-xs text-slate-500 font-medium">Telegram Bot va Boshqaruv Paneli</p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={() => fetchStats(true)}
              disabled={refreshing}
              className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 transition shadow-sm disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
              {refreshing ? 'Yangilanmoqda...' : 'Yangilash'}
            </button>

            {/* Status Pills */}
            <div className="flex items-center gap-2">
              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${
                stats?.botActive 
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                  : 'bg-amber-50 text-amber-700 border-amber-200'
              }`}>
                {stats?.botActive ? (
                  <>
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                    Bot Faol
                  </>
                ) : (
                  <>
                    <AlertTriangle className="w-3 h-3 text-amber-600" />
                    BOT_TOKEN Kiritilmagan
                  </>
                )}
              </span>

              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${
                stats?.adminConfigured 
                  ? 'bg-blue-50 text-blue-700 border-blue-200' 
                  : 'bg-slate-100 text-slate-600 border-slate-200'
              }`}>
                <ShieldCheck className="w-3.5 h-3.5" />
                {stats?.adminConfigured ? `Admin ID: ${stats.adminId}` : 'Admin Sozlanmagan'}
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Notice Banner if BOT_TOKEN missing */}
      {!stats?.botActive && !loading && (
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-3">
          <div className="max-w-7xl mx-auto flex items-start sm:items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5 sm:mt-0" />
            <div className="text-xs sm:text-sm text-amber-800">
              <span className="font-semibold">Diqqat:</span> Telegram botni faollashtirish uchun AI Studio paneli sozlamalaridan (<code className="bg-amber-100 px-1 py-0.5 rounded font-mono">Secrets</code> yoki <code className="bg-amber-100 px-1 py-0.5 rounded font-mono">Environment Variables</code>) <strong className="font-mono">BOT_TOKEN</strong> o'zgaruvchisini qo'shing.
            </div>
          </div>
        </div>
      )}

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        
        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-200 overflow-x-auto space-x-6">
          <button
            onClick={() => setActiveTab('analytics')}
            className={`pb-3 px-1 text-sm font-semibold flex items-center gap-2 border-b-2 whitespace-nowrap transition-colors ${
              activeTab === 'analytics'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Users className="w-4 h-4" />
            Statistika
          </button>

          <button
            onClick={() => setActiveTab('settings')}
            className={`pb-3 px-1 text-sm font-semibold flex items-center gap-2 border-b-2 whitespace-nowrap transition-colors ${
              activeTab === 'settings'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Settings className="w-4 h-4" />
            Silka & Kanal Sozlamalari
          </button>

          <button
            onClick={() => setActiveTab('broadcast')}
            className={`pb-3 px-1 text-sm font-semibold flex items-center gap-2 border-b-2 whitespace-nowrap transition-colors ${
              activeTab === 'broadcast'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Send className="w-4 h-4" />
            Xabar Tarqatish
          </button>

          <button
            onClick={() => setActiveTab('guide')}
            className={`pb-3 px-1 text-sm font-semibold flex items-center gap-2 border-b-2 whitespace-nowrap transition-colors ${
              activeTab === 'guide'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <HelpCircle className="w-4 h-4" />
            Bot Qo'llanmasi
          </button>
        </div>

        {/* TAB 1: ANALYTICS */}
        {activeTab === 'analytics' && (
          <div className="space-y-6">
            {/* Top Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              
              {/* Card 1: Users */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                  <Users className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-500">Jami Foydalanuvchilar</p>
                  <p className="text-2xl font-bold text-slate-900 mt-0.5">
                    {loading ? '...' : stats?.usersCount || 0}
                  </p>
                </div>
              </div>

              {/* Card 2: HDP LC */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                  <Building2 className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-500">HDP LC Arizalari</p>
                  <p className="text-2xl font-bold text-slate-900 mt-0.5">
                    {loading ? '...' : stats?.totalHdp || 0}
                  </p>
                </div>
              </div>

              {/* Card 3: Omon School Total */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4 sm:col-span-2 lg:col-span-1">
                <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                  <School className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-500">Omon School (Jami)</p>
                  <p className="text-2xl font-bold text-slate-900 mt-0.5">
                    {loading ? '...' : stats?.totalOmon || 0}
                  </p>
                </div>
              </div>

            </div>

            {/* Omon School Branches Breakdown */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
              <h2 className="text-base font-bold text-slate-900 mb-4 flex items-center gap-2">
                <School className="w-5 h-5 text-blue-600" />
                Omon School Filiallar Bo'yicha Bosinglar
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* Urganch */}
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 flex flex-col justify-between space-y-2">
                  <div className="flex items-center justify-between text-slate-600">
                    <span className="text-xs font-semibold uppercase tracking-wider">Urganch Filiali</span>
                    <Building2 className="w-4 h-4 text-slate-400" />
                  </div>
                  <div className="text-2xl font-extrabold text-slate-900">
                    {loading ? '...' : stats?.totalOmonUrganch || 0}
                  </div>
                  <p className="text-[11px] text-slate-500">Arizaga o'tish tugmasi bosilgan</p>
                </div>

                {/* Gurlan */}
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 flex flex-col justify-between space-y-2">
                  <div className="flex items-center justify-between text-slate-600">
                    <span className="text-xs font-semibold uppercase tracking-wider">Gurlan Filiali</span>
                    <Building2 className="w-4 h-4 text-slate-400" />
                  </div>
                  <div className="text-2xl font-extrabold text-slate-900">
                    {loading ? '...' : stats?.totalOmonGurlan || 0}
                  </div>
                  <p className="text-[11px] text-slate-500">Arizaga o'tish tugmasi bosilgan</p>
                </div>

                {/* Shovot */}
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 flex flex-col justify-between space-y-2">
                  <div className="flex items-center justify-between text-slate-600">
                    <span className="text-xs font-semibold uppercase tracking-wider">Shovot Filiali</span>
                    <Building2 className="w-4 h-4 text-slate-400" />
                  </div>
                  <div className="text-2xl font-extrabold text-slate-900">
                    {loading ? '...' : stats?.totalOmonShovot || 0}
                  </div>
                  <p className="text-[11px] text-slate-500">Arizaga o'tish tugmasi bosilgan</p>
                </div>
              </div>
            </div>

            {/* Quick Actions & Current Links Summary */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Info className="w-5 h-5 text-blue-600" />
                Joriy Havolalar Ko'rinishi
              </h2>

              <div className="divide-y divide-slate-100 text-xs sm:text-sm">
                <div className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <span className="font-medium text-slate-600 w-48">A'zolik Kanali:</span>
                  <a
                    href={stats?.settings.channel_username?.startsWith('http') ? stats.settings.channel_username : `https://t.me/${stats?.settings.channel_username?.replace('@', '')}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-blue-600 hover:underline flex items-center gap-1 font-mono truncate"
                  >
                    {stats?.settings.channel_username || 'Kiritilmagan'}
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>

                <div className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <span className="font-medium text-slate-600 w-48">HDP LC Formasi:</span>
                  <a
                    href={stats?.settings.hdp_link}
                    target="_blank"
                    rel="noreferrer"
                    className="text-blue-600 hover:underline flex items-center gap-1 font-mono truncate"
                  >
                    {stats?.settings.hdp_link || 'Kiritilmagan'}
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>

                <div className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <span className="font-medium text-slate-600 w-48">Omon School (Urganch):</span>
                  <a
                    href={stats?.settings.omon_urganch_link}
                    target="_blank"
                    rel="noreferrer"
                    className="text-blue-600 hover:underline flex items-center gap-1 font-mono truncate"
                  >
                    {stats?.settings.omon_urganch_link || 'Kiritilmagan'}
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>

                <div className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <span className="font-medium text-slate-600 w-48">Omon School (Gurlan):</span>
                  <a
                    href={stats?.settings.omon_gurlan_link}
                    target="_blank"
                    rel="noreferrer"
                    className="text-blue-600 hover:underline flex items-center gap-1 font-mono truncate"
                  >
                    {stats?.settings.omon_gurlan_link || 'Kiritilmagan'}
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>

                <div className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <span className="font-medium text-slate-600 w-48">Omon School (Shovot):</span>
                  <a
                    href={stats?.settings.omon_shovot_link}
                    target="_blank"
                    rel="noreferrer"
                    className="text-blue-600 hover:underline flex items-center gap-1 font-mono truncate"
                  >
                    {stats?.settings.omon_shovot_link || 'Kiritilmagan'}
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: SETTINGS */}
        {activeTab === 'settings' && (
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-6">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Bot Sozlamalari va Havolalar</h2>
              <p className="text-xs text-slate-500 mt-1">
                Foydalanuvchilar botda tugmalarni bosganda yo'naltiriladigan Google Forms yoki Telegram havolalarini shu yerdan o'zgartirishingiz mumkin.
              </p>
            </div>

            <div className="space-y-5 max-w-3xl">
              {/* Channel */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Majburiy Obuna Kanali (Username yoki Havola)
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={settingsForm.channel_username}
                    onChange={(e) => setSettingsForm({ ...settingsForm, channel_username: e.target.value })}
                    placeholder="https://t.me/Xorazm_ish_bozor1"
                    className="flex-1 px-3.5 py-2 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                  <button
                    onClick={() => handleSaveSetting('channel_username')}
                    disabled={savingKey === 'channel_username'}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl transition flex items-center gap-1.5 shadow-sm disabled:opacity-50"
                  >
                    <Save className="w-3.5 h-3.5" />
                    {savingKey === 'channel_username' ? '...' : 'Saqlash'}
                  </button>
                </div>
                {saveStatus.channel_username && (
                  <p className="text-xs text-emerald-600 font-medium flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> {saveStatus.channel_username}
                  </p>
                )}
              </div>

              {/* HDP Link */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  HDP LC Ariza Formasi Silkasi
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={settingsForm.hdp_link}
                    onChange={(e) => setSettingsForm({ ...settingsForm, hdp_link: e.target.value })}
                    placeholder="https://forms.gle/..."
                    className="flex-1 px-3.5 py-2 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                  <button
                    onClick={() => handleSaveSetting('hdp_link')}
                    disabled={savingKey === 'hdp_link'}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl transition flex items-center gap-1.5 shadow-sm disabled:opacity-50"
                  >
                    <Save className="w-3.5 h-3.5" />
                    {savingKey === 'hdp_link' ? '...' : 'Saqlash'}
                  </button>
                </div>
                {saveStatus.hdp_link && (
                  <p className="text-xs text-emerald-600 font-medium flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> {saveStatus.hdp_link}
                  </p>
                )}
              </div>

              {/* Urganch Link */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Omon School (Urganch filiali) Silkasi
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={settingsForm.omon_urganch_link}
                    onChange={(e) => setSettingsForm({ ...settingsForm, omon_urganch_link: e.target.value })}
                    placeholder="https://forms.gle/..."
                    className="flex-1 px-3.5 py-2 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                  <button
                    onClick={() => handleSaveSetting('omon_urganch_link')}
                    disabled={savingKey === 'omon_urganch_link'}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl transition flex items-center gap-1.5 shadow-sm disabled:opacity-50"
                  >
                    <Save className="w-3.5 h-3.5" />
                    {savingKey === 'omon_urganch_link' ? '...' : 'Saqlash'}
                  </button>
                </div>
                {saveStatus.omon_urganch_link && (
                  <p className="text-xs text-emerald-600 font-medium flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> {saveStatus.omon_urganch_link}
                  </p>
                )}
              </div>

              {/* Gurlan Link */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Omon School (Gurlan filiali) Silkasi
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={settingsForm.omon_gurlan_link}
                    onChange={(e) => setSettingsForm({ ...settingsForm, omon_gurlan_link: e.target.value })}
                    placeholder="https://forms.gle/..."
                    className="flex-1 px-3.5 py-2 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                  <button
                    onClick={() => handleSaveSetting('omon_gurlan_link')}
                    disabled={savingKey === 'omon_gurlan_link'}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl transition flex items-center gap-1.5 shadow-sm disabled:opacity-50"
                  >
                    <Save className="w-3.5 h-3.5" />
                    {savingKey === 'omon_gurlan_link' ? '...' : 'Saqlash'}
                  </button>
                </div>
                {saveStatus.omon_gurlan_link && (
                  <p className="text-xs text-emerald-600 font-medium flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> {saveStatus.omon_gurlan_link}
                  </p>
                )}
              </div>

              {/* Shovot Link */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Omon School (Shovot filiali) Silkasi
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={settingsForm.omon_shovot_link}
                    onChange={(e) => setSettingsForm({ ...settingsForm, omon_shovot_link: e.target.value })}
                    placeholder="https://forms.gle/..."
                    className="flex-1 px-3.5 py-2 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                  <button
                    onClick={() => handleSaveSetting('omon_shovot_link')}
                    disabled={savingKey === 'omon_shovot_link'}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl transition flex items-center gap-1.5 shadow-sm disabled:opacity-50"
                  >
                    <Save className="w-3.5 h-3.5" />
                    {savingKey === 'omon_shovot_link' ? '...' : 'Saqlash'}
                  </button>
                </div>
                {saveStatus.omon_shovot_link && (
                  <p className="text-xs text-emerald-600 font-medium flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> {saveStatus.omon_shovot_link}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: BROADCAST */}
        {activeTab === 'broadcast' && (
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-6">
            <div>
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-blue-600" />
                Foydalanuvchilarga Xabar Tarqatish
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Barcha {stats?.usersCount || 0} ta ro'yxatdan o'tgan Telegram bot foydalanuvchilariga bir vaqtning o'zida e'lon yuborish.
              </p>
            </div>

            <form onSubmit={handleSendBroadcast} className="space-y-4 max-w-3xl">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Xabar Matni
                </label>
                <textarea
                  rows={6}
                  value={broadcastText}
                  onChange={(e) => setBroadcastText(e.target.value)}
                  placeholder="Hurmatli foydalanuvchilar, yangi bo'sh ish o'rinlari e'lon qilindi! ..."
                  className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  required
                />
              </div>

              <div className="flex items-center justify-between pt-2">
                <p className="text-xs text-slate-500">
                  Xabarlar navbat (<code className="bg-slate-100 px-1 py-0.5 rounded">p-queue</code>) orqali Telegram limitlariga amal qilgan holda yetkaziladi.
                </p>

                <button
                  type="submit"
                  disabled={sendingBroadcast || !broadcastText.trim() || !stats?.botActive}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl transition flex items-center gap-2 shadow-md shadow-blue-200 disabled:opacity-50"
                >
                  <Send className={`w-4 h-4 ${sendingBroadcast ? 'animate-bounce' : ''}`} />
                  {sendingBroadcast ? 'Yuborilmoqda...' : 'Xabarni Tarqatish'}
                </button>
              </div>
            </form>

            {/* Broadcast Results */}
            {broadcastResult && (
              <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 space-y-1">
                <p className="text-xs font-bold text-emerald-800 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  Xabar tarqatish yakunlandi!
                </p>
                <p className="text-xs text-emerald-700">
                  Yetkazildi: <strong>{broadcastResult.sent}</strong> ta | Bloklagan/Xatolik: <strong>{broadcastResult.fail}</strong> ta
                </p>
              </div>
            )}
          </div>
        )}

        {/* TAB 4: GUIDE */}
        {activeTab === 'guide' && (
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-6">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Bot va Admin Paneli Qo'llanmasi</h2>
              <p className="text-xs text-slate-500 mt-1">
                Bot sozlamalarini va Telegram buyruqlarini boshqarish bo'yicha ko'rsatmalar.
              </p>
            </div>

            <div className="space-y-4 text-xs sm:text-sm text-slate-700">
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-blue-600" />
                  1. Telegram Botni Sozlash (BOT_TOKEN)
                </h3>
                <p className="leading-relaxed">
                  Telegram'da <a href="https://t.me/BotFather" target="_blank" rel="noreferrer" className="text-blue-600 underline">@BotFather</a> orqali yangi bot yarating va olingan API Tokenni AI Studio interfeysidagi Secrets bo'limiga <strong className="font-mono">BOT_TOKEN</strong> kaliti bilan saqlang.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-blue-600" />
                  2. Telegram Admin ID o'rnatish
                </h3>
                <p className="leading-relaxed">
                  Telegram botingizga kiring va <code className="bg-slate-200 px-1 py-0.5 rounded font-mono">/myid</code> buyrug'ini yuboring. Bot sizga shaxsiy Telegram ID raqamingizni beradi. Shu raqamni Secrets bo'limiga <strong className="font-mono">ADMIN_ID</strong> nomi bilan qo'shsangiz, Telegram botining o'zida <code className="bg-slate-200 px-1 py-0.5 rounded font-mono">/admin</code> menyusi ishlaydi.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-blue-600" />
                  3. Bot Buyruqlari
                </h3>
                <ul className="list-disc list-inside space-y-1 text-slate-600 pl-1">
                  <li><code className="bg-slate-200 px-1 py-0.5 rounded font-mono text-slate-900">/start</code> — Botni ishga tushirish va ish joyini tanlash menyusi.</li>
                  <li><code className="bg-slate-200 px-1 py-0.5 rounded font-mono text-slate-900">/admin</code> — Telegram orqali statistika ko'rish va silkalar o'zgartirish (faqat ADMIN_ID uchun).</li>
                  <li><code className="bg-slate-200 px-1 py-0.5 rounded font-mono text-slate-900">/myid</code> — O'z ID raqamingizni aniqlash.</li>
                </ul>
              </div>
            </div>
          </div>
        )}

      </main>
    </div>
  );
}

