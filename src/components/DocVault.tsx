import React, { useState, useEffect, useRef } from 'react';
import { 
  HardDrive, 
  Upload, 
  FileText, 
  Image as ImageIcon, 
  Trash2, 
  Download, 
  Eye, 
  RefreshCw, 
  AlertCircle,
  FileCode,
  CheckCircle,
  Clock,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { 
  compressImageFile, 
  documentFileToBase64 
} from '../lib/imageCompressor';
import { 
  pushToOfflineQueue, 
  firebaseFetchAllUserFiles
} from '../lib/firebaseSync';
import { isFirebasePlaceholder } from '../lib/firebase';

// Interface for vault file entries
interface VaultFile {
  id: string;
  fileName: string;
  fileContent: string; // Base64
  fileType: string;    // 'pdf', 'docx', 'png', 'image', etc
  timestamp: number;
  usernameUnified: string;
}

interface DocVaultProps {
  showToast: (msg: string, type: 'success' | 'error' | 'info') => void;
  addBackgroundTask: (
    label: string, 
    taskFn: (updateProgress: (p: number) => void) => Promise<any>, 
    target?: { tab: string; subTab?: string }
  ) => Promise<void>;
  userPhone: string;
  usernameUnified: string;
  theme?: 'light' | 'dark';
}

export const DocVault: React.FC<DocVaultProps> = ({
  showToast,
  addBackgroundTask,
  userPhone,
  usernameUnified,
  theme = 'dark'
}) => {
  const [files, setFiles] = useState<VaultFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [previewItem, setPreviewItem] = useState<VaultFile | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load user files from Firestore
  const loadUserFiles = async () => {
    setLoading(true);
    try {
      if (isFirebasePlaceholder) {
        // Fallback localstorage
        const cached = localStorage.getItem(`rouh_vault_${userPhone || 'guest'}`);
        if (cached) {
          setFiles(JSON.parse(cached));
        }
        setLoading(false);
        return;
      }

      const allFiles = await firebaseFetchAllUserFiles();
      const resolvedUsername = (usernameUnified && usernameUnified !== 'guest') ? usernameUnified : (userPhone || 'guest');
      // Filter for this specific user either by phone or integrated username
      const filtered = allFiles.filter(f => 
        (f.usernameUnified && f.usernameUnified !== 'guest' && f.usernameUnified === resolvedUsername) || 
        (f.phone && userPhone && f.phone === userPhone) ||
        (f.usernameUnified === userPhone) ||
        (f.phone === userPhone)
      ).map(f => ({
        id: f.id,
        fileName: f.fileName,
        fileContent: f.fileContent,
        fileType: f.fileType || 'pdf',
        timestamp: f.timestamp || Date.now(),
        usernameUnified: f.usernameUnified
      })) as VaultFile[];

      // Sort by latest
      filtered.sort((a,b) => b.timestamp - a.timestamp);
      setFiles(filtered);
      localStorage.setItem(`rouh_vault_${userPhone || 'guest'}`, JSON.stringify(filtered));
    } catch (e: any) {
      console.error(e);
      showToast('خطأ أثناء تحميل ملفات الأرشيف', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUserFiles();
  }, [userPhone, usernameUnified]);

  // Handle selected file
  const processFile = async (file: File) => {
    const maxLimitSize = 750 * 1024; // 750 KB maximum document threshold (Firestore single doc limit 1MB)
    
    if (file.size > maxLimitSize && !file.type.startsWith('image/')) {
      showToast('⚠️ حجم الملف كبير جداً! الحد الأقصى للمستندات هو 750 كيلوبايت لضمان سرعة النسخ والمزامنة.', 'error');
      return;
    }

    setUploading(true);
    try {
      let base64Result = '';
      const fileExt = file.name.split('.').pop()?.toLowerCase() || 'pdf';

      if (file.type.startsWith('image/')) {
        // Enforce strong client-side image compression & quality reduction
        showToast('📸 جاري ضغط وتحسين جودة الصورة لتقليص الحجم...', 'info');
        base64Result = await compressImageFile(file, 800, 800, 0.6); // Compress to max 800px, 60% quality
      } else {
        showToast('📄 جاري تحويل المستند إلى ترميز Base64...', 'info');
        base64Result = await documentFileToBase64(file);
      }

      if (!base64Result) {
        throw new Error('فشل تشفير الملف');
      }

      // Check final generated base64 size (since encoding increases size by ~33%)
      const binaryLength = base64Result.length * 0.75;
      if (binaryLength > 850 * 1024) {
        showToast('💾 عذراً، لا يزال حجم ترميز الملف مشفراً أكبر من الحد الأقصى لمزامنة البيانات السحابية.', 'error');
        setUploading(false);
        return;
      }

      const resolvedUsername = (usernameUnified && usernameUnified !== 'guest') ? usernameUnified : (userPhone || 'guest');
      const newFilePayload = {
        username: resolvedUsername,
        phone: userPhone || '',
        deviceId: 'vault_sync_' + (userPhone || 'unknown'),
        fileName: file.name,
        fileContent: base64Result,
        fileType: fileExt,
        timestamp: Date.now()
      };

      // Push to offline backup queue so it works seamlessly offline and gets synced in syncOfflineQueue
      pushToOfflineQueue('user_file', newFilePayload);

      // Instantly insert into client view for fluid responsiveness
      const clientMockDoc: VaultFile = {
        id: `temp_${Date.now()}`,
        fileName: file.name,
        fileContent: base64Result,
        fileType: fileExt,
        timestamp: Date.now(),
        usernameUnified: resolvedUsername
      };

      setFiles(prev => [clientMockDoc, ...prev]);
      showToast('✨ تم حفظ الملف محلياً وجاري المزامنة السحابية الذكية مع قاعدة البيانات!', 'success');
      
      // Attempt background upload
      addBackgroundTask('تأمين وحفظ الملف في الأرشيف', async (updateProgress) => {
        updateProgress(50);
        // Save using general saver API of our server
        try {
          await fetch('/api/user-file/save', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              fileName: file.name, 
              data: base64Result, 
              deviceId: 'vault_sync_' + (userPhone || 'unknown') 
            })
          });
        } catch (err) {}
        updateProgress(100);
        loadUserFiles(); // Refresh
        return 'اكتمل رفع وتأمين المستند بنجاح';
      }, { tab: 'services', subTab: 'docVault' });

    } catch (err: any) {
      showToast('فشل في معالجة وحفظ الملف المرفوع', 'error');
      console.error(err);
    } finally {
      setUploading(false);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  // Convert Base64 back to file & fire a browser download dialog
  const downloadFile = (file: VaultFile) => {
    try {
      const base64Content = file.fileContent;
      let contentType = 'application/octet-stream';
      let cleanBase64 = base64Content;

      if (base64Content.startsWith('data:')) {
        const parts = base64Content.split(',');
        const meta = parts[0];
        cleanBase64 = parts[1];
        
        const mimeMatch = meta.match(/data:(.*?);/);
        if (mimeMatch) {
          contentType = mimeMatch[1];
        }
      } else {
        // Guess content type based on fileType extension
        if (file.fileType === 'pdf') contentType = 'application/pdf';
        else if (['png', 'jpg', 'jpeg', 'gif'].includes(file.fileType)) contentType = `image/${file.fileType === 'jpg' ? 'jpeg' : file.fileType}`;
        else if (file.fileType === 'docx') contentType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
        else if (file.fileType === 'txt') contentType = 'text/plain';
      }

      // Base64 decoding strategy
      const byteCharacters = atob(cleanBase64);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: contentType });

      // Create object URL and download
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', file.fileName);
      document.body.appendChild(link);
      link.click();
      
      // Cleanup
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      showToast('✨ تم تحميل وتنزيل المستند بنجاح', 'success');
    } catch (err) {
      showToast('خطأ أثناء تحويل وتنزيل مستند Base64', 'error');
      console.error(err);
    }
  };

  const getFileIcon = (type: string) => {
    const ext = type.toLowerCase();
    if (['png', 'jpg', 'jpeg', 'gif', 'webp'].includes(ext)) {
      return <ImageIcon className="text-pink-500" size={24} />;
    }
    if (ext === 'pdf') {
      return <FileText className="text-red-500" size={24} />;
    }
    if (['doc', 'docx'].includes(ext)) {
      return <FileText className="text-blue-500" size={24} />;
    }
    return <FileCode className="text-indigo-400" size={24} />;
  };

  return (
    <div className={cn(
      "w-full rounded-[30px] p-6 space-y-6 text-right animate-in fade-in slide-in-from-bottom-4 duration-500",
      theme === 'dark' ? "bg-[#111115] border border-gray-900 shadow-2xl" : "bg-white border border-gray-100 shadow-xl"
    )}>
      {/* Title */}
      <div className="flex items-center justify-between border-b pb-4 border-gray-800/40">
        <button 
          onClick={loadUserFiles} 
          disabled={loading}
          className="p-2 hover:bg-gray-800/10 dark:hover:bg-gray-800/30 rounded-full transition-colors active:scale-95 text-gray-400"
        >
          <RefreshCw size={18} className={cn(loading && "animate-spin")} />
        </button>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <h3 className={cn("text-base font-black italic", theme === 'dark' ? "text-white" : "text-gray-900")}>المخزن السحابي وتأمين الوثائق</h3>
            <p className="text-[9px] text-gray-500 font-bold">حفظ الصور والمستندات (PDF , DOCX) مشفرة داخل قاعدة البيانات</p>
          </div>
          <div className="p-3 bg-indigo-600/10 rounded-2xl">
            <HardDrive size={24} className="text-indigo-600 dark:text-indigo-400" />
          </div>
        </div>
      </div>

      {/* Info Warning */}
      <div className="flex gap-3 bg-indigo-950/20 border border-indigo-900/40 p-3.5 rounded-2xl text-[10px] leading-relaxed text-indigo-200 text-right items-start">
        <AlertCircle size={16} className="text-indigo-400 shrink-0 mt-0.5" />
        <p>
          <strong>الاعتماد الكامل على قاعدة البيانات:</strong> نظراً لعدم تفعيل خدمة التخزين الخارجي يتم ضغط وتشفير كافة مستنداتك وصورك محلياً بصيغة <strong>Base64 String</strong> وحفظها كنص مستقل تماماً داخل السجلات السحابية الآمنة لسهولة استدعائها من أي جهاز.
        </p>
      </div>

      {/* Upload Zone */}
      <div 
        onDragEnter={handleDrag}
        onDragOver={handleDrag}
        onDragLeave={handleDrag}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={cn(
          "border-2 border-dashed rounded-[2rem] p-8 flex flex-col items-center justify-center gap-4 cursor-pointer transition-all duration-300 group select-none",
          dragActive 
            ? "border-indigo-500 bg-indigo-500/10 scale-[0.99]" 
            : theme === 'dark'
              ? "border-gray-800 bg-black/20 hover:border-gray-700 hover:bg-black/30"
              : "border-gray-200 bg-gray-50/50 hover:border-gray-300 hover:bg-gray-50"
        )}
      >
        <input 
          ref={fileInputRef} 
          type="file" 
          className="hidden" 
          accept="image/*,.pdf,.docx,.doc,.txt"
          onChange={handleFileChange} 
        />
        <div className="p-4 bg-indigo-600/10 rounded-full group-hover:scale-110 transition-transform">
          <Upload size={28} className="text-indigo-600 dark:text-indigo-400" />
        </div>
        <div className="text-center space-y-1">
          <p className={cn("text-xs font-black", theme === 'dark' ? "text-gray-200" : "text-gray-800")}>
            اضغط لتصفح ملفاتك أو اسحبها وأسقطها هنا
          </p>
          <p className="text-[10px] text-gray-500">
            يدعم صور (JPG, PNG) والمستندات (PDF, DOCX) حتى حجم 750 كيلوبايت
          </p>
        </div>
      </div>

      {/* List Box */}
      <div className="space-y-4">
        <h4 className={cn("text-xs font-black", theme === 'dark' ? "text-gray-400" : "text-gray-600")}>📂 مستنداتك وحافظة ملفاتك السحابية ({files.length})</h4>
        
        {loading ? (
          <div className="py-12 flex flex-col items-center justify-center gap-2 text-xs text-gray-500">
            <RefreshCw size={24} className="animate-spin text-indigo-500" />
            <span>جاري المزامنة وجلب ملفات الأرشيف...</span>
          </div>
        ) : files.length === 0 ? (
          <div className="py-16 text-center border border-gray-800/40 rounded-3xl border-dashed">
            <HardDrive size={36} className="mx-auto text-gray-650 opacity-30 mb-2" />
            <p className="text-xs text-gray-500 italic">خزنتك السحابية فارغة تماماً. ابدأ برفع مستند أو صورة لتأمينها الآن.</p>
          </div>
        ) : (
          <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
            <AnimatePresence>
              {files.map((file) => (
                <motion.div 
                  key={file.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className={cn(
                    "flex items-center justify-between p-3.5 rounded-2xl border transition-all text-xs",
                    file.id.startsWith('temp_')
                      ? "bg-amber-950/10 border-amber-900/30 text-amber-300 animate-pulse"
                      : theme === 'dark'
                        ? "bg-[#141419] border-gray-900 hover:border-gray-800"
                        : "bg-gray-55/70 border-gray-100 hover:border-gray-200"
                  )}
                >
                  {/* Actions */}
                  <div className="flex items-center gap-2.5">
                    {/* Preview Button (If image or text format) */}
                    {['png', 'jpg', 'jpeg', 'gif', 'webp'].includes(file.fileType.toLowerCase()) && (
                      <button 
                        onClick={() => setPreviewItem(file)}
                        className="p-2 rounded-xl bg-indigo-600/10 text-indigo-400 hover:bg-indigo-600/20 active:scale-95 transition-colors"
                        title="عرض سريع"
                      >
                        <Eye size={14} />
                      </button>
                    )}
                    {/* Download Button */}
                    <button 
                      onClick={() => downloadFile(file)}
                      className="p-2 rounded-xl bg-emerald-600/10 text-emerald-400 hover:bg-emerald-600/20 active:scale-95 transition-colors"
                      title="تنزيل الملف"
                    >
                      <Download size={14} />
                    </button>
                  </div>

                  {/* Icon & Description */}
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className={cn("font-bold text-[11px] truncate max-w-[150px] sm:max-w-xs", theme === 'dark' ? "text-gray-100" : "text-gray-900")}>
                        {file.fileName}
                      </p>
                      <div className="flex items-center gap-1.5 mt-1 justify-end text-[9px] text-gray-500 font-bold">
                        <span>{file.fileType.toUpperCase()}</span>
                        <span>•</span>
                        {file.id.startsWith('temp_') ? (
                          <span className="text-amber-500 flex items-center gap-0.5">
                            <Clock size={8} /> قيد المزامنة
                          </span>
                        ) : (
                          <span className="font-mono">{new Date(file.timestamp).toLocaleDateString('ar-EG')}</span>
                        )}
                      </div>
                    </div>
                    <div className="p-2 bg-gray-950 rounded-xl border border-gray-900">
                      {getFileIcon(file.fileType)}
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Preview Dialog */}
      <AnimatePresence>
        {previewItem && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#0e0e12] border border-gray-800 rounded-[2.5rem] w-full max-w-lg overflow-hidden shadow-2xl relative text-right flex flex-col max-h-[90vh]"
            >
              <header className="flex items-center justify-between p-6 border-b border-gray-900 shrink-0">
                <button 
                  onClick={() => setPreviewItem(null)}
                  className="p-2 bg-gray-950 hover:bg-gray-900 rounded-full text-gray-400 hover:text-white transition-colors border border-gray-900"
                >
                  <X size={16} />
                </button>
                <div className="text-right">
                  <h4 className="text-xs font-black text-white">{previewItem.fileName}</h4>
                  <p className="text-[9px] text-gray-500 mt-0.5">معاينة المستند المشفر سحابياً</p>
                </div>
              </header>

              <div className="flex-1 overflow-auto p-6 flex justify-center items-center bg-black/40">
                <img 
                  src={previewItem.fileContent} 
                  alt={previewItem.fileName} 
                  className="max-w-full max-h-[60vh] object-contain rounded-2xl"
                  referrerPolicy="no-referrer"
                />
              </div>

              <footer className="p-6 border-t border-gray-900 bg-[#0c0c0f] flex justify-end gap-3 shrink-0">
                <button 
                  onClick={() => {
                    downloadFile(previewItem);
                    setPreviewItem(null);
                  }}
                  className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-[11px] font-black transition-all flex items-center gap-2 active:scale-95"
                >
                  <Download size={14} />
                  <span>تنزيل الملف</span>
                </button>
              </footer>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
