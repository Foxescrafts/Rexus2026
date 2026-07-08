#!/data/data/com.termux/files/usr/bin/bash
cd ~/dream_bot_new/bot2
while true; do
  node index.js
  echo "Rexus Manager упал. Перезапуск через 3 секунды..."
  sleep 3
done
