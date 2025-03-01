# Stage 1: Build the frontend
FROM node:23 AS builder

WORKDIR /app

# Copy package.json and package-lock.json to leverage Docker caching
COPY ./package.json ./package-lock.json ./

RUN npm install --frozen-lockfile

# Copy the rest of the frontend code and build
COPY . .

RUN chmod -R a+x node_modules
RUN npm run build

# Stage 2: Serve with Nginx
FROM nginx:latest

# Install envsubst (part of the gettext package)
RUN apt-get update && apt-get install -y gettext && rm -rf /var/lib/apt/lists/*

WORKDIR /usr/share/nginx/html

# Copy the built frontend from the previous stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Remove default Nginx config and replace it with a custom one
RUN rm /etc/nginx/nginx.conf
COPY nginx/nginx.conf /etc/nginx/nginx.conf

# Copy the template configuration file (with placeholders for environment variables)
COPY nginx/default.template.conf /etc/nginx/conf.d/default.template.conf

# Define build arguments for environment variables
ARG BACKEND_HOST

# Use envsubst to replace environment variables in the template file
# and output the result to the final configuration file
RUN envsubst '${BACKEND_HOST}' < /etc/nginx/conf.d/default.template.conf > /etc/nginx/conf.d/default.conf
RUN rm /etc/nginx/conf.d/default.template.conf

# RUN mv /etc/nginx/conf.d/default.conf /default.conf

# Expose the default HTTP port
EXPOSE 80

# Start Nginx
CMD ["nginx", "-g", "daemon off;"]
