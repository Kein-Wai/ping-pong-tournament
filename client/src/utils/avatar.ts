export const getPlayerAvatar = (name: string, avatarUrl?: string | null) => {
  console.log(avatarUrl);
  if (avatarUrl && avatarUrl.trim() !== '') {
    console.log('aqui');
    return avatarUrl;
  }
  const cleanName = encodeURIComponent(name || 'Jugador');
  return `https://api.dicebear.com/10.x/open-peeps/svg?seed=${cleanName}`;
};
