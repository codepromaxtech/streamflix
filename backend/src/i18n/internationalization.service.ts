import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';

interface Translation {
  key: string;
  value: string;
  locale: string;
  namespace?: string;
  context?: string;
  pluralForm?: string;
}

interface LocaleConfig {
  code: string;
  name: string;
  nativeName: string;
  direction: 'ltr' | 'rtl';
  currency: string;
  dateFormat: string;
  timeFormat: string;
  numberFormat: {
    decimal: string;
    thousands: string;
  };
  isActive: boolean;
  isDefault: boolean;
}

interface TranslationRequest {
  text: string;
  fromLocale: string;
  toLocale: string;
  context?: string;
}

@Injectable()
export class InternationalizationService {
  private readonly logger = new Logger(InternationalizationService.name);
  private translations: Map<string, Map<string, string>> = new Map();
  private locales: Map<string, LocaleConfig> = new Map();
  private defaultLocale = 'en';

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {
    this.initializeI18n();
  }

  private async initializeI18n(): Promise<void> {
    try {
      await this.loadSupportedLocales();
      await this.loadTranslations();
      this.logger.log('Internationalization service initialized');
    } catch (error) {
      this.logger.error('Error initializing i18n service:', error);
    }
  }

  async getSupportedLocales(): Promise<LocaleConfig[]> {
    return Array.from(this.locales.values()).filter(locale => locale.isActive);
  }

  async getTranslation(
    key: string,
    locale: string,
    params?: Record<string, any>,
    namespace?: string,
  ): Promise<string> {
    try {
      const translationKey = namespace ? `${namespace}.${key}` : key;
      const localeTranslations = this.translations.get(locale);
      
      let translation = localeTranslations?.get(translationKey);
      
      // Fallback to default locale if translation not found
      if (!translation && locale !== this.defaultLocale) {
        const defaultTranslations = this.translations.get(this.defaultLocale);
        translation = defaultTranslations?.get(translationKey);
      }
      
      // Fallback to key if no translation found
      if (!translation) {
        translation = key;
        this.logger.warn(`Translation not found: ${translationKey} for locale ${locale}`);
      }
      
      // Replace parameters
      if (params) {
        translation = this.interpolateParams(translation, params);
      }
      
      return translation;
    } catch (error) {
      this.logger.error('Error getting translation:', error);
      return key;
    }
  }

  async getTranslations(
    keys: string[],
    locale: string,
    namespace?: string,
  ): Promise<Record<string, string>> {
    const translations: Record<string, string> = {};
    
    for (const key of keys) {
      translations[key] = await this.getTranslation(key, locale, undefined, namespace);
    }
    
    return translations;
  }

  async addTranslation(translation: Translation): Promise<void> {
    try {
      // Save to database
      await this.prisma.translation.upsert({
        where: {
          key_locale_namespace: {
            key: translation.key,
            locale: translation.locale,
            namespace: translation.namespace || 'default',
          },
        },
        update: {
          value: translation.value,
          context: translation.context,
          pluralForm: translation.pluralForm,
          updatedAt: new Date(),
        },
        create: {
          key: translation.key,
          value: translation.value,
          locale: translation.locale,
          namespace: translation.namespace || 'default',
          context: translation.context,
          pluralForm: translation.pluralForm,
        },
      });

      // Update in-memory cache
      const localeTranslations = this.translations.get(translation.locale) || new Map();
      const translationKey = translation.namespace 
        ? `${translation.namespace}.${translation.key}` 
        : translation.key;
      localeTranslations.set(translationKey, translation.value);
      this.translations.set(translation.locale, localeTranslations);

      this.logger.log(`Translation added: ${translation.key} for locale ${translation.locale}`);
    } catch (error) {
      this.logger.error('Error adding translation:', error);
      throw error;
    }
  }

  async updateTranslation(
    key: string,
    locale: string,
    value: string,
    namespace?: string,
  ): Promise<void> {
    try {
      await this.prisma.translation.update({
        where: {
          key_locale_namespace: {
            key,
            locale,
            namespace: namespace || 'default',
          },
        },
        data: {
          value,
          updatedAt: new Date(),
        },
      });

      // Update in-memory cache
      const localeTranslations = this.translations.get(locale) || new Map();
      const translationKey = namespace ? `${namespace}.${key}` : key;
      localeTranslations.set(translationKey, value);
      this.translations.set(locale, localeTranslations);

      this.logger.log(`Translation updated: ${key} for locale ${locale}`);
    } catch (error) {
      this.logger.error('Error updating translation:', error);
      throw error;
    }
  }

  async deleteTranslation(key: string, locale: string, namespace?: string): Promise<void> {
    try {
      await this.prisma.translation.delete({
        where: {
          key_locale_namespace: {
            key,
            locale,
            namespace: namespace || 'default',
          },
        },
      });

      // Remove from in-memory cache
      const localeTranslations = this.translations.get(locale);
      if (localeTranslations) {
        const translationKey = namespace ? `${namespace}.${key}` : key;
        localeTranslations.delete(translationKey);
      }

      this.logger.log(`Translation deleted: ${key} for locale ${locale}`);
    } catch (error) {
      this.logger.error('Error deleting translation:', error);
      throw error;
    }
  }

  async importTranslations(
    locale: string,
    translations: Record<string, string>,
    namespace?: string,
  ): Promise<{ imported: number; errors: number }> {
    let imported = 0;
    let errors = 0;

    for (const [key, value] of Object.entries(translations)) {
      try {
        await this.addTranslation({
          key,
          value,
          locale,
          namespace,
        });
        imported++;
      } catch (error) {
        this.logger.error(`Error importing translation ${key}:`, error);
        errors++;
      }
    }

    this.logger.log(`Import completed: ${imported} imported, ${errors} errors`);
    return { imported, errors };
  }

  async exportTranslations(
    locale: string,
    namespace?: string,
  ): Promise<Record<string, string>> {
    try {
      const translations = await this.prisma.translation.findMany({
        where: {
          locale,
          ...(namespace && { namespace }),
        },
      });

      const result: Record<string, string> = {};
      translations.forEach(translation => {
        const key = namespace && translation.namespace !== 'default'
          ? `${translation.namespace}.${translation.key}`
          : translation.key;
        result[key] = translation.value;
      });

      return result;
    } catch (error) {
      this.logger.error('Error exporting translations:', error);
      throw error;
    }
  }

  async getMissingTranslations(locale: string): Promise<string[]> {
    try {
      // Get all keys from default locale
      const defaultKeys = await this.prisma.translation.findMany({
        where: { locale: this.defaultLocale },
        select: { key: true, namespace: true },
      });

      // Get existing keys for target locale
      const existingKeys = await this.prisma.translation.findMany({
        where: { locale },
        select: { key: true, namespace: true },
      });

      const existingKeySet = new Set(
        existingKeys.map(t => `${t.namespace || 'default'}.${t.key}`)
      );

      const missingKeys = defaultKeys
        .filter(t => !existingKeySet.has(`${t.namespace || 'default'}.${t.key}`))
        .map(t => t.namespace && t.namespace !== 'default' 
          ? `${t.namespace}.${t.key}` 
          : t.key
        );

      return missingKeys;
    } catch (error) {
      this.logger.error('Error getting missing translations:', error);
      return [];
    }
  }

  async autoTranslate(request: TranslationRequest): Promise<string> {
    try {
      // Implement auto-translation using services like Google Translate
      // This is a placeholder implementation
      const translatedText = await this.callTranslationAPI(request);
      return translatedText;
    } catch (error) {
      this.logger.error('Error auto-translating:', error);
      return request.text;
    }
  }

  async formatCurrency(
    amount: number,
    locale: string,
    currency?: string,
  ): Promise<string> {
    try {
      const localeConfig = this.locales.get(locale);
      const currencyCode = currency || localeConfig?.currency || 'USD';
      
      return new Intl.NumberFormat(locale, {
        style: 'currency',
        currency: currencyCode,
      }).format(amount);
    } catch (error) {
      this.logger.error('Error formatting currency:', error);
      return amount.toString();
    }
  }

  async formatDate(
    date: Date,
    locale: string,
    options?: Intl.DateTimeFormatOptions,
  ): Promise<string> {
    try {
      const localeConfig = this.locales.get(locale);
      const formatOptions = options || {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      };
      
      return new Intl.DateTimeFormat(locale, formatOptions).format(date);
    } catch (error) {
      this.logger.error('Error formatting date:', error);
      return date.toISOString();
    }
  }

  async formatNumber(
    number: number,
    locale: string,
    options?: Intl.NumberFormatOptions,
  ): Promise<string> {
    try {
      return new Intl.NumberFormat(locale, options).format(number);
    } catch (error) {
      this.logger.error('Error formatting number:', error);
      return number.toString();
    }
  }

  async getLocaleConfig(locale: string): Promise<LocaleConfig | null> {
    return this.locales.get(locale) || null;
  }

  async addLocale(config: LocaleConfig): Promise<void> {
    try {
      await this.prisma.locale.upsert({
        where: { code: config.code },
        update: config,
        create: config,
      });

      this.locales.set(config.code, config);
      this.logger.log(`Locale added: ${config.code}`);
    } catch (error) {
      this.logger.error('Error adding locale:', error);
      throw error;
    }
  }

  async getTranslationProgress(): Promise<Record<string, {
    total: number;
    translated: number;
    percentage: number;
  }>> {
    try {
      const defaultTranslationCount = await this.prisma.translation.count({
        where: { locale: this.defaultLocale },
      });

      const progress: Record<string, any> = {};

      for (const locale of this.locales.keys()) {
        if (locale === this.defaultLocale) continue;

        const translatedCount = await this.prisma.translation.count({
          where: { locale },
        });

        progress[locale] = {
          total: defaultTranslationCount,
          translated: translatedCount,
          percentage: Math.round((translatedCount / defaultTranslationCount) * 100),
        };
      }

      return progress;
    } catch (error) {
      this.logger.error('Error getting translation progress:', error);
      return {};
    }
  }

  // Private helper methods
  private async loadSupportedLocales(): Promise<void> {
    try {
      // Load from database
      const locales = await this.prisma.locale.findMany({
        where: { isActive: true },
      });

      // Add default locales if none exist
      if (locales.length === 0) {
        await this.createDefaultLocales();
        return this.loadSupportedLocales();
      }

      locales.forEach(locale => {
        this.locales.set(locale.code, locale as LocaleConfig);
        if (locale.isDefault) {
          this.defaultLocale = locale.code;
        }
      });

      this.logger.log(`Loaded ${locales.length} supported locales`);
    } catch (error) {
      this.logger.error('Error loading supported locales:', error);
    }
  }

  private async loadTranslations(): Promise<void> {
    try {
      const translations = await this.prisma.translation.findMany();

      translations.forEach(translation => {
        const localeTranslations = this.translations.get(translation.locale) || new Map();
        const key = translation.namespace && translation.namespace !== 'default'
          ? `${translation.namespace}.${translation.key}`
          : translation.key;
        localeTranslations.set(key, translation.value);
        this.translations.set(translation.locale, localeTranslations);
      });

      this.logger.log(`Loaded ${translations.length} translations`);
    } catch (error) {
      this.logger.error('Error loading translations:', error);
    }
  }

  private async createDefaultLocales(): Promise<void> {
    const defaultLocales: LocaleConfig[] = [
      {
        code: 'en',
        name: 'English',
        nativeName: 'English',
        direction: 'ltr',
        currency: 'USD',
        dateFormat: 'MM/DD/YYYY',
        timeFormat: '12h',
        numberFormat: { decimal: '.', thousands: ',' },
        isActive: true,
        isDefault: true,
      },
      {
        code: 'es',
        name: 'Spanish',
        nativeName: 'Español',
        direction: 'ltr',
        currency: 'EUR',
        dateFormat: 'DD/MM/YYYY',
        timeFormat: '24h',
        numberFormat: { decimal: ',', thousands: '.' },
        isActive: true,
        isDefault: false,
      },
      {
        code: 'fr',
        name: 'French',
        nativeName: 'Français',
        direction: 'ltr',
        currency: 'EUR',
        dateFormat: 'DD/MM/YYYY',
        timeFormat: '24h',
        numberFormat: { decimal: ',', thousands: ' ' },
        isActive: true,
        isDefault: false,
      },
      {
        code: 'de',
        name: 'German',
        nativeName: 'Deutsch',
        direction: 'ltr',
        currency: 'EUR',
        dateFormat: 'DD.MM.YYYY',
        timeFormat: '24h',
        numberFormat: { decimal: ',', thousands: '.' },
        isActive: true,
        isDefault: false,
      },
      {
        code: 'ar',
        name: 'Arabic',
        nativeName: 'العربية',
        direction: 'rtl',
        currency: 'USD',
        dateFormat: 'DD/MM/YYYY',
        timeFormat: '12h',
        numberFormat: { decimal: '.', thousands: ',' },
        isActive: true,
        isDefault: false,
      },
    ];

    for (const locale of defaultLocales) {
      await this.prisma.locale.create({ data: locale });
    }
  }

  private interpolateParams(text: string, params: Record<string, any>): string {
    return text.replace(/\{\{(\w+)\}\}/g, (match, key) => {
      return params[key] !== undefined ? String(params[key]) : match;
    });
  }

  private async callTranslationAPI(request: TranslationRequest): Promise<string> {
    // Placeholder for actual translation API call
    // This would integrate with Google Translate, AWS Translate, etc.
    return `[AUTO-TRANSLATED from ${request.fromLocale} to ${request.toLocale}] ${request.text}`;
  }
}
