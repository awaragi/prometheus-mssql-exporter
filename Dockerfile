FROM node:16.10.0-alpine
MAINTAINER Pierre Awaragi (pierre@awaragi.com)

# Create a directory where our app will be placed
RUN mkdir -p /usr/src/app

# Change directory so that our commands run inside this new directory
WORKDIR /usr/src/app

# Copy dependency definitions
COPY package.json *.js /usr/src/app/

# Install dependecies
RUN npm install --production

# Expose the port the app runs in
EXPOSE 4000

RUN apk add shadow && useradd --no-log-init -r user

USER user

# Serve the app
CMD ["node", "index.js"]
