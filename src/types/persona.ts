export interface Source {
  id: string;
  type: 'url' | 'file';
  name: string;
  content?: string; // For files
  url?: string; // For URLs
}

export interface Persona {
  id: string;
  name: string;
  role: string;
  description: string;
  voice: 'Puck' | 'Charon' | 'Kore' | 'Fenrir' | 'Zephyr';
  systemInstruction: string;
  attributes: {
    tone: string;
    expertise: string[];
    personality: string;
  };
  memory: string[];
  sources?: Source[];
  notebookConfig?: {
    enabled: boolean;
    id: string; // Google Doc ID
    name: string;
    lastSynced?: string;
  };
  bridgeConfig?: {
    enabled: boolean;
    ip: string;
    port: number;
    protocol: 'http' | 'https';
  };
  rustDeskConfig?: {
    enabled: boolean;
    id: string;
    password?: string;
    server?: string;
  };
}

export interface TailscaleDevice {
  id: string;
  name: string;
  addresses: string[];
  lastSeen: string;
  online: boolean;
  os: string;
}
