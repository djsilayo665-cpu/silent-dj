# Use a slim Node.js image
FROM node:22-slim

# Install ONLY the runtime dependencies your bot needs (ffmpeg for media, libwebp for images)
RUN apt-get update -qq && \
    apt-get install --no-install-recommends -y ffmpeg libwebp7 && \
    rm -rf /var/lib/apt/lists/*

# Set the working directory
WORKDIR /app

# Copy package files and install dependencies (this caches the layer)
COPY package*.json ./
RUN npm install --omit=dev

# Copy the rest of your application code
COPY . .

# Start the bot
CMD ["node", "index.js"]
