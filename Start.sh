#!/bin/bash

# === LernDashboard PWA – Lokaler Server für macOS ===
# Speichere diese Datei im selben Ordner wie index.html

# Farben für schöne Ausgabe
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}LernDashboard PWA wird gestartet...${NC}"

# Prüfe, ob Python 3 installiert ist
if ! command -v python3 &> /dev/null; then
    echo -e "${RED}Python 3 ist nicht installiert!${NC}"
    echo -e "${YELLOW}Installiere Python von https://www.python.org/downloads/${NC}"
    open "https://www.python.org/downloads/"
    exit 1
fi

# Starte lokalen Server auf Port 8000
echo -e "${GREEN}Starte lokalen Server auf http://localhost:8000${NC}"
echo -e "${YELLOW}Drücke STRG+C zum Beenden${NC}"

# Starte Server im Hintergrund
python3 -m http.server 8000 > /dev/null 2>&1 &
SERVER_PID=$!

# Warte kurz, bis Server läuft
sleep 2

# Öffne im Standard-Browser
echo -e "${GREEN}Öffne im Browser...${NC}"
open "http://localhost:8000"

# Warte, bis Benutzer STRG+C drückt
wait $SERVER_PID

echo -e "${BLUE}Server beendet. Auf Wiedersehen!${NC}"