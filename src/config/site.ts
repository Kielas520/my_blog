import config from '../../public/config.json';

export interface SiteConfig {
  siteName: string;
  icon: string;
  avatar: string;
  backgroundImage: string;
  cursor: string;
}

const defaults: SiteConfig = {
  siteName: 'Hi There',
  icon: 'https://image.kielasovo.com/2026/10/8de4e3a07a08c071fe4f6bee2ba5bce6.jpg',
  avatar: 'https://image.kielasovo.com/2026/10/8de4e3a07a08c071fe4f6bee2ba5bce6.jpg',
  backgroundImage: '',
  cursor: 'https://image.kielasovo.com/2026/10/85a5e0ade6ca166e36e53b0ff1f710c5.png',
};

export const siteConfig: SiteConfig = { ...defaults, ...config };
