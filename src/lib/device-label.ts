export function detectDeviceLabel(userAgent: string): {
  name: string;
  platform: string;
} {
  const isTablet = /iPad|Tablet/i.test(userAgent);
  const isMobile = !isTablet && /Mobi|Android|iPhone/i.test(userAgent);
  const platform = isTablet
    ? "Tablette"
    : isMobile
      ? "Téléphone"
      : "Ordinateur";

  const browser = /Edg\//i.test(userAgent)
    ? "Edge"
    : /Firefox/i.test(userAgent)
      ? "Firefox"
      : /Chrome/i.test(userAgent)
        ? "Chrome"
        : /Safari/i.test(userAgent)
          ? "Safari"
          : "Navigateur";

  return { name: `${browser} sur ${platform}`, platform };
}
