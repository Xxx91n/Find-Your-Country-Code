export interface SiteRules {
  isExcluded(url: string): boolean;
}

export function createRules(): SiteRules {
  return { isExcluded: () => false };
}
