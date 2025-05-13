# 1) Build
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# 2) Runner
FROM node:18-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

# Bring in all necessary files
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json

# Copy environment variables
COPY .env.production ./

EXPOSE 3000
CMD ["npm", "start"]