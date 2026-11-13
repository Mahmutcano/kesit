#!/bin/zsh
# macOS: Claude Code CLI'ı kurar ve giriş ekranını açar.
export PATH="$HOME/.local/bin:$HOME/.claude/local:/opt/homebrew/bin:/usr/local/bin:$PATH"
[ -s "$HOME/.nvm/nvm.sh" ] && . "$HOME/.nvm/nvm.sh" >/dev/null 2>&1
if ! command -v claude >/dev/null 2>&1; then
  echo "Claude Code kuruluyor…"
  curl -fsSL https://claude.ai/install.sh | bash || npm install -g @anthropic-ai/claude-code
  export PATH="$HOME/.local/bin:$PATH"; hash -r
fi
echo "Giriş için açılan ekrandaki adımları izle, bitince /exit yaz."
claude
