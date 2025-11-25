#!/bin/bash

# MapChirp Extension Packaging Script
# Creates zip files for Chrome and Firefox extensions

set -e

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Get the script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo -e "${BLUE}Starting MapChirp packaging...${NC}"

# Package Chrome extension
if [ -d "Chrome" ]; then
    echo -e "${BLUE}Packaging Chrome extension...${NC}"
    cd Chrome
    zip -r ../mapchirp-chrome.zip . -x "*.git*" -x "*.DS_Store" -x "*Thumbs.db"
    cd ..
    echo -e "${GREEN}✓ Chrome extension packaged: mapchirp-chrome.zip${NC}"
else
    echo "Warning: Chrome directory not found"
fi

# Package Firefox extension
if [ -d "firefox" ]; then
    echo -e "${BLUE}Packaging Firefox extension...${NC}"
    cd firefox
    zip -r ../mapchirp-firefox.zip . -x "*.git*" -x "*.DS_Store" -x "*Thumbs.db"
    cd ..
    echo -e "${GREEN}✓ Firefox extension packaged: mapchirp-firefox.zip${NC}"
else
    echo "Warning: firefox directory not found"
fi

echo -e "${GREEN}Packaging complete!${NC}"
ls -lh mapchirp-*.zip 2>/dev/null || echo "No zip files created"
