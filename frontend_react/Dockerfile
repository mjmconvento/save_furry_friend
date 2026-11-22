# Dockerfile for React
# Node 26 is the Active LTS line (LTS from 2026-10-28, EOL 2029-04-30). Do not
# follow odd-numbered majors here - they go end-of-life six months after release.
FROM node:26

# Set the working directory
WORKDIR /app

# From Node 26 the official image ships neither yarn nor corepack. Install the
# exact yarn the project pins in package.json ("packageManager"), so the image
# and the server's SPA build use the same one.
COPY package.json ./
RUN npm install --global --no-fund --no-audit \
        "$(node -p 'require("./package.json").packageManager')"

# Install dependencies from the committed lockfile. yarn.lock must be copied
# here, or the cached install layer silently ignores dependency updates.
COPY package.json yarn.lock ./

RUN yarn install --frozen-lockfile

# Copy the rest of the application files
COPY . .

# Expose the application's port
EXPOSE 3000

# Start the React application
CMD ["yarn", "start"]