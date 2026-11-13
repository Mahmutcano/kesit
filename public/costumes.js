// Çizgi film karakter kostümleri — sunucu (prompt) ve motor ortak kullanır.
// body: gövde rengi, legs: bacak, hat/hair: baş, detail: gövde süsü, facial: bıyık/sakal
export const COSTUMES = {
  casual: { body: '#4F86C6', legs: '#2B2B33', hair: 'short', hairColor: '#3B2A1E' },
  blob: { body: '#26282F', legs: '#17181D', skin: '#E4D1B1', hairColor: '#E4D1B1', detail: 'pocket', headScale: 1.32, brows: 1, hood: 1 },
  blobgrey: { body: '#6C717D', legs: '#23252C', skin: '#E4D1B1', hairColor: '#E4D1B1', detail: 'pocket', headScale: 1.32, brows: 1, hood: 1 },
  hoodie: { body: '#7A7F8C', legs: '#30323A', hair: 'spiky', hairColor: '#201A17', detail: 'pocket' },
  suit: { body: '#2F3B52', legs: '#1F2533', hair: 'short', hairColor: '#2A1E18', detail: 'tie' },
  businesswoman: { body: '#8E3B5E', legs: '#2A2230', hair: 'long', hairColor: '#5A3320', detail: 'buttons' },
  soldier: { body: '#7A7248', legs: '#3F3B26', hat: 'helmet', hatColor: '#5F5A38', belt: '#C9A227' },
  general: { body: '#6B6440', legs: '#35311F', hat: 'cap', hatColor: '#C9A227', belt: '#C9A227', facial: 'mustache', detail: 'medals' },
  gentleman: { body: '#6A5A3A', legs: '#2A241A', hat: 'tophat', hatColor: '#1E1E1E', belt: '#C9A227', facial: 'mustache' },
  lady: { body: '#C4567A', legs: '#C4567A', hat: 'sunhat', hatColor: '#F2D9A0', hair: 'long', hairColor: '#7A4A2A', detail: 'dress' },
  king: { body: '#8C1C2C', legs: '#3A1620', hat: 'crown', hatColor: '#F4C430', facial: 'beard', hairColor: '#6B4A2A', detail: 'sash' },
  queen: { body: '#6B2D8C', legs: '#6B2D8C', hat: 'crown', hatColor: '#F4C430', hair: 'long', hairColor: '#2A1A12', detail: 'dress' },
  farmer: { body: '#3F7CAC', legs: '#5A4630', hat: 'strawhat', hatColor: '#E3C16F', detail: 'overalls' },
  doctor: { body: '#F4F6F8', legs: '#3A4A5A', hair: 'short', hairColor: '#3B2A1E', detail: 'steth' },
  scientist: { body: '#F4F6F8', legs: '#2F3B52', hair: 'wild', hairColor: '#D9D9D9', detail: 'pocket', glasses: true },
  chef: { body: '#F7F7F2', legs: '#2B2B33', hat: 'chef', hatColor: '#FFFFFF', detail: 'buttons', facial: 'mustache' },
  worker: { body: '#F28C28', legs: '#3A4A5A', hat: 'hardhat', hatColor: '#F4C430', detail: 'vest' },
  police: { body: '#243B6B', legs: '#1A2744', hat: 'cap', hatColor: '#1A2744', belt: '#111111', detail: 'badge' },
  pirate: { body: '#7A1F1F', legs: '#2A2A2A', hat: 'tricorn', hatColor: '#1E1E1E', facial: 'beard', hairColor: '#2A1A12', belt: '#C9A227', eyepatch: true },
  wizard: { body: '#3D2C8D', legs: '#3D2C8D', hat: 'wizard', hatColor: '#3D2C8D', facial: 'longbeard', hairColor: '#E8E8E8', detail: 'dress' },
  knight: { body: '#9AA3AD', legs: '#5C6670', hat: 'knight', hatColor: '#9AA3AD', belt: '#6B4A2A', detail: 'cross' },
  caveman: { body: '#B07A3A', legs: '#D9A066', hair: 'wild', hairColor: '#3B2A1E', facial: 'beard', detail: 'spots', barefoot: true },
  roman: { body: '#F2EFE6', legs: '#D9A066', hat: 'roman', hatColor: '#C9A227', detail: 'sash', barefoot: true },
  viking: { body: '#6B4A2A', legs: '#3A2C1E', hat: 'viking', hatColor: '#9AA3AD', facial: 'beard', hairColor: '#C9772E', belt: '#3A2C1E' },
  teacher: { body: '#5C7C5A', legs: '#3A3A44', hair: 'bun', hairColor: '#5A3320', glasses: true, detail: 'buttons' },
  student: { body: '#E4572E', legs: '#2F3B52', hair: 'spiky', hairColor: '#201A17', detail: 'backpack' },
  astronaut: { body: '#EDEFF2', legs: '#C9CED6', hat: 'astronaut', hatColor: '#EDEFF2', detail: 'badge' },
  ninja: { body: '#1E1E24', legs: '#1E1E24', hat: 'ninja', hatColor: '#1E1E24', belt: '#B3261E' },
  cowboy: { body: '#A0522D', legs: '#3A5A8C', hat: 'cowboy', hatColor: '#6B4A2A', facial: 'mustache', detail: 'vest', belt: '#C9A227' },
  grandpa: { body: '#8A7B6B', legs: '#4A4038', hair: 'bald', hairColor: '#E0E0E0', facial: 'mustache', glasses: true, detail: 'buttons' },
  kid: { body: '#F2C230', legs: '#3A6EA5', hat: 'ballcap', hatColor: '#E4572E', small: true },
  athlete: { body: '#E63946', legs: '#F1F1F1', hair: 'short', hairColor: '#201A17', hat: 'headband', hatColor: '#FFFFFF', detail: 'number' },
  artist: { body: '#2B2B33', legs: '#3A3A44', hat: 'beret', hatColor: '#B3261E', facial: 'mustache', detail: 'stripes' },
  detective: { body: '#8C6B3F', legs: '#3A2C1E', hat: 'fedora', hatColor: '#5A4630', detail: 'coat', belt: '#3A2C1E' },
};
export const COSTUME_NAMES = Object.keys(COSTUMES);
export const SKINS = ['#F6D2B0', '#EBC08C', '#D9A066', '#B9814F', '#8D5A3A', '#F2C9A0'];
export const FLAGS = ['tr', 'us', 'gb', 'de', 'fr', 'it', 'es', 'ru', 'jp', 'cn', 'nl', 'ua', 'pl', 'se', 'br', 'in', 'az', 'eu', 'at', 'ie', 'be', 'ro', 'gr', 'ca'];
export const GROUND_ITEMS = ['pig', 'dog', 'cat', 'cow', 'sheep', 'chicken', 'campfire', 'chest', 'rock', 'sword', 'tree', 'house', 'car', 'bomb', 'gift', 'plant', 'door'];
