# Dockerfile for React
# Use an appropriate Node.js version
FROM node:23

# Set the working directory
WORKDIR /app

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