import { apiRequest } from "./client";

export type FooterLink = {
  id?: string;
  label: string;
  url: string;
  target?: "_self" | "_blank" | string;
  sortOrder?: number;
  active?: boolean;
};

export type FooterColumn = {
  id?: string;
  title: string;
  sortOrder?: number;
  active?: boolean;
  links: FooterLink[];
};

export type FooterImageButton = {
  id?: string;
  label?: string;
  imageUrl: string;
  url: string;
  target?: "_self" | "_blank" | string;
  active?: boolean;
  sortOrder?: number;
};

export type FooterSocialLink = {
  id?: string;
  platform?: string;
  label: string;
  url: string;
  icon?: string;
  target?: "_self" | "_blank" | string;
  active?: boolean;
  sortOrder?: number;
};

export type FooterCountry = {
  id?: string;
  name: string;
  flagUrl: string;
  url?: string;
  target?: "_self" | "_blank" | string;
  active?: boolean;
  sortOrder?: number;
};

export type FooterData = {
  brandText?: string;

  columns: FooterColumn[];

  appDownload?: {
    title?: string;
    description?: string;
    buttons?: FooterImageButton[];
  };

  social?: {
    title?: string;
    links?: FooterSocialLink[];
  };

  shoppingFrom?: {
    title?: string;
    currentText?: string;
    currentCountry?: FooterCountry;
    internationalText?: string;
    countries?: FooterCountry[];
  };

  legalLinks?: FooterLink[];

  badges?: FooterImageButton[];

  promoTab?: {
    enabled?: boolean;
    text?: string;
    url?: string;
  };

   floatingButtons?: {
    enabled?: boolean;
  };

  copyright?: string;
};

export type FooterResponse = {
  success?: boolean;
  data?:
    | FooterData
    | {
        id?: string;
        key?: string;
        value?: FooterData;
        status?: string;
        createdBy?: string | null;
        updatedBy?: string | null;
        createdAt?: string;
        updatedAt?: string;
      };
  error?: string | null;
};

export function getSiteFooter() {
  return apiRequest<FooterResponse>("/site/footer", {
    method: "GET",
  });
}