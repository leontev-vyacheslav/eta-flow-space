FROM node:24.14-alpine AS build

WORKDIR /app

COPY package*.json ./

RUN npm ci

COPY . .

RUN npm run build

# Production stage
FROM node:24.14-alpine

WORKDIR /app

COPY package*.json ./

RUN npm ci --only=production

COPY --from=build /app/dist ./dist

ENV NODE_ENV=production

EXPOSE 3002

CMD ["npm", "run", "start:prod"]
