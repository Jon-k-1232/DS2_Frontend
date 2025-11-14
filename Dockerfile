# Dockerfile_App2_Frontend
# Pull official base image (pin to an LTS release)
FROM node:20.18.0-alpine

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

# Accept build arguments
ARG REACT_APP_ENV=production
ARG REACT_APP_API_PROD_ENDPOINT=https://ds2.kimmeloffice.com/ds2_backend

# Set as environment variables for the build
ENV REACT_APP_ENV=$REACT_APP_ENV
ENV REACT_APP_API_PROD_ENDPOINT=$REACT_APP_API_PROD_ENDPOINT

# Build the app for production
RUN npm run build

# Install serve to run the production build
RUN npm install -g serve

# Expose port 3003
EXPOSE 3003

# Serve the production build on port 3003
CMD ["serve", "-s", "build", "-l", "3003"]
