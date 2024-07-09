# Dockerfile_App2_Frontend
# Pull official base image
FROM node:latest

# Set the time zone
ENV TZ=America/Phoenix
RUN ln -snf /usr/share/zoneinfo/$TZ /etc/localtime && echo $TZ > /etc/timezone

# Set working directory in the container
WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install app dependencies
RUN npm install --force

# Copy app source code
COPY . .

# Build the app
RUN npm run build

# Start the app
CMD [ "npm", "start" ]
