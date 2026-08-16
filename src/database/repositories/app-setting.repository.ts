import { database } from '@/database/database';
import type { LaunchPreference, ThemePreference } from '@/stores/app.store';

type SettingKey = 'theme_preference' | 'launch_preference';

type AppSettingRow = {
  value: string;
};

export type AppPreferences = {
  launchPreference: LaunchPreference;
  themePreference: ThemePreference;
};

const defaultPreferences: AppPreferences = {
  launchPreference: 'notebooks',
  themePreference: 'system',
};

function nowIso() {
  return new Date().toISOString();
}

function getValue(key: SettingKey) {
  return database.getFirstSync<AppSettingRow>(
    `
      SELECT value
      FROM app_setting
      WHERE key = ?
    `,
    key,
  )?.value;
}

function setValue(key: SettingKey, value: string) {
  database.runSync(
    `
      INSERT INTO app_setting (key, value, updated_at)
      VALUES (?, ?, ?)
      ON CONFLICT(key) DO UPDATE SET
        value = excluded.value,
        updated_at = excluded.updated_at
    `,
    key,
    value,
    nowIso(),
  );
}

function isThemePreference(value: string | undefined): value is ThemePreference {
  return value === 'system' || value === 'light' || value === 'dark';
}

function isLaunchPreference(value: string | undefined): value is LaunchPreference {
  return value === 'notebooks' || value === 'defaultNotebook';
}

export const appSettingRepository = {
  getPreferences(): AppPreferences {
    const themePreference = getValue('theme_preference');
    const launchPreference = getValue('launch_preference');

    return {
      launchPreference: isLaunchPreference(launchPreference)
        ? launchPreference
        : defaultPreferences.launchPreference,
      themePreference: isThemePreference(themePreference)
        ? themePreference
        : defaultPreferences.themePreference,
    };
  },

  setLaunchPreference(value: LaunchPreference) {
    setValue('launch_preference', value);
  },

  setThemePreference(value: ThemePreference) {
    setValue('theme_preference', value);
  },
};
