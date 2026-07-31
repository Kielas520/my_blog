// @ts-expect-error Astro runs this build-time module in Node; the project does not ship Node typings.
import { readFileSync } from 'node:fs';

export interface SiteConfig {
  siteName: string;
  icon: string;
  avatar: string;
  backgroundImage: string;
  cursor: string;
}

const defaults: SiteConfig = {
  siteName: 'Hi There',
  icon: '/images/kiana.jpg',
  avatar: '/images/kiana.jpg',
  backgroundImage: '/images/frutiger_aero.jpg',
  cursor: '/cursors/vista-glass.svg',
};

function readSiteConfig(): SiteConfig {
  try {
    const path = new URL('../../public/config.json', import.meta.url);
    const value = JSON.parse(readFileSync(path, 'utf8')) as Partial<SiteConfig>;
    return { ...defaults, ...value };
  } catch {
    return defaults;
  }
}

export const siteConfig = readSiteConfig();
