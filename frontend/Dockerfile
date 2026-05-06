FROM node:lts-alpine AS build

WORKDIR /app/frontend

COPY package*.json ./
RUN npm ci

COPY . .
RUN chmod +x node_modules/.bin/* && npm run build

FROM nginx:1.27-alpine

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/frontend/dist /usr/share/nginx/html
COPY docker-entrypoint.sh /docker-entrypoint.d/40-env-config.sh
RUN chmod +x /docker-entrypoint.d/40-env-config.sh

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
