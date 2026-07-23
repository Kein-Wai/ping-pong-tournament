export const getPlayerAvatar = (name: string, avatarUrl?: string | null) => {
  if (avatarUrl && avatarUrl.trim() !== '') {
    return avatarUrl;
  }
  const cleanName = encodeURIComponent(name || 'Jugador');
  return `https://api.dicebear.com/10.x/open-peeps/svg?seed=${cleanName}`;
};
