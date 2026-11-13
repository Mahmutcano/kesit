#!/bin/zsh
# macOS: çift tıkla → sunucu (yeniden) başlar ve tarayıcı açılır. Bu pencere açık kaldıkça uygulama çalışır.
cd "$(dirname "$0")"
[ -s "$HOME/.nvm/nvm.sh" ] && . "$HOME/.nvm/nvm.sh" >/dev/null 2>&1
export PATH="$HOME/.local/bin:/opt/homebrew/bin:/usr/local/bin:$PATH"
OLD=$(lsof -ti tcp:5178 2>/dev/null)
if [ -n "$OLD" ]; then
  echo "Eski sunucu kapatılıyor…"
  kill $OLD 2>/dev/null
  sleep 1
fi
node scripts/setup.js
( sleep 2; open http://127.0.0.1:5178 ) &
node server.js
