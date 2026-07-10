FROM docker.io/node:22-alpine AS build

WORKDIR /app

ENV HUSKY=0

RUN npm install -g pnpm@11.10.0

# Copy dependency and pnpm policy files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

# Install dependencies
RUN pnpm install --frozen-lockfile

COPY . .

RUN pnpm run build

FROM docker.io/caddy:2-alpine

COPY ./Caddyfile /etc/caddy/Caddyfile
COPY --from=build /app/dist /var/www/html

EXPOSE 8080
