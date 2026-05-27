# Multi-stage build: keeps the runtime image lean and free of dev/build tooling.

# Stage 1: build the React app
FROM node:20.18.0-alpine AS build
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

ARG REACT_APP_ENV=production
ARG REACT_APP_API_PROD_ENDPOINT=https://ds2.kimmeloffice.com/ds2_backend
ARG REACT_APP_GOOGLE_CLIENT_ID
ENV REACT_APP_ENV=$REACT_APP_ENV
ENV REACT_APP_API_PROD_ENDPOINT=$REACT_APP_API_PROD_ENDPOINT
ENV REACT_APP_GOOGLE_CLIENT_ID=$REACT_APP_GOOGLE_CLIENT_ID
ENV GENERATE_SOURCEMAP=false

RUN npm run build

# Stage 2: lean static-server runtime
FROM node:20.18.0-alpine
RUN apk add --no-cache curl tini

ENV TZ=America/Phoenix
RUN ln -snf /usr/share/zoneinfo/$TZ /etc/localtime && echo $TZ > /etc/timezone

WORKDIR /app
RUN npm install -g serve@14

COPY --from=build /app/build ./build
COPY serve.json ./

RUN addgroup -S app && adduser -S -G app app \
  && chown -R app:app /app
USER app

EXPOSE 3003

ENTRYPOINT ["/sbin/tini", "--"]
CMD ["serve", "-s", "build", "-l", "3003"]
