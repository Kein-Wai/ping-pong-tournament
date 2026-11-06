import { Capacitor } from '@capacitor/core';

/** `true` en las apps de iOS y Android; `false` en el navegador. El modo sin conexión solo existe en las primeras. */
export const isNativeApp = (): boolean => Capacitor.isNativePlatform();
