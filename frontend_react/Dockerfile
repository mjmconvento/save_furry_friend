# Dockerfile for React
# Use an appropriate Node.js version
FROM node:23

# Set the working directory
WORKDIR /app

# Copy package.json and package-lock.json for npm install
COPY package*.json ./

# Install dependencies
RUN yarn install

# Copy the rest of the application files
COPY . .

# Expose the application's port
EXPOSE 3000

# Start the React application
CMD ["npm", "start"]