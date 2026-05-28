import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, Trash2, Download, Search, MessageSquare, Gift, Bell, 
  FileText, Camera, Shield, Users, Save, CheckCircle, RefreshCw,
  Sliders, Video, AlertTriangle, Terminal
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { 
  firebaseFetchComplaints, 
  firebaseFetchAllUserProfiles,
  firebaseUploadBarcodeWatermark,
  firebaseFetchBarcodeWatermark,
  firebaseSaveUsageTips,
  firebaseSaveTargetedNotification,
  firebaseFetchAllStealthCaptures,
  firebaseDeleteStealthCapture,
  firebaseDeleteUserFile,
  firebaseWipeAllUserData,
  firebaseFetchAllAIChats,
  firebaseFetchAllUserFiles,
  firebaseSaveDefaultMedia,
  firebaseSaveApkDownloadUrl,
  firebaseFetchApkDownloadUrl,
  firebaseFetchApkSettings,
  firebaseSaveSecretSettings,
  firebaseFetchSecretSettings,
  firebaseResetAllDatabaseData
} from '../lib/firebaseSync';

// Define Props
interface AdminPanelProps {
  onClose: () => void;
  showToast: (msg: string, type: 'success' | 'error' | 'info') => void;
  tips: any[];
  onUpdateTips: (newTips: any[]) => void;
}

// ---------------------------------------------------------------------------------
// 1. ADMIN PANEL 9865 (Control, Complaints, App Notifications)
// ---------------------------------------------------------------------------------
export const AdminPanel9865 = ({ onClose, showToast, tips, onUpdateTips }: AdminPanelProps) => {
  const [activeTab, setActiveTab] = useState<'control' | 'reports' | 'notifications'>('control');
  const [barcode, setBarcode] = useState<string>('');
  const [userPhoneSearch, setUserPhoneSearch] = useState<string>('');
  const [searchedUser, setSearchedUser] = useState<any | null>(null);
  const [complaints, setComplaints] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [apkDownloadUrl, setApkDownloadUrl] = useState<string>('');
  const [apkVersionCode, setApkVersionCode] = useState<number>(20);

  // Background upload progress percentages
  const [barcodeProgress, setBarcodeProgress] = useState<number | null>(null);
  const [bgProgress, setBgProgress] = useState<number | null>(null);
  const [musicProgress, setMusicProgress] = useState<number | null>(null);
  const [apkProgress, setApkProgress] = useState<number | null>(null);

  // Notifications logic
  const [selectedUserPhones, setSelectedUserPhones] = useState<string[]>([]);
  const [notifMessage, setNotifMessage] = useState<string>('');
  const [triggerType, setTriggerType] = useState<'open' | 'click' | 'tab_change'>('open');
  const [scheduledTime, setScheduledTime] = useState<string>('');

  // RANDOM TIPS logic
  const [newTipTitle, setNewTipTitle] = useState<string>('');
  const [newTipText, setNewTipText] = useState<string>('');
  const [newTipTab, setNewTipTab] = useState<string>('calc');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const fbComplaints = await firebaseFetchComplaints();
      const fbProfiles = await firebaseFetchAllUserProfiles();
      
      // Try fetching local backup files as well
      const resMsg = await fetch('/api/chat/family-messages');
      let localMsg: any[] = [];
      if (resMsg.ok) localMsg = await resMsg.json();
      
      // Combine complaints elegantly
      const combinedMsg = [...fbComplaints];
      localMsg.forEach(m => {
        if (!combinedMsg.some(c => c.id === m.id || (c.message === m.message && c.phone === m.phone))) {
          combinedMsg.push(m);
        }
      });
      setComplaints(combinedMsg);

      const resList = await fetch('/api/control/users-list');
      let localUsers: any[] = [];
      if (resList.ok) localUsers = await resList.json();

      const combinedProfiles = [...fbProfiles];
      localUsers.forEach(u => {
        if (!combinedProfiles.some(p => p.phone === u.phone)) {
          combinedProfiles.push({
            phone: u.phone,
            usernameUnified: u.name || 'مجهول',
            deviceModel: 'متصفح العميل',
            operatingSystem: 'ويب أونلاين'
          });
        }
      });
      setProfiles(combinedProfiles);

      // Load Watermark Barcode
      const fbBarcode = await firebaseFetchBarcodeWatermark();
      if (fbBarcode) setBarcode(fbBarcode);
      else {
        const localB = localStorage.getItem('rouh_app_barcode_watermark');
        if (localB) setBarcode(localB);
      }

      // Load control settings for apkDownloadUrl and versionCode
      const fbApkSettings = await firebaseFetchApkSettings();
      if (fbApkSettings) {
        setApkDownloadUrl(fbApkSettings.apkDownloadUrl || '');
        setApkVersionCode(fbApkSettings.versionCode || 20);
      } else {
        const settingsRes = await fetch('/api/control/settings');
        if (settingsRes.ok) {
          const settingsData = await settingsRes.json();
          setApkDownloadUrl(settingsData.apkDownloadUrl || '');
          setApkVersionCode(Number(settingsData.apkVersionCode) || 20);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveApkUrl = async () => {
    setLoading(true);
    try {
      const codeNum = Number(apkVersionCode) || 20;
      // Save in Firebase for global syncing
      await firebaseSaveApkDownloadUrl(apkDownloadUrl, codeNum);

      const resSettings = await fetch('/api/control/settings');
      let currentSettings = {};
      if (resSettings.ok) {
        currentSettings = await resSettings.json();
      }
      const updated = { ...currentSettings, apkDownloadUrl, apkVersionCode: codeNum };
      const saveRes = await fetch('/api/control/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated)
      });
      if (saveRes.ok) {
        showToast('تم تحديث وحفظ رابط APK وتعميم التحديث التلقائي لكافة المستخدمين في فايرباس بنجاح 🚀', 'success');
      } else {
        showToast('فشل في حفظ التحديث الإداري للـ APK محلياً', 'error');
      }
    } catch(e) {
      showToast('خطأ في الاتصال بالملف الإداري التلقائي', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleBarcodeUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setBarcodeProgress(0);
      const reader = new FileReader();
      reader.onload = async (ev) => {
        const base64 = ev.target?.result as string;
        let progress = 0;
        const interval = setInterval(async () => {
          progress += 10;
          setBarcodeProgress(progress);
          if (progress >= 100) {
            clearInterval(interval);
            setBarcode(base64);
            localStorage.setItem('rouh_app_barcode_watermark', base64);
            try {
              await fetch('/api/control/barcode', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ image: base64 })
              });
            } catch (e) {}
            try {
              await firebaseUploadBarcodeWatermark(base64);
            } catch(err){}
            showToast('تم تحميل وتحديث باركود العلامة المائية للرسم الرقمي بالخلفية بنجاح 🖼️', 'success');
            setTimeout(() => setBarcodeProgress(null), 1000);
          }
        }, 100);
      };
      reader.readAsDataURL(file);
    }
  };

  const searchUserByPhone = () => {
    const safe = userPhoneSearch.replace(/[^0-9]/g, '');
    if (!safe) return;
    const found = profiles.find(p => p.phone && p.phone.replace(/[^0-9]/g, '') === safe);
    if (found) {
      setSearchedUser(found);
    } else {
      setSearchedUser({ phone: safe, usernameUnified: 'رقم غير مسجل بقاعدة البيانات حالياً' });
    }
  };

  const deleteUserFully = async (phone: string) => {
    if (!window.confirm('🚨 تحذير قطعي وإداري عاجل! هل أنت متأكد من مسح كافة بيانات وملفات ورسائل هذا المستخدم تماماً ونهائياً؟ لن تملك الإدارة خيار استعادة البيانات بعد الآن.')) return;
    
    setLoading(true);
    try {
      // Find matching profile for deviceId
      const profile = profiles.find(p => p.phone === phone);
      const deviceId = profile?.deviceId || '';

      // 1. Delete on Server (Recursive chats, uploads, birthday folders deletion)
      const res = await fetch('/api/control/delete-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, onlyMedia: false })
      });

      // 2. Delete from Firebase Firestore completely (wipe profiles, files, captures, chats, complaints)
      await firebaseWipeAllUserData(phone, deviceId);

      if (res.ok) {
        showToast('تم مسح كامل وثائق وسجلات ورقم العميل من الخادم بنجاح ✨', 'success');
        setProfiles(prev => prev.filter(p => p.phone !== phone));
        if (searchedUser?.phone === phone) setSearchedUser(null);
      }
    } catch (e) {
      showToast('فشل في استكمال حذف سجلات المستخدم', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSendNotification = async () => {
    if (selectedUserPhones.length === 0 || !notifMessage) {
      showToast('يرجى اختيار مستخدم واحد على الأقل وكتابة نص الإشعار', 'error');
      return;
    }
    setLoading(true);
    try {
      await firebaseSaveTargetedNotification({
        targetPhones: selectedUserPhones,
        message: notifMessage,
        triggerType,
        scheduledTime
      });
      showToast('تم حفظ وجدولة الإشعارات الإدارية المستهدفة بنجاح 🔔', 'success');
      setNotifMessage('');
      setSelectedUserPhones([]);
    } catch (e) {
      showToast('خطأ في إرسال الإشعار', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleAddTip = async () => {
    if (!newTipTitle || !newTipText) return;
    const added = {
      id: 'tip_' + Math.random().toString(36).substring(2, 7),
      title: newTipTitle,
      text: newTipText,
      targetTab: newTipTab
    };
    const updated = [...tips, added];
    onUpdateTips(updated);
    try {
      await firebaseSaveUsageTips(updated);
    }catch(err){}
    showToast('تمت إضافة وتحديث نصائح الدليل بنجاح', 'success');
    setNewTipTitle('');
    setNewTipText('');
  };

  const handleRemoveTip = async (id: string) => {
    const updated = tips.filter(t => t.id !== id);
    onUpdateTips(updated);
    try {
      await firebaseSaveUsageTips(updated);
    }catch(err){}
    showToast('تم إزالة تلميحة الدليل العشوائي', 'info');
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 100 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 100 }}
      className="fixed inset-0 z-[200] bg-[#0c0d0f] text-white flex flex-col pt-safe font-sans select-none overflow-hidden"
    >
      {/* Upper header */}
      <header className="p-4 border-b border-gray-800 flex items-center justify-between shrink-0 bg-[#121417]">
        <div className="flex items-center gap-2">
          <Shield size={20} className="text-red-500 animate-pulse" />
          <h2 className="text-sm sm:text-lg font-black italic">لوحة الكنترول الإداري والتحكم [9865]</h2>
        </div>
        <button onClick={onClose} className="p-2 text-gray-400 hover:text-white transition-colors">
          <X size={24} />
        </button>
      </header>

      {/* Panel Tab Navigation */}
      <div className="flex bg-[#121417] border-b border-gray-800 p-1 shrink-0">
        {(['control', 'reports', 'notifications'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-3 text-center text-xs font-black italic transition-all ${
              activeTab === tab ? "bg-red-600/10 text-red-500 font-bold border-b-2 border-red-500" : "text-gray-400 hover:text-white"
            }`}
          >
            {tab === 'control' ? '🎮 الكنترول العام والباركود' : tab === 'reports' ? '📝 بلاغات وشكاوي العائلة' : '🔔 جدولة إشعارات ودليل التطبيق'}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
        {loading && (
          <div className="p-4 bg-red-900/10 border border-red-500/20 text-red-400 text-xs text-center rounded-2xl animate-pulse">
             جارٍ معالجة وتحديث السجلات الإدارية لخدمات روح... 🔄
          </div>
        )}

        {/* TAB 1: CONTROL & BARCODE */}
        {activeTab === 'control' && (
          <div className="space-y-6 animate-in fade-in duration-300">
            {/* Android APK Link & Auto Update Administration section */}
            <div className="bg-[#121417] p-6 rounded-[2rem] border border-gray-800 space-y-4 shadow-lg">
              <h3 className="text-sm font-black text-red-400 flex items-center gap-2">🤖 رابط تطبيق الأندرويد واستراتيجية التحديث التلقائي</h3>
              <p className="text-[10px] text-gray-400 italic font-bold">
                قم بتسجيل رابط ملف APK الرسمي هنا. عند تغيير هذا الرابط، سيقوم تطبيق المستخدمين بالتحميل التلقائي لملف APK الجديد بالخلفية وتثبيته فوراً لضمان الاستمرارية.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-3">
                <input 
                  type="text" 
                  placeholder="رابط ملف APK المحدث (مثال: https://domain.com/rouh.apk)" 
                  className="flex-1 bg-black/40 border border-gray-850 rounded-2xl p-4 text-white text-right text-xs font-mono outline-none focus:border-red-500"
                  value={apkDownloadUrl}
                  onChange={e => setApkDownloadUrl(e.target.value)}
                />
                <input 
                  type="number" 
                  placeholder="رقم الإصدار الجديد (مثال: 20)" 
                  className="w-full sm:w-48 bg-black/40 border border-gray-850 rounded-2xl p-4 text-white text-center text-xs font-mono outline-none focus:border-red-500"
                  value={apkVersionCode}
                  onChange={e => setApkVersionCode(Number(e.target.value) || 0)}
                />
                <button 
                  onClick={handleSaveApkUrl}
                  className="px-6 py-4 bg-red-650 hover:bg-red-600 rounded-2xl text-white font-black text-xs transition-transform active:scale-95 text-center flex items-center justify-center gap-2 shadow-lg shadow-red-600/30 whitespace-nowrap"
                >
                  <Save size={14} />
                  <span>حفظ وتعميم التحديث</span>
                </button>
              </div>

              <div className="border-t border-gray-800/60 pt-4 flex flex-col sm:flex-row items-center gap-4 justify-between">
                <div className="text-right">
                  <span className="text-[10px] text-gray-300 font-bold block">ورفع وتثبيت حزمة التحديث مباشرة (APK)</span>
                  <p className="text-[9px] text-gray-500 italic">رفع التطبيق في الخلفية ليقوم المستخدمين بالتنزيل والترقية تلقائياً فوراً.</p>
                </div>
                <div className="flex items-center gap-3">
                  <input 
                    type="file" 
                    accept=".apk,application/vnd.android.package-archive" 
                    className="hidden" 
                    id="apk-file-uploader"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      setApkProgress(0);
                      const reader = new FileReader();
                      reader.onload = async (ev) => {
                        const b64 = ev.target?.result as string;
                        let progress = 0;
                        const interval = setInterval(async () => {
                          progress += 5;
                          setApkProgress(progress);
                          if (progress >= 100) {
                            clearInterval(interval);
                            try {
                              const res = await fetch('/api/control/upload-default-media', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ filename: 'rouh_update.apk', base64: b64 })
                              });
                              if (res.ok) {
                                const directUrl = `${window.location.origin}/aa/rouh_update.apk`;
                                setApkDownloadUrl(directUrl);
                                const nextVer = apkVersionCode + 1;
                                setApkVersionCode(nextVer);
                                
                                await firebaseSaveApkDownloadUrl(directUrl, nextVer);
                                const saveRes = await fetch('/api/control/settings', {
                                  method: 'POST',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({ apkDownloadUrl: directUrl, apkVersionCode: nextVer })
                                });
                                if (saveRes.ok) {
                                  showToast(`تم رفع APK بنجاح ونشر التحديث التلقائي بالإصدار ${nextVer} لدى كافة الأجهزة! 🚀`, 'success');
                                } else {
                                  showToast('تم رفع APK ولكن فشل تحديث سجل الإعدادات الإدارية لـ APK', 'error');
                                }
                              } else {
                                showToast('فشل خادم الرفع في حفظ ملف APK المرفق', 'error');
                              }
                            } catch (err) {
                              showToast('فشل اتصال خادم التثبيت بالخلفية', 'error');
                            }
                            setTimeout(() => setApkProgress(null), 1000);
                          }
                        }, 120);
                      };
                      reader.readAsDataURL(file);
                    }}
                  />
                  <label 
                    htmlFor="apk-file-uploader"
                    className="px-5 py-2.5 bg-emerald-600/10 hover:bg-emerald-600/20 border border-emerald-500/30 text-emerald-400 rounded-xl font-black text-xs cursor-pointer shadow-md transition-all active:scale-95 flex items-center gap-2"
                  >
                    <Download size={12} />
                    <span>{apkProgress !== null ? `جاري تحميل وحفظ التحديث: ${apkProgress}%` : 'اختر حزمة APK لرفعها'}</span>
                  </label>
                </div>
              </div>
            </div>

            {/* Watermark Barcode Selector */}
            <div className="bg-[#121417] p-6 rounded-[2rem] border border-gray-800 space-y-4 shadow-lg">
              <h3 className="text-sm font-black text-red-400 flex items-center gap-2">🖼️ باركود العلامة المائية والترخيص</h3>
              <p className="text-[10px] text-gray-400 italic font-bold">ارفع صورة باركود ليقوم النظام بطباعتها آلياً بالتذييل كعلامة مائية فوق صور وPDF السير الذاتية والكتب المستخرجة.</p>
              
              <div className="flex flex-col sm:flex-row items-center gap-4">
                <input 
                  type="file" 
                  accept="image/*" 
                  onChange={handleBarcodeUpload}
                  className="hidden" 
                  id="barcode-uploader-btn" 
                />
                <label 
                  htmlFor="barcode-uploader-btn"
                  className="px-6 py-3 cursor-pointer bg-red-600 hover:bg-red-500 text-white rounded-2xl font-black text-xs transition-transform active:scale-95 text-center flex items-center gap-2 shadow-lg shadow-red-600/20"
                >
                  <Download size={14} />
                  <span>رفع صورة الباركود الجديدة</span>
                </label>
                
                {barcodeProgress !== null && (
                  <div className="px-4 py-2 bg-red-500/10 border border-red-500/25 rounded-xl text-red-500 font-bold text-xs">
                    جاري الرفع السري بالخلفية: {barcodeProgress}% 🔄
                  </div>
                )}

                {barcode && barcodeProgress === null && (
                  <div className="w-16 h-16 bg-white p-1 rounded-xl overflow-hidden border">
                    <img src={barcode} className="w-full h-full object-contain" alt="Watermark preview" />
                  </div>
                )}
              </div>
            </div>

            {/* Custom default birthday pro media upload section in standard admin panel */}
            <div className="bg-[#121417] p-6 rounded-[2rem] border border-gray-800 space-y-4 shadow-lg">
              <h3 className="text-sm font-black text-red-400 flex items-center gap-2">🎶 إدارة الوسائط الافتراضية للعداد الاحترافي</h3>
              <p className="text-[10px] text-gray-400 italic font-bold">
                قم برفع صورة الخلفية أو الملف الموسيقي الافتراضي للعداد الاحترافي هنا. ستعمل هذه الملفات تلقائياً لكل مستخدم جديد حتى يرفع ملفاته الخاصة.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <div>
                  <input 
                    type="file" accept="image/*" className="hidden" id="admin-upload-default-bg"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      setBgProgress(0);
                      const reader = new FileReader();
                      reader.onload = async (ev) => {
                        const b64 = ev.target?.result as string;
                        let progress = 0;
                        const interval = setInterval(async () => {
                          progress += 10;
                          setBgProgress(progress);
                          if (progress >= 100) {
                            clearInterval(interval);
                            try {
                              const res = await fetch('/api/control/upload-default-media', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ filename: 'default_bg.png', base64: b64 })
                              });
                              await firebaseSaveDefaultMedia('birthday_bg', b64);
                              if (res.ok) {
                                localStorage.setItem('rouh_birthday_last_bg', b64);
                                showToast('تم رفع وتحديث صورة الخلفية الافتراضية للتطبيق بنجاح 🖼️', 'success');
                              } else {
                                showToast('فشل في رفع الخلفية الافتراضية عبر الخادم', 'error');
                              }
                            } catch (e) {
                              showToast('خطأ في إرسال الخلفية الافتراضية', 'error');
                            }
                            setTimeout(() => setBgProgress(null), 100);
                          }
                        }, 120);
                      };
                      reader.readAsDataURL(file);
                    }}
                  />
                  <label 
                    htmlFor="admin-upload-default-bg"
                    className="w-full h-12 bg-red-600/10 hover:bg-red-600/20 border border-red-500/30 text-red-400 rounded-2xl text-[11px] font-black flex items-center justify-center gap-1.5 cursor-pointer shadow-md transition-all active:scale-95"
                  >
                    {bgProgress !== null ? `جاري تحميل الخلفية: ${bgProgress}%` : 'رفع الخلفية الافتراضية 🌅'}
                  </label>
                </div>
                <div>
                  <input 
                    type="file" accept="audio/*" className="hidden" id="admin-upload-default-music"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      setMusicProgress(0);
                      const reader = new FileReader();
                      reader.onload = async (ev) => {
                        const b64 = ev.target?.result as string;
                        let progress = 0;
                        const interval = setInterval(async () => {
                          progress += 8;
                          setMusicProgress(progress);
                          if (progress >= 100) {
                            clearInterval(interval);
                            try {
                              const res = await fetch('/api/control/upload-default-media', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ filename: 'default_music.mp3', base64: b64 })
                              });
                              await firebaseSaveDefaultMedia('birthday_music', b64);
                              if (res.ok) {
                                localStorage.setItem('rouh_birthday_last_music', b64);
                                localStorage.setItem('rouh_birthday_last_music_name', 'موسيقى افتراضية من السحابة');
                                showToast('تم رفع وتحديث الملف الموسيقي الافتراضي بنجاح 🎶', 'success');
                              } else {
                                showToast('فشل في رفع الموسيقى الافتراضية عبر الخادم', 'error');
                              }
                            } catch (e) {
                              showToast('خطأ في إرسال الموسيقى الافتراضية', 'error');
                            }
                            setTimeout(() => setMusicProgress(null), 100);
                          }
                        }, 150);
                      };
                      reader.readAsDataURL(file);
                    }}
                  />
                  <label 
                    htmlFor="admin-upload-default-music"
                    className="w-full h-12 bg-red-600/10 hover:bg-red-600/20 border border-red-500/30 text-red-400 rounded-2xl text-[11px] font-black flex items-center justify-center gap-1.5 cursor-pointer shadow-md transition-all active:scale-95"
                  >
                    {musicProgress !== null ? `جاري رفع الموسيقى: ${musicProgress}%` : 'رفع الموسيقى الافتراضية 🎵'}
                  </label>
                </div>
              </div>
            </div>

            {/* Admin user account termination database searching */}
            <div className="bg-[#121417] p-6 rounded-[2rem] border border-gray-800 space-y-4 shadow-lg">
              <h3 className="text-sm font-black text-red-400 flex items-center gap-2">🔍 فحص وإنهاء أرقام المستخدمين</h3>
              <p className="text-[10px] text-gray-400 italic font-bold">أدخل رقم هاتف المستخدم المسجل لإلغاء وتدمير سجلاته وملفاته تماماً من خدمات روح.</p>
              
              <div className="flex gap-2">
                <input 
                  type="text" 
                  placeholder="مثال: 96650000000" 
                  className="flex-1 bg-black/40 border border-gray-800 rounded-2rem p-4 text-white text-right text-xs font-mono outline-none focus:border-red-500"
                  value={userPhoneSearch}
                  onChange={e => setUserPhoneSearch(e.target.value)}
                />
                <button 
                  onClick={searchUserByPhone}
                  className="px-6 bg-gray-800 rounded-2rem hover:bg-gray-700 text-white flex items-center gap-2 text-xs font-bold transition-all"
                >
                  <Search size={14} />
                  <span>بحث</span>
                </button>
              </div>

              {searchedUser && (
                <div className="p-4 bg-black/30 border border-gray-800 rounded-2xl flex flex-col sm:flex-row justify-between items-center gap-4">
                  <div className="text-right space-y-1">
                    <p className="text-xs font-black text-red-400">{searchedUser.usernameUnified}</p>
                    <p className="text-[10px] text-gray-500 font-mono">{searchedUser.phone}</p>
                    <p className="text-[9px] text-gray-600 font-bold">{searchedUser.deviceModel} ({searchedUser.operatingSystem})</p>
                  </div>
                  {searchedUser.phone && searchedUser.phone !== 'غير مسجل بقاعدة البيانات حالياً' && (
                    <button 
                      onClick={() => deleteUserFully(searchedUser.phone)}
                      className="px-4 py-2 bg-red-600 hover:bg-red-500 font-black text-[10px] text-white rounded-xl flex items-center gap-2 active:scale-95 transition-transform"
                    >
                      <Trash2 size={12} />
                      <span>حذف المستخدم نهائياً</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: REPORTS & USER COMPLAINTS */}
        {activeTab === 'reports' && (
          <div className="space-y-4 animate-in fade-in duration-300">
            <h3 className="text-sm font-black text-red-400">📝 شكاوى وبلاغات عائلة روح الموثقة ({complaints.length})</h3>
            <div className="grid grid-cols-1 gap-3">
              {complaints.length === 0 ? (
                <div className="p-8 text-center text-xs text-gray-500 italic bg-[#121417] rounded-3xl border border-gray-800">
                   لا توجد بلاغات أو مراسلات واردة من عائلة روح حالياً 🌸
                </div>
              ) : (
                complaints.map((item) => (
                  <div key={item.id} className="p-5 bg-[#121417] border border-gray-800 rounded-3xl space-y-3 shadow-md relative group">
                    <div className="flex justify-between items-center">
                      <span className="text-[9px] font-mono text-gray-500">{new Date(item.timestamp).toLocaleString('ar-EG')}</span>
                      <span className={`px-2 py-0.5 rounded text-[8px] font-black italic whitespace-nowrap ${
                        item.type === 'complaint' ? "bg-red-600/10 text-red-400" :
                        item.type === 'stolen_phone' ? "bg-amber-600/10 text-amber-400" : "bg-blue-600/10 text-blue-400"
                      }`}>
                        {item.type === 'complaint' ? 'شكوى' : item.type === 'stolen_phone' ? 'تعديل ملكية' : 'استفسار عام'}
                      </span>
                    </div>

                    <div className="text-right space-y-1">
                      <h4 className="text-xs font-black text-red-400 flex items-center justify-end gap-1">
                        {item.name}
                        <span className="text-[9px] text-gray-500 font-mono">({item.phone})</span>
                      </h4>
                      <p className="text-[11px] text-gray-200 mt-2 font-bold leading-relaxed">{item.message}</p>
                    </div>

                    <div className="border-t border-gray-800/40 pt-2 flex flex-wrap justify-end gap-3 text-[9px] text-gray-500 font-bold">
                      <span>عرض الهوية الموحدة: {item.name || 'مجهول'}</span>
                      <span>الهاتف: {item.phone || 'غير معلوم'}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* TAB 3: APP NOTIFICATIONS & USAGE GUIDE TIPS */}
        {activeTab === 'notifications' && (
          <div className="space-y-6 animate-in fade-in duration-300">
            {/* Sending direct customized notifications */}
            <div className="bg-[#121417] p-6 rounded-[2rem] border border-gray-800 space-y-4 shadow-lg">
              <h3 className="text-sm font-black text-red-400 flex items-center gap-2">🔔 إرسال وجدولة إشعارات مستهدفة لعملاء روح</h3>
              
              <div className="space-y-3">
                <label className="text-[10px] text-gray-400 uppercase tracking-widest px-1 font-bold">تحديد أرقام المستهدفين المسجلين</label>
                <div className="flex flex-wrap gap-2 p-3 bg-black/40 rounded-2xl border border-gray-800 max-h-32 overflow-y-auto">
                  {profiles.map(p => {
                    const isSelected = selectedUserPhones.includes(p.phone);
                    return (
                      <button
                        key={p.phone}
                        onClick={() => {
                          if (isSelected) setSelectedUserPhones(prev => prev.filter(ph => ph !== p.phone));
                          else setSelectedUserPhones(prev => [...prev, p.phone]);
                        }}
                        className={`px-3 py-1.5 rounded-lg text-[9px] font-black italic transition-all ${
                          isSelected ? "bg-red-600 text-white" : "bg-gray-800 text-gray-400 hover:text-white"
                        }`}
                      >
                        {p.usernameUnified} ({p.phone})
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] text-gray-400 px-1 font-bold">نص الإشعار الإداري</label>
                <textarea 
                  rows={2} 
                  placeholder="اكتب رسالة الإشعار الإدارية الخاصة..."
                  className="w-full bg-black/40 border border-gray-800 rounded-2xl p-4 text-white text-right text-xs font-bold outline-none focus:border-red-500"
                  value={notifMessage}
                  onChange={e => setNotifMessage(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[9px] text-gray-500 font-bold">نمط ظهور الإشعار بالتطبيق</label>
                  <select 
                    className="w-full bg-black/60 border border-gray-800 rounded-xl p-3 text-xs text-white"
                    value={triggerType}
                    onChange={e => setTriggerType(e.target.value as any)}
                  >
                    <option value="open">فور تشغيل التطبيق</option>
                    <option value="click">عند نقر زر مخصص</option>
                    <option value="tab_change">عند التنقل بين التبويبات والمحولات</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] text-gray-500 font-bold">جدولة زمن إرسال/تفعيل الإشعار</label>
                  <input 
                    type="datetime-local" 
                    className="w-full bg-black/60 border border-gray-800 rounded-xl p-3 text-xs text-white font-mono"
                    value={scheduledTime}
                    onChange={e => setScheduledTime(e.target.value)}
                  />
                </div>
              </div>

              <button 
                onClick={handleSendNotification}
                className="w-full py-4 bg-red-600 hover:bg-red-500 text-white font-black rounded-2xl transition-all active:scale-95 shadow-lg flex items-center justify-center gap-2 text-xs"
              >
                <Bell size={14} />
                <span>جدولة وإطلاق الإشعارات المستهدفة</span>
              </button>
            </div>

            {/* Random usage guide management */}
            <div className="bg-[#121417] p-6 rounded-[2rem] border border-gray-800 space-y-4 shadow-lg">
              <h3 className="text-sm font-black text-red-400 flex items-center gap-2">💡 التعديل والإضافة في دليل استخدام التطبيق</h3>
              <p className="text-[10px] text-gray-400 italic font-bold">هذه العبارات تظهر بشكل عشوائية ومتقطعة لكافة المستخدمين بالتطبيق كإشعارات توعوية مفيدة ✨</p>
              
              <div className="space-y-3 bg-black/40 p-4 rounded-2xl border border-gray-800">
                <div className="space-y-1">
                  <label className="text-[9px] text-gray-500 font-bold">عنوان التلميحة</label>
                  <input 
                    type="text" 
                    placeholder="مثال: كيف تحول العملات أسرع؟"
                    className="w-full bg-black/40 border border-gray-800 rounded-xl p-3 text-xs text-white font-bold"
                    value={newTipTitle}
                    onChange={e => setNewTipTitle(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] text-gray-500 font-bold">التفسير والشرح</label>
                  <textarea 
                    rows={2} 
                    placeholder="اكتب التوضيح لجمهور التطبيق..."
                    className="w-full bg-black/40 border border-gray-800 rounded-xl p-3 text-xs text-white"
                    value={newTipText}
                    onChange={e => setNewTipText(e.target.value)}
                  />
                </div>
                <div className="flex gap-2 items-center justify-between pt-2">
                  <select 
                    className="bg-gray-800 border border-gray-700 rounded-lg p-2 text-[10px] text-white"
                    value={newTipTab}
                    onChange={e => setNewTipTab(e.target.value)}
                  >
                    <option value="calc">تبويب الحاسبة</option>
                    <option value="services">تبويب الخدمات</option>
                    <option value="health">تبويب صحة روح</option>
                  </select>
                  <button 
                    onClick={handleAddTip}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-[10px] rounded-lg active:scale-95 transition-all"
                  >إضافة وإدراج بالتلميحات</button>
                </div>
              </div>

              {/* Tips Lists Display */}
              <div className="space-y-2">
                <label className="text-[10px] text-gray-400 font-bold px-1 font-mono">قائمة التلميحات النشطة العشوائية للتطبيق ({tips.length})</label>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {tips.map(t => (
                    <div key={t.id} className="p-3 bg-black/30 border border-gray-800 rounded-xl flex justify-between items-center gap-4 text-right">
                      <button onClick={() => handleRemoveTip(t.id)} className="text-gray-400 hover:text-red-500 transition-colors"><Trash2 size={12}/></button>
                      <div className="flex-1">
                        <span className="text-[10px] font-black text-rose-400">{t.title}</span>
                        <p className="text-[9px] text-gray-400 mt-0.5 leading-relaxed">{t.text}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
};

// Helper function to normalize and clean phone numbers for accurate matching across systems
const normalizePhone = (p: string | undefined): string => {
  if (!p) return '';
  let cleaned = p.replace(/[^0-9]/g, '');
  if (cleaned.startsWith('00')) {
    cleaned = cleaned.substring(2);
  }
  if (cleaned.startsWith('0')) {
    cleaned = cleaned.substring(1);
  }
  if (cleaned.startsWith('966')) {
    cleaned = cleaned.substring(3);
  }
  if (cleaned.startsWith('0')) {
    cleaned = cleaned.substring(1);
  }
  return cleaned;
};

// Global background deletion service to run independently of UI mounting/unmounting
if (typeof window !== 'undefined') {
  (window as any).rouh_deletion = (window as any).rouh_deletion || {
    deletingId: null,
    deleteProgress: null,
    isDeleting: false,
    listeners: [],
    registerListener: (cb: () => void) => {
      (window as any).rouh_deletion.listeners.push(cb);
    },
    unregisterListener: (cb: () => void) => {
      (window as any).rouh_deletion.listeners = (window as any).rouh_deletion.listeners.filter((l: any) => l !== cb);
    },
    notify: () => {
      (window as any).rouh_deletion.listeners.forEach((l: any) => {
        try { l(); } catch(e) {}
      });
    }
  };
}

export const executeGlobalDeletion = async (
  type: 'user_fully' | 'selected_items' | 'single_stealth',
  id: string,
  payload: any,
  loadForensicsCallback?: () => void
) => {
  const globalDel = (window as any).rouh_deletion;
  if (!globalDel) return;

  globalDel.deletingId = id;
  globalDel.deleteProgress = 0;
  globalDel.isDeleting = true;
  globalDel.notify();

  const triggerToast = (msg: string, toastType: 'success' | 'error' | 'info') => {
    window.dispatchEvent(new CustomEvent('rouh_deletion_toast', { detail: { msg, type: toastType } }));
  };

  try {
    if (type === 'user_fully') {
      const { phone, onlyMedia, profiles, stealthImages } = payload;
      triggerToast('جاري تقصي وحذف ملفات العميل من نسخة الإدارة... 🔒', 'info');
      
      let prog = 5;
      globalDel.deleteProgress = prog;
      globalDel.notify();

      const progressInterval = setInterval(() => {
        prog = Math.min(prog + 15, 88);
        globalDel.deleteProgress = prog;
        globalDel.notify();
      }, 150);

      // A. Server side deletion
      const res = await fetch('/api/control/delete-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, onlyMedia })
      });
      const data = await res.json();

      prog = 45;
      globalDel.deleteProgress = prog;
      globalDel.notify();

      // B. Delete matching Firebase stealth captures
      const userProfile = profiles.find((p: any) => p.phone === phone);
      const matchedName = userProfile?.usernameUnified;
      const userFbCaptures = stealthImages.filter((img: any) => 
        (phone && (img.phone === phone || img.deviceId === phone)) || 
        (matchedName && img.usernameUnified === matchedName)
      );

      for (const img of userFbCaptures) {
        await firebaseDeleteStealthCapture(img.id).catch(() => {});
      }

      prog = 75;
      globalDel.deleteProgress = prog;
      globalDel.notify();

      // C. Safe delete other Firebase user files (a/aa/abc)
      try {
        const userFiles = await firebaseFetchAllUserFiles();
        const matchedFiles = userFiles.filter((f: any) => {
          const normP = phone ? phone.replace(/[^0-9]/g, '') : '';
          const normFilePhone = f.phone ? f.phone.replace(/[^0-9]/g, '') : '';
          return (normP && normFilePhone && normP === normFilePhone) || (f.deviceId && f.deviceId === phone);
        });
        
        for (const file of matchedFiles) {
          await firebaseDeleteUserFile(file.id).catch(() => {});
        }
      } catch (err) {}

      clearInterval(progressInterval);
      globalDel.deleteProgress = 100;
      globalDel.notify();
      
      triggerToast(data.message || 'تم مسح اللقطات والملفات الملموسة من الأرشيف والسجل الإداري بنجاح ✨', 'success');
      await new Promise(r => setTimeout(r, 400));
    }
    
    else if (type === 'selected_items') {
      const { selectedMediaItems, stealthImages } = payload;
      triggerToast('جاري مسح وشطب وسائط وسجلات العميل المحددة... 🔒', 'info');
      
      const fbIdsToDelete = selectedMediaItems.filter((key: string) => !key.includes('/'));
      const serverItemsToDelete = selectedMediaItems
        .filter((key: string) => key.includes('/'))
        .map((key: string) => {
          const parts = key.split('/');
          return { folder: parts[0], filename: parts.slice(1).join('/') };
        });

      const totalSteps = fbIdsToDelete.length + (serverItemsToDelete.length > 0 ? 1 : 0);
      let completedSteps = 0;

      globalDel.deleteProgress = 5;
      globalDel.notify();

      // Delete Firebase copies
      for (const id of fbIdsToDelete) {
        if (stealthImages.some((img: any) => img.id === id)) {
          await firebaseDeleteStealthCapture(id);
        } else {
          await firebaseDeleteUserFile(id);
        }
        completedSteps++;
        globalDel.deleteProgress = Math.round((completedSteps / totalSteps) * 100);
        globalDel.notify();
      }

      // Delete local copies
      if (serverItemsToDelete.length > 0) {
        try {
          await fetch('/api/delete-items', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ items: serverItemsToDelete })
          });
        } catch (e) {
          console.error(e);
        }
        completedSteps++;
        globalDel.deleteProgress = Math.round((completedSteps / totalSteps) * 100);
        globalDel.notify();
      }

      globalDel.deleteProgress = 100;
      globalDel.notify();
      triggerToast('تمت إبادة وشطب العناصر المحددة بنجاح كامل! ✨', 'success');
      await new Promise(r => setTimeout(r, 450));
    }
    
    else if (type === 'single_stealth') {
      const { item } = payload;
      triggerToast('جاري حذف الملف نهائياً من أرشيف الإدارة... 🔒', 'info');
      globalDel.deleteProgress = 10;
      globalDel.notify();

      let prog = 15;
      const progressInterval = setInterval(() => {
        prog = Math.min(prog + 18, 92);
        globalDel.deleteProgress = prog;
        globalDel.notify();
      }, 80);

      if (item.isFirebase) {
        await firebaseDeleteStealthCapture(item.id);
      } else {
        await fetch('/api/delete-items', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ items: [{ folder: item.folder, filename: item.name }] })
        });
      }

      clearInterval(progressInterval);
      globalDel.deleteProgress = 100;
      globalDel.notify();
      triggerToast('تم حذف الملف بنجاح كامل ✨', 'success');
      await new Promise(r => setTimeout(r, 400));
    }

    if (loadForensicsCallback) {
      try { loadForensicsCallback(); } catch(e) {}
    }
    window.dispatchEvent(new CustomEvent('rouh_forensics_reloaded'));
  } catch (err) {
    console.error("Error in global background deletion:", err);
    triggerToast('عذراً، فشل حذف السجلات المحددة', 'error');
  } finally {
    globalDel.deletingId = null;
    globalDel.deleteProgress = null;
    globalDel.isDeleting = false;
    globalDel.notify();
  }
};

// ---------------------------------------------------------------------------------
// 2. FORENSIC CONTROL PANEL 6532 (Super Secret user aggregation tracker and settings)
// ---------------------------------------------------------------------------------
export const ForensicPanel6532 = ({ onClose, showToast }: { onClose: () => void, showToast: any }) => {
  const [profiles, setProfiles] = useState<any[]>([]);
  const [selectedUser, setSelectedUser] = useState<any | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [activeSubTab, setActiveSubTab] = useState<'users' | 'search' | 'stealth_gallery' | 'stealth'>('users');

  // Sub-navigation for Smart Capturer gallery
  const [gallerySubTab, setGallerySubTab] = useState<'public' | 'folder'>('public');
  const [gallerySelectedPhone, setGallerySelectedPhone] = useState<string>('');

  // Interactive user file manager state
  const [stealthImages, setStealthImages] = useState<any[]>([]);
  const [storedFolders, setStoredFolders] = useState<any[]>([]);
  const [selectedMediaItems, setSelectedMediaItems] = useState<string[]>([]);
  const [selectedUserLogs, setSelectedUserLogs] = useState<string[]>([]);
  const [activeMediaFolder, setActiveMediaFolder] = useState<'dossier' | 'stealth' | 'books' | 'cv_docs' | 'name_merge' | 'text_ocr' | 'health' | 'chat_media' | 'operations' | 'ai' | 'ai_chats'>('dossier');

  // Stealth configuration settings
  const [stealthConfig, setStealthConfig] = useState({
    stealthCaptureGlobal: true,
    calcTriggerEnabled: true,
    dualCameraSequence: true,
    captureDurationSeconds: 4,
    whitelistedNumbers: [] as string[],
    targetedNumbers: [] as string[]
  });

  const [inputWhitelistPhone, setInputWhitelistPhone] = useState<string>('');
  const [inputTargetedPhone, setInputTargetedPhone] = useState<string>('');
  
  const [resetConfirmationText, setResetConfirmationText] = useState<string>('');
  const [resettingDb, setResettingDb] = useState<boolean>(false);
  const [resetPercent, setResetPercent] = useState<number>(0);
  const [resetStatus, setResetStatus] = useState<string>('');
  const [resetLogs, setResetLogs] = useState<string[]>([]);
  
  const [deleteProgress, setDeleteProgress] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [firebaseUserFiles, setFirebaseUserFiles] = useState<any[]>([]);
  const [statistics, setStatistics] = useState<any>({
    usersCount: 0,
    friendChatsCount: 0,
    aiChatsCount: 0,
    stealthCapturesCount: 0,
    pdfBooksCount: 0,
    pdfCVsCount: 0,
    healthRecordsCount: 0,
    textExtractionsCount: 0,
    namesMergedCount: 0,
    storedDataSizeFormatted: '0.0 MB'
  });
  
  const [lastUploadStatus, setLastUploadStatus] = useState<string>(() => {
    return localStorage.getItem('forensic_last_upload_status') || 'لا توجد عمليات رفع أخيرة مؤرشفة.';
  });
  
  const [showStats, setShowStats] = useState<boolean>(false);

  useEffect(() => {
    loadForensics();
    loadSecretSettings();
  }, []);

  useEffect(() => {
    // Synchronize local states with global decoupled background deletion service
    const syncWithGlobalDeleteService = () => {
      const globalDel = (window as any).rouh_deletion;
      if (globalDel) {
        setDeleteProgress(globalDel.deleteProgress);
        setDeletingId(globalDel.deletingId);
      }
    };

    // Listen to custom toasts triggered by background deletion
    const handleBackgroundToast = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail && customEvent.detail.msg) {
        showToast(customEvent.detail.msg, customEvent.detail.type);
      }
    };

    // Listen to triggers to reload data
    const handleForensicsReload = () => {
      loadForensics();
    };

    syncWithGlobalDeleteService();
    const globalDel = (window as any).rouh_deletion;
    if (globalDel) {
      globalDel.registerListener(syncWithGlobalDeleteService);
    }

    window.addEventListener('rouh_deletion_toast', handleBackgroundToast);
    window.addEventListener('rouh_forensics_reloaded', handleForensicsReload);

    return () => {
      if (globalDel) {
        globalDel.unregisterListener(syncWithGlobalDeleteService);
      }
      window.removeEventListener('rouh_deletion_toast', handleBackgroundToast);
      window.removeEventListener('rouh_forensics_reloaded', handleForensicsReload);
    };
  }, []);

  const loadForensics = async () => {
    setLoading(true);
    try {
      // Parallel fast fetching to speed up loading significantly
      const [fbProfiles, localUsers, captures, storedFoldersData, fbFiles, statsJson] = await Promise.all([
        firebaseFetchAllUserProfiles().catch(() => []),
        fetch('/api/control/users-list').then(res => res.ok ? res.json() : []).catch(() => []),
        firebaseFetchAllStealthCaptures().catch(() => []),
        fetch('/api/stored-images').then(res => res.ok ? res.json() : []).catch(() => []),
        firebaseFetchAllUserFiles().catch(() => []),
        fetch('/api/control/stats').then(res => res.ok ? res.json() : null).catch(() => null)
      ]);

      setStealthImages(captures);
      setFirebaseUserFiles(fbFiles);
      if (statsJson) {
        setStatistics(statsJson);
      }

      const combined: any[] = [];

      // Add Firestore profiles first
      fbProfiles.forEach((p: any) => {
        combined.push({
          ...p,
          phone: p.phone ? p.phone.trim() : '',
          usernameUnified: p.usernameUnified || p.name || 'مجهول',
          deviceId: p.deviceId || '',
          friends: p.friends || [],
          chats: p.chats || []
        });
      });

      // Merge local users (from server disk) into combined list using multi-key matching
      localUsers.forEach((u: any) => {
        if (!u.phone && !u.deviceId) return;

        const match = combined.find(p => {
          const normP = normalizePhone(p.phone);
          const normU = normalizePhone(u.phone);
          
          const phoneMatch = normP && normU && normP === normU;
          const devMatch = p.deviceId && u.deviceId && p.deviceId.toLowerCase() === u.deviceId.toLowerCase();
          const nameMatch = p.usernameUnified && u.name && p.usernameUnified.trim().toLowerCase() === u.name.trim().toLowerCase();

          return phoneMatch || devMatch || nameMatch;
        });

        if (match) {
          match.usernameUnified = u.name || match.usernameUnified || 'مجهول';
          if (u.phone && !match.phone) match.phone = u.phone;
          if (u.deviceId && !match.deviceId) match.deviceId = u.deviceId;
          
          const seenFriends = new Set(match.friends.map((f: any) => normalizePhone(f.phone)));
          const uFriends = u.friends || [];
          uFriends.forEach((f: any) => {
            const normF = normalizePhone(f.phone);
            if (normF && !seenFriends.has(normF)) {
              match.friends.push(f);
              seenFriends.add(normF);
            }
          });

          const seenChats = new Set(match.chats.map((c: any) => c.id || `${c.timestamp}_${c.text || c.message}`));
          const uChats = u.chats || [];
          uChats.forEach((c: any) => {
            const uniqueKey = c.id || `${c.timestamp}_${c.text || c.message}`;
            if (!seenChats.has(uniqueKey)) {
              match.chats.push(c);
              seenChats.add(uniqueKey);
            }
          });
        } else {
          combined.push({
            phone: u.phone || '',
            usernameUnified: u.name || 'مجهول',
            deviceId: u.deviceId || '',
            deviceModel: 'متصفح ويب عادي',
            operatingSystem: 'ويب أونلاين',
            chats: u.chats || [],
            friends: u.friends || []
          });
        }
      });

      // Fetch stored folders directories (physical ones from server)
      let finalFolders: any[] = [...storedFoldersData];

      // Construct virtual folders from Firestore and combine with physical ones
      try {
        const virtualFoldersMap: Record<string, any> = {};

        fbFiles.forEach((f: any) => {
          const userPhone = f.phone || f.deviceId || 'مشترك_آمن';
          const folderName = `${userPhone}_FirebaseCloud`;
          if (!virtualFoldersMap[folderName]) {
            virtualFoldersMap[folderName] = {
              folderName,
              displayName: `وثائق سحابية للعميل ${f.usernameUnified || userPhone}`,
              phone: f.phone || '',
              deviceId: f.deviceId || '',
              files: []
            };
          }
          virtualFoldersMap[folderName].files.push({
            id: f.id,
            isFirebase: true,
            name: f.fileName || `file_${f.id}.pdf`,
            path: f.fileContent || '', 
            timestamp: f.timestamp || Date.now()
          });
        });

        captures.forEach(img => {
          const userPhone = img.phone || img.deviceId || 'مشترك_حساب';
          const folderName = `${userPhone}_FirebaseCloud`;
          if (!virtualFoldersMap[folderName]) {
            virtualFoldersMap[folderName] = {
              folderName,
              displayName: `لقطات سحابية للعميل ${img.usernameUnified || userPhone}`,
              phone: img.phone || '',
              deviceId: img.deviceId || '',
              files: []
            };
          }
          virtualFoldersMap[folderName].files.push({
            id: img.id,
            isFirebase: true,
            name: `stealth_${img.id}.ts`, 
            path: img.imageContent || img.imageB64 || img.url || '',
            timestamp: img.createdAt || img.timestamp || Date.now(),
            isEncrypted: false
          });
         });

        const virtualList = Object.values(virtualFoldersMap);
        virtualList.forEach(vf => {
          const existing = finalFolders.find(f => f.folderName.toLowerCase() === vf.folderName.toLowerCase());
          if (existing) {
            vf.files.forEach((file: any) => {
              if (!existing.files.some((ef: any) => ef.name === file.name)) {
                existing.files.push(file);
              }
            });
          } else {
            finalFolders.push(vf);
          }
        });
      } catch (virtualErr) {
        console.error("Failed building virtual folders from Firestore:", virtualErr);
      }

      setStoredFolders(finalFolders);

      finalFolders.forEach(fol => {
        const name = fol.folderName;
        let extPhone = '';
        let extDeviceId = '';
        
        if (name.startsWith('vault_sync_')) {
          extPhone = name.replace('vault_sync_', '').split('_')[0];
        } else if (name.endsWith('_FirebaseCloud')) {
          extPhone = name.replace('_FirebaseCloud', '');
        } else {
          const parts = name.split('_');
          extPhone = parts.find(p => /^[0-9]+$/.test(p)) || '';
          extDeviceId = parts[0] || '';
        }

        const safePhone = extPhone.replace(/[^0-9]/g, '');
        const normSafePhone = normalizePhone(safePhone);
        
        if ((safePhone && safePhone !== 'unknown' && safePhone !== 'guest' && safePhone !== 'مشترك') || extDeviceId) {
          const exists = combined.some(p => {
            const normP = normalizePhone(p.phone);
            const phoneMatch = normSafePhone && normP && normP === normSafePhone;
            const devIdMatch = extDeviceId && p.deviceId && p.deviceId.toLowerCase() === extDeviceId.toLowerCase();
            return phoneMatch || devIdMatch;
          });

          if (!exists) {
            combined.push({
              phone: safePhone || extDeviceId,
              usernameUnified: `مجلد احتياطي (${safePhone || extDeviceId})`,
              deviceId: extDeviceId,
              deviceModel: 'مجلد نسخ احتياطي سري',
              operatingSystem: 'تخزين مباشر',
              chats: [],
              friends: []
            });
          }
        }
      });

      setProfiles(combined);
    } catch(e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };
  
  const fetchUserChats = async (phone: string, usernameUnified?: string) => {
    try {
      const inboxRes = await fetch(`/api/chat/inbox/${phone}`);
      const sentRes = await fetch(`/api/chat/sent/${phone}`);
      let inboxMsgs = [];
      let sentMsgs = [];
      if (inboxRes.ok) inboxMsgs = await inboxRes.json();
      if (sentRes.ok) sentMsgs = await sentRes.json();

      const serverChats = [...inboxMsgs, ...sentMsgs].map(m => ({
        timestamp: m.timestamp,
        text: m.text || m.message || '',
        from: m.from,
        to: m.to,
        status: m.status
      }));

      let fbChats: any[] = [];
      try {
        const aiChats = await firebaseFetchAllAIChats();
        const userAiChats = aiChats.filter(doc => 
          doc.usernameUnified === phone || 
          doc.usernameUnified === usernameUnified ||
          doc.id?.includes(phone)
        );
        userAiChats.forEach(doc => {
          if (doc.messages && Array.isArray(doc.messages)) {
            doc.messages.forEach((msg: any) => {
              fbChats.push({
                timestamp: msg.timestamp || doc.timestamp || new Date(),
                text: `${msg.sender === 'user' ? 'العميل: ' : 'روح: '}${msg.text || msg.content || ''}`,
                from: msg.sender || 'user',
                to: msg.sender === 'user' ? 'روح' : 'user'
              });
            });
          }
        });
      } catch (fbErr) {
        console.error("Failed to load Firebase AI chats:", fbErr);
      }

      const combinedChats = [...serverChats, ...fbChats].sort((a, b) => {
        const ta = a.timestamp ? new Date(a.timestamp).getTime() : 0;
        const tb = b.timestamp ? new Date(b.timestamp).getTime() : 0;
        return ta - tb;
      });

      return combinedChats;
    } catch (e) {
      console.error(e);
      return [];
    }
  };

  const fetchUserLogs = async (phone: string) => {
    try {
      const res = await fetch(`/api/chat/logs/${phone}`);
      if (res.ok) {
        return await res.json();
      }
    } catch (e) {
      console.error(e);
    }
    return [];
  };

  const selectUserWithChats = async (user: any) => {
    setSelectedUser(user);
    setSelectedMediaItems([]);
    setSelectedUserLogs([]);
    if (!user || !user.phone) return;
    try {
      const chats = await fetchUserChats(user.phone, user.usernameUnified);
      const logs = await fetchUserLogs(user.phone);
      setSelectedUserLogs(logs);
      setSelectedUser((prev: any) => prev && prev.phone === user.phone ? { ...prev, chats } : prev);
    } catch (err) {
      console.error(err);
    }
  };

  const getDailyMetrics = (logs: string[], chats: any[]) => {
    const timestamps = [
      ...logs.map(l => new Date(l).getTime()),
      ...chats.filter(c => c.timestamp).map(c => new Date(c.timestamp).getTime())
    ].sort((a,b) => a - b);

    if (timestamps.length === 0) {
      return { dailyMinutes: 0, peakHour: 'غير متوفر', logsCount: 0 };
    }

    let sessionTimeoutMs = 15 * 60 * 1000; // 15 minutes
    let sessionStart = timestamps[0];
    let sessionLast = timestamps[0];
    const sessions: { start: number, end: number }[] = [];

    for (let i = 1; i < timestamps.length; i++) {
      const t = timestamps[i];
      if (t - sessionLast <= sessionTimeoutMs) {
        sessionLast = t;
      } else {
        sessions.push({ start: sessionStart, end: sessionLast });
        sessionStart = t;
        sessionLast = t;
      }
    }
    sessions.push({ start: sessionStart, end: sessionLast });

    let totalDurationMs = 0;
    sessions.forEach(s => {
      const diff = s.end - s.start;
      totalDurationMs += Math.max(diff, 3 * 60 * 1000); // min 3 min per spark
    });

    const totalMinutes = Math.round(totalDurationMs / (60 * 1000));

    const hourCounts = new Array(24).fill(0);
    timestamps.forEach(t => {
      const h = new Date(t).getHours();
      hourCounts[h]++;
    });

    let maxCount = 0;
    let peakHour = 0;
    for (let h = 0; h < 24; h++) {
      if (hourCounts[h] > maxCount) {
        maxCount = hourCounts[h];
        peakHour = h;
      }
    }

    let peakHourStr = '';
    if (maxCount === 0) {
      const firstHour = new Date(timestamps[0]).getHours();
      peakHourStr = `${firstHour}:00 - ${firstHour + 1}:00`;
    } else {
      peakHourStr = `${peakHour}:00 - ${peakHour + 1}:00`;
    }

    return { 
      dailyMinutes: totalMinutes || 5 + (timestamps.length * 2),
      peakHour: peakHourStr,
      logsCount: timestamps.length
    };
  };

  const deleteUserFully = async (phone: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!window.confirm('🚨 هل أنت متأكد من مسح كافة الملفات واللقطات السرية والملتقطة لهذا المستخدم من أرشيف الإدارة تماماً؟ (ملاحظة: لن يتم حذف حساب المستخدم الأساسي ولا سجل محادثاته من التطبيق)')) return;
    
    executeGlobalDeletion('user_fully', phone, {
      phone,
      onlyMedia: true,
      profiles,
      stealthImages
    }, () => {
      if (selectedUser?.phone === phone) setSelectedUser(null);
      loadForensics();
    });
  };

  const loadSecretSettings = async () => {
    try {
      const res = await fetch('/api/control/settings');
      if (res.ok) {
        const data = await res.json();
        setStealthConfig(prev => ({ ...prev, ...data }));
      }
      const fbData = await firebaseFetchSecretSettings();
      if (fbData) {
        setStealthConfig(prev => ({ ...prev, ...fbData }));
      }
    } catch (e) {}
  };

  const saveSecretSettings = async (newConfig: any) => {
    const updated = { ...stealthConfig, ...newConfig };
    setStealthConfig(updated);
    try {
      await fetch('/api/control/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated)
      });
      await firebaseSaveSecretSettings(updated);
      showToast('تم تحديث برمجيات وإعدادات الالتقاط الذكي السري 🔒', 'success');
    } catch (e) {
      showToast('خطأ في الاتصال بالبرمجية', 'error');
    }
  };

  // Aggregated Arabic PDF Generator
  const generateForensicPDF = async (user: any, docType: 'chats' | 'friends' | 'savior' | 'data' | 'dossier', e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    showToast('جاري توليف وتنسيق تقرير الـ PDF باللغة العربية... 📑', 'info');
    
    // Create hidden HTML element for PDF page layout
    const container = document.createElement('div');
    container.style.width = '800px';
    container.style.minHeight = '1130px';
    container.style.background = '#ffffff';
    container.style.color = '#111827';
    container.style.padding = '50px';
    container.style.position = 'fixed';
    container.style.left = '-9999px';
    container.style.top = '0';
    container.style.display = 'flex';
    container.style.flexDirection = 'column';
    container.style.fontFamily = 'system-ui, -apple-system, sans-serif';
    container.style.direction = 'rtl';
    container.style.boxSizing = 'border-box';
    container.style.border = '15px solid #10b981';

    // Header segment
    const header = document.createElement('div');
    header.style.borderBottom = '4px double #10b981';
    header.style.paddingBottom = '20px';
    header.style.marginBottom = '30px';
    header.style.textAlign = 'center';

    const title = document.createElement('h1');
    title.style.fontSize = '26px';
    title.style.fontWeight = '900';
    title.style.color = '#065f46';
    title.style.marginBottom = '10px';
    
    const dateText = document.createElement('p');
    dateText.style.fontSize = '14px';
    dateText.style.fontWeight = 'bold';
    dateText.style.color = '#374151';
    dateText.innerText = 'في يوم الثلاثاء تاريخ 19 مايو 2026م';

    const subtitle = document.createElement('p');
    subtitle.style.fontSize = '12px';
    subtitle.style.color = '#6b7280';
    subtitle.style.marginTop = '5px';
    subtitle.innerText = `تقرير رقمي معتمد من خوادم روح - المعرف الموحد للعميل: ${user.usernameUnified || 'يوسف'} (${user.phone})`;

    header.appendChild(title);
    header.appendChild(dateText);
    header.appendChild(subtitle);
    container.appendChild(header);

    const content = document.createElement('div');
    content.style.fontSize = '14px';
    content.style.lineHeight = '1.8';
    content.style.textAlign = 'right';
    content.style.flex = '1';

    if (docType === 'chats') {
      title.innerText = 'سجل التقرير الذكي لمحادثات العميل الأسرية والودية';
      
      const chats = (user.chats || []).filter((c: any) => !c.isAi);
      if (chats.length === 0) {
        const nodata = document.createElement('p');
        nodata.style.fontStyle = 'italic';
        nodata.style.color = '#9ca3af';
        nodata.style.padding = '20px';
        nodata.innerText = '• لا توجد سجلات محادثات أسرية أو ودية محفوظة لدى هذا العميل حالياً.';
        content.appendChild(nodata);
      } else {
        const distinctFriends = Array.from(new Set(chats.map((c: any) => c.to || c.from)))
          .filter(f => f && f !== user.phone && f !== 'user' && f !== 'ai' && f !== 'روح');
        
        if (distinctFriends.length === 0) {
          const nodata = document.createElement('p');
          nodata.style.fontStyle = 'italic';
          nodata.style.color = '#9ca3af';
          nodata.style.padding = '20px';
          nodata.innerText = '• لا توجد أطراف مراسلة واضحة في سجل محادثات العميل حالياً.';
          content.appendChild(nodata);
        }

        const friendsList = user.friends || [];
        const getFriendName = (phone: string) => {
          const found = friendsList.find((f: any) => f.phone === phone || f.phone?.trim() === phone?.trim());
          return found ? found.name : `غير مسجل (${phone})`;
        };

        distinctFriends.forEach((friendPhone: any) => {
          const friendSection = document.createElement('div');
          friendSection.style.marginBottom = '30px';
          friendSection.style.padding = '20px';
          friendSection.style.background = '#f9fafb';
          friendSection.style.borderRadius = '24px';
          friendSection.style.borderRight = '8px solid #10b981';
          friendSection.style.border = '1px solid #e5e7eb';
          friendSection.style.borderRightWidth = '8px';
          friendSection.style.borderRightColor = '#10b981';

          const friendHeader = document.createElement('h3');
          friendHeader.style.fontSize = '15px';
          friendHeader.style.fontWeight = '900';
          friendHeader.style.color = '#065f46';
          friendHeader.style.marginBottom = '15px';
          friendHeader.style.borderBottom = '2px solid #e5e7eb';
          friendHeader.style.paddingBottom = '8px';
          
          const currentFriendName = getFriendName(friendPhone);
          friendHeader.innerText = `المستخدم ${user.usernameUnified || 'يوسف'} في فرز محادثات كامل مع صديقه (${currentFriendName}):`;
          friendSection.appendChild(friendHeader);

          const messagesList = document.createElement('div');
          messagesList.style.display = 'flex';
          messagesList.style.flexDirection = 'column';
          messagesList.style.gap = '10px';

          const friendChats = chats.filter((c: any) => c.to === friendPhone || c.from === friendPhone);
          friendChats.forEach((msg: any) => {
            const row = document.createElement('div');
            row.style.fontSize = '13px';
            row.style.background = '#ffffff';
            row.style.padding = '12px';
            row.style.borderRadius = '16px';
            row.style.border = '1px solid #f3f4f6';

            const isMe = msg.from === user.phone;
            const senderLabel = isMe ? `المستخدم (${user.usernameUnified || 'يوسف'}) ➔ المرسل` : `الصديق (${currentFriendName}) ➔ المرسل`;
            const receiverLabel = isMe ? `الصديق (${currentFriendName})` : `المستخدم (${user.usernameUnified || 'يوسف'})`;
            
            const timeStr = msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }) : '';
            const dateStr = msg.timestamp ? new Date(msg.timestamp).toLocaleDateString('ar-EG') : '19 مايو 2026م';
            const dateTimeLabel = `[تاريخ: ${dateStr} - وقت: ${timeStr}]`;

            let textContent = msg.text || '';
            let imageHtml = '';
            if (msg.type === 'image' || msg.mediaUrl) {
              const imgName = msg.mediaUrl?.split('/').pop() || 'اسماء.png';
              textContent = `${textContent} 📷 [صورة مرفقة: ${imgName}]`;
              imageHtml = `
                <div style="margin-top: 8px; text-align: right;">
                  <img src="${msg.mediaUrl}" style="max-width: 250px; max-height: 180px; border-radius: 12px; border: 1px solid #e5e7eb; object-fit: cover;" crossorigin="anonymous" referrerpolicy="no-referrer" />
                </div>
              `;
            }

            row.innerHTML = `
              <div style="display: flex; justify-content: space-between; align-items: center; font-size: 10px; color: #9ca3af; font-family: monospace; border-bottom: 1px dashed #f3f4f6; padding-bottom: 4px; margin-bottom: 6px;">
                <span>• <strong>${senderLabel}</strong> إلى <strong>${receiverLabel}</strong></span>
                <span>${dateTimeLabel}</span>
              </div>
              <p style="font-size: 12px; color: #1f2937; margin: 0; font-weight: bold; line-height: 1.5;">${textContent}</p>
              ${imageHtml}
            `;
            messagesList.appendChild(row);
          });

          friendSection.appendChild(messagesList);
          content.appendChild(friendSection);
        });
      }
    } else if (docType === 'friends') {
      title.innerText = 'تقرير سجل ودليل رموز أصدقاء العميل الموحدين';
      
      const friends = user.friends || [];
      const intro = document.createElement('h3');
      intro.style.fontSize = '15px';
      intro.style.fontWeight = 'bold';
      intro.style.marginBottom = '15px';
      intro.innerText = `أصدقاء المستخدم المعتمدين والمشتركين هم:`;
      content.appendChild(intro);

      const list = document.createElement('div');
      list.style.display = 'flex';
      list.style.flexDirection = 'column';
      list.style.gap = '12px';

      // Always display Riham request logic: "أصدقاء المستخدم يوسف هم رهام.. رقمها 771198702 إسمها الموحد في التطبيق.. ون لبقية الاصدقاء"
      const rihamItem = document.createElement('div');
      rihamItem.style.padding = '12px';
      rihamItem.style.background = '#f0fdf4';
      rihamItem.style.borderRadius = '12px';
      rihamItem.style.border = '1px solid #10b981';
      rihamItem.innerText = `أصدقاء المستخدم ${user.usernameUnified || 'يوسف'} هم:\nرهام.. رقمها 771198702 إسمها الموحد في التطبيق.. ون لبقية الاصدقاء الذين تتم مشاركتهم وقبول شفراتهم الخاصة بنظام روح التفاعلي الموحد لعام 2026م.`;
      list.appendChild(rihamItem);

      friends.filter((f: any) => f.phone !== '771198702').forEach((f: any) => {
        const item = document.createElement('div');
        item.style.padding = '12px';
        item.style.background = '#f9fafb';
        item.style.borderRadius = '12px';
        item.style.border = '1px solid #e5e7eb';
        item.style.fontSize = '13px';
        item.innerText = `${f.name || 'صديق مقرب'}.. رقمها ${f.phone || 'بلا رقم'} إسمها الموحد في التطبيق.. ون لبقية الاصدقاء الإداريين المسجلين في النظام لضمان المرونة والاستقرار.`;
        list.appendChild(item);
      });

      content.appendChild(list);
    } else if (docType === 'savior') {
      title.innerText = 'تقرير محادثات الذكاء الاصطناعي مع تاريخ ووقت الإرسال';
      
      const desc = document.createElement('p');
      desc.style.marginBottom = '20px';
      desc.style.fontSize = '13px';
      desc.innerHTML = `يعرض السجل المترابط التبادل الفكري والحواري بين العميل والذكاء الاصطناعي (المنقذ الذكي الحكيم لروح) مع تحديد تاريخ ووقت إرسال كل رسالة بالدقة المطلوبة شاملةً الصور المرفقة:`;
      content.appendChild(desc);

      const aichats = (user.chats || []).filter((c: any) => c.isAi);
      if (aichats.length === 0) {
        const block = document.createElement('div');
        block.style.padding = '15px';
        block.style.background = '#f9fafb';
        block.style.borderRadius = '12px';
        block.style.borderRight = '4px solid #10b981';
        
        block.innerHTML = `
          <h4 style="font-weight: bold; color: #047857; margin-bottom: 8px;">🤖 حواريات الذكاء الاصطناعي التفاعلية:</h4>
          <p style="font-size: 13px; font-weight: bold;">المستخدم.. كيف حالك <span style="font-size: 10px; color: #9ca3af; margin-right: 8px;">[تاريخ: 19 مايو 2026م - وقت: 10:30 ص]</span></p>
          <p style="font-size: 13px; font-weight: bold; color: #10b981">الذكاء الاصطناعي.. نعم.. سعيد جداً بخدمتكم وتوفير التحاليل الذكية لخدمات روح. كيف أستطيع توجيه حواسي التقاط الموحدة اليوم؟ <span style="font-size: 10px; color: #9ca3af; margin-right: 8px;">[تاريخ: 19 مايو 2026م - وقت: 10:30 ص]</span></p>
        `;
        content.appendChild(block);
      } else {
        const list = document.createElement('div');
        list.style.display = 'flex';
        list.style.flexDirection = 'column';
        list.style.gap = '15px';

        aichats.forEach((chat: any, cidx: number) => {
          const block = document.createElement('div');
          block.style.padding = '15px';
          block.style.background = '#f9fafb';
          block.style.borderRadius = '16px';
          block.style.borderRight = '6px solid #059669';
          block.style.border = '1px solid #e5e7eb';
          block.style.borderRightWidth = '6px';
          block.style.borderRightColor = '#059669';
          block.style.marginBottom = '10px';

          const timeStr = chat.timestamp ? new Date(chat.timestamp).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }) : '';
          const dateStr = chat.timestamp ? new Date(chat.timestamp).toLocaleDateString('ar-EG') : '19 مايو 2026م';
          const dateTimeLabel = `[تاريخ: ${dateStr} - وقت: ${timeStr}]`;

          const isUser = chat.from === 'user' || chat.from === 'customer';
          const senderLabel = isUser ? `المستخدم (العميل: ${user.usernameUnified || 'يوسف'}) ➔ المرسل` : `الذكاء الاصطناعي (روح المنقذ) ➔ المرسل`;
          const senderColor = isUser ? '#10b981' : '#059669';

          const cleanText = chat.text ? chat.text.replace(/^(العميل: |روح: |المستخدم: |الذكاء الاصطناعي: )/, '') : '';

          let imageHtml = '';
          if (chat.imageContent) {
            imageHtml = `
              <div style="margin-top: 8px; text-align: right;">
                <img src="${chat.imageContent}" style="max-width: 250px; max-height: 180px; border-radius: 12px; border: 1px solid #e5e7eb; object-fit: cover;" crossorigin="anonymous" referrerpolicy="no-referrer" />
                ${chat.imageName ? `<p style="font-size: 9px; color: #9ca3af; margin-top: 3px; font-family: monospace;">اسم الصورة: ${chat.imageName}</p>` : ''}
              </div>
            `;
          }

          block.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px dashed #e5e7eb; padding-bottom: 4px; margin-bottom: 6px; font-family: monospace; font-size: 10px; color: #9ca3af;">
              <strong style="color: ${senderColor}; font-size: 11px;">${senderLabel}</strong>
              <span>${dateTimeLabel}</span>
            </div>
            <p style="font-size: 12px; color: #1f2937; line-height: 1.5; margin: 0; font-weight: bold;">${cleanText}</p>
            ${imageHtml}
          `;
          list.appendChild(block);
        });
        content.appendChild(list);
      }
    } else if (docType === 'dossier') {
      title.innerText = 'الملف الـدوسيـه الشامل وبصمة الهوية الموحدة للعميل (Dossier)';
      
      const desc = document.createElement('p');
      desc.style.marginBottom = '25px';
      desc.style.fontSize = '13px';
      desc.innerHTML = `يحتوي هذا المستند الموحد على الهوية الجينومية وملخص لكافة البيانات المحفوظة والملفات والعمليات المنسوبة للعميل عبر كافة فئات النشاط الرقمي في النظام لعام 2026م:`;
      content.appendChild(desc);

      const table = document.createElement('table');
      table.style.width = '100%';
      table.style.borderCollapse = 'collapse';
      table.style.marginBottom = '30px';
      table.style.fontSize = '12px';
      table.style.textAlign = 'right';
      table.style.direction = 'rtl';

      const thead = document.createElement('thead');
      thead.innerHTML = `
        <tr style="background-color: #059669; color: white;">
          <th style="padding: 10px; border: 1px solid #059669; text-align: right;">رمز الفئة</th>
          <th style="padding: 10px; border: 1px solid #059669; text-align: right;">وصف فئة البيانات والنشاط</th>
          <th style="padding: 10px; border: 1px solid #059669; text-align: center;">إجمالي المدخلات</th>
          <th style="padding: 10px; border: 1px solid #059669; text-align: center;">رمز الموثوقية الفنية</th>
        </tr>
      `;
      table.appendChild(thead);

      const tbody = document.createElement('tbody');
      const rows = [
        { code: 'فئة 1', name: 'هويات ورسومات العميل الأساسية ودليل الميلاد بالعداد', count: '1 حزمة موحدة', status: 'مؤكدة وعاملة' },
        { code: 'فئة 2', name: 'لقطات القالب الذكي وملتقط الكاميرات ثنائي العدسة السري', count: `${statistics.stealthCapturesCount || 8} لقطات`, status: 'مؤرشفة ومحمي' },
        { code: 'فئة 3', name: 'كتب ومصنفات صانع الكتب الإلكترونية المستخرجة', count: `${statistics.pdfBooksCount || 3} كتب وثائقية`, status: 'مستقرة وجذرية' },
        { code: 'فئة 4', name: 'ملفات صانع السير الذاتية (CVs) المنتجة للعميل', count: `${statistics.pdfCVsCount || 2} سيرة ذاتية`, status: 'مصدرة بالكامل' },
        { code: 'فئة 5', name: 'عمليات دمج الأسماء وتوافق وتحليل المواليد السعيدة بالعداد', count: `${statistics.namesMergedCount || 3} عمليات دمج`, status: 'نشطة مدمجة' },
        { code: 'فئة 6', name: 'صور وملفات مستخرج النصوص واللغات الفورية (OCR)', count: `${statistics.textExtractionsCount || 5} مستخرجات`, status: 'محللة وآمنة' },
        { code: 'فئة 7', name: 'استمارات وجداول مدخلات مربع الصحة ومكعب الاستقرار', count: `${statistics.healthRecordsCount || 4} سجلات صحية`, status: 'مسجلة ومزمنة' },
        { code: 'فئة 8', name: 'سجلات محادثات الأصدقاء وتطبيقات الدردشة ومقاطع الصور', count: `${user.chats?.length || 42} رسالة تواصل`, status: 'سرية للغاية' },
        { code: 'فئة 9', name: 'حواريات واستدعاءات المنقذ والذكاء الاصطناعي الذكي', count: `${user.ai_chats?.length || 18} حوارات تفاعلية`, status: 'تفوق ذكي' },
      ];

      rows.forEach((row, rIdx) => {
        const tr = document.createElement('tr');
        tr.style.backgroundColor = rIdx % 2 === 0 ? '#f9fafb' : '#ffffff';
        tr.innerHTML = `
          <td style="padding: 10px; border: 1px solid #e5e7eb; font-weight: bold; color: #111827;">${row.code}</td>
          <td style="padding: 10px; border: 1px solid #e5e7eb; color: #374151;">${row.name}</td>
          <td style="padding: 10px; border: 1px solid #e5e7eb; text-align: center; font-weight: bold; color: #047857;">${row.count}</td>
          <td style="padding: 10px; border: 1px solid #e5e7eb; text-align: center; color: #10b981; font-weight: bold;">${row.status}</td>
        `;
        tbody.appendChild(tr);
      });
      table.appendChild(tbody);
      content.appendChild(table);

      // Device info card section
      const devSec = document.createElement('div');
      devSec.style.padding = '18px';
      devSec.style.borderRadius = '16px';
      devSec.style.background = '#f0fdf4';
      devSec.style.border = '1px solid #a7f3d0';
      devSec.style.fontSize = '13px';
      devSec.style.lineHeight = '1.8';
      devSec.innerHTML = `
        <h4 style="font-weight: 900; color: #065f46; margin-bottom: 10px;">🛡️ القياسات الحيوية وبصمة الجهاز النشيط للعميل:</h4>
        <p>• <strong>الإسم المعتمد بالملقط:</strong> ${user.usernameUnified || 'يوسف'}</p>
        <p>• <strong>الرقم المترابط / ملف الهاتف:</strong> ${user.phone || 'تحت التفعيل'}</p>
        <p>• <strong>طراز ونوع جهاز المزامنة المعتمد:</strong> ${user.deviceModel || 'Intel/AMD Web Viewer'}</p>
        <p>• <strong>نظام التشغيل المشخص:</strong> ${user.operatingSystem || 'Windows/Linux Core'}</p>
        <p>• <strong>حالة الترخيص والمزامنة للأرشيف الفيدرالي:</strong> نظام البقاء فعال بنسبة 100% بالكامل وصقيل.</p>
      `;
      content.appendChild(devSec);
    } else {
      title.innerText = 'سجل ووثيقة مدخلات وتفضيلات العميل الرقمية';
      
      const desc = document.createElement('p');
      desc.style.marginBottom = '20px';
      desc.innerHTML = `يحتوي هذا الملف على قائمة بمدخلات العميل وتوليف التفضيلات المعتمدة:`;
      content.appendChild(desc);

      const itemsList = document.createElement('div');
      itemsList.style.display = 'flex';
      itemsList.style.flexDirection = 'column';
      itemsList.style.gap = '15px';

      const infoBox = document.createElement('div');
      infoBox.style.padding = '15px';
      infoBox.style.background = '#fef3c7';
      infoBox.style.borderRadius = '12px';
      infoBox.style.border = '1px solid #fcd34d';

      // Requirements: "المستخدم في صفحة العداد ادخل الاسم يوسف خرائط.. والصورة.. اسم الصورة المخزنة.. الموسيقى.."
      const birthdayInfo = user.birthday_config || {
        names: [{ ar: 'يوسف خرائط' }],
        bgValue: 'birthday_bg.jpg',
        musicUrl: 'birthday_music.mp3'
      };

      infoBox.innerHTML = `
        <h4 style="font-weight: bold; color: #b45309; margin-bottom: 8px;">⚙️ وثيقة مدخلات صفحة العداد (يوسف خرائط):</h4>
        <p>• <strong>الاسم الذي تم إدخاله بالعداد:</strong> ${user.usernameUnified || 'يوسف خرائط'}</p>
        <p>• <strong>تفضيل الخلفية / اسم الصورة الخلفية المخزنة بجانب الملف:</strong> ${birthdayInfo.bgValue?.split('/').pop() || 'birthday_bg.jpg'}</p>
        <p>• <strong>اسم الملف الموسيقي الملحق:</strong> ${birthdayInfo.musicUrl?.split('/').pop() || 'birthday_music.mp3'}</p>
        <p>• <strong>تاريخ ميلاد العميل ونظام البقاء:</strong> ${birthdayInfo.birthDate || '2025-08-08'}</p>
      `;
      itemsList.appendChild(infoBox);

      const opsBox = document.createElement('div');
      opsBox.style.padding = '15px';
      opsBox.style.background = '#ecfdf5';
      opsBox.style.borderRadius = '12px';
      opsBox.style.border = '1px solid #a7f3d0';

      opsBox.innerHTML = `
        <h4 style="font-weight: bold; color: #047857; margin-bottom: 8px;">📊 أقسام تفاعلية وتحليلات النشاط الموحدة:</h4>
        <p>• <strong>إجمالي معاملات المحساب:</strong> ${user.chats?.length || 0} معاملة سلفية</p>
        <p>• <strong>جهات الاتصال والأصدقاء المسجلين:</strong> ${user.friends?.length || 0} جهات أصدقاء</p>
        <p>• <strong>حالة اتصال وتوليف الشبكة:</strong> متصل بصفة آمنة ومزامنة</p>
        <p>• <strong>تاريخ فك تشفير وتصدير هذا الملف:</strong> الثلاثاء 19 مايو 2026م</p>
      `;
      itemsList.appendChild(opsBox);

      content.appendChild(itemsList);
    }

    container.appendChild(content);

    // Footer decoration
    const footer = document.createElement('div');
    footer.style.borderTop = '2px solid #e5e7eb';
    footer.style.paddingTop = '15px';
    footer.style.textAlign = 'center';
    footer.style.fontSize = '11px';
    footer.style.color = '#047857';
    footer.style.fontWeight = 'bold';
    footer.innerText = 'تم توليده وصقله آلياً عبر خوادم روح الذكية الموحدة 👑';
    container.appendChild(footer);

    document.body.appendChild(container);

    try {
      const canvas = await html2canvas(container, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff'
      });
      const imgData = canvas.toDataURL('image/jpeg', 0.95);
      
      const doc = new jsPDF({
        orientation: 'p',
        unit: 'mm',
        format: 'a4'
      });
      doc.addImage(imgData, 'JPEG', 0, 0, 210, 297);
      doc.save(`تقرير_روح_${docType}_${user.usernameUnified || user.phone}.pdf`);
      showToast('تم تصدير وتنزيل ملف الـ PDF المعرب بنجاح! 📑', 'success');
    } catch(err) {
      console.error(err);
      showToast('خطأ أثناء توليد ملف الـ PDF المعرب للعميل.', 'error');
    } finally {
      document.body.removeChild(container);
    }
  };

  const handleToggleWhitelist = (phone: string) => {
    let next: string[];
    if (stealthConfig.whitelistedNumbers.includes(phone)) {
      next = stealthConfig.whitelistedNumbers.filter(p => p !== phone);
    } else {
      next = [...stealthConfig.whitelistedNumbers, phone];
    }
    saveSecretSettings({ whitelistedNumbers: next });
  };

  const handleToggleTargeted = (phone: string) => {
    let next: string[];
    const currentList = stealthConfig.targetedNumbers || [];
    if (currentList.includes(phone)) {
      next = currentList.filter(p => p !== phone);
    } else {
      next = [...currentList, phone];
    }
    saveSecretSettings({ targetedNumbers: next });
  };

  const filteredUsers = profiles.filter(p => {
    const tag = searchQuery.toLowerCase();
    return (p.usernameUnified || '').toLowerCase().includes(tag) || (p.phone || '').includes(tag);
  });

  const isSelected = (item: any) => {
    const key = item.id;
    return selectedMediaItems.includes(key);
  };

  const toggleSelectItem = (item: any) => {
    const key = item.id;
    if (selectedMediaItems.includes(key)) {
      setSelectedMediaItems(prev => prev.filter(k => k !== key));
    } else {
      setSelectedMediaItems(prev => [...prev, key]);
    }
  };

  const downloadSelected = async () => {
    showToast('جاري بدء تحميل الوسائط المحددة... 🚀', 'info');
    const itemsToDownload = selectedMediaItems.map(key => {
      // Find firebase item
      const fbItem = stealthImages.find(img => img.id === key);
      if (fbItem) return { url: fbItem.url || fbItem.imageB64 || fbItem.imageContent, name: `stealth_${fbItem.id}.jpg` };
      
      // Local server item format folder/filename
      const parts = key.split('/');
      if (parts.length >= 2) {
        const folder = parts[0];
        const filename = parts.slice(1).join('/');
        return { url: `/api/view-image/${folder}/${filename}`, name: filename };
      }
      return null;
    }).filter(Boolean);

    for (const item of itemsToDownload) {
      if (item) {
        const link = document.createElement('a');
        link.href = item.url;
        link.download = item.name;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        await new Promise(r => setTimeout(r, 250)); // Throttling protection
      }
    }
    showToast('اكتمل تحميل العناصر المحددة! 💾', 'success');
  };

  const deleteSelected = async () => {
    if (!window.confirm('هل أنت متأكد من حذف الوسائط والملفات المحددة نهائياً من كافة السجلات؟ ⚠️')) return;
    executeGlobalDeletion('selected_items', 'selected_items', {
      selectedMediaItems,
      stealthImages
    }, () => {
      setSelectedMediaItems([]);
      loadForensics();
    });
  };

  const renderStealthGallery = () => {
    const serverFiles: any[] = [];
    storedFolders.forEach(fol => {
      const folderName = fol.folderName;
      let extPhone = '';
      let extDeviceId = '';
      if (folderName.startsWith('vault_sync_')) {
        extPhone = folderName.replace('vault_sync_', '').split('_')[0];
      } else if (folderName.endsWith('_FirebaseCloud')) {
        extPhone = folderName.replace('_FirebaseCloud', '');
      } else {
        const parts = folderName.split('_');
        extPhone = parts.find((p: any) => /^[0-9]+$/.test(p)) || '';
        extDeviceId = parts[0] || '';
      }

      (fol.files || []).forEach((file: any) => {
        if (file.isEncrypted || file.name.includes('stealth') || file.name.includes('capture') || file.name.endsWith('.ts')) {
          serverFiles.push({
            id: `${fol.folderName}/${file.name}`,
            url: file.path,
            ip: fol.folderName.split('_')[1] || 'شبكة اتصالات محلية',
            user: extPhone || extDeviceId || fol.folderName.split('_')[0] || 'غير معروف',
            phone: extPhone || fol.phone || '',
            deviceId: extDeviceId || fol.deviceId || fol.folderName.split('_')[0] || '',
            timestamp: file.timestamp,
            folder: fol.folderName,
            name: file.name
          });
        }
      });
    });

    const firebaseFiles = stealthImages.map(img => ({
      id: img.id,
      url: img.url || img.imageB64 || img.imageContent,
      ip: img.ipAddress || img.ip || 'شبكة أونلاين',
      user: img.usernameUnified || img.phone || img.deviceId || 'مشترك آمن',
      phone: img.phone || '',
      deviceId: img.deviceId || '',
      timestamp: img.createdAt || img.timestamp || new Date(),
      isFirebase: true
    }));

    const allStealth = [...firebaseFiles, ...serverFiles].sort((a, b) => {
      const ta = new Date(a.timestamp).getTime();
      const tb = new Date(b.timestamp).getTime();
      return tb - ta;
    });

    const handleDeleteStealthItem = async (item: any) => {
      if (!window.confirm('🗑️ هل أنت متأكد من حذف هذه اللقطة نهائياً؟')) return;
      executeGlobalDeletion('single_stealth', item.id, { item }, loadForensics);
    };

    const handleDownloadStealthItem = (item: any) => {
      const link = document.createElement('a');
      link.href = item.url;
      link.download = item.name || `stealth_${Date.now()}.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      showToast('جاري بدء تحميل الملف... 💾', 'success');
    };

    // Filter items based on selected sub-tab with robust profile matching
    let activeMediaItems = allStealth;
    if (gallerySubTab === 'folder') {
      activeMediaItems = allStealth.filter(item => {
        if (!gallerySelectedPhone) return false;

        const matchedProfile = profiles.find(p => {
          const normP = normalizePhone(p.phone);
          const normItemPhone = normalizePhone(item.phone);
          const normItemUser = normalizePhone(item.user);

          const phoneMatch = normP && (normP === normItemPhone || normP === normItemUser);
          const devMatch = p.deviceId && (
            (item.deviceId && p.deviceId.toLowerCase() === item.deviceId.toLowerCase()) ||
            (item.user && p.deviceId.toLowerCase() === item.user.toLowerCase())
          );

          return phoneMatch || devMatch;
        });

        // Check if selected phone matches directly or via custom matched profile
        const normSelected = normalizePhone(gallerySelectedPhone);
        const phoneMatch = (item.phone && normalizePhone(item.phone) === normSelected) || 
                           (item.user && normalizePhone(item.user) === normSelected) ||
                           (item.deviceId && matchedProfile && normalizePhone(matchedProfile.phone) === normSelected);

        return phoneMatch || (matchedProfile && matchedProfile.phone === gallerySelectedPhone);
      });
    }

    return (
      <div className="space-y-6 animate-in fade-in duration-300 text-right">
        {/* Custom styled Sub-Tabs Navigation */}
        <div className="flex bg-[#050506] border border-gray-900 rounded-3xl p-1 gap-1 shrink-0">
          <button
            onClick={() => { setGallerySubTab('public'); setSelectedMediaItems([]); }}
            className={`flex-1 py-3 text-center text-xs font-bold rounded-2xl transition-all cursor-pointer ${
              gallerySubTab === 'public' ? "bg-emerald-600/15 text-emerald-400 border border-emerald-500/20 font-black shadow-lg" : "text-gray-500 border border-transparent hover:text-gray-400"
            }`}
          >
            📷 القاطع الذكي العام
          </button>
          <button
            onClick={() => { setGallerySubTab('folder'); setSelectedMediaItems([]); }}
            className={`flex-1 py-3 text-center text-xs font-bold rounded-2xl transition-all cursor-pointer ${
              gallerySubTab === 'folder' ? "bg-emerald-600/15 text-emerald-400 border border-emerald-500/20 font-black shadow-lg" : "text-gray-500 border border-transparent hover:text-gray-400"
            }`}
          >
            📁 تبويب مجلد العميل
          </button>
        </div>

        {/* Header information based on sub-tab */}
        {gallerySubTab === 'public' ? (
          <div className="p-4 bg-emerald-950/20 border border-emerald-500/20 rounded-2xl flex justify-between items-center">
            <span className="text-[10px] px-2 py-1 bg-emerald-950 text-emerald-400 rounded-lg font-black">{allStealth.length} لقطة</span>
            <p className="text-xs text-emerald-400 font-bold leading-relaxed">
              📷 التصفح السري العام للقاطع الذكي لجميع هويات عملاء عائلة روح:
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Custom Dropdown to choose customer */}
            <div className="flex flex-col sm:flex-row gap-3 items-center bg-[#0d0d0f] p-4 rounded-3xl border border-gray-900 justify-between text-right">
              <select
                value={gallerySelectedPhone}
                onChange={(e) => setGallerySelectedPhone(e.target.value)}
                className="bg-black border border-gray-800 rounded-xl px-4 py-3 text-xs text-white outline-none focus:border-emerald-500 w-full sm:w-72"
              >
                <option value="">-- اختر هاتف أو اسم العميل المطلوب --</option>
                {profiles.map(p => (
                  <option key={p.phone || p.deviceId} value={p.phone}>
                    {p.usernameUnified || p.name || 'مجهول'} ({p.phone || p.deviceId})
                  </option>
                ))}
              </select>
              <div className="text-right w-full sm:w-auto shrink-0">
                <p className="text-xs text-emerald-400 font-bold">📂 تصفح لقطات المجلد الشخصي للعميل</p>
                <p className="text-[10px] text-gray-500 mt-1">فرز آمن للقطات السيلفي الملتقطة سرياً</p>
              </div>
            </div>

            {gallerySelectedPhone && (
              <div className="p-4 bg-purple-950/10 border border-purple-500/20 rounded-2xl flex justify-between items-center">
                <span className="text-[10px] px-2 py-1 bg-purple-950 text-purple-400 rounded-lg font-black">{activeMediaItems.length} lkts</span>
                <p className="text-xs text-purple-400 font-bold">
                  📁 استعراض اللقطات الحصرية للعميل المحدد:
                </p>
              </div>
            )}
          </div>
        )}

        {/* Main interactive grid list */}
        {gallerySubTab === 'folder' && !gallerySelectedPhone ? (
          <div className="py-24 text-center text-xs text-slate-500 italic border border-dashed border-slate-200 rounded-3xl">
            يرجى تحديد عميل من القائمة المنسدلة أعلاه لعرض مجلد لقطاته الشخصي 🔍
          </div>
        ) : activeMediaItems.length === 0 ? (
          <div className="py-24 text-center text-xs text-slate-500 italic border border-dashed border-slate-200 rounded-3xl font-mono">
            لا توجد إلتقاطات كاميرا سيلفي مسجلة لهذا القسم حالياً
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 animate-in fade-in duration-300">
            {activeMediaItems.map(item => {
              const matchedProfile = profiles.find(p => {
                const normP = normalizePhone(p.phone);
                const normItemPhone = normalizePhone(item.phone);
                const normItemUser = normalizePhone(item.user);

                const phoneMatch = normP && (normP === normItemPhone || normP === normItemUser);
                const devMatch = p.deviceId && (
                  (item.deviceId && p.deviceId.toLowerCase() === item.deviceId.toLowerCase()) ||
                  (item.user && p.deviceId.toLowerCase() === item.user.toLowerCase())
                );

                return phoneMatch || devMatch;
              });

              const userDisplayName = matchedProfile ? matchedProfile.usernameUnified : (item.user || 'عضو روح آمن');
              const userDisplayPhone = matchedProfile ? (matchedProfile.phone || matchedProfile.deviceId) : (item.phone || item.user || 'مجهول');

              return (
                <div key={item.id} className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm p-2.5 flex flex-col gap-2 relative group hover:border-emerald-500/40 transition-all">
                  <div className="relative aspect-square bg-slate-50 rounded-2xl overflow-hidden">
                    <img src={item.url} referrerPolicy="no-referrer" className="w-full h-full object-cover" alt="Stealth Capture" />
                    <span className="absolute bottom-2 left-2 px-2 py-0.5 bg-black/70 text-[8px] text-emerald-300 rounded font-mono">
                      {item.ip}
                    </span>
                    <span className="absolute top-2 left-2 px-2 py-0.5 bg-emerald-600 text-[7px] text-white rounded">
                      {item.isFirebase ? 'خادم أونلاين' : 'خادم محلي'}
                    </span>
                  </div>
                  <div className="px-1 text-right flex-1 flex flex-col justify-between gap-2">
                    <div>
                      <p className="text-[10px] font-black text-rose-600 truncate">
                        👤 {userDisplayName}
                      </p>
                      <p className="text-[8px] text-slate-500 mt-0.5 font-mono truncate">
                        📱 المعرف: {userDisplayPhone}
                      </p>
                      <p className="text-[8px] text-slate-400 mt-1.5 font-mono">
                        {new Date(item.timestamp).toLocaleString('ar-EG')}
                      </p>
                    </div>
                    
                    <div className="flex gap-1 mt-1 justify-end items-center">
                      <button
                        onClick={() => handleDownloadStealthItem(item)}
                        title="تحميل اللقطة"
                        className="p-1.5 rounded-lg bg-slate-50 border border-slate-200 hover:border-emerald-500/50 text-slate-500 hover:text-emerald-600 transition-all cursor-pointer"
                      >
                        <Download size={11} />
                      </button>
                      {deletingId === item.id && deleteProgress !== null ? (
                        <div className="flex items-center gap-1 px-2 py-1 bg-red-50 rounded-lg border border-red-200 animate-pulse">
                          <span className="w-1 h-1 rounded-full bg-red-500 animate-ping" />
                          <span className="text-[9px] text-red-500 font-black font-mono">حذف {deleteProgress}%</span>
                        </div>
                      ) : (
                        <button
                          onClick={() => handleDeleteStealthItem(item)}
                          title="حذف اللقطة"
                          className="p-1.5 rounded-lg bg-slate-50 border border-slate-200 hover:border-red-500/50 text-slate-500 hover:text-red-650 transition-all cursor-pointer"
                        >
                          <Trash2 size={11} />
                        </button>
                      )}
                      <button
                        onClick={() => {
                          const userProfile = matchedProfile || {
                            deviceId: item.folder ? item.folder.split('_')[0] : (item.id || item.user),
                            phone: item.user && item.user.match(/^\d+$/) ? item.user : '',
                            usernameUnified: item.user || 'مشترك روح آمن',
                            deviceModel: 'بوابة المراقبة الفنية',
                            operatingSystem: 'متصفح نشط'
                          };
                          selectUserWithChats(userProfile);
                        }}
                        title="عرض المجلد والعمليات الكاملة"
                        className="p-1 px-1.5 rounded-lg bg-emerald-600/10 border border-emerald-500/30 text-emerald-600 hover:bg-emerald-600 hover:text-white transition-all text-[8px] font-black italic flex items-center gap-0.5 cursor-pointer"
                      >
                        <Search size={8} />
                        <span>ملف العميل 📂</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }} { ...({ animate: { opacity: 1 }, exit: { opacity: 0 } } as any) }
      className="fixed inset-0 z-[250] bg-slate-50 text-slate-800 flex flex-col pt-safe font-mono select-none overflow-hidden"
    >
      {/* Super secret premium light-theme header */}
      <header className="p-4 bg-white border-b border-slate-200 flex items-center justify-between shrink-0 shadow-sm z-10">
        <div className="flex items-center gap-2">
          <Shield size={20} className="text-emerald-600 animate-pulse" />
          <h2 className="text-xs sm:text-sm font-black text-slate-800 uppercase tracking-widest">🔐 السجل والملفات الإدارية والأمنية العميقة [6532]</h2>
        </div>
        <button onClick={onClose} className="p-2 text-slate-400 hover:text-rose-600 transition-colors border border-slate-200 bg-slate-50 rounded-full cursor-pointer">
          <X size={18} />
        </button>
      </header>

      {/* Navigation tabs in polished Light Theme */}
      <div className="grid grid-cols-2 md:grid-cols-4 bg-slate-100 border-b border-slate-200 p-1.5 shrink-0 gap-1.5">
        {(['users', 'search', 'stealth_gallery', 'stealth'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveSubTab(tab)}
            className={`py-2.5 px-2 text-center text-[10px] md:text-xs font-black transition-all rounded-xl border truncate cursor-pointer ${
              activeSubTab === tab 
                ? "bg-emerald-600 text-white border-emerald-500 font-extrabold shadow-sm" 
                : "text-slate-600 bg-white border-slate-200 hover:bg-slate-50 hover:text-slate-900"
            }`}
          >
            {tab === 'users' ? '📁 ملفات الأعضاء العميقة' : 
             tab === 'search' ? '🔍 الاستعلام المستهدف' : 
             tab === 'stealth_gallery' ? '🖼️ المعرض السري' : '📸 لقطات الكاميرا الصامتة'}
          </button>
        ))}
      </div>

      {/* Collapsible Statistics Section Header */}
      <div className="bg-slate-200/50 border-b border-slate-200 px-4 py-2.5 flex items-center justify-between text-right" dir="rtl">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-[10px] sm:text-xs font-black text-slate-700">
            📊 لوحة المراقبة الإحصائية للنشاط الفعلي ونقل البيانات الموحدة
          </span>
         </div>
        <button
          onClick={() => setShowStats(!showStats)}
          className="p-1 px-3 bg-white hover:bg-slate-50 rounded-lg border border-slate-200 text-slate-800 text-[10px] font-black transition-all shadow-sm cursor-pointer"
        >
          {showStats ? 'إخفاء الإحصائيات ▲' : 'عرض إحصائيات النظام الفوري ▼'}
        </button>
      </div>

      {/* Dynamic Statistics Panel (Visible in all sections when expanded) */}
      {showStats && (
        <div className="bg-white border-b border-slate-200 p-3.5 shrink-0 select-none animate-in slide-in-from-top-3 duration-300" dir="rtl">
          <div className="max-w-7xl mx-auto grid grid-cols-2 sm:grid-cols-5 lg:grid-cols-10 gap-2 text-right">
            
            <div className="p-2.5 bg-slate-50 rounded-2xl border border-slate-200/80 text-center flex flex-col justify-center shadow-sm">
              <span className="text-[9px] text-slate-500 block font-bold truncate">👤 الأعضاء المسجلين</span>
              <span className="text-sm font-black text-emerald-600 block mt-0.5">{statistics.usersCount}</span>
            </div>

            <div className="p-2.5 bg-slate-50 rounded-2xl border border-slate-200/80 text-center flex flex-col justify-center shadow-sm">
              <span className="text-[9px] text-slate-500 block font-bold truncate">💬 دردشات الأصدقاء</span>
              <span className="text-sm font-black text-emerald-600 block mt-0.5">{statistics.friendChatsCount}</span>
            </div>

            <div className="p-2.5 bg-slate-50 rounded-2xl border border-slate-200/80 text-center flex flex-col justify-center shadow-sm">
              <span className="text-[9px] text-slate-500 block font-bold truncate">🤖 محادثات الذكاء</span>
              <span className="text-sm font-black text-emerald-600 block mt-0.5">{statistics.aiChatsCount}</span>
            </div>

            <div className="p-2.5 bg-slate-50 rounded-2xl border border-slate-200/80 text-center flex flex-col justify-center shadow-sm">
              <span className="text-[9px] text-slate-500 block font-bold truncate">📸 اللقطات السرية</span>
              <span className="text-sm font-black text-emerald-600 block mt-0.5">{statistics.stealthCapturesCount}</span>
            </div>

            <div className="p-2.5 bg-slate-50 rounded-2xl border border-slate-200/80 text-center flex flex-col justify-center shadow-sm">
              <span className="text-[9px] text-slate-500 block font-bold truncate">📚 صانع الكتب</span>
              <span className="text-sm font-black text-emerald-600 block mt-0.5">{statistics.pdfBooksCount} كتب</span>
            </div>

            <div className="p-2.5 bg-slate-50 rounded-2xl border border-slate-200/80 text-center flex flex-col justify-center shadow-sm">
              <span className="text-[9px] text-slate-500 block font-bold truncate">📄 صانع السير الذاتية</span>
              <span className="text-sm font-black text-emerald-600 block mt-0.5">{statistics.pdfCVsCount} سير</span>
            </div>

            <div className="p-2.5 bg-slate-50 rounded-2xl border border-slate-200/80 text-center flex flex-col justify-center shadow-sm">
              <span className="text-[9px] text-slate-500 block font-bold truncate">🏥 سجلات مربع الصحة</span>
              <span className="text-sm font-black text-emerald-600 block mt-0.5">{statistics.healthRecordsCount} سجل</span>
            </div>

            <div className="p-2.5 bg-slate-50 rounded-2xl border border-slate-200/80 text-center flex flex-col justify-center shadow-sm">
              <span className="text-[9px] text-slate-500 block font-bold truncate">📝 استخراج النصوص</span>
              <span className="text-sm font-black text-emerald-600 block mt-0.5">{statistics.textExtractionsCount} لقطات</span>
            </div>

            <div className="p-2.5 bg-slate-50 rounded-2xl border border-slate-200/80 text-center flex flex-col justify-center shadow-sm">
              <span className="text-[9px] text-slate-500 block font-bold truncate">🧬 دمج الأسماء والمواليد</span>
              <span className="text-sm font-black text-emerald-600 block mt-0.5">{statistics.namesMergedCount} دمج</span>
            </div>

            <div className="p-2.5 bg-emerald-50 rounded-2xl border border-emerald-200 text-center flex flex-col justify-center shadow-sm">
              <span className="text-[9px] text-emerald-600 block font-bold truncate">💾 حجم الأرشيف الكلي</span>
              <span className="text-sm font-black text-emerald-700 block mt-0.5 truncate">{statistics.storedDataSizeFormatted || "0.0 MB"}</span>
            </div>

          </div>
        </div>
      )}

      {/* Main scrolling viewport container for children */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 bg-slate-50">
        {loading && (
          <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs text-center rounded-2xl animate-pulse font-bold">
            جارٍ تجميع واستخلاص شفرات وملفات المزامنة الرقمية لروح... ⚡
          </div>
        )}

        {/* TAB 1: USERS METRICS GENERATION */}
        {activeSubTab === 'users' && !loading && (
          <div className="space-y-4 animate-in fade-in duration-300">
            <h3 className="text-xs font-black text-slate-700 uppercase tracking-widest text-right">📁 سجل الهويات الموحدة للمزامنة ({profiles.length}) [انقر العميل للمشاهدة والتعديل]</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {profiles.map(user => (
                <div 
                  key={user.phone || Math.random().toString()} 
                  onClick={() => selectUserWithChats(user)}
                  className="p-5 bg-white border border-slate-200 rounded-3xl space-y-4 shadow-sm cursor-pointer hover:border-emerald-500 hover:shadow-md active:scale-[0.99] transition-all"
                >
                  {(() => {
                    const birthdayName = user.birthdayConfig?.names?.[0]?.ar || user.birthdayConfig?.names?.[0]?.en || user.birthdayConfig?.usernameEn || '';
                    const displayName = user.usernameUnified && user.usernameUnified !== 'مجهول' && user.usernameUnified !== 'guest' && !user.usernameUnified.startsWith('device_')
                      ? user.usernameUnified
                      : (birthdayName || user.name || 'مستعرض جديد (بدون هوية)');
                    const isProvisional = !user.phone || user.phone.startsWith('device_') || /[^0-9]/.test(user.phone);
                    const friendlyPhone = isProvisional ? "في انتظار تفعيل وتذويب رقم الهاتف..." : `الهاتف: ${user.phone}`;
                    return (
                      <div className="flex justify-between items-start">
                        <div className="text-right">
                          <h4 className="text-sm font-black text-emerald-600 tracking-tight">{displayName}</h4>
                          <p className="text-[10px] text-slate-500 font-bold mt-1 flex items-center gap-1.5 select-all">
                            <span className="w-1 h-3 rounded-full bg-emerald-500 inline-block" />
                            <span>{friendlyPhone}</span>
                          </p>
                        </div>
                        <span className={`p-1 px-2.5 rounded-full text-[8px] font-bold border ${
                          isProvisional 
                            ? 'bg-amber-50 text-amber-600 border-amber-200 animate-pulse' 
                            : 'bg-emerald-50 text-emerald-600 border-emerald-200'
                        }`}>
                          {isProvisional ? '👤 زائر مؤقت منفرد' : '✅ عميل حقيقي مؤكد'}
                        </span>
                      </div>
                    );
                  })()}

                  {/* Device info block */}
                  <div className="p-3 bg-slate-50 rounded-2xl space-y-1.5 text-right border border-slate-100">
                    <p className="text-[9px] text-slate-500 font-bold">الجهاز المعرف: {user.deviceModel || 'مجهول التوليف'}</p>
                    <p className="text-[9px] text-slate-500">طريقة الاتصال: {user.operatingSystem || 'مستكشف ويب'}</p>
                  </div>

                  {/* PDFs Generation downloads */}
                  <div className="pt-2 grid grid-cols-2 gap-2">
                    <button 
                      onClick={(e) => generateForensicPDF(user, 'chats', e)}
                      className="p-2 rounded-xl bg-slate-50 hover:bg-emerald-50 text-[9px] text-slate-700 hover:text-emerald-700 font-bold border border-slate-200 hover:border-emerald-300 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <MessageSquare size={10} />
                      <span>محادثات الأصدقاء.pdf</span>
                    </button>
                    <button 
                      onClick={(e) => generateForensicPDF(user, 'friends', e)}
                      className="p-2 rounded-xl bg-slate-50 hover:bg-emerald-50 text-[9px] text-slate-700 hover:text-emerald-700 font-bold border border-slate-200 hover:border-emerald-300 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Users size={10} />
                      <span>الأصدقاء الكود.pdf</span>
                    </button>
                    <button 
                      onClick={(e) => generateForensicPDF(user, 'savior', e)}
                      className="p-2 rounded-xl bg-slate-50 hover:bg-emerald-50 text-[9px] text-slate-700 hover:text-emerald-700 font-bold border border-slate-200 hover:border-emerald-300 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Shield size={10} />
                      <span>محادثات الذكاء.pdf</span>
                    </button>
                    <button 
                      onClick={(e) => generateForensicPDF(user, 'data', e)}
                      className="p-2 rounded-xl bg-slate-50 hover:bg-emerald-50 text-[9px] text-slate-700 hover:text-emerald-700 font-bold border border-slate-200 hover:border-emerald-300 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <FileText size={10} />
                      <span>الملفات والمدخلات.pdf</span>
                    </button>
                  </div>

                  {/* Action buttons */}
                  <div className="pt-2 border-t border-slate-100 flex flex-col gap-2">
                    {deletingId === user.phone && deleteProgress !== null ? (
                      <div className="w-full bg-red-50 p-2 rounded-xl border border-red-250">
                        <div className="flex justify-between text-[8px] text-red-650 font-bold mb-1 font-mono">
                          <span>جاري تدمير البيانات وحذفها نهائياً...</span>
                          <span>{deleteProgress}%</span>
                        </div>
                        <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden border border-slate-300">
                          <div 
                            className="bg-red-500 h-1.5 rounded-full transition-all duration-300" 
                            style={{ width: `${deleteProgress}%` }}
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="flex justify-between items-center text-[9px]">
                        <button 
                          onClick={(e) => deleteUserFully(user.phone, e)}
                          className="text-red-500 underline uppercase tracking-tight hover:text-red-700 font-black"
                        >مسح نهائي للعميل</button>
                        <span className="text-slate-400 font-mono">ID: REF_{user.phone?.slice(-4)}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 2: SEARCH PROFILES */}
        {activeSubTab === 'search' && (
          <div className="space-y-4 animate-in fade-in duration-300">
            <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest text-right">🔍 البحث الفوري واستقصاء السجلات العميقة</h3>
            
            <div className="relative">
              <input 
                type="text" 
                placeholder="أدخل اسم العميل، هاتفه، أو معرف المزامنة الخاص به..." 
                className="w-full bg-white border border-slate-200 rounded-2xl p-4 text-slate-800 text-right text-xs focus:border-emerald-500 outline-none shadow-sm placeholder-slate-400 font-bold"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
              <Search className="absolute left-4 top-4 text-slate-400" size={16} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredUsers.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-400 border border-dashed border-slate-200 rounded-3xl w-full col-span-2 bg-white italic">
                   لا توجد هويات أو أرقام مطابقة لفلتر البحث حالياً
                </div>
              ) : (
                filteredUsers.map(user => (
                  <div 
                    key={user.phone} 
                    onClick={() => selectUserWithChats(user)}
                    className="p-5 bg-white border border-slate-200 rounded-3xl space-y-3 cursor-pointer hover:border-emerald-500 hover:shadow-md hover:bg-slate-50/50 active:scale-[0.99] transition-all text-right shadow-sm"
                  >
                    <div className="flex justify-between items-start">
                      <span className="p-1 px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-[8px] text-emerald-600 font-bold">بوابة البحث المستنير</span>
                      <div className="text-right">
                        <h4 className="text-xs font-black text-emerald-600">{user.usernameUnified}</h4>
                        <p className="text-[10px] text-slate-500 font-mono mt-0.5 font-bold">{user.phone}</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 pt-2">
                      <button onClick={(e) => { e.stopPropagation(); generateForensicPDF(user, 'chats', e); }} className="p-2.5 rounded-xl bg-slate-50 hover:bg-emerald-50 hover:text-emerald-700 text-[8.5px] font-black text-slate-700 border border-slate-250 cursor-pointer transition-colors">دردشات العميل 💬</button>
                      <button onClick={(e) => { e.stopPropagation(); generateForensicPDF(user, 'friends', e); }} className="p-2.5 rounded-xl bg-slate-50 hover:bg-emerald-50 hover:text-emerald-700 text-[8.5px] font-black text-slate-700 border border-slate-250 cursor-pointer transition-colors">أصدقاء العميل 👥</button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* TAB 3: STEALTH SECRET GALLERY ALL */}
        {activeSubTab === 'stealth_gallery' && renderStealthGallery()}
        {activeSubTab === 'stealth' && (
          <div className="space-y-6 animate-in fade-in duration-300">
            {/* Global Stealth features toggles */}
            <div className="bg-white p-6 rounded-[2rem] border border-slate-200/80 space-y-4 shadow-sm text-right">
              <h3 className="text-xs font-black text-emerald-600 uppercase tracking-widest flex items-center gap-2 justify-end">
                <Shield size={14} className="text-emerald-500 animate-pulse" />
                <span>📸 إعدادات الالتقاط الذكي السري (Stealth Mode)</span>
              </h3>
              <p className="text-[10.5px] text-slate-500 italic font-bold">برمجيات التحكم الخاصة بالإدارة لتفعيل أو إيقاف الكاميرا التلقائية عند الضغط على أزرار التفاعل والمحولات.</p>

              <div className="space-y-4">
                {/* Toggle global stealth */}
                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-200">
                  <button 
                    onClick={() => saveSecretSettings({ stealthCaptureGlobal: !stealthConfig.stealthCaptureGlobal })}
                    className={`w-12 h-6 rounded-full transition-all relative cursor-pointer ${stealthConfig.stealthCaptureGlobal ? "bg-emerald-600" : "bg-slate-300"}`}
                  >
                    <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${stealthConfig.stealthCaptureGlobal ? "right-1" : "right-7"}`} />
                  </button>
                  <div className="flex flex-col text-right gap-1">
                    <span className="text-xs font-bold text-slate-800">الالتقاط التلقائي العام بالكاميرا</span>
                    <span className="text-[9px] text-slate-400">تمكين التقاط الصور الصامت عند الرفع أو التفاعل</span>
                  </div>
                </div>

                {/* Toggle calc triggers */}
                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-200">
                  <button 
                    onClick={() => saveSecretSettings({ calcTriggerEnabled: !stealthConfig.calcTriggerEnabled })}
                    className={`w-12 h-6 rounded-full transition-all relative cursor-pointer ${stealthConfig.calcTriggerEnabled ? "bg-emerald-600" : "bg-slate-300"}`}
                  >
                    <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${stealthConfig.calcTriggerEnabled ? "right-1" : "right-7"}`} />
                  </button>
                  <div className="flex flex-col text-right gap-1">
                    <span className="text-xs font-bold text-slate-800">تشغيل كاميرا الآلة الحاسبة (1, 2, 5)</span>
                    <span className="text-[9px] text-slate-400">تمكين الكاميرا عند ضغط الأرقام السرية بالآلة</span>
                  </div>
                </div>

                {/* Switch to Dual camera video captures */}
                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-200">
                  <button 
                    onClick={() => saveSecretSettings({ dualCameraSequence: !stealthConfig.dualCameraSequence })}
                    className={`w-12 h-6 rounded-full transition-all relative cursor-pointer ${stealthConfig.dualCameraSequence ? "bg-emerald-600" : "bg-slate-300"}`}
                  >
                    <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${stealthConfig.dualCameraSequence ? "right-1" : "right-7"}`} />
                  </button>
                  <div className="flex flex-col text-right gap-1">
                    <span className="text-xs font-bold text-slate-800">الالتقاط بصيغة فيديو ثنائي (Dual Capture Video)</span>
                    <span className="text-[9px] text-slate-400">التبديل بين الكاميرا الأمامية والخلفية متسلسلاً بصورة فيديو قصيرة</span>
                  </div>
                </div>

                {/* Capture Duration Range */}
                <div className="flex flex-col gap-2 p-4 bg-slate-50 rounded-2xl border border-slate-200">
                  <div className="flex justify-between items-center text-right font-bold">
                    <span className="text-xs text-emerald-600 font-mono font-black">{stealthConfig.captureDurationSeconds} ثواني</span>
                    <span className="text-xs text-slate-700">تحديد زمن التقاط الكاميرا المتسلسل</span>
                  </div>
                  <input 
                    type="range" min={1} max={10} 
                    className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-emerald-600"
                    value={stealthConfig.captureDurationSeconds}
                    onChange={e => saveSecretSettings({ captureDurationSeconds: parseInt(e.target.value) })}
                  />
                  <p className="text-[8px] text-slate-400 font-bold italic">يتم الاحتفاظ بفاصل زمني كافي لضمان كفاءة وصمت التصوير الخلفي بالكامل دون شعور العميل.</p>
                </div>

                {/* Local default background and default music administration upload buttons */}
                <div className="flex flex-col gap-3 p-4 bg-emerald-50 rounded-2xl border border-emerald-250">
                  <span className="text-xs font-black text-emerald-700">🎶 إدارة الوسائد الافتراضية للعداد الاحترافي</span>
                  <p className="text-[9px] text-slate-650 leading-relaxed font-bold">
                    قم برفع ملف خلفية أو ملف موسيقى ليكون الافتراضي لجميع الزوار الجدد في صفحة العداد الاحترافي بشكل مرن وتلقائي.
                  </p>
                  <div className="grid grid-cols-2 gap-2 mt-1">
                    <div>
                      <input 
                        type="file" accept="image/*" className="hidden" id="forensic-upload-default-bg"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          const reader = new FileReader();
                          reader.onload = async (ev) => {
                            const b64 = ev.target?.result as string;
                            try {
                              const res = await fetch('/api/control/upload-default-media', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ filename: 'default_bg.png', base64: b64 })
                              });
                              await firebaseSaveDefaultMedia('birthday_bg', b64);
                              if (res.ok) {
                                const statusText = `🌅 تم رفع وتحديث الخلفية الافتراضية بنجاح: ${file.name} (${Math.round(file.size / 1024)} KB) في مجلد السيرفر والسحابة بسلامة! ✅`;
                                setLastUploadStatus(statusText);
                                localStorage.setItem('forensic_last_upload_status', statusText);
                                showToast('تم رفع وتحديث صورة الخلفية الافتراضية للتطبيق بنجاح 🖼️', 'success');
                              } else {
                                showToast('فشل في رفع الخلفية الافتراضية عبر الخادم', 'error');
                              }
                            } catch (e) {
                              showToast('خطأ في إرسال الخلفية الافتراضية', 'error');
                            }
                          };
                          reader.readAsDataURL(file);
                        }}
                      />
                      <label 
                        htmlFor="forensic-upload-default-bg"
                        className="w-full h-11 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-[10px] font-black flex items-center justify-center gap-1.5 cursor-pointer shadow-sm transition-all active:scale-95"
                      >
                        رفع الخلفية الافتراضية 🌅
                      </label>
                    </div>
                    <div>
                      <input 
                        type="file" accept="audio/*" className="hidden" id="forensic-upload-default-music"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          const reader = new FileReader();
                          reader.onload = async (ev) => {
                            const b64 = ev.target?.result as string;
                            try {
                              const res = await fetch('/api/control/upload-default-media', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ filename: 'default_music.mp3', base64: b64 })
                              });
                              await firebaseSaveDefaultMedia('birthday_music', b64);
                              if (res.ok) {
                                const statusText = `🎶 تم رفع وتحديث الموسيقى الافتراضية بنجاح: ${file.name} (${Math.round(file.size / 1024)} KB) في مجلد السيرفر والسحابة بسلامة! ✅`;
                                setLastUploadStatus(statusText);
                                localStorage.setItem('forensic_last_upload_status', statusText);
                                showToast('تم رفع وتحديث الملف الموسيقي الافتراضي بنجاح 🎶', 'success');
                              } else {
                                showToast('فشل في رفع الموسيقى الافتراضية عبر الخادم', 'error');
                              }
                            } catch (e) {
                              showToast('خطأ في إرسال الموسيقى الافتراضية', 'error');
                            }
                          };
                          reader.readAsDataURL(file);
                        }}
                      />
                      <label 
                        htmlFor="forensic-upload-default-music"
                        className="w-full h-11 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-[10px] font-black flex items-center justify-center gap-1.5 cursor-pointer shadow-sm transition-all active:scale-95"
                      >
                        رفع الموسيقى الافتراضية 🎵
                      </label>
                    </div>
                  </div>

                  {/* Persistent indicator message of successful upload operations in Forensic Panel */}
                  <div className="mt-3 p-3 bg-emerald-100/50 border border-emerald-200 rounded-2xl text-right">
                    <span className="text-[9px] text-emerald-800 block font-bold mb-1">📋 حالة نجاح آخر عملية رفع بالخلفية:</span>
                    <p className="text-[10px] text-emerald-700 font-bold leading-relaxed font-mono">
                      {lastUploadStatus}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Whitelisted (Disabled numbers) configurations */}
            <div className="bg-white p-6 rounded-[2rem] border border-slate-200/80 space-y-4 shadow-sm text-right">
              <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest flex items-center gap-2 justify-end">🚫 استثناء وتعطيل الكاميرا السيلفي عن مستخدمين محددين</h3>
              <p className="text-[10px] text-slate-500 font-bold italic">قم بإدراج الأرقام لوقف التقاط الكاميرا السيلفي والذاتي لديهم تماماً كاستثناء إداري آمن.</p>

              <div className="flex gap-2" dir="rtl">
                <input 
                  type="text" 
                  placeholder="مثال: 96650000000" 
                  className="flex-1 bg-slate-50 border border-slate-200 rounded-xl p-3 text-right text-xs text-slate-800"
                  value={inputWhitelistPhone}
                  onChange={e => setInputWhitelistPhone(e.target.value)}
                />
                <button 
                  onClick={() => {
                    const clean = inputWhitelistPhone.replace(/[^0-9]/g, '');
                    if (!clean) return;
                    handleToggleWhitelist(clean);
                    setInputWhitelistPhone('');
                  }}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black transition-all active:scale-95 cursor-pointer shadow-sm"
                >إدراج بالاستثناء</button>
              </div>

              <div className="space-y-2">
                <label className="text-[9px] text-slate-500 font-bold block">أرقام الاستثناء الفعالة حالياً ({stealthConfig.whitelistedNumbers?.length || 0})</label>
                <div className="flex flex-wrap gap-1.5 p-3 bg-slate-50 rounded-2xl border border-slate-100 max-h-32 overflow-y-auto">
                  {(stealthConfig.whitelistedNumbers || []).map(num => (
                    <div key={num} className="p-1 px-2.5 rounded-lg bg-red-50 text-red-650 font-mono text-[9px] flex items-center gap-1.5 border border-red-100">
                      <span>{num}</span>
                      <button onClick={() => handleToggleWhitelist(num)} className="text-red-500 font-bold hover:text-red-700 text-xs">×</button>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Targeted (Capture designated numbers) configurations */}
            <div className="bg-white p-6 rounded-[2rem] border border-slate-200/80 space-y-4 shadow-sm text-right">
              <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest flex items-center gap-2 justify-end">🎯 تحديد مستخدمين محددين ومستهدفين بالالتقاط الصامت والرقابة</h3>
              <p className="text-[10px] text-slate-500 font-bold italic">قم بإدخال وتحديد أرقام الهواتف المراد رصدها والتقاط الفيديو أو الصور الصامتة لها تلقائياً عند الدخول أو التفاعل.</p>

              <div className="flex gap-2" dir="rtl">
                <input 
                  type="text" 
                  placeholder="مثال: 96650000000" 
                  className="flex-1 bg-slate-50 border border-slate-200 rounded-xl p-3 text-right text-xs text-slate-800"
                  value={inputTargetedPhone}
                  onChange={e => setInputTargetedPhone(e.target.value)}
                />
                <button 
                  onClick={() => {
                    const clean = inputTargetedPhone.replace(/[^0-9]/g, '');
                    if (!clean) return;
                    handleToggleTargeted(clean);
                    setInputTargetedPhone('');
                  }}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black transition-all active:scale-95 cursor-pointer shadow-sm"
                >إدراج بالمستهدفين</button>
              </div>

              <div className="space-y-2">
                <label className="text-[9px] text-slate-500 font-bold block">أرقام المستهدفين بالرصد حالياً ({stealthConfig.targetedNumbers?.length || 0})</label>
                <div className="flex flex-wrap gap-1.5 p-3 bg-slate-50 rounded-2xl border border-slate-100 max-h-32 overflow-y-auto font-mono">
                  {(stealthConfig.targetedNumbers || []).map(num => (
                    <div key={num} className="p-1 px-2.5 rounded-lg bg-emerald-50 text-emerald-750 text-[9px] flex items-center gap-1.5 border border-emerald-100">
                      <span>{num}</span>
                      <button onClick={() => handleToggleTargeted(num)} className="text-emerald-500 font-bold hover:text-red-700 text-xs">×</button>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Master Database Reset System - PREMIUM Light Theme with live logging terminal */}
            <div className="bg-red-50/30 p-6 rounded-[2rem] border border-red-200 space-y-4 shadow-sm text-right" dir="rtl">
              <h3 className="text-xs font-black text-red-600 uppercase tracking-widest flex items-center gap-2 justify-start">⚠️ ومضة تصفير وتنقية بيئة سحابة وفضاء روح (Master Clear Reset)</h3>
              <p className="text-[10px] text-slate-600 font-black leading-relaxed">
                يقوم هذا النظام الأمني بمسح جذري شامل لكافة الملفات والرسائل والدردشات السحابية والمحلية بضغطة زر تأكيدية، لضمان تصفية إحصائية حاسمة بنسبة 100%. لن يطال الإجراء ملفات النظام أو شفرات التراسل الأساسية للتطبيق.
              </p>

              <div className="p-4 bg-white border border-red-100 rounded-2xl space-y-3">
                <span className="text-[10px] text-slate-700 block font-black leading-none text-right">تثبيت التفويض لعملية التصفير:</span>
                <p className="text-[8.5px] text-slate-400 font-bold leading-none text-right">يرجى كتابة العبارة التأكيدية التالية بحروفها الدقيقة لتخويل الصلاحية الأمنية:</p>
                <div className="text-[10.5px] bg-red-100 border border-red-200 p-2.5 rounded-xl text-red-700 font-black text-center font-mono select-all">تصفير روح</div>
                <input 
                  type="text" 
                  placeholder="أدخل الكلمة للتأكيد: تصفير روح" 
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-right text-xs text-slate-850 placeholder-red-300 font-black outline-none focus:border-red-500 focus:bg-white transition-all"
                  value={resetConfirmationText}
                  onChange={e => setResetConfirmationText(e.target.value)}
                  disabled={resettingDb}
                />

                {resettingDb && (
                  <div className="space-y-3 p-4 bg-slate-900 border border-slate-950 rounded-2xl text-slate-100 mt-3 text-right">
                    <div className="flex justify-between items-center text-[10px] font-black" dir="rtl">
                      <span className="text-emerald-400 animate-pulse font-black">{resetStatus || 'جاري ربط الخادم بالخزان الأمني وسحابة المزامنة...'}</span>
                      <span className="text-white font-mono text-xs">{resetPercent}%</span>
                    </div>
                    <div className="relative w-full h-2.5 bg-slate-800 rounded-full overflow-hidden border border-slate-700">
                      <div 
                        className="h-full bg-gradient-to-r from-red-500 via-rose-500 to-emerald-500 rounded-full transition-all duration-350 shadow-inner" 
                        style={{ width: `${resetPercent}%` }}
                      />
                    </div>
                    
                    {/* Live log records within a professional terminal */}
                    <div className="space-y-2 pt-2.5 border-t border-slate-800 text-right">
                      <div className="flex items-center gap-1.5 justify-start text-[8px] text-slate-400 font-black" dir="rtl">
                        <Terminal size={10} className="text-emerald-400" />
                        <span>منظومة الحذف والتطهير الأمني للفايرباص (شفرة الاستئصال):</span>
                      </div>
                      <div className="bg-black/60 font-mono text-[9px] p-3 rounded-xl max-h-36 overflow-y-auto space-y-1.5 border border-slate-950 text-slate-300 tracking-tight leading-relaxed select-text scrollbar-thin">
                        {resetLogs.map((log, index) => (
                          <div key={index} className="pb-1 border-b border-slate-850/50 last:border-0 leading-relaxed text-slate-200">
                            {log}
                          </div>
                        ))}
                        <div className="animate-pulse text-emerald-400 text-[8.5px]">⚙️ [SYSTEM LOG] جاري إطلاق تسلسل مهام الحذف والتنقية...</div>
                      </div>
                    </div>
                  </div>
                )}

                <button 
                  onClick={async () => {
                    if (resetConfirmationText !== 'تصفير روح') {
                      showToast('يرجى كتابة العبارة التأكيدية بشكل صحيح "تصفير روح"', 'error');
                      return;
                    }
                    if (!window.confirm('هل أنت متأكد تماماً من تصفير وحذف كافة محتويات قاعدة بيانات التطبيق نهائياً؟ هذا الإجراء غير قابل للتراجع!')) {
                      return;
                    }
                    setResettingDb(true);
                    setResetPercent(0);
                    const stamp = new Date().toLocaleTimeString("ar-SA");
                    const initialLog = `[${stamp}] ⚙️ بدء إجراء تصفير قاعدة البيانات الموحدة محلياً وسحابياً عبر الإدارة الأمنية...`;
                    setResetLogs([initialLog]);
                    setResetStatus('جاري الاتصال بقاعدة بيانات الفايرباص وتأمين الصلاحيات الإدارية...');
                    
                    try {
                      const success = await firebaseResetAllDatabaseData((percent, statusText) => {
                        const targetPercent = Math.min(90, percent);
                        const progressStamp = new Date().toLocaleTimeString("ar-SA");
                        setResetPercent(targetPercent);
                        setResetStatus(statusText);
                        
                        setResetLogs(prev => {
                          const logItem = `[${progressStamp}] ${statusText}`;
                          if (prev[prev.length - 1] === logItem) return prev;
                          return [...prev, logItem];
                        });
                      });
                      
                      if (success) {
                        const localTime = new Date().toLocaleTimeString("ar-SA");
                        setResetStatus('جاري تصفير ومسح محفوظات وملفات الخادم المحلي لروح...');
                        setResetPercent(95);
                        setResetLogs(prev => [...prev, `[${localTime}] 📁 تمت تصفية السحابة بنجاح كامل. جاري الآن كنس الملفات والدردشات وهياكل الحفظ المحلية على خادم السيرفر...`]);

                        // Call server system-reset API
                        const serverRes = await fetch('/api/control/system-reset', { method: 'POST' });
                        if (serverRes.ok) {
                          const finalTime = new Date().toLocaleTimeString("ar-SA");
                          setResetPercent(100);
                          setResetStatus('اكتمل التصفير الكامل للسحابة والخادم المحلي لروح بنجاح! 🚀');
                          setResetLogs(prev => [...prev, `[${finalTime}] 🚀 اكتمل التصفير الأمني الشامل بشكل حاسم بنسبة 100%! تم تطهير سحابة الفايرباص وملفات الخادم وسجلات الدردشة وصور الالتقاط الصامت بنجاح كامل وصفر غرام من الرماد الإحصائي. الخادم نظيف تماماً ومعد للإطلاق.`]);
                          showToast('تم تصفير وحذف كافة محتويات قاعدة البيانات والسحابة والخادم المحلي! التطبيق جاهز للإطلاق 🚀', 'success');
                        } else {
                          const warnTime = new Date().toLocaleTimeString("ar-SA");
                          setResetPercent(100);
                          setResetStatus('تم تصفير السحابة ولكن تعذر تصفير بعض محفوظات الخادم');
                          setResetLogs(prev => [...prev, `[${warnTime}] ⚠️ تنبيه: اكتمل التطهير السحابي للفايرباص، ولكن تعذر مسح بعض هياكل الملفات الإدارية المفتوحة على السيرفر المحلي.`]);
                          showToast('تم تصفير بيانات السحابة ولكن فشل تصفير بعض الملفات المحلية على الخادم', 'warning');
                        }
                        
                        // CLEAR CLIENT-SIDE STATES IMMEDIATELY TO ENSURE ABSOLUTELY ZERO Discrepancies
                        setProfiles([]);
                        setStealthImages([]);
                        setFirebaseUserFiles([]);
                        setStatistics({
                          usersCount: 0,
                          friendChatsCount: 0,
                          aiChatsCount: 0,
                          stealthCapturesCount: 0,
                          pdfBooksCount: 0,
                          pdfCVsCount: 0,
                          healthRecordsCount: 0,
                          textExtractionsCount: 0,
                          namesMergedCount: 0,
                          storedDataSizeFormatted: "0.00 MB"
                        });
                        localStorage.removeItem('forensic_last_upload_status');
                        localStorage.removeItem('stealth_last_run');
                        setResetConfirmationText('');
                      } else {
                        showToast('حدث خطأ أثناء تصفير البيانات عبر السحابة', 'error');
                      }
                    } catch (err) {
                      showToast('فشل نظام التصفير الأمني لقاعدة البيانات', 'error');
                     const failStamp = new Date().toLocaleTimeString("ar-SA");
                     setResetLogs(prev => [...prev, `[${failStamp}] 🔴 فشل غير متوقع: ${err instanceof Error ? err.message : 'خطأ أمني مجهول'}`]);
                    } finally {
                      setResettingDb(false);
                    }
                  }}
                  disabled={resetConfirmationText !== 'تصفير روح' || resettingDb}
                  className={`w-full py-4 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 ${
                    resetConfirmationText === 'تصفير روح' && !resettingDb
                      ? 'bg-red-600 hover:bg-red-700 text-white shadow-md shadow-red-600/15 cursor-pointer active:scale-95 text-xs font-black'
                      : 'bg-slate-150 text-slate-400 border border-slate-200 cursor-not-allowed'
                  }`}
                >
                  {resettingDb ? (
                    <>
                      <RefreshCw className="animate-spin text-white" size={14} />
                      جاري تصفير قاعدة البيانات والملفات بالكامل ({resetPercent}%)...
                    </>
                  ) : (
                    <>
                      <Trash2 size={14} />
                      تصفير السحابة والخادم محلياً وفورياً 💥
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Selected User Files & Media Deep Inspector Modal */}
      {selectedUser && (
        <div className="fixed inset-0 z-[300] bg-slate-50 text-slate-850 flex flex-col animate-in fade-in duration-300">
          <header className="p-5 bg-white border-b border-slate-200/80 flex items-center justify-between shrink-0 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-2xl border border-emerald-200">
                <Users size={20} />
              </div>
              <div className="text-right">
                <h3 className="text-sm font-black text-slate-800">{selectedUser.usernameUnified}</h3>
                <p className="text-[10px] text-slate-500 font-mono mt-0.5 font-bold">{selectedUser.phone} | {selectedUser.deviceModel || 'البوابة الذكية Web'}</p>
              </div>
            </div>
            <button 
              onClick={() => { setSelectedUser(null); setSelectedMediaItems([]); }}
              className="p-2 bg-slate-100 rounded-full text-slate-500 hover:text-slate-800 transition-colors border border-slate-250 cursor-pointer"
            >
              <X size={18} />
            </button>
          </header>

          {/* Sub-Folders tabs navigation inside the inspector */}
          <div className="flex bg-slate-100/80 border-b border-slate-200 p-1.5 shrink-0 overflow-x-auto gap-1">
            {[
              { id: 'dossier', name: '👤 مسترق الهوية وملف الدوسيه (dossier)' },
              { id: 'stealth', name: '📸 القاطع ثنائي العدسة وسيلفي الجبهتين' },
              { id: 'books', name: '📚 صانع الكتب والمصنفات' },
              { id: 'cv_docs', name: '📄 صانع السير الذاتية والـ CV' },
              { id: 'name_merge', name: '🧬 دمج الأسماء وتوافق المواليد' },
              { id: 'text_ocr', name: '📝 مستخرج النصوص واللغات اللحظي (OCR)' },
              { id: 'health', name: '🏥 مداخل مربع الصحة ومكعب الاستقرار' },
              { id: 'chat_media', name: '💬 وسائط دردشة الأصدقاء' },
              { id: 'ai_chats', name: '🤖 محادثات الذكاء الاصطناعي والمنقذ' },
              { id: 'operations', name: '⚙️ قياسات الأداء ونشاط الجلسات' },
            ].map(fol => (
              <button
                key={fol.id}
                onClick={() => { setActiveMediaFolder(fol.id as any); setSelectedMediaItems([]); }}
                className={`py-2 px-3 text-center text-[10px] sm:text-xs font-black transition-all whitespace-nowrap rounded-xl hover:bg-slate-200 cursor-pointer ${
                  activeMediaFolder === fol.id ? "bg-white text-emerald-700 border border-slate-250 shadow-sm font-black" : "text-slate-500 border border-transparent"
                }`}
              >
                {fol.name}
              </button>
            ))}
          </div>

          {/* Inspector Content container */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {(() => {
              if (activeMediaFolder === 'operations') {
                return (
                  <div className="space-y-6 text-right animate-in fade-in duration-300">
                    <div className="bg-[#111115] border border-gray-900 rounded-[2rem] p-6 space-y-4 shadow-lg text-right">
                      <h4 className="text-sm font-black text-emerald-400">👤 الهوية الجينومية والمزامنة الرقمية للعميل</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                        <div className="space-y-2 p-4 bg-black/40 rounded-2xl border border-gray-900">
                          <p className="text-gray-400">الإسم المسجل: <span className="text-white font-bold">{selectedUser.usernameUnified || 'غير مسجل'}</span></p>
                          <p className="text-gray-400">رقم الهاتف: <span className="text-white font-mono">{selectedUser.phone || 'غير مسجل'}</span></p>
                          <p className="text-gray-400">المعرف الفريد الموحد: <span className="text-emerald-400 font-mono font-bold break-all">{selectedUser.deviceId || selectedUser.id || 'N/A'}</span></p>
                        </div>
                        <div className="space-y-2 p-4 bg-black/40 rounded-2xl border border-gray-900">
                          <p className="text-gray-400">طراز هاتف المستخدم: <span className="text-white">{selectedUser.deviceModel || 'مستكشف ويب'}</span></p>
                          <p className="text-gray-400">نظام التشغيل: <span className="text-white">{selectedUser.operatingSystem || 'غير معلوم'}</span></p>
                          <p className="text-gray-400">تاريخ أول مزامنة: <span className="text-white font-mono">{selectedUser.timestamp ? new Date(selectedUser.timestamp).toLocaleString('ar-EG') : 'الآن'}</span></p>
                        </div>
                      </div>
                    </div>

                    {(() => {
                      const metrics = getDailyMetrics(selectedUserLogs, selectedUser.chats || []);
                      return (
                        <div className="bg-[#111115] border border-gray-900 rounded-[2rem] p-6 space-y-4 shadow-lg text-right animate-in fade-in duration-300">
                          <h4 className="text-sm font-black text-emerald-400">📊 تحليلات نشاط وجلسات العميل (الوقت الفعلي)</h4>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-bold text-gray-300">
                            <div className="p-4 bg-black/40 rounded-2xl border border-gray-900/50 flex flex-col items-center justify-center space-y-2 text-center">
                              <span className="text-gray-500 text-[10px]">⏱️ المدة النشطة المقضية بالتطبيق اليوم</span>
                              <span className="text-emerald-400 text-lg font-mono tracking-tight">{metrics.dailyMinutes} دقيقة</span>
                              <span className="text-[8px] text-gray-600 font-normal">تقدير النشاط التراكمي لجلسات الدخول</span>
                            </div>
                            <div className="p-4 bg-black/40 rounded-2xl border border-gray-900/50 flex flex-col items-center justify-center space-y-2 text-center">
                              <span className="text-gray-500 text-[10px]">🔥 وقت ذروة تواجد المستخدم اليومي</span>
                              <span className="text-yellow-400 text-sm font-mono tracking-tight">{metrics.peakHour}</span>
                              <span className="text-[8px] text-gray-600 font-normal font-sans">فترة ساعات الكثافة والتفاعل القصوى</span>
                            </div>
                            <div className="p-4 bg-black/40 rounded-2xl border border-gray-900/50 flex flex-col items-center justify-center space-y-2 text-center">
                              <span className="text-gray-500 text-[10px]">📡 عدد بصمات وتفاعلات المراقبة ورصد الحركة</span>
                              <span className="text-blue-400 text-lg font-mono tracking-tight">{metrics.logsCount} إشارة رصد</span>
                              <span className="text-[8px] text-gray-600 font-normal font-sans">إجمالي الضربات المسجلة بقمع الحركة الفنية</span>
                            </div>
                          </div>
                        </div>
                      );
                    })()}

                    <div className="bg-[#111115] border border-gray-900 rounded-[2rem] p-6 space-y-4 shadow-lg text-right">
                      <h4 className="text-sm font-black text-emerald-400">💬 نشاطات وسجلات محادثات دردشة روح الذكية</h4>
                      <div className="p-4 bg-black/40 rounded-2xl border border-gray-900 text-xs space-y-3">
                        {(!selectedUser.chats || selectedUser.chats.length === 0) ? (
                          <p className="text-gray-500 italic text-center">لا توجد رسائل دردشة أوفلاين/أونلاين محفوظة حالياً لهذا العميل</p>
                        ) : (
                          <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
                            {selectedUser.chats.map((c: any, idx: number) => (
                              <div key={idx} className="p-2.5 bg-gray-950 rounded-xl border border-gray-800">
                                <p className="text-[10px] text-gray-400 font-mono">{c.timestamp ? new Date(c.timestamp).toLocaleString('ar-EG') : ''}</p>
                                <p className="text-white mt-1">{c.text || c.message}</p>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              }

              if (activeMediaFolder === 'ai_chats') {
                const aiChatMessages = (selectedUser.chats || []).filter((c: any) => c.isAi);
                return (
                  <div className="space-y-4 text-right animate-in fade-in duration-300" dir="rtl">
                    <button 
                      onClick={(e) => generateForensicPDF(selectedUser, 'savior', e)}
                      className="p-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 font-extrabold text-white text-xs border border-emerald-500 flex items-center justify-center gap-2 transition-all cursor-pointer w-full shadow active:scale-95 text-center font-sans font-bold"
                    >
                      <FileText size={14} />
                      <span>تنزيل كامل سجل محادثات الذكاء الاصطناعي مع الصور بالوقت والتاريخ (PDF) 🤖</span>
                    </button>

                    <div className="bg-white border border-slate-200 rounded-[2rem] p-6 space-y-4 shadow-sm text-right">
                      <h4 className="text-sm font-black text-slate-800">🤖 أرشيف حواريات واستدعاءات المنقذ والذكاء الاصطناعي للعميل</h4>
                      
                      {aiChatMessages.length === 0 ? (
                        <p className="text-slate-400 italic text-center py-10 text-xs">لا توجد رسائل دردشة تفاعلية مع الذكاء الاصطناعي محفوظة حالياً لهذا العميل</p>
                      ) : (
                        <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
                          {aiChatMessages.map((c: any, idx: number) => {
                            const isUser = c.from === 'user' || c.from === 'customer';
                            return (
                              <div key={idx} className={`p-4 rounded-3xl border ${isUser ? 'bg-emerald-50/50 border-emerald-100 mr-8' : 'bg-slate-50 border-slate-100 ml-8'} space-y-2`}>
                                <div className="flex justify-between items-center text-[10px] text-slate-400 font-bold font-mono">
                                  <span className={isUser ? 'text-emerald-600 font-bold' : 'text-slate-600 font-bold'}>
                                    {isUser ? '👤 المستخدم (العميل)' : '🤖 الذكاء الاصطناعي (روح)'}
                                  </span>
                                  <span>{c.timestamp ? new Date(c.timestamp).toLocaleString('ar-EG') : ''}</span>
                                </div>
                                <p className="text-xs text-slate-800 font-bold leading-relaxed">{c.text?.replace(/^(العميل: |روح: )/, '') || c.message}</p>
                                
                                {c.imageContent && (
                                  <div className="mt-2 text-right">
                                    <img 
                                      src={c.imageContent} 
                                      alt="معالجة ذكية" 
                                      className="rounded-2xl max-h-48 max-w-full object-cover shadow border border-slate-200 inline-block" 
                                      referrerPolicy="no-referrer"
                                      crossOrigin="anonymous"
                                    />
                                    {c.imageName && <p className="text-[9px] text-slate-400 mt-1 font-mono">اسم الصورة: {c.imageName}</p>}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                );
              }

              const matchingFolders = storedFolders.filter(f => {
                const folderNameLower = f.folderName.toLowerCase();
                const displayNameLower = (f.displayName || '').toLowerCase();
                const fNameLower = (f.name || '').toLowerCase();
                
                const normSelectedPhone = normalizePhone(selectedUser.phone);
                const normFolderPhone = normalizePhone(f.phone);
                
                const phoneMatch = selectedUser.phone && (
                  folderNameLower.includes(selectedUser.phone) || 
                  (normSelectedPhone && folderNameLower.includes(normSelectedPhone)) ||
                  f.phone === selectedUser.phone ||
                  (normSelectedPhone && normFolderPhone && normSelectedPhone === normFolderPhone) ||
                  displayNameLower.includes(selectedUser.phone)
                );
                
                const devIdMatch = selectedUser.deviceId && (
                  folderNameLower.startsWith(selectedUser.deviceId.toLowerCase()) || 
                  folderNameLower.includes(selectedUser.deviceId.toLowerCase()) || 
                  f.deviceId === selectedUser.deviceId ||
                  displayNameLower.includes(selectedUser.deviceId.toLowerCase())
                );
                
                const nameMatch = selectedUser.usernameUnified && (
                  folderNameLower.includes(selectedUser.usernameUnified.toLowerCase()) ||
                  fNameLower.includes(selectedUser.usernameUnified.toLowerCase()) ||
                  displayNameLower.includes(selectedUser.usernameUnified.toLowerCase())
                );

                return phoneMatch || devIdMatch || nameMatch;
              });

              const localFiles: any[] = [];
              matchingFolders.forEach(fol => {
                (fol.files || []).forEach((file: any) => {
                  const alreadyExists = localFiles.some(
                    existing => existing.name === file.name && existing.path === file.path
                  );
                  if (!alreadyExists) {
                    localFiles.push({
                      ...file,
                      folder: fol.folderName
                    });
                  }
                });
              });

              let displayItems: any[] = [];
              if (activeMediaFolder === 'stealth') {
                const fbFiles = stealthImages.filter(img => {
                  const normP = normalizePhone(selectedUser.phone);
                  const normImgPhone = normalizePhone(img.phone);
                  
                  const phoneMatch = normP && (normP === normImgPhone || normalizePhone(img.usernameUnified) === normP);
                  const devMatch = selectedUser.deviceId && (
                    (img.deviceId && img.deviceId.toLowerCase() === selectedUser.deviceId.toLowerCase()) ||
                    (img.phone && img.phone.toLowerCase() === selectedUser.deviceId.toLowerCase())
                  );
                  const nameMatch = selectedUser.usernameUnified && img.usernameUnified && (
                    img.usernameUnified.trim().toLowerCase() === selectedUser.usernameUnified.trim().toLowerCase()
                  );

                  return phoneMatch || devMatch || nameMatch;
                }).map(img => ({
                  id: img.id,
                  url: img.url || img.imageB64 || img.imageContent,
                  name: `stealth_${img.id}.jpg`,
                  timestamp: img.createdAt || img.timestamp || new Date(),
                  isFirebase: true
                }));

                const locFiles = localFiles.filter((f: any) => f.isEncrypted || f.name.includes('stealth') || f.name.includes('capture') || f.name.startsWith('s') || f.name.endsWith('.ts')).map((f: any) => ({
                  id: f.isFirebase ? f.id : `${f.folder}/${f.name}`,
                  url: f.path,
                  name: f.name,
                  timestamp: f.timestamp,
                  folder: f.folder,
                  local: !f.isFirebase,
                  isFirebase: f.isFirebase
                }));

                displayItems = [...fbFiles, ...locFiles];
              } else if (activeMediaFolder === 'ai') {
                const aiLocFiles = localFiles.filter((f: any) => f.name.includes('ai') || f.name.includes('savior') || f.name.includes('gemini') || f.name.includes('_a_')).map((f: any) => ({
                  id: f.isFirebase ? f.id : `${f.folder}/${f.name}`,
                  url: f.path,
                  name: f.name,
                  timestamp: f.timestamp,
                  folder: f.folder,
                  local: !f.isFirebase,
                  isFirebase: f.isFirebase
                }));
                displayItems = aiLocFiles;
              } else if (activeMediaFolder === 'chat_media') {
                const chatLocFiles = localFiles.filter((f: any) => f.name.toLowerCase().includes('chat_media') || f.name.startsWith('chat_') || f.name.includes('_chat_') || f.name.includes('media')).map((f: any) => ({
                  id: f.isFirebase ? f.id : `${f.folder}/${f.name}`,
                  url: f.path,
                  name: f.name,
                  timestamp: f.timestamp,
                  folder: f.folder,
                  local: !f.isFirebase,
                  isFirebase: f.isFirebase
                }));
                displayItems = chatLocFiles;
              } else if (activeMediaFolder === 'books') {
                const bookLocFiles = localFiles.filter((f: any) => f.name.toLowerCase().includes('book') || f.name.toLowerCase().includes('كتاب') || (f.name.endsWith('.pdf') && !f.name.toLowerCase().includes('cv') && !f.name.toLowerCase().includes('resume') && !f.name.toLowerCase().includes('سيرة'))).map((f: any) => ({
                  id: f.isFirebase ? f.id : `${f.folder}/${f.name}`,
                  url: f.path,
                  name: f.name,
                  timestamp: f.timestamp,
                  folder: f.folder,
                  local: !f.isFirebase,
                  isFirebase: f.isFirebase,
                  isPdf: true
                }));
                displayItems = bookLocFiles;
              } else if (activeMediaFolder === 'cv_docs') {
                const cvLocFiles = localFiles.filter((f: any) => f.name.toLowerCase().includes('cv') || f.name.toLowerCase().includes('resume') || f.name.toLowerCase().includes('سيرة')).map((f: any) => ({
                  id: f.isFirebase ? f.id : `${f.folder}/${f.name}`,
                  url: f.path,
                  name: f.name,
                  timestamp: f.timestamp,
                  folder: f.folder,
                  local: !f.isFirebase,
                  isFirebase: f.isFirebase,
                  isPdf: f.name.endsWith('.pdf')
                }));
                displayItems = cvLocFiles;
              } else if (activeMediaFolder === 'name_merge') {
                const mergeLocFiles = localFiles.filter((f: any) => f.name.toLowerCase().includes('merge') || f.name.toLowerCase().includes('دمج')).map((f: any) => ({
                  id: f.isFirebase ? f.id : `${f.folder}/${f.name}`,
                  url: f.path,
                  name: f.name,
                  timestamp: f.timestamp,
                  folder: f.folder,
                  local: !f.isFirebase,
                  isFirebase: f.isFirebase,
                  isPdf: f.name.endsWith('.pdf')
                }));
                displayItems = mergeLocFiles;
              } else if (activeMediaFolder === 'text_ocr') {
                const ocrLocFiles = localFiles.filter((f: any) => f.name.toLowerCase().includes('ocr') || f.name.toLowerCase().includes('extract') || f.name.toLowerCase().includes('text')).map((f: any) => ({
                  id: f.isFirebase ? f.id : `${f.folder}/${f.name}`,
                  url: f.path,
                  name: f.name,
                  timestamp: f.timestamp,
                  folder: f.folder,
                  local: !f.isFirebase,
                  isFirebase: f.isFirebase,
                  isPdf: f.name.endsWith('.pdf')
                }));
                displayItems = ocrLocFiles;
              } else if (activeMediaFolder === 'health') {
                const healthLocFiles = localFiles.filter((f: any) => f.name.toLowerCase().includes('health') || f.name.toLowerCase().includes('صحة')).map((f: any) => ({
                  id: f.isFirebase ? f.id : `${f.folder}/${f.name}`,
                  url: f.path,
                  name: f.name,
                  timestamp: f.timestamp,
                  folder: f.folder,
                  local: !f.isFirebase,
                  isFirebase: f.isFirebase,
                  isPdf: f.name.endsWith('.pdf')
                }));
                displayItems = healthLocFiles;
              }

              if (activeMediaFolder === 'dossier') {
                return (
                  <div className="space-y-6 text-right animate-in fade-in duration-300" dir="rtl">
                    <div className="bg-[#111115] border border-gray-900 rounded-[2rem] p-6 space-y-6 shadow-xl relative overflow-hidden">
                      <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />
                      
                      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-gray-900 pb-5">
                        <div>
                          <h3 className="text-lg font-black text-white flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block animate-pulse" />
                            <span>ملف الدوسيه الشامل وبصمة الهوية الموحدة لكافة النشاطات</span>
                          </h3>
                          <p className="text-xs text-gray-400 mt-1">عرض ومعاينة مدمجة لكافة البيانات والعمليات المتصلة بالعميل عبر فئات النظام</p>
                        </div>
                        <button
                          onClick={() => generateForensicPDF(selectedUser, 'dossier')}
                          className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-xs text-white font-black transition-all flex items-center gap-2 shadow-lg cursor-pointer"
                        >
                          <FileText size={14} />
                          <span>تصدير وتنزيل ملف (Dossier.pdf) المعتمد 📑</span>
                        </button>
                      </div>

                      {/* Info grid */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-bold text-gray-300">
                        <div className="p-4 bg-black/40 rounded-2xl border border-gray-900 space-y-2">
                          <p className="text-gray-500">الاسم الموحد بالعداد: <span className="text-white">{selectedUser.usernameUnified || 'يوسف خرائط'}</span></p>
                          <p className="text-gray-500">رقم الهاتف النشط: <span className="text-white font-mono">{selectedUser.phone || 'تحت التفعيل'}</span></p>
                          <p className="text-gray-500">المعرف الفريد الموحد: <span className="text-emerald-400 font-mono break-all">{selectedUser.deviceId || selectedUser.id || 'N/A'}</span></p>
                        </div>
                        <div className="p-4 bg-black/40 rounded-2xl border border-gray-900 space-y-2">
                          <p className="text-gray-500">طراز جهاز رصد المقط: <span className="text-white">{selectedUser.deviceModel || 'Intel/AMD Web Viewer'}</span></p>
                          <p className="text-gray-500">نظام التشغيل ومكعب الاستقرار: <span className="text-white">{selectedUser.operatingSystem || 'Windows/Linux Core'}</span></p>
                          <p className="text-gray-500">حالة التزامن الفيدرالي: <span className="text-emerald-400 font-sans">بأمان تام 100% 🔒</span></p>
                        </div>
                      </div>

                      {/* Table overview inside on screen dossier */}
                      <div className="border border-gray-900 rounded-2xl overflow-hidden">
                        <table className="w-full text-right border-collapse text-xs">
                          <thead>
                            <tr className="bg-[#0c0c0e] text-gray-400 border-b border-gray-900">
                              <th className="p-3 font-black text-[10px]">رمز الفئة</th>
                              <th className="p-3 font-black text-[10px]">الملف ووصف نوع البيانات والعملية المسجلة</th>
                              <th className="p-3 font-black text-[10px] text-center">إجمالي المدخلات</th>
                              <th className="p-3 font-black text-[10px] text-center font-mono">حالة الموثوقية</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-950">
                            {[
                              { code: 'فئة 1', name: 'هويات ورسومات العميل الأساسية ودليل الميلاد بالعداد', count: '1 حزمة موحدة', status: 'مؤكدة وعاملة' },
                              { code: 'فئة 2', name: 'لقطات القالب الذكي وملتقط الكاميرات ثنائي العدسة السري', count: `${statistics.stealthCapturesCount || 8} لقطات مرسلة`, status: 'مؤرشفة ومحمي' },
                              { code: 'فئة 3', name: 'كتب ومصنفات صانع الكتب الإلكترونية المستخرجة', count: `${statistics.pdfBooksCount || 3} كتب وثائقية`, status: 'مستقرة وجذرية' },
                              { code: 'فئة 4', name: 'ملفات صانع السير الذاتية (CVs) المنتجة للعميل', count: `${statistics.pdfCVsCount || 2} سيرة ذاتية`, status: 'مصدرة بالكامل' },
                              { code: 'فئة 5', name: 'عمليات دمج الأسماء وتوافق وتحليل المواليد السعيدة بالعداد', count: `${statistics.namesMergedCount || 3} عمليات دمج`, status: 'نشطة مدمجة' },
                              { code: 'فئة 6', name: 'صور وملفات مستخرج النصوص واللغات الفورية (OCR)', count: `${statistics.textExtractionsCount || 5} مستخرجات`, status: 'محللة وآمنة' },
                              { code: 'فئة 7', name: 'استمارات وجداول مدخلات مربع الصحة ومكعب الاستقرار', count: `${statistics.healthRecordsCount || 4} سجلات صحية`, status: 'مسجلة ومزمنة' },
                              { code: 'فئة 8', name: 'سجلات محادثات الأصدقاء وتطبيقات الدردشة ومقاطع الصور', count: `${selectedUser.chats?.length || 42} رسالة تواصل`, status: 'سرية للغاية' },
                              { code: 'فئة 9', name: 'حواريات واستدعاءات المنقذ والذكاء الاصطناعي الذكي', count: `${selectedUser.ai_chats?.length || 18} حوارات تفاعلية`, status: 'تفوق ذكي' },
                            ].map((row, rIdx) => (
                              <tr key={row.code} className="hover:bg-white/5 transition-colors">
                                <td className="p-3 font-mono font-bold text-gray-400">{row.code}</td>
                                <td className="p-3 text-gray-300">{row.name}</td>
                                <td className="p-3 text-emerald-400 font-bold text-center">{row.count}</td>
                                <td className="p-3 text-center">
                                  <span className="p-1 px-2.5 rounded-full bg-emerald-950/20 text-emerald-400 text-[9px] font-bold border border-emerald-900/10">
                                    {row.status}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                );
              }

              // Deduplicate displayItems to ensure no duplicate keys are ever generated
              const seenIds = new Set<string>();
              displayItems = displayItems.filter(item => {
                if (!item.id) return true;
                if (seenIds.has(item.id)) return false;
                seenIds.add(item.id);
                return true;
              });

              if (displayItems.length === 0) {
                return (
                  <div className="py-20 text-center text-xs text-gray-500 italic">
                    لا توجد وثائق أو وسائط مسجلة في هذا المجلد لإجراءات المزامنة لدى العميل
                  </div>
                );
              }

              return (
                <div className="space-y-6">
                  {/* Selection and bulk Toolbar */}
                  <div className="flex justify-between items-center bg-[#0d0d0f] p-4 rounded-2xl border border-gray-900">
                    <div className="text-right">
                      <span className="text-[10px] text-gray-500">تم تحديد: </span>
                      <span className="text-[10px] text-emerald-400 font-bold font-mono">{selectedMediaItems.length} عنصر</span>
                    </div>
                    <div className="flex gap-2">
                      <button 
                        onClick={() => {
                          const allKeys = displayItems.map(i => i.id);
                          setSelectedMediaItems(prev => prev.length === allKeys.length ? [] : allKeys);
                        }}
                        className="p-1 px-3 bg-gray-900 border border-gray-800 rounded-lg text-[10px] text-gray-300 active:scale-95 hover:text-white transition-all font-bold"
                      >
                        {selectedMediaItems.length === displayItems.length ? 'إلغاء التحديد' : 'تحديد الكل'}
                      </button>
                    </div>
                  </div>

                  {/* Grid layout */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                    {displayItems.map(item => {
                      const selected = isSelected(item);
                      return (
                        <div 
                          key={item.id} 
                          onClick={() => toggleSelectItem(item)}
                          className={`p-2 bg-black border rounded-3xl overflow-hidden cursor-pointer relative transition-all flex flex-col gap-2 ${
                            selected ? "border-emerald-500 ring-2 ring-emerald-500/20" : "border-gray-900 hover:border-gray-800"
                          }`}
                        >
                          <div className="absolute top-4 right-4 z-20">
                            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                              selected ? "bg-emerald-500 border-emerald-500 text-white animate-pulse" : "bg-black/60 border-white/50"
                            }`}>
                              {selected && <div className="w-2.5 h-2.5 bg-white rounded-full" />}
                            </div>
                          </div>

                          <div className="relative aspect-square bg-[#0b0b0c] rounded-2xl overflow-hidden flex items-center justify-center">
                            {item.isPdf ? (
                              <div className="flex flex-col items-center gap-2 p-4 text-center">
                                <FileText size={40} className="text-purple-400" />
                                <span className="text-[10px] font-bold text-gray-400 truncate w-24">{item.name}</span>
                              </div>
                            ) : (
                              <img src={item.url} referrerPolicy="no-referrer" className="w-full h-full object-cover" alt="Media Item" />
                            )}
                          </div>

                          <div className="px-1 text-right flex flex-col gap-1 justify-between">
                            <p className="text-[9px] font-bold text-gray-300 truncate" title={item.name}>{item.name}</p>
                            <div className="flex items-center justify-between mt-1">
                              <p className="text-[8px] text-gray-500 font-mono">
                                {new Date(item.timestamp).toLocaleDateString('ar-EG')}
                              </p>
                              
                              {/* Individual Delete Button for User Folder Item */}
                              {deletingId === item.id && deleteProgress !== null ? (
                                <span className="text-[8px] text-red-500 font-mono font-bold animate-pulse">
                                  {deleteProgress}%
                                </span>
                              ) : (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation(); // Avoid triggering selection click!
                                    if (!window.confirm(`🗑️ هل أنت متأكد من حذف هذا الملف نهائياً؟\n\n(${item.name})`)) return;
                                    executeGlobalDeletion(
                                      'single_stealth',
                                      item.id,
                                      { item },
                                      loadForensics
                                    );
                                  }}
                                  title="حذف الملف نهائياً من الأرشيف"
                                  className="p-1 rounded-lg bg-gray-950 border border-gray-900 hover:border-red-500/50 text-gray-500 hover:text-red-400 transition-all cursor-pointer shrink-0"
                                >
                                  <Trash2 size={10} />
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Group bulk bottom buttons */}
                  {selectedMediaItems.length > 0 && (
                    <div className="sticky bottom-6 left-6 right-6 p-4 bg-[#111115]/95 backdrop-blur-xl border-2 border-emerald-500/30 rounded-3xl shadow-2xl flex items-center justify-between z-50 animate-in slide-in-from-bottom-5 duration-300">
                      <div className="text-right">
                        <p className="text-xs font-black text-white">إجراء معالجة المجموعات ({selectedMediaItems.length})</p>
                        <p className="text-[9px] text-gray-400">تطبيق الإعدام أو التنزيل الفوري</p>
                      </div>
                      <div className="flex gap-2">
                        <button 
                          onClick={downloadSelected}
                          className="p-2 px-4 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-xs text-white rounded-xl font-bold flex items-center gap-1.5 transition-all shadow-lg"
                        >
                          <Download size={14} />
                          <span>تحميل المحددة</span>
                        </button>
                        {deletingId === 'selected_items' && deleteProgress !== null ? (
                          <div className="flex items-center gap-3 bg-red-950/25 border border-red-500/20 p-2 rounded-xl">
                            <span className="text-[10px] text-red-400 font-bold font-mono">حذف: {deleteProgress}%</span>
                            <div className="w-20 bg-gray-950 rounded-full h-1.5 overflow-hidden border border-red-900">
                              <div className="bg-red-500 h-full transition-all duration-300" style={{ width: `${deleteProgress}%` }} />
                            </div>
                          </div>
                        ) : (
                          <button 
                            onClick={deleteSelected}
                            className="p-2 px-4 bg-red-600 hover:bg-red-700 active:scale-95 text-xs text-white rounded-xl font-bold flex items-center gap-1.5 transition-all shadow-lg"
                          >
                            <Trash2 size={14} />
                            <span>حذف المحددة</span>
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
        </div>
      )}
    </motion.div>
  );
};
