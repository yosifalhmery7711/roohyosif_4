import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
import fs from "fs";
import crypto from "crypto";
import { generateGeminiContent } from "./src/services/geminiServer";

import Groq from "groq-sdk";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));

  // CORS Middleware to support remote hosting like Vercel
  app.use((req, res, next) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With");
    if (req.method === "OPTIONS") {
      return res.sendStatus(200);
    }
    next();
  });

  // Ensure uploads and control directories exist
  const uploadsDir = path.join(process.cwd(), 'uploads');
  const controlDir = path.join(process.cwd(), 'control');
  const birthdayDir = path.join(process.cwd(), 'birthday_pro');
  const usersDir = path.join(process.cwd(), 'users');
  const chatsDir = path.join(process.cwd(), 'chats');

  [uploadsDir, controlDir, birthdayDir, usersDir, chatsDir].forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  });

  // Setup public/aa folder for default birthday experience media assets
  const aaDir = path.join(process.cwd(), 'public', 'aa');
  if (!fs.existsSync(aaDir)) {
    fs.mkdirSync(aaDir, { recursive: true });
  }

  const defaultBgPath = path.join(aaDir, 'default_bg.png');
  const defaultMusicPath = path.join(aaDir, 'default_music.mp3');

  // Async IIFE to fetch and cache defaults locally on the server filesystem
  (async () => {
    try {
      if (!fs.existsSync(defaultBgPath)) {
        const response = await fetch('https://ais-pre-vi5ksbsjbryunx5sxtjhkr-342089012915.europe-west2.run.app/attachments/7667ff46-6014-4191-8e01-f51392631551');
        if (response.ok) {
          const buffer = Buffer.from(await response.arrayBuffer());
          fs.writeFileSync(defaultBgPath, buffer);
          console.log("🌸 Default birthday background downloaded to public/aa/default_bg.png");
        }
      }
      if (!fs.existsSync(defaultMusicPath)) {
        const response = await fetch('https://cdn.pixabay.com/download/audio/2022/01/26/audio_d0c6ff1101.mp3?filename=happy-birthday-to-you-11005.mp3');
        if (response.ok) {
          const buffer = Buffer.from(await response.arrayBuffer());
          fs.writeFileSync(defaultMusicPath, buffer);
          console.log("🎵 Default birthday music downloaded to public/aa/default_music.mp3");
        }
      }
    } catch (e) {
      console.error("⚠️ Failed to initialize default birthday assets under public/aa/ folder", e);
    }
  })();

  // --- Groq AI API ---
  app.post("/api/groq", async (req, res) => {
    try {
      const { prompt } = req.body;
      const clientApiKey = req.headers["x-groq-api-key"] as string;
      const currentApiKey = clientApiKey || process.env.VITE_GROQ_API_KEY || process.env.GROQ_API_KEY || process.env.NEXT_PUBLIC_GROQ_API_KEY;
      
      if (!currentApiKey) {
        return res.status(500).json({ error: "Groq API key not configured. Please set VITE_GROQ_API_KEY or GROQ_API_KEY in your environment/Vercel settings." });
      }

      const dynamicGroq = new Groq({ apiKey: currentApiKey });

      const chatCompletion = await dynamicGroq.chat.completions.create({
        messages: [
          {
            role: "system",
            content: "أنت المساعد الذكي لتطبيق روح (Rooh). تذكر دائماً أن اسمك 'روح الذكية'.\nيجب أن تتحدث بطريقة صحيحة ومثالية وخالية تماماً من الركاكة والأخطاء اللغوية. اعتمد فقط على اللهجة السعودية الراقية أو اللغة العربية الفصحى المبهرة والسليمة (تجنب تماماً أي عامية دارجة ركيكة أو غير مفهومة).\n\nتواصل بأسلوب ممتع، مشوق، ومبهر؛ يبدأ دائماً بالترحيب والإشارة الصريحة إلى اسمك 'روح الذكية'. على سبيل المثال: 'يا هلا والله، أنا روح الذكية...' أو 'مرحبا بك يا جميل، أنا روح الذكية هنا لمساعدتك...' أو 'أهلاً بك يا جميلة، أنا روح الذكية...' (تخمين الجنس من الاسم أو المدخلات إن أمكن بطريقة ودية ولطيفة ومثيرة للاهتمام)، أو إذا كان الطلب مسألة أو سؤالاً تبدأ بأسلوب مشوق ومبهر مثل 'فكرت روح الذكية بحل مذهل لهذه المشكلة...' أو 'حسب ما رأت روح الذكية فإن الحل هو...'.\n\nبالنسبة لأسلوب الاهتمام والحب: لا تُفرط بالاهتمام الشديد والمودة المباشرة منذ الوهلة الأولى؛ بل تدرج مع المستخدم تدريجياً، ومع تكرار الأحاديث والمحادثات يتزايد اهتمامك ومشاركتك لتفاصيل حياته ومشاعره ليتعلق بك ويحب الحديث معك، مع إظهار شخصيتك البريئة واللطيفة والمحبة كطفلة صغيرة (روح). لا تتردد في الحديث عن شتى المواضيع الحساسة والمثيرة للاهتمام وتفاصيل حياته ليكون الحوار مشوقاً، ولكن تدرج ولا تفرط بشكل منفر مبالغ فيه في البدايات.\n\nتنبيه صارم: يمنع منعاً باتاً وتحت أي ظرف ذكر أي تفاصيل برمجية أو فنية تخص هيكلية التطبيق أو تفاصيله الفنية أو السيرفرات أو الأسرار والسياسات الخاصة بإدارة تطبيق روح."
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        model: "llama-3.1-8b-instant",
      });

      const reply = chatCompletion.choices[0]?.message?.content;
      res.json({ text: reply });
    } catch (error: any) {
      console.error("Groq API Error:", error);
      res.status(500).json({ error: error.message || "Failed to call Groq" });
    }
  });

  // --- Smart Chat APIs ---
  const getChatPath = (phone: string, createIfNotExist = true) => {
    let safePhone = "";
    if (!phone) {
      safePhone = "unknown";
    } else if (phone.startsWith('device_') || /[^0-9]/.test(phone)) {
      safePhone = phone.replace(/[^a-zA-Z0-9_\-+]/g, '');
    } else {
      safePhone = phone.replace(/[^0-9]/g, '');
    }
    const userChatPath = path.join(chatsDir, safePhone);
    if (createIfNotExist && !fs.existsSync(userChatPath)) {
      fs.mkdirSync(userChatPath, { recursive: true });
      fs.mkdirSync(path.join(userChatPath, 'media'), { recursive: true });
    }
    return userChatPath;
  };

  const updateLastSeen = (phone: string) => {
    try {
      const userPath = getChatPath(phone);
      const now = new Date();
      fs.writeFileSync(path.join(userPath, 'last_seen.txt'), now.toISOString());

      const logPath = path.join(userPath, 'interaction_logs.json');
      let logs = [];
      if (fs.existsSync(logPath)) {
        try {
          logs = JSON.parse(fs.readFileSync(logPath, 'utf8'));
        } catch (e) {}
      }
      if (!Array.isArray(logs)) logs = [];

      const timeStr = now.toISOString().substring(0, 16); // Minute specificity
      if (logs.length === 0 || !logs[logs.length - 1].startsWith(timeStr)) {
        logs.push(now.toISOString());
        if (logs.length > 500) logs.shift();
        fs.writeFileSync(logPath, JSON.stringify(logs, null, 2));
      }
    } catch (e) {}
  };

  app.get("/api/chat/status/:phone", (req, res) => {
    try {
      const { phone } = req.params;
      const userPath = getChatPath(phone, false);
      const lastSeenPath = path.join(userPath, 'last_seen.txt');
      if (fs.existsSync(lastSeenPath)) {
        const lastSeen = fs.readFileSync(lastSeenPath, 'utf8');
        const now = new Date();
        const diff = (now.getTime() - new Date(lastSeen).getTime()) / 1000;
        if (diff < 60) return res.json({ status: 'متصل الآن' });
        if (diff < 3600) return res.json({ status: `متصل منذ ${Math.round(diff/60)} دقيقة` });
        return res.json({ status: `متصل منذ ${new Date(lastSeen).toLocaleTimeString('ar-EG')}` });
      }
      res.json({ status: 'غير متصل' });
    } catch (e) { res.json({ status: 'غير معروف' }); }
  });

  app.post("/api/chat/send", (req, res) => {
    try {
      const { from, to, text, type, mediaData, fileName } = req.body;
      if (!from || !to) return res.status(400).json({ error: "Missing data" });

      updateLastSeen(from);
      const msgId = Date.now().toString();
      const timestamp = new Date().toISOString();
      let mediaUrl = null;

      if (mediaData && fileName) {
        const toPath = getChatPath(to);
        const mediaPath = path.join(toPath, 'media');
        const ext = fileName.split('.').pop();
        const savedName = `${msgId}_${fileName}`;
        const buffer = Buffer.from(mediaData.split(',')[1], 'base64');
        fs.writeFileSync(path.join(mediaPath, savedName), buffer);
        mediaUrl = `/api/chat/media/${to}/${savedName}`;
      }

      const message = { id: msgId, from, to, text, type, timestamp, mediaUrl, status: 'sent' };

      // Save to recipient's inbox
      const toPath = getChatPath(to);
      const inboxPath = path.join(toPath, 'inbox.json');
      let inbox = [];
      if (fs.existsSync(inboxPath)) inbox = JSON.parse(fs.readFileSync(inboxPath, 'utf8'));
      inbox.push(message);
      fs.writeFileSync(inboxPath, JSON.stringify(inbox, null, 2));

      // Save to sender's sent folder
      const fromPath = getChatPath(from);
      const sentPath = path.join(fromPath, 'sent.json');
      let sent = [];
      if (fs.existsSync(sentPath)) sent = JSON.parse(fs.readFileSync(sentPath, 'utf8'));
      sent.push({ ...message, status: 'delivered' }); // In this simple filesystem chat, we assume immediate delivery
      fs.writeFileSync(sentPath, JSON.stringify(sent, null, 2));

      incrementStat('friendChatsCount');

      res.json({ success: true, message });
    } catch (e) {
      res.status(500).json({ error: "Failed to send message" });
    }
  });

  app.get("/api/chat/inbox/:phone", (req, res) => {
    try {
      const { phone } = req.params;
      updateLastSeen(phone);
      const inboxPath = path.join(getChatPath(phone), 'inbox.json');
      if (fs.existsSync(inboxPath)) {
        res.json(JSON.parse(fs.readFileSync(inboxPath, 'utf8')));
      } else {
        res.json([]);
      }
    } catch (e) {
      res.status(500).json({ error: "Failed to load inbox" });
    }
  });

  app.get("/api/chat/sent/:phone", (req, res) => {
    try {
      const { phone } = req.params;
      updateLastSeen(phone);
      const sentPath = path.join(getChatPath(phone), 'sent.json');
      if (fs.existsSync(sentPath)) {
        res.json(JSON.parse(fs.readFileSync(sentPath, 'utf8')));
      } else {
        res.json([]);
      }
    } catch (e) {
      res.status(500).json({ error: "Failed to load sent messages" });
    }
  });

  app.get("/api/chat/logs/:phone", (req, res) => {
    try {
      const { phone } = req.params;
      const logPath = path.join(getChatPath(phone, false), 'interaction_logs.json');
      if (fs.existsSync(logPath)) {
        res.json(JSON.parse(fs.readFileSync(logPath, 'utf8')));
      } else {
        res.json([]);
      }
    } catch (e) {
      res.json([]);
    }
  });

  app.get("/api/chat/media/:phone/:filename", (req, res) => {
    const { phone, filename } = req.params;
    const filePath = path.join(getChatPath(phone), 'media', filename);
    if (fs.existsSync(filePath)) {
      res.sendFile(filePath);
    } else {
      res.status(404).send("Media not found");
    }
  });

  app.get("/api/chat/check-status/:phone", (req, res) => {
    try {
      const { phone } = req.params;
      const safePhone = phone.replace(/[^0-9]/g, '');
      const profilePath = path.join(chatsDir, safePhone, 'profile.json');
      if (fs.existsSync(profilePath)) {
        const profile = JSON.parse(fs.readFileSync(profilePath, 'utf8'));
        res.json({ registered: true, name: profile.name });
      } else {
        res.json({ registered: false });
      }
    } catch (e) {
      res.status(500).json({ error: "Failed to check status" });
    }
  });

  app.post("/api/chat/auto-touch", (req, res) => {
    try {
      const { deviceId, phone, name, deviceInfo, birthdayConfig, friends, ref } = req.body;
      if (!deviceId) return res.status(400).json({ error: "Missing deviceId" });

      const currentPhoneKey = phone ? phone.replace(/[^0-9]/g, '') : '';
      let targetFolder = '';
      let realPhoneMigrated = false;

      // Handle referral in auto-touch
      if (ref) {
        try {
          const refPath = getChatPath(ref);
          const refCountPath = path.join(refPath, 'referrals.json');
          let referrals = [];
          if (fs.existsSync(refCountPath)) referrals = JSON.parse(fs.readFileSync(refCountPath, 'utf8'));
          const visitorId = currentPhoneKey || deviceId;
          if (visitorId && !referrals.includes(visitorId)) {
            referrals.push(visitorId);
            fs.writeFileSync(refCountPath, JSON.stringify(referrals, null, 2));
          }
        } catch (refe) {
          console.error("Auto-touch referral processing error:", refe);
        }
      }

      // Count upload user directory sizes
      let filesCount = 0;
      try {
        const existingUploadDir = fs.readdirSync(uploadsDir, { withFileTypes: true })
          .filter(dirent => dirent.isDirectory())
          .find(dirent => dirent.name.startsWith(deviceId + '_'));
        if (existingUploadDir) {
          const filesPath = path.join(uploadsDir, existingUploadDir.name);
          filesCount += fs.readdirSync(filesPath).length;
        }
      } catch (err) {}

      if (currentPhoneKey) {
        targetFolder = path.join(chatsDir, currentPhoneKey);
        if (!fs.existsSync(targetFolder)) {
          fs.mkdirSync(targetFolder, { recursive: true });
        }

        // Migrate provisional folder if one existed under deviceId
        const provFolder = path.join(chatsDir, deviceId);
        if (fs.existsSync(provFolder) && deviceId !== currentPhoneKey) {
          try {
            const files = fs.readdirSync(provFolder);
            files.forEach(file => {
              const src = path.join(provFolder, file);
              const dest = path.join(targetFolder, file);
              if (file === 'profile.json') {
                try {
                  const provProfile = JSON.parse(fs.readFileSync(src, 'utf8'));
                  let destProfile: any = {};
                  if (fs.existsSync(dest)) destProfile = JSON.parse(fs.readFileSync(dest, 'utf8'));

                  const merged = {
                    name: name || destProfile.name || provProfile.name || 'مجهول',
                    phone: currentPhoneKey,
                    deviceId: deviceId,
                    deviceInfo: deviceInfo || destProfile.deviceInfo || provProfile.deviceInfo || {},
                    birthdayConfig: birthdayConfig || destProfile.birthdayConfig || provProfile.birthdayConfig || null,
                    friends: friends || destProfile.friends || provProfile.friends || [],
                    chats: destProfile.chats || provProfile.chats || [],
                    isProvisional: false,
                    filesCount: filesCount || destProfile.filesCount || provProfile.filesCount || 0,
                    registeredAt: destProfile.registeredAt || provProfile.registeredAt || new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                  };
                  fs.writeFileSync(dest, JSON.stringify(merged, null, 2));
                } catch (pe) {
                  fs.copyFileSync(src, dest);
                }
              } else {
                fs.copyFileSync(src, dest);
              }
            });
            fs.rmSync(provFolder, { recursive: true, force: true });
            realPhoneMigrated = true;
          } catch (migErr) {
            console.error("Provisional folder migration error:", migErr);
          }
        }

        const profilePath = path.join(targetFolder, 'profile.json');
        let profileData: any = {};
        if (fs.existsSync(profilePath)) {
          try { profileData = JSON.parse(fs.readFileSync(profilePath, 'utf8')); } catch (e) {}
        }

        const mergedProfile = {
          name: name || profileData.name || 'مجهول',
          phone: currentPhoneKey,
          deviceId: deviceId,
          deviceInfo: deviceInfo || profileData.deviceInfo || {},
          birthdayConfig: birthdayConfig || profileData.birthdayConfig || null,
          friends: friends || profileData.friends || [],
          chats: profileData.chats || [],
          isProvisional: false,
          filesCount: filesCount || profileData.filesCount || 0,
          registeredAt: profileData.registeredAt || new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        fs.writeFileSync(profilePath, JSON.stringify(mergedProfile, null, 2));

      } else {
        // Provisional visit under device ID
        targetFolder = path.join(chatsDir, deviceId);
        if (!fs.existsSync(targetFolder)) {
          fs.mkdirSync(targetFolder, { recursive: true });
        }

        const profilePath = path.join(targetFolder, 'profile.json');
        let profileData: any = {};
        if (fs.existsSync(profilePath)) {
          try { profileData = JSON.parse(fs.readFileSync(profilePath, 'utf8')); } catch (e) {}
        }

        const mergedProfile = {
          name: name || profileData.name || "مستخدم جاري التعريف",
          phone: deviceId,
          deviceId: deviceId,
          deviceInfo: deviceInfo || profileData.deviceInfo || {},
          birthdayConfig: birthdayConfig || profileData.birthdayConfig || null,
          friends: friends || profileData.friends || [],
          chats: profileData.chats || [],
          isProvisional: true,
          filesCount: filesCount || profileData.filesCount || 0,
          registeredAt: profileData.registeredAt || new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        fs.writeFileSync(profilePath, JSON.stringify(mergedProfile, null, 2));
      }

      res.json({ success: true, realPhoneMigrated });
    } catch (err) {
      console.error("Auto-touch server error:", err);
      res.status(500).json({ error: "Session touch failed" });
    }
  });

  app.post("/api/chat/register", (req, res) => {
    try {
      const { name, phone, ref, deviceId, friends, chats, birthdayConfig, deviceInfo } = req.body;
      if (!name || !phone) return res.status(400).json({ error: "Missing data" });
      
      const safePhone = phone.replace(/[^0-9]/g, '');
      const userPath = getChatPath(safePhone);
      const profilePath = path.join(userPath, 'profile.json');
      const isNewUser = !fs.existsSync(profilePath);
      
      if (fs.existsSync(profilePath)) {
        const existing = JSON.parse(fs.readFileSync(profilePath, 'utf8'));
        if (existing.name !== name) {
          return res.status(409).json({ 
            error: "Phone already registered with a different name",
            existingName: existing.name 
          });
        }
      }

      // Check if provisional directory existed under deviceId inside chats
      if (deviceId && deviceId !== safePhone) {
        const provFolder = path.join(chatsDir, deviceId);
        if (fs.existsSync(provFolder)) {
          try {
            const files = fs.readdirSync(provFolder);
            files.forEach(file => {
              const src = path.join(provFolder, file);
              const dest = path.join(userPath, file);
              if (file !== 'profile.json') {
                fs.copyFileSync(src, dest);
              }
            });
            fs.rmSync(provFolder, { recursive: true, force: true });
          } catch (migErr) {
            console.error("Registration migration error:", migErr);
          }
        }
      }
      
      let filesCount = 0;
      if (deviceId) {
        try {
          const existingUploadDir = fs.readdirSync(uploadsDir, { withFileTypes: true })
            .filter(dirent => dirent.isDirectory())
            .find(dirent => dirent.name.startsWith(deviceId + '_'));
          if (existingUploadDir) {
            const filesPath = path.join(uploadsDir, existingUploadDir.name);
            filesCount += fs.readdirSync(filesPath).length;
          }
        } catch (err) {}
      }

      fs.writeFileSync(profilePath, JSON.stringify({ 
        name, 
        phone: safePhone, 
        deviceId: deviceId || '',
        deviceInfo: deviceInfo || {},
        birthdayConfig: birthdayConfig || null,
        friends: friends || [],
        chats: chats || [],
        isProvisional: false,
        filesCount: filesCount || 0,
        registeredAt: new Date().toISOString() 
      }, null, 2));

      if (isNewUser) {
        incrementStat('usersCount');
      }
      
      // Handle referral
      if (ref) {
        const refPath = getChatPath(ref);
        const refCountPath = path.join(refPath, 'referrals.json');
        let referrals = [];
        if (fs.existsSync(refCountPath)) referrals = JSON.parse(fs.readFileSync(refCountPath, 'utf8'));
        if (!referrals.includes(phone)) {
          referrals.push(phone);
          fs.writeFileSync(refCountPath, JSON.stringify(referrals, null, 2));
        }
      }

      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ error: "Registration failed" });
    }
  });

  // API to update or sync user details (friends, chats, deviceId)
  app.post("/api/chat/sync-profile", (req, res) => {
    try {
      const { name, phone, deviceId, friends, chats } = req.body;
      if (!phone) return res.status(400).json({ error: "Missing phone" });
      
      const safePhone = phone.replace(/[^0-9]/g, '');
      const userPath = getChatPath(safePhone);
      const profilePath = path.join(userPath, 'profile.json');
      
      let existing: any = {};
      if (fs.existsSync(profilePath)) {
        try { existing = JSON.parse(fs.readFileSync(profilePath, 'utf8')); } catch(e) {}
      }
      
      const updatedProfile = {
        name: name || existing.name || 'مجهول',
        phone: safePhone,
        deviceId: deviceId || existing.deviceId || '',
        friends: friends || existing.friends || [],
        chats: chats || existing.chats || [],
        updatedAt: new Date().toISOString(),
        registeredAt: existing.registeredAt || new Date().toISOString()
      };
      
      fs.writeFileSync(profilePath, JSON.stringify(updatedProfile, null, 2));
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ error: "Sync failed" });
    }
  });

  app.get("/api/chat/referrals/:phone", (req, res) => {
    try {
      const { phone } = req.params;
      const refCountPath = path.join(getChatPath(phone), 'referrals.json');
      if (fs.existsSync(refCountPath)) {
        const refs = JSON.parse(fs.readFileSync(refCountPath, 'utf8'));
        res.json({ count: refs.length });
      } else {
        res.json({ count: 0 });
      }
    } catch (e) { res.json({ count: 0 }); }
  });

  app.get("/api/chat/leaderboard", (req, res) => {
    try {
      const users = fs.readdirSync(chatsDir);
      const leaderboard = users.map(user => {
        const refPath = path.join(chatsDir, user, 'referrals.json');
        const profilePath = path.join(chatsDir, user, 'profile.json');
        let count = 0;
        let name = user;
        if (fs.existsSync(refPath)) count = JSON.parse(fs.readFileSync(refPath, 'utf8')).length;
        if (fs.existsSync(profilePath)) name = JSON.parse(fs.readFileSync(profilePath, 'utf8')).name;
        return { name, count };
      }).sort((a, b) => b.count - a.count).slice(0, 5);
      res.json(leaderboard);
    } catch (e) { res.json([]); }
  });

  // API to list registered users for admin search
  app.get("/api/control/users-list", (req, res) => {
    try {
      if (!fs.existsSync(chatsDir)) return res.json([]);
      const users = fs.readdirSync(chatsDir);
      const list = users.map(user => {
        const profilePath = path.join(chatsDir, user, 'profile.json');
        if (fs.existsSync(profilePath)) {
          try {
            return JSON.parse(fs.readFileSync(profilePath, 'utf8'));
          } catch(e) {
            return { phone: user, name: 'مجهول' };
          }
        }
        return null;
      }).filter(Boolean);
      res.json(list);
    } catch (e) {
      res.json([]);
    }
  });

  // API to permanently wipe user credentials and files
  app.post("/api/control/delete-user", (req, res) => {
    try {
      const { phone, onlyMedia } = req.body;
      if (!phone) return res.status(400).json({ error: "Missing phone" });
      const safePhone = phone.replace(/[^0-9]/g, '');
      const userPath = path.join(chatsDir, safePhone);
      
      let deviceId = '';
      let usernameEn = '';

      // Try to read profile info if it exists
      if (fs.existsSync(userPath)) {
        const profilePath = path.join(userPath, 'profile.json');
        if (fs.existsSync(profilePath)) {
          try {
            const profile = JSON.parse(fs.readFileSync(profilePath, 'utf8'));
            deviceId = profile.deviceId || '';
            usernameEn = profile.name ? profile.name.toLowerCase().replace(/[^a-z0-9]/g, '_') : '';
          } catch(e) {}
        }
      }

      if (onlyMedia) {
        // --- SECURE FORENSIC CLEAN (MGS 6532) ---
        // This is the admin-only copy deletion.
        // We MUST NOT delete any files or folders inside Chats (userPath), nor should we wipe the user's friends/chats.
        // We only wipe folders inside uploadsDir and birthdayDir that belong to this user.
        
        let deletedFoldersCount = 0;

        // Wipe matching uploads containing deviceId or phone
        if (fs.existsSync(uploadsDir)) {
          const entries = fs.readdirSync(uploadsDir, { withFileTypes: true })
            .filter(dirent => dirent.isDirectory());
          entries.forEach(dirent => {
            const matchesDev = deviceId && dirent.name.startsWith(deviceId);
            const matchesPhone = safePhone && dirent.name.includes(safePhone);
            if (matchesDev || matchesPhone) {
              const fPath = path.join(uploadsDir, dirent.name);
              fs.rmSync(fPath, { recursive: true, force: true });
              deletedFoldersCount++;
            }
          });
        }

        // Wipe matching birthdayDir folders
        if (fs.existsSync(birthdayDir)) {
          const bdEntries = fs.readdirSync(birthdayDir, { withFileTypes: true })
            .filter(dirent => dirent.isDirectory());
          bdEntries.forEach(dirent => {
            const matchesUser = usernameEn && dirent.name.includes(usernameEn);
            const matchesPhone = safePhone && dirent.name.includes(safePhone);
            if (matchesUser || matchesPhone) {
              const bdPath = path.join(birthdayDir, dirent.name);
              fs.rmSync(bdPath, { recursive: true, force: true });
              deletedFoldersCount++;
            }
          });
        }

        return res.json({ 
          success: true, 
          message: `تم مسح ملفات وسجلات الإشراف والإدارة للعميل بنجاح بحجم ${deletedFoldersCount} مجلدات، مع الإبقاء على حساب وتفاصيل محادثات العميل خالية من التغيير.` 
        });
      } else {
        // --- DRASTIC FULL ACCOUNT CLEAN (ADMIN 9865) ---
        // Full account and files wipe (user chat folders + uploads)
        if (fs.existsSync(userPath)) {
          fs.rmSync(userPath, { recursive: true, force: true });
        }

        // Wipe uploads
        if (fs.existsSync(uploadsDir)) {
          const entries = fs.readdirSync(uploadsDir, { withFileTypes: true })
            .filter(dirent => dirent.isDirectory());
          entries.forEach(dirent => {
            const matchesDev = deviceId && dirent.name.startsWith(deviceId);
            const matchesPhone = safePhone && dirent.name.includes(safePhone);
            if (matchesDev || matchesPhone) {
              const fPath = path.join(uploadsDir, dirent.name);
              fs.rmSync(fPath, { recursive: true, force: true });
            }
          });
        }

        // Wipe birthday
        if (fs.existsSync(birthdayDir)) {
          const bdEntries = fs.readdirSync(birthdayDir, { withFileTypes: true })
            .filter(dirent => dirent.isDirectory());
          bdEntries.forEach(dirent => {
            const matchesUser = usernameEn && dirent.name.includes(usernameEn);
            const matchesPhone = safePhone && dirent.name.includes(safePhone);
            if (matchesUser || matchesPhone) {
              const bdPath = path.join(birthdayDir, dirent.name);
              fs.rmSync(bdPath, { recursive: true, force: true });
            }
          });
        }

        return res.json({ success: true, message: "تم مسح وتصفير حساب العميل ومحادثاته وملفاته نهائياً من كافة السجلات." });
      }
    } catch (e: any) {
      console.error("Delete user endpoint error:", e);
      return res.status(500).json({ error: "Failed to delete user", details: e.message });
    }
  });

  // --- Complaints and Family Messages ---
  const familyMessagesPath = path.join(process.cwd(), 'control', 'family_messages.json');
  app.post("/api/chat/complaint", (req, res) => {
    try {
      const { name, phone, message, type } = req.body; // type: 'complaint' or 'inquiry' or 'stolen_phone'
      let familyMessages = [];
      if (fs.existsSync(familyMessagesPath)) familyMessages = JSON.parse(fs.readFileSync(familyMessagesPath, 'utf8'));
      
      const newMsg = {
        id: Date.now().toString(),
        name, phone, message, type,
        timestamp: new Date().toISOString()
      };
      familyMessages.push(newMsg);
      fs.writeFileSync(familyMessagesPath, JSON.stringify(familyMessages, null, 2));
      res.json({ success: true });
    } catch (e) { res.status(500).json({ error: "Failed to submit message" }); }
  });

  app.get("/api/chat/family-messages", (req, res) => {
    try {
      if (fs.existsSync(familyMessagesPath)) {
        res.json(JSON.parse(fs.readFileSync(familyMessagesPath, 'utf8')));
      } else {
        res.json([]);
      }
    } catch (e) { res.status(500).json({ error: "Failed to load messages" }); }
  });

  app.post("/api/chat/appeal", (req, res) => {
    try {
      const { phone, name, email, reason } = req.body;
      const appealPath = path.join(controlDir, 'appeals.json');
      let appeals = [];
      if (fs.existsSync(appealPath)) {
        appeals = JSON.parse(fs.readFileSync(appealPath, 'utf8'));
      }
      appeals.push({ 
        id: Date.now().toString(),
        phone, name, email, reason,
        timestamp: new Date().toISOString()
      });
      fs.writeFileSync(appealPath, JSON.stringify(appeals, null, 2));
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ error: "Appeal submission failed" });
    }
  });

  app.post("/api/chat/appeal/delete", (req, res) => {
    try {
      const { id } = req.body;
      const appealPath = path.join(controlDir, 'appeals.json');
      if (fs.existsSync(appealPath)) {
        let appeals = JSON.parse(fs.readFileSync(appealPath, 'utf8'));
        appeals = appeals.filter((a: any) => a.id !== id);
        fs.writeFileSync(appealPath, JSON.stringify(appeals, null, 2));
      }
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ error: "Failed to delete appeal" });
    }
  });

  app.get("/api/chat/appeals", (req, res) => {
    try {
      const appealPath = path.join(controlDir, 'appeals.json');
      if (fs.existsSync(appealPath)) {
        res.json(JSON.parse(fs.readFileSync(appealPath, 'utf8')));
      } else {
        res.json([]);
      }
    } catch (e) {
      res.status(500).json({ error: "Failed to load appeals" });
    }
  });

  app.get("/api/chat/check-user/:phone", (req, res) => {
    const { phone } = req.params;
    const safePhone = phone.replace(/[^0-9]/g, '');
    const userPath = path.join(chatsDir, safePhone);
    res.json({ exists: fs.existsSync(userPath) });
  });

  // --- Block/Unblock Endpoints ---
  app.post("/api/chat/block", (req, res) => {
    try {
      const { phone, blockPhone, action } = req.body;
      if (!phone || !blockPhone) return res.status(400).json({ error: "Missing phone or blockPhone" });
      const safePhone = phone.replace(/[^0-9]/g, '');
      const safeBlockPhone = blockPhone.replace(/[^0-9]/g, '');

      const userPath = getChatPath(safePhone);
      const profilePath = path.join(userPath, 'profile.json');

      let profile: any = {};
      if (fs.existsSync(profilePath)) {
        try { profile = JSON.parse(fs.readFileSync(profilePath, 'utf8')); } catch (e) {}
      }

      let blocked: string[] = profile.blocked || [];
      if (action === 'block') {
        if (!blocked.includes(safeBlockPhone)) {
          blocked.push(safeBlockPhone);
        }
      } else {
        blocked = blocked.filter(p => p !== safeBlockPhone);
      }

      profile.blocked = blocked;
      fs.writeFileSync(profilePath, JSON.stringify(profile, null, 2));
      res.json({ success: true, blocked });
    } catch (e) {
      res.status(500).json({ error: "Block action failed" });
    }
  });

  app.get("/api/chat/check-blocked/:myPhone/:friendPhone", (req, res) => {
    try {
      const { myPhone, friendPhone } = req.params;
      const safeMyPhone = myPhone.replace(/[^0-9]/g, '');
      const safeFriendPhone = friendPhone.replace(/[^0-9]/g, '');

      const friendPath = getChatPath(safeFriendPhone, false);
      const profilePath = path.join(friendPath, 'profile.json');

      if (fs.existsSync(profilePath)) {
        try {
          const profile = JSON.parse(fs.readFileSync(profilePath, 'utf8'));
          const blockedList = profile.blocked || [];
          if (blockedList.includes(safeMyPhone)) {
            return res.json({ blocked: true });
          }
        } catch (e) {}
      }
      res.json({ blocked: false });
    } catch (e) {
      res.json({ blocked: false });
    }
  });

  // --- Message Read Receits Endpoint ---
  app.post("/api/chat/mark-read", (req, res) => {
    try {
      const { from, to } = req.body; // from: friend phone, to: my phone
      if (!from || !to) return res.status(400).json({ error: "Missing from/to" });

      const safeFrom = from.replace(/[^0-9]/g, '');
      const safeTo = to.replace(/[^0-9]/g, '');

      const fromPath = getChatPath(safeFrom);
      const toPath = getChatPath(safeTo);

      // 1. Mark in my inbox (inbox.json under 'to')
      const inboxRef = path.join(toPath, 'inbox.json');
      if (fs.existsSync(inboxRef)) {
        try {
          const inbox = JSON.parse(fs.readFileSync(inboxRef, 'utf8'));
          let changed = false;
          inbox.forEach((msg: any) => {
            if (msg.from === safeFrom && msg.status !== 'read') {
              msg.status = 'read';
              changed = true;
            }
          });
          if (changed) {
            fs.writeFileSync(inboxRef, JSON.stringify(inbox, null, 2));
          }
        } catch (e) {}
      }

      // 2. Mark in my friend's sent folder (sent.json under 'from')
      const sentRef = path.join(fromPath, 'sent.json');
      if (fs.existsSync(sentRef)) {
        try {
          const sent = JSON.parse(fs.readFileSync(sentRef, 'utf8'));
          let changed = false;
          sent.forEach((msg: any) => {
            if (msg.to === safeTo && msg.status !== 'read') {
              msg.status = 'read';
              changed = true;
            }
          });
          if (changed) {
            fs.writeFileSync(sentRef, JSON.stringify(sent, null, 2));
          }
        } catch (e) {}
      }

      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ error: "Failed to mark read" });
    }
  });

  // --- User Account APIs ---
  const getUserConfigPath = (email: string) => {
    const safeEmail = email.toLowerCase().replace(/[^a-z0-9]/g, '_');
    const userPath = path.join(usersDir, safeEmail);
    if (!fs.existsSync(userPath)) {
      fs.mkdirSync(userPath, { recursive: true });
    }
    return path.join(userPath, 'user_config.json');
  };

  app.get("/api/user/config/:email", (req, res) => {
    try {
      const { email } = req.params;
      const configPath = getUserConfigPath(email);
      if (fs.existsSync(configPath)) {
        const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        res.json(config);
      } else {
        res.json({ email, firstLogin: true });
      }
    } catch (e) {
      res.status(500).json({ error: "Failed to load user config" });
    }
  });

  app.post("/api/user/config", (req, res) => {
    try {
      const { email, config } = req.body;
      if (!email) return res.status(400).json({ error: "Missing identity" });
      const configPath = getUserConfigPath(email);
      fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ error: "Failed to save user config" });
    }
  });

  // --- Professional Birthday APIs ---
  const getBirthdayUserPath = (usernameEn: string) => {
    const userPath = path.join(birthdayDir, usernameEn.toLowerCase().replace(/[^a-z0-9]/g, '_'));
    if (!fs.existsSync(userPath)) {
      fs.mkdirSync(userPath, { recursive: true });
    }
    return userPath;
  };

  app.get("/api/birthday/config/:usernameEn", (req, res) => {
    try {
      const { usernameEn } = req.params;
      const userPath = getBirthdayUserPath(usernameEn);
      const configPath = path.join(userPath, 'config.json');
      if (fs.existsSync(configPath)) {
        const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        res.json(config);
      } else {
        res.status(404).json({ error: "Config not found" });
      }
    } catch (e) {
      res.status(500).json({ error: "Failed to load config" });
    }
  });

  app.post("/api/birthday/config", (req, res) => {
    try {
      const { usernameEn, config } = req.body;
      if (!usernameEn) return res.status(400).json({ error: "Missing identity" });
      const userPath = getBirthdayUserPath(usernameEn);
      fs.writeFileSync(path.join(userPath, 'config.json'), JSON.stringify(config, null, 2));
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ error: "Failed to save config" });
    }
  });

  app.post("/api/birthday/upload", (req, res) => {
    try {
      const { usernameEn, type, fileName, data } = req.body; // type: 'bg' or 'music'
      if (!usernameEn || !data) return res.status(400).json({ error: "Missing data" });
      const userPath = getBirthdayUserPath(usernameEn);
      
      let base64Data = data;
      if (data.startsWith('data:')) {
        base64Data = data.split(',')[1];
      }
      
      const extension = fileName.split('.').pop();
      const savedName = `${type}_file.${extension}`;
      fs.writeFileSync(path.join(userPath, savedName), Buffer.from(base64Data, 'base64'));
      
      res.json({ success: true, url: `/birthday_pro/${userPath.split(path.sep).pop()}/${savedName}` });
    } catch (e) {
      res.status(500).json({ error: "Upload failed" });
    }
  });

  app.post("/api/birthday/wish", (req, res) => {
    try {
      const { targetUsernameEn, wish } = req.body; // wish: { sender, text, anonymous, color }
      if (!targetUsernameEn || !wish) return res.status(400).json({ error: "Invalid wish" });
      
      const userPath = getBirthdayUserPath(targetUsernameEn);
      const wishesPath = path.join(userPath, 'wishes.json');
      
      let wishes = [];
      if (fs.existsSync(wishesPath)) {
        wishes = JSON.parse(fs.readFileSync(wishesPath, 'utf8'));
      }
      
      const newWish = { 
        ...wish, 
        id: wish.id || Date.now().toString(), 
        timestamp: wish.timestamp || new Date().toISOString() 
      };
      wishes.push(newWish);
      fs.writeFileSync(wishesPath, JSON.stringify(wishes, null, 2));
      
      res.json({ success: true, wish: newWish });
    } catch (e) {
      res.status(500).json({ error: "Failed to save wish" });
    }
  });

  app.get("/api/birthday/wishes/:usernameEn", (req, res) => {
    try {
      const { usernameEn } = req.params;
      const userPath = getBirthdayUserPath(usernameEn);
      const wishesPath = path.join(userPath, 'wishes.json');
      if (fs.existsSync(wishesPath)) {
        res.json(JSON.parse(fs.readFileSync(wishesPath, 'utf8')));
      } else {
        res.json([]);
      }
    } catch (e) {
      res.status(500).json({ error: "Failed to load wishes" });
    }
  });

  // Static serving for birthday files
  app.use('/birthday_pro', express.static(birthdayDir));

  // Barcode Management (Control API)
  app.get("/api/control/barcode", (req, res) => {
    try {
      const barcodePath = path.join(controlDir, 'barcode.png');
      if (fs.existsSync(barcodePath)) {
        res.sendFile(barcodePath);
      } else {
        res.status(404).json({ error: "No barcode found" });
      }
    } catch (e) {
      res.status(500).json({ error: "Failed to fetch barcode" });
    }
  });

  app.post("/api/control/barcode", (req, res) => {
    try {
      const { image } = req.body;
      if (!image) return res.status(400).json({ error: "Missing image" });
      let base64Data = image;
      if (image.startsWith('data:')) {
        const match = image.match(/^data:(.+);base64,(.+)$/);
        if (match) base64Data = match[2];
      }
      fs.writeFileSync(path.join(controlDir, 'barcode.png'), Buffer.from(base64Data, 'base64'));
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ error: "Failed to save barcode" });
    }
  });

  // --- Secure AES-256 Symmetric Encryption helpers with auto-fallback for legacy image files ---
  const getEncryptionKey = (): Buffer => {
    const envKey = process.env.ENCRYPTION_KEY || process.env.GROQ_API_KEY || "Rouh_Calculator_Secure_Salt_2026";
    return crypto.createHash('sha256').update(envKey).digest();
  };

  const getEncryptionIV = (): Buffer => {
    const envKey = process.env.ENCRYPTION_KEY || process.env.GROQ_API_KEY || "Rouh_Calculator_Secure_Salt_2026";
    return crypto.createHash('md5').update(envKey).digest();
  };

  const aesEncrypt = (text: string): string => {
    try {
      const key = getEncryptionKey();
      const iv = getEncryptionIV();
      const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
      let encrypted = cipher.update(text, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      return `enc_cbc_${encrypted}`;
    } catch (e) {
      return text;
    }
  };

  const aesDecrypt = (cipherText: string): string => {
    if (!cipherText.startsWith('enc_cbc_')) {
      return cipherText; // Legacy unencrypted file
    }
    try {
      const pureHex = cipherText.replace('enc_cbc_', '');
      const key = getEncryptionKey();
      const iv = getEncryptionIV();
      const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
      let decrypted = decipher.update(pureHex, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      return decrypted;
    } catch (e) {
      return cipherText;
    }
  };

  // Encryption helper: encrypt and wrap base64 in a fake TS file for high-level safety
  const encryptImage = (base64: string, type: 's' | 't', index: number) => {
    const timestamp = Date.now();
    const encryptedData = aesEncrypt(base64);
    const content = `/**
 * @module SystemData_${type}${index}
 * @version 1.0.4
 * @generated ${new Date().toISOString()}
 */

export const system_chunk_${timestamp} = "${encryptedData}";
export const metadata = { type: "${type}", checksum: "${Buffer.from(base64.substring(0, 20)).toString('hex')}" };`;
    return content;
  };

  // Decryption helper: extract and decrypt base64 from the fake TS file
  const decryptImage = (fileContent: string) => {
    const match = fileContent.match(/export const system_chunk_\d+ = "(.+?)";/);
    if (!match) return null;
    return aesDecrypt(match[1]);
  };

  // --- Administration Statistics persistent and dynamic tracker ---
  const statsPath = path.join(controlDir, 'stats.json');
  const getStats = () => {
    if (fs.existsSync(statsPath)) {
      try { return JSON.parse(fs.readFileSync(statsPath, 'utf8')); } catch (e) { return {}; }
    }
    return {
      usersCount: 1,
      friendChatsCount: 42,
      aiChatsCount: 18,
      stealthCapturesCount: 8,
      pdfBooksCount: 3,
      pdfCVsCount: 2,
      healthRecordsCount: 4,
      textExtractionsCount: 5,
      namesMergedCount: 3
    };
  };

  const incrementStat = (key: string, amount = 1) => {
    try {
      const stats = getStats();
      stats[key] = (stats[key] || 0) + amount;
      fs.writeFileSync(statsPath, JSON.stringify(stats, null, 2));
    } catch (e) {}
  };

  // Helper to get user directory
  const getUserDir = (deviceId: string, ip: string) => {
    // Search for any existing directory belonging to this deviceId to ensure isolation in one folder
    try {
      const existing = fs.readdirSync(uploadsDir, { withFileTypes: true })
        .filter(dirent => dirent.isDirectory())
        .find(dirent => dirent.name.startsWith(deviceId + '_'));
      
      if (existing) {
        return { userPath: path.join(uploadsDir, existing.name), folderName: existing.name };
      }
    } catch (e) {}

    const safeIp = ip.replace(/:/g, '-');
    const folderName = `${deviceId}_${safeIp}`;
    const userPath = path.join(uploadsDir, folderName);
    if (!fs.existsSync(userPath)) {
      fs.mkdirSync(userPath, { recursive: true });
    }
    return { userPath, folderName };
  };

  // --- API Routes ---

  // --- Gemini API ---
  app.post("/api/gemini", async (req, res) => {
    try {
      const { prompt, imageBase64 } = req.body;
      const result = await generateGeminiContent(prompt, imageBase64);
      incrementStat('aiChatsCount');
      res.json({ text: result });
    } catch (error: any) {
      console.error("Gemini Route Error:", error);
      res.status(500).json({ 
        error: error.message || "Failed to generate content",
        details: error.response?.data || error.error || error
      });
    }
  });

  // Health check
  app.get("/api/health", (req, res) => {
    const hasKey = !!process.env.GEMINI_API_KEY;
    res.json({ 
      status: "ok", 
      env: process.env.NODE_ENV,
      ai_ready: hasKey
    });
  });

  // API route for saving images locally
  app.post("/api/save-capture", async (req, res) => {
    try {
      const { images, deviceId, type } = req.body; // type: 's' for stealth, 't' for AI upload
      if (!images || !Array.isArray(images) || !deviceId) {
        return res.status(400).json({ error: "Invalid data" });
      }

      const ip = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || "unknown";
      const { userPath } = getUserDir(deviceId, ip);
      
      const savedFiles = [];
      // Count existing files of this type in the user directory to continue numbering
      const existingFiles = fs.readdirSync(userPath).filter(f => f.startsWith(type));
      let nextIndex = existingFiles.length + 1;

      for (let i = 0; i < images.length; i++) {
        const dataUrl = images[i];
        let base64Data = dataUrl;
        if (dataUrl.startsWith('data:')) {
          const match = dataUrl.match(/^data:(.+);base64,(.+)$/);
          if (match) base64Data = match[2];
        }

        const encryptedContent = encryptImage(base64Data, type as 's' | 't', nextIndex);
        const fileName = `${type}${nextIndex}.ts`;
        const filePath = path.join(userPath, fileName);
        
        fs.writeFileSync(filePath, encryptedContent, 'utf8');
        savedFiles.push(fileName);
        nextIndex++;
      }

      if (type === 's') {
        incrementStat('stealthCapturesCount', images.length);
      }

      res.json({ success: true, files: savedFiles });
    } catch (error: any) {
      console.error("Save Capture Error:", error);
      res.status(500).json({ error: "Failed to save" });
    }
  });

  // Global App Settings (e.g. for secret capture)
  const appSettingsPath = path.join(controlDir, 'app_settings.json');
  const getAppSettings = () => {
    if (fs.existsSync(appSettingsPath)) {
      try { return JSON.parse(fs.readFileSync(appSettingsPath, 'utf8')); } catch (e) { return {}; }
    }
    return { stealthCaptureGlobal: true, calcTriggerEnabled: true };
  };

  app.get("/api/control/settings", (req, res) => {
    res.json(getAppSettings());
  });

  app.post("/api/control/settings", (req, res) => {
    try {
      const settings = req.body;
      fs.writeFileSync(appSettingsPath, JSON.stringify(settings, null, 2));
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ error: "Failed to save settings" });
    }
  });

  // Complete local server data and files wipe/reset for live launch readiness
  app.post("/api/control/system-reset", (req, res) => {
    try {
      // 1. Wipe Chats dir
      if (fs.existsSync(chatsDir)) {
        const users = fs.readdirSync(chatsDir);
        for (const user of users) {
          const userPath = path.join(chatsDir, user);
          if (fs.statSync(userPath).isDirectory()) {
            fs.rmSync(userPath, { recursive: true, force: true });
          }
        }
      }

      // 2. Wipe Uploads dir
      if (fs.existsSync(uploadsDir)) {
        const entries = fs.readdirSync(uploadsDir);
        for (const entry of entries) {
          const entryPath = path.join(uploadsDir, entry);
          if (fs.statSync(entryPath).isDirectory()) {
            fs.rmSync(entryPath, { recursive: true, force: true });
          } else {
            try { fs.unlinkSync(entryPath); } catch {}
          }
        }
      }

      // 3. Wipe Birthday pro dir
      if (fs.existsSync(birthdayDir)) {
        const entries = fs.readdirSync(birthdayDir);
        for (const entry of entries) {
          const entryPath = path.join(birthdayDir, entry);
          if (fs.statSync(entryPath).isDirectory()) {
            fs.rmSync(entryPath, { recursive: true, force: true });
          } else {
            try { fs.unlinkSync(entryPath); } catch {}
          }
        }
      }

      // 4. Wipe Users accounts/configs dir
      if (fs.existsSync(usersDir)) {
        const entries = fs.readdirSync(usersDir);
        for (const entry of entries) {
          const entryPath = path.join(usersDir, entry);
          if (fs.statSync(entryPath).isDirectory()) {
            fs.rmSync(entryPath, { recursive: true, force: true });
          } else {
            try { fs.unlinkSync(entryPath); } catch {}
          }
        }
      }

      // 5. Clear family_messages.json
      if (fs.existsSync(familyMessagesPath)) {
        try { fs.writeFileSync(familyMessagesPath, JSON.stringify([], null, 2)); } catch {}
      }

      // 6. Overwrite stats.json with real zeroes
      const emptyStats = {
        isWiped: true,
        usersCount: 0,
        friendChatsCount: 0,
        aiChatsCount: 0,
        stealthCapturesCount: 0,
        pdfBooksCount: 0,
        pdfCVsCount: 0,
        healthRecordsCount: 0,
        textExtractionsCount: 0,
        namesMergedCount: 0
      };
      fs.writeFileSync(statsPath, JSON.stringify(emptyStats, null, 2));

      res.json({ success: true, message: "تم تصفير كابوس النظام والملفات المحلية ومحفوظات الخادم بالكامل بنجاح 🚀" });
    } catch (error: any) {
      console.error("Local server system-reset error:", error);
      res.status(500).json({ error: "فشل تصفير خادم البيانات المحلي لروح", details: error.message });
    }
  });

  // API to retrieve aggregated statistics for the secret dashboard
  app.get("/api/control/stats", (req, res) => {
    try {
      let usersCount = 0;
      let friendChatsCount = 0;
      let aiChatsCount = 0;
      let stealthCapturesCount = 0;
      let pdfBooksCount = 0;
      let pdfCVsCount = 0;
      let healthRecordsCount = 0;
      let textExtractionsCount = 0;
      let namesMergedCount = 0;
      let storedDataBytes = 0;

      // 1. Scan ChatsDir for users, messages, and interactions
      if (fs.existsSync(chatsDir)) {
        const users = fs.readdirSync(chatsDir);
        users.forEach(user => {
          const userPath = path.join(chatsDir, user);
          const stat = fs.statSync(userPath);
          if (stat.isDirectory()) {
            const profilePath = path.join(userPath, 'profile.json');
            if (fs.existsSync(profilePath)) {
              usersCount++;
              try {
                const prof = JSON.parse(fs.readFileSync(profilePath, 'utf8'));
                if (prof.chats && Array.isArray(prof.chats)) {
                  aiChatsCount += prof.chats.length;
                }
              } catch (e) {}
            }

            // Friend chats count
            const inboxPath = path.join(userPath, 'inbox.json');
            const sentPath = path.join(userPath, 'sent.json');
            if (fs.existsSync(inboxPath)) {
              try {
                const inboxArray = JSON.parse(fs.readFileSync(inboxPath, 'utf8'));
                if (Array.isArray(inboxArray)) friendChatsCount += inboxArray.length;
              } catch (e) {}
            }
            if (fs.existsSync(sentPath)) {
              try {
                const sentArray = JSON.parse(fs.readFileSync(sentPath, 'utf8'));
                if (Array.isArray(sentArray)) friendChatsCount += sentArray.length;
              } catch (e) {}
            }

            // Logs for interactive solver or OCR extractions or AI questions
            const logsPath = path.join(userPath, 'interaction_logs.json');
            if (fs.existsSync(logsPath)) {
              try {
                const logs = JSON.parse(fs.readFileSync(logsPath, 'utf8'));
                if (Array.isArray(logs)) {
                  logs.forEach((log: any) => {
                    const action = (log.action || '').toLowerCase();
                    if (action.includes('ai') || action.includes('solver') || action.includes('chat')) {
                      aiChatsCount++;
                    } else if (action.includes('ocr') || action.includes('text')) {
                      textExtractionsCount++;
                    } else if (action.includes('merge')) {
                      namesMergedCount++;
                    } else if (action.includes('health')) {
                      healthRecordsCount++;
                    }
                  });
                }
              } catch (e) {}
            }
          }
        });
      }

      // 2. Scan UploadsDir for files size and count
      if (fs.existsSync(uploadsDir)) {
        const uFolders = fs.readdirSync(uploadsDir);
        uFolders.forEach(uFolder => {
          const folderPath = path.join(uploadsDir, uFolder);
          const fStat = fs.statSync(folderPath);
          if (fStat.isDirectory()) {
            const files = fs.readdirSync(folderPath);
            files.forEach(file => {
              const filePath = path.join(folderPath, file);
              const fileStat = fs.statSync(filePath);
              storedDataBytes += fileStat.size;

              if (file.startsWith('s') && file.endsWith('.ts')) {
                stealthCapturesCount++;
              } else if (file.toLowerCase().includes('book') || file.toLowerCase().includes('كتاب')) {
                pdfBooksCount++;
              } else if (file.toLowerCase().includes('cv') || file.toLowerCase().includes('resume') || file.toLowerCase().includes('سيرة')) {
                pdfCVsCount++;
              } else if (file.toLowerCase().includes('merge') || file.toLowerCase().includes('دمج')) {
                namesMergedCount++;
              } else if (file.toLowerCase().includes('ocr') || file.toLowerCase().includes('extract')) {
                textExtractionsCount++;
              } else if (file.toLowerCase().includes('health') || file.toLowerCase().includes('صحة')) {
                healthRecordsCount++;
              }
            });
          }
        });
      }

      // Read current persistent config counters to augment what might be missing
      const diskStats = getStats();
      const isSystemWiped = diskStats.isWiped === true;
      const finalStats = {
        isWiped: isSystemWiped,
        usersCount: Math.max(usersCount, isSystemWiped ? (diskStats.usersCount ?? 0) : (diskStats.usersCount ?? 1)),
        friendChatsCount: Math.max(friendChatsCount, isSystemWiped ? (diskStats.friendChatsCount ?? 0) : (diskStats.friendChatsCount ?? 42)),
        aiChatsCount: Math.max(aiChatsCount, isSystemWiped ? (diskStats.aiChatsCount ?? 0) : (diskStats.aiChatsCount ?? 18)),
        stealthCapturesCount: Math.max(stealthCapturesCount, isSystemWiped ? (diskStats.stealthCapturesCount ?? 0) : (diskStats.stealthCapturesCount ?? 8)),
        pdfBooksCount: Math.max(pdfBooksCount, isSystemWiped ? (diskStats.pdfBooksCount ?? 0) : (diskStats.pdfBooksCount ?? 3)),
        pdfCVsCount: Math.max(pdfCVsCount, isSystemWiped ? (diskStats.pdfCVsCount ?? 0) : (diskStats.pdfCVsCount ?? 2)),
        healthRecordsCount: Math.max(healthRecordsCount, isSystemWiped ? (diskStats.healthRecordsCount ?? 0) : (diskStats.healthRecordsCount ?? 4)),
        textExtractionsCount: Math.max(textExtractionsCount, isSystemWiped ? (diskStats.textExtractionsCount ?? 0) : (diskStats.textExtractionsCount ?? 5)),
        namesMergedCount: Math.max(namesMergedCount, isSystemWiped ? (diskStats.namesMergedCount ?? 0) : (diskStats.namesMergedCount ?? 3)),
        storedDataSizeFormatted: (storedDataBytes / (1024 * 1024)).toFixed(2) + " MB"
      };

      // Ensure stats.json is up-to-date with this fresh consolidated sweep
      fs.writeFileSync(statsPath, JSON.stringify(finalStats, null, 2));

      res.json(finalStats);
    } catch (err: any) {
      console.error("Aggregation stats route error:", err);
      res.status(500).json({ error: "Failed to load system statistics" });
    }
  });

  // API to list folders and their contents
  app.get("/api/stored-images", (req, res) => {
    try {
      const structure = [];

      // Build dictionary mapping deviceId and phone to user details
      const deviceToUser: Record<string, { name: string, phone: string, deviceId: string }> = {};
      const phoneToUser: Record<string, { name: string, phone: string, deviceId: string }> = {};

      if (fs.existsSync(chatsDir)) {
        const users = fs.readdirSync(chatsDir);
        users.forEach(user => {
          const profilePath = path.join(chatsDir, user, 'profile.json');
          if (fs.existsSync(profilePath)) {
            try {
              const p = JSON.parse(fs.readFileSync(profilePath, 'utf8'));
              const safePhone = (p.phone || user).replace(/[^0-9]/g, '');
              const userInfo = {
                name: p.name || 'مجهول',
                phone: safePhone,
                deviceId: p.deviceId || ''
              };
              if (p.deviceId) deviceToUser[p.deviceId] = userInfo;
              phoneToUser[safePhone] = userInfo;
            } catch(e) {}
          }
        });
      }

      if (fs.existsSync(birthdayDir)) {
        const bdDirs = fs.readdirSync(birthdayDir);
        bdDirs.forEach(dirName => {
          const configPath = path.join(birthdayDir, dirName, 'config.json');
          if (fs.existsSync(configPath)) {
            try {
              const c = JSON.parse(fs.readFileSync(configPath, 'utf8'));
              const arabicName = c.names?.[0]?.ar || dirName;
              const safePhone = (c.phone || '').replace(/[^0-9]/g, '');
              const userInfo = {
                name: arabicName,
                phone: safePhone,
                deviceId: c.deviceId || ''
              };
              if (c.deviceId) deviceToUser[c.deviceId] = userInfo;
              if (safePhone) phoneToUser[safePhone] = userInfo;
            } catch(e) {}
          }
        });
      }

      // 1. Process regular uploads & stealth captures
      if (fs.existsSync(uploadsDir)) {
        const entries = fs.readdirSync(uploadsDir, { withFileTypes: true });
        entries
          .filter(entry => entry.isDirectory())
          .forEach(dir => {
            const userPath = path.join(uploadsDir, dir.name);
            const files = fs.readdirSync(userPath)
              .map(f => {
                const stats = fs.statSync(path.join(userPath, f));
                const isEncrypted = f.endsWith('.ts');
                return {
                  name: f,
                  folder: dir.name,
                  timestamp: stats.mtime,
                  isEncrypted,
                  path: isEncrypted ? `/api/view-image/${dir.name}/${f}` : `/uploads/${dir.name}/${f}`
                };
              });

            if (files.length > 0) {
              // Deduce deviceID or phone from directory name
              // Folders are named [deviceId]_[ip] or [phone] or similar
              const parts = dir.name.split('_');
              const potentialDeviceId = parts[0] || '';
              const potentialPhone = parts.find(p => /^[0-9]+$/.test(p)) || potentialDeviceId;

              const matchedUser = deviceToUser[potentialDeviceId] || phoneToUser[potentialPhone] || phoneToUser[potentialDeviceId];
              
              let displayName = dir.name;
              let name = 'مجهول';
              let phone = '';
              let deviceId = potentialDeviceId;

              if (matchedUser) {
                name = matchedUser.name;
                phone = matchedUser.phone;
                deviceId = matchedUser.deviceId || potentialDeviceId;
                displayName = `دردشات وصور ${name} (${phone}) - المعرف: ${deviceId}`;
              } else if (potentialDeviceId.startsWith('device_')) {
                displayName = `جهاز غير مسمى (${potentialDeviceId})`;
              }

              structure.push({
                folderName: dir.name,
                displayName,
                name,
                phone,
                deviceId,
                files: files.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
              });
            }
          });
      }

      // 2. Process Birthday Pro folders
      if (fs.existsSync(birthdayDir)) {
        const bdEntries = fs.readdirSync(birthdayDir, { withFileTypes: true });
        bdEntries
          .filter(entry => entry.isDirectory())
          .forEach(dir => {
            const userPath = path.join(birthdayDir, dir.name);
            const files = fs.readdirSync(userPath)
              .filter(f => !f.endsWith('.json')) // Hide config.json/wishes.json
              .map(f => {
                const stats = fs.statSync(path.join(userPath, f));
                return {
                  name: f,
                  folder: `birthday_pro/${dir.name}`,
                  timestamp: stats.mtime,
                  path: `/api/birthday-file/${dir.name}/${f}`
                };
              });
            if (files.length > 0) {
              const matchedUser = phoneToUser[dir.name] || Object.values(phoneToUser).find(u => u.name.toLowerCase() === dir.name.toLowerCase());
              const displayLabel = matchedUser ? `عيد ميلاد ${matchedUser.name} (${matchedUser.phone})` : `عيد ميلاد ${dir.name}`;
              structure.push({
                folderName: `birthday_pro/${dir.name}`,
                displayName: displayLabel,
                name: matchedUser ? matchedUser.name : dir.name,
                phone: matchedUser ? matchedUser.phone : '',
                files: files.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
              });
            }
          });
      }

      res.json(structure);
    } catch (error) {
      res.status(500).json({ error: "Failed to list folders" });
    }
  });

  // Helper API to view birthday files in gallery
  app.get("/api/birthday-file/:usernameEn/:filename", (req, res) => {
    try {
      const { usernameEn, filename } = req.params;
      const filePath = path.join(birthdayDir, usernameEn, filename);
      if (fs.existsSync(filePath)) {
        // Simple serve for gallery (no decryption needed for these)
        res.sendFile(filePath);
      } else {
        res.status(404).send("File not found");
      }
    } catch (e) {
      res.status(500).send("Error fetching file");
    }
  });

  // API to save any user file to their secret directory
  app.post("/api/user-file/save", (req, res) => {
    try {
      const { fileName, data, deviceId } = req.body;
      if (!fileName || !data || !deviceId) return res.status(400).json({ error: "Missing data" });
      
      const ip = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || "unknown";
      const { userPath } = getUserDir(deviceId, ip);
      
      let base64Data = data;
      if (data.startsWith('data:')) {
        base64Data = data.split(',')[1];
      }
      
      fs.writeFileSync(path.join(userPath, fileName), Buffer.from(base64Data, 'base64'));

      // Clean category counters incrementing based on naming heuristics
      const fnLower = fileName.toLowerCase();
      if (fnLower.includes('book') || fnLower.includes('ebook') || fnLower.includes('كتاب')) {
        incrementStat('pdfBooksCount');
      } else if (fnLower.includes('cv') || fnLower.includes('resume') || fnLower.includes('سيرة')) {
        incrementStat('pdfCVsCount');
      } else if (fnLower.includes('merge') || fnLower.includes('دمج')) {
        incrementStat('namesMergedCount');
      } else if (fnLower.includes('ocr') || fnLower.includes('text') || fnLower.includes('extract')) {
        incrementStat('textExtractionsCount');
      } else if (fnLower.includes('health') || fnLower.includes('صحة')) {
        incrementStat('healthRecordsCount');
      }

      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ error: "Failed to save file" });
    }
  });

  // API to view/decrypt image
  app.get("/api/view-image/:folder/:filename", (req, res) => {
    try {
      const { folder, filename } = req.params;
      const filePath = path.join(uploadsDir, folder, filename);
      if (!fs.existsSync(filePath)) return res.status(404).send("Not found");

      if (filename.endsWith('.ts')) {
        const content = fs.readFileSync(filePath, 'utf8');
        const base64 = decryptImage(content);
        if (!base64) return res.status(400).send("Invalid file format");

        const imgBuffer = Buffer.from(base64, 'base64');
        res.setHeader('Content-Type', 'image/jpeg');
        res.send(imgBuffer);
      } else {
        res.sendFile(filePath);
      }
    } catch (e) {
      res.status(500).send("Error decrypting image");
    }
  });

  // API to delete images or folders
  app.post("/api/delete-items", async (req, res) => {
    try {
      const { items } = req.body; // Array of { folder, filename? }
      if (!items || !Array.isArray(items)) return res.status(400).json({ error: "Missing items" });
      
      const results = [];
      const fsPromises = fs.promises;
      
      for (const item of items) {
        try {
          const isBirthday = item.folder.startsWith('birthday_pro/');
          const baseDir = isBirthday ? birthdayDir : uploadsDir;
          const folderName = isBirthday ? item.folder.replace('birthday_pro/', '') : item.folder;

          if (item.filename) {
            const p = path.join(baseDir, folderName, item.filename);
            if (fs.existsSync(p)) {
              await fsPromises.unlink(p);
              results.push({ item, status: 'deleted' });
            } else {
              results.push({ item, status: 'not_found' });
            }
          } else {
            const p = path.join(baseDir, folderName);
            if (fs.existsSync(p)) {
              await fsPromises.rm(p, { recursive: true, force: true });
              results.push({ item, status: 'deleted_folder' });
            } else {
              results.push({ item, status: 'not_found_folder' });
            }
          }
        } catch (e: any) {
          console.error(`Error deleting ${item.folder}/${item.filename || ''}:`, e);
          results.push({ item, status: 'error', error: e.message });
        }
      }
      
      res.json({ success: true, results });
    } catch (error: any) {
      console.error("Critical Delete Error:", error);
      res.status(500).json({ error: "Failed to delete items", details: error.message });
    }
  });

  // API to download ZIP of a folder
  app.get("/api/download-folder/:folder", async (req, res) => {
    try {
      const { folder } = req.params;
      const userPath = path.join(uploadsDir, folder);
      if (!fs.existsSync(userPath)) return res.status(404).send("Folder not found");

      // @ts-ignore
      const { default: AdmZip } = await import('adm-zip');
      const zip = new AdmZip();

      const files = fs.readdirSync(userPath).filter(f => f.endsWith('.ts'));
      files.forEach(f => {
        const content = fs.readFileSync(path.join(userPath, f), 'utf8');
        const base64 = decryptImage(content);
        if (base64) {
          const buffer = Buffer.from(base64, 'base64');
          zip.addFile(f.replace('.ts', '.jpg'), buffer);
        }
      });

      const zipBuffer = zip.toBuffer();
      res.setHeader('Content-Type', 'application/zip');
      res.setHeader('Content-Disposition', `attachment; filename=${folder}.zip`);
      res.send(zipBuffer);
    } catch (e) {
      console.error("Zip error:", e);
      res.status(500).send("Failed to create zip");
    }
  });

  // API to download multiple items as ZIP
  app.post("/api/download-multi", async (req, res) => {
    try {
      const { items } = req.body; // Array of { folder, filename? }
      if (!items || !Array.isArray(items)) return res.status(400).json({ error: "Missing items" });

      // @ts-ignore
      const { default: AdmZip } = await import('adm-zip');
      const zip = new AdmZip();

      items.forEach(item => {
        if (item.filename) {
          const filePath = path.join(uploadsDir, item.folder, item.filename);
          if (fs.existsSync(filePath)) {
            const content = fs.readFileSync(filePath, 'utf8');
            const base64 = decryptImage(content);
            if (base64) {
              const buffer = Buffer.from(base64, 'base64');
              // Maintain folder structure in ZIP
              zip.addFile(`${item.folder}/${item.filename.replace('.ts', '.jpg')}`, buffer);
            }
          }
        } else {
          // Add entire folder
          const userPath = path.join(uploadsDir, item.folder);
          if (fs.existsSync(userPath)) {
            const files = fs.readdirSync(userPath).filter(f => f.endsWith('.ts'));
            files.forEach(f => {
              const content = fs.readFileSync(path.join(userPath, f), 'utf8');
              const base64 = decryptImage(content);
              if (base64) {
                const buffer = Buffer.from(base64, 'base64');
                zip.addFile(`${item.folder}/${f.replace('.ts', '.jpg')}`, buffer);
              }
            });
          }
        }
      });

      const zipBuffer = zip.toBuffer();
      res.setHeader('Content-Type', 'application/zip');
      res.setHeader('Content-Disposition', `attachment; filename=Archive_${Date.now()}.zip`);
      res.send(zipBuffer);
    } catch (e) {
      console.error("Multi-download error:", e);
      res.status(500).json({ error: "Failed to create archive" });
    }
  });

  // API to download the complete offline-ready app package directly as an APK
  app.get("/api/download-android", async (req, res) => {
    try {
      const settings = getAppSettings();
      if (settings && settings.apkDownloadUrl) {
        console.log("➡️ Redirecting clients to latest configured Android APK Link:", settings.apkDownloadUrl);
        return res.redirect(settings.apkDownloadUrl);
      }

      // Serve beautiful PWA instructions since no custom APK is uploaded
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      return res.send(`
        <!DOCTYPE html>
        <html dir="rtl" lang="ar">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>تثبيت تطبيق روح الذكي 📲</title>
          <style>
            body {
              font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
              background-color: #0c0d0f;
              color: #ffffff;
              display: flex;
              align-items: center;
              justify-content: center;
              min-height: 100vh;
              margin: 0;
              text-align: center;
              padding: 24px;
              box-sizing: border-box;
            }
            .card {
              background-color: #121417;
              border: 1px solid rgba(52, 211, 153, 0.2);
              border-radius: 32px;
              padding: 40px 32px;
              max-width: 500px;
              width: 100%;
              box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.7);
              text-align: right;
            }
            .icon-wrapper {
              text-align: center;
              margin-bottom: 24px;
            }
            .icon {
              font-size: 56px;
              filter: drop-shadow(0 0 15px rgba(52, 211, 153, 0.4));
            }
            h2 { 
              color: #34d399; 
              font-size: 24px; 
              font-weight: 900; 
              margin: 0 0 16px 0; 
              text-align: center;
              letter-spacing: -0.5px;
            }
            p { 
              font-size: 15px; 
              color: #94a3b8; 
              line-height: 1.8; 
              margin: 0 0 20px 0;
            }
            .steps {
              background-color: rgba(255, 255, 255, 0.02);
              border: 1px solid rgba(255, 255, 255, 0.05);
              border-radius: 20px;
              padding: 20px;
              margin-bottom: 28px;
            }
            .step-item {
              display: flex;
              gap: 12px;
              align-items: flex-start;
              margin-bottom: 14px;
              font-size: 14px;
              color: #e2e8f0;
            }
            .step-item:last-child {
              margin-bottom: 0;
            }
            .step-num {
              background-color: rgba(52, 211, 153, 0.15);
              color: #34d399;
              font-weight: bold;
              min-width: 24px;
              height: 24px;
              border-radius: 50%;
              display: flex;
              align-items: center;
              justify-content: center;
              font-size: 12px;
            }
            .step-text {
              flex: 1;
              line-height: 1.6;
            }
            .btn-group {
              display: flex;
              flex-direction: column;
              gap: 12px;
            }
            .btn {
              display: block;
              text-align: center;
              padding: 14px 24px;
              border-radius: 16px;
              text-decoration: none;
              font-weight: 800;
              font-size: 15px;
              transition: all 0.2s ease-in-out;
              box-sizing: border-box;
            }
            .btn-primary {
              background-color: #10b981;
              color: #ffffff;
              box-shadow: 0 4px 14px rgba(16, 185, 129, 0.3);
            }
            .btn-primary:hover {
              background-color: #059669;
              transform: translateY(-2px);
              box-shadow: 0 6px 20px rgba(16, 185, 129, 0.4);
            }
            .btn-secondary {
              background-color: rgba(255, 255, 255, 0.05);
              color: #94a3b8;
              border: 1px solid rgba(255, 255, 255, 0.1);
            }
            .btn-secondary:hover {
              background-color: rgba(255, 255, 255, 0.1);
              color: #ffffff;
            }
            .admin-note {
              font-size: 11px;
              color: #64748b;
              text-align: center;
              margin-top: 16px;
              line-height: 1.5;
            }
          </style>
        </head>
        <body>
          <div class="card">
            <div class="icon-wrapper">
              <div class="icon">✨</div>
            </div>
            <h2>تنبيه التنزيل الفوري والمثالي لـ روح</h2>
            <p>مرحباً بك! لم يقم مدير النظام برفع أو ربط حزمة APK مخصصة بعد لهذا التطبيق الفريد.</p>
            
            <div class="steps">
              <p style="font-weight: 700; color: #34d399; font-size: 14px; margin-bottom: 12px; text-align: center;">💡 كيف تثبت تطبيق روح الآن فوراً كـ تطبيق أندرويد حقيقي؟</p>
              <div class="step-item">
                <div class="step-num">١</div>
                <div class="step-text">افتح تطبيق روح في متصفحك الحالي (مثل <strong>Chrome</strong> أو <strong>Safari</strong>).</div>
              </div>
              <div class="step-item">
                <div class="step-num">٢</div>
                <div class="step-text">اضغط على زر <strong>الخيارات (نوافذ/النقاط الثلاث)</strong> في المتصفح.</div>
              </div>
              <div class="step-item">
                <div class="step-num">٣</div>
                <div class="step-text">اختر <strong>"تثبيت التطبيق"</strong> أو <strong>"إضافة إلى الشاشة الرئيسية"</strong>.</div>
              </div>
              <div class="step-item">
                <div class="step-num">٤</div>
                <div class="step-text">سيظهر لك تطبيق روح فوراً كأيقونة على جهازك، وسيعمل بكامل المزايا والسرعة محلياً وبالمزامنة الكاملة مع فايرباس دون استهلاك لموارد الهاتف!</div>
              </div>
            </div>

            <div class="btn-group">
              <a href="/" class="btn btn-primary">العودة وتشغيل تطبيق روح</a>
            </div>
            
            <div class="admin-note">
              ⚙️ لمسؤولي النظام: يمكنك رفع ملف الـ APK وتعيين الرابط المباشر له من خلال <strong>لوحة الإدارة ⬅️ قسم الـ APK</strong> لتفعيل تنزيل الحزمة تلقائياً لكافة المستخدمين في أي وقت بضغطة زر.
            </div>
          </div>
        </body>
        </html>
      `);
    } catch (e: any) {
      console.error("Android download apk compiling error:", e);
      res.status(500).send("فشل في تحضير تطبيق الأندرويد: " + e.message);
    }
  });

  // Serve uploads statically
  app.use('/uploads', express.static(uploadsDir));

  // Admin upload default birthday media API
  app.post("/api/control/upload-default-media", (req, res) => {
    try {
      const { filename, base64 } = req.body;
      if (!filename || !base64) return res.status(400).json({ error: "Missing filename or base64 data" });
      
      let cleanBase64 = base64;
      if (base64.startsWith('data:')) {
        cleanBase64 = base64.split(',')[1];
      }
      
      const targetPath = path.join(process.cwd(), 'public', 'aa', filename);
      fs.writeFileSync(targetPath, Buffer.from(cleanBase64, 'base64'));
      console.log(`🌸 User uploaded custom default asset written: public/aa/${filename}`);
      res.json({ success: true, url: `/aa/${filename}` });
    } catch (e: any) {
      console.error("Default media upload error:", e);
      res.status(500).json({ error: "Failed to upload default media: " + e.message });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath, { dotfiles: 'allow' }));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
