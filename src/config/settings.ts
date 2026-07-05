export type AppSettingKey = "site_name" | "registration_enabled" | "arl_token";

export type AppSettingDefinition =
  | {
      key: AppSettingKey;
      label: string;
      description: string;
      type: "string";
      default: string;
    }
   | {
      key: AppSettingKey;
      label: string;
      description: string;
      type: "string";
      default: string;
    }
  | {
      key: AppSettingKey;
      label: string;
      description: string;
      type: "boolean";
      default: "true" | "false";
    };

export const APP_SETTINGS: AppSettingDefinition[] = [
  {
    key: "site_name",
    label: "Nom de l'application",
    description:
      "Affiché dans la barre latérale et l'en-tête de l'application.",
    type: "string",
    default: "Spotlab",
  },
  {
    key: "arl_token",
    label: "Token ARL Deezer",
    description:
      "Sera utilisé afin de télécharger les musiques localement.",
    type: "string",
    default: "qwerty",
  },
  {
    key: "registration_enabled",
    label: "Inscriptions ouvertes",
    description:
      "Autorise la création de nouveaux comptes depuis la page d'inscription.",
    type: "boolean",
    default: "true",
  },
];

export type UserSettingKey = "library_sort_order";

export type UserSettingDefinition = {
  key: UserSettingKey;
  label: string;
  description: string;
  type: "select";
  options: { value: string; label: string }[];
  default: string;
};

export const USER_SETTINGS: UserSettingDefinition[] = [
  {
    key: "library_sort_order",
    label: "Tri de la bibliothèque",
    description: "Ordre d'affichage des titres likés sur la page Bibliothèque.",
    type: "select",
    options: [
      { value: "recent", label: "Ajout récent" },
      { value: "title", label: "Titre (A-Z)" },
      { value: "artist", label: "Artiste (A-Z)" },
    ],
    default: "recent",
  },
];
