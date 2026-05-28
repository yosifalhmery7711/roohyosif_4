export interface HistoryItem {
  id: string;
  timestamp: number;
  type: 'calculator' | 'converter' | 'health' | 'ai';
  title: string;
  details: string;
  result: string;
}

export interface AIMessage {
  id?: string;
  role: 'user' | 'model';
  content: string;
  image?: string;
}

export type UnitType = 'mass' | 'volume' | 'distance';

export interface Unit {
  label: string;
  value: string;
  factor: number; // Factor relative to a base unit
}

export interface Nickname {
  ar: string;
  en: string;
}

export interface Greeting {
  id: string;
  sender: string | null;
  text: string;
  anonymous: boolean;
  color: string;
  timestamp: string;
}

export interface ProfessionalCountdownConfig {
  enabled: boolean;
  names: Nickname[];
  birthDate: string;
  bgType: 'color' | 'image';
  bgValue: string;
  musicUrl: string;
  textColor: string;
  usernameEn: string;
}

export interface Experience {
  id: string;
  title: string;
  company: string;
  from: string;
  to: string;
  description: string;
}

export interface Certificate {
  id: string;
  name: string;
  issuer: string;
  date: string;
}

export interface Language {
  id: string;
  name: string;
  level: number; // 0-100
}

export interface CVData {
  jobTitle: string;
  name: string;
  email: string;
  phone: string;
  whatsapp: string;
  summary: string;
  experiences: Experience[];
  certificates: Certificate[];
  skills: string[];
  languages: Language[];
  template: 'classic' | 'modern' | 'minimal' | 'elegant' | 'executive' | 'tech' | 'modern_pro' | 'creative' | 'classic_pro' | 'hot';
}

export interface ChatMessage {
  id?: string;
  from?: string;
  to?: string;
  text?: string;
  type?: 'text' | 'image' | 'video';
  mediaUrl?: string;
  role?: 'user' | 'model' | 'system';
  content?: string;
  image?: string;
  timestamp: string | number;
  status?: 'sent' | 'delivered' | 'read';
}

export interface ChatFriend {
  id: string;
  name: string;
  phone: string;
  accessCodes?: string[];
  lastMessage?: string;
  unreadCount?: number;
  avatar?: string;
  status?: {
    online: boolean;
    lastSeen?: string | number;
  };
}

export interface UserFolder {
  id: string;
  name: string;
  folderName: string;
  count?: number;
  files?: any[];
}

export interface UsageTip {
  id: string;
  title: string;
  text: string;
  targetTab: string;
}
