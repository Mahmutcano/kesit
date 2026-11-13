#!/bin/zsh
# macOS: Antigravity CLI'ı (agy) kurar ve Google hesabınla giriş ekranını açar.
export PATH="$HOME/.local/bin:/opt/homebrew/bin:/usr/local/bin:$PATH"
if ! command -v agy >/dev/null 2>&1; then
  echo "Antigravity CLI kuruluyor…"
  curl -fsSL https://antigravity.google/cli/install.sh | bash
  hash -r
fi
echo "Açılan ekranda Google hesabınla giriş yap. Bittikten sonra /exit yaz ve bu pencereyi kapat."
agy
