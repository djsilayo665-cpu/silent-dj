FROM node:22-slim

# Install git and other dependencies
RUN apt-get update -qq && \
    apt-get install --no-install-recommends -y \
    ffmpeg \
    libwebp7 \
    git \
    openssh-client \
    ca-certificates && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# Force git to use HTTPS for GitHub
RUN git config --global url."https://github.com/".insteadOf git@github.com: && \
    git config --global url."https://".insteadOf ssh://git@github.com/ && \
    git config --global url."https://github.com/".insteadOf ssh://git@github.com

# Set working directory
WORKDIR /app

# Copy npmrc first
COPY .npmrc .npmrc

# Copy package files
COPY package*.json ./

# Install dependencies with verbose output
RUN npm install --loglevel=verbose

# Copy the rest of the application
COPY . .

# Start the bot
CMD ["node", "index.js"]
