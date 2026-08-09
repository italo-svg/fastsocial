FROM node:20-slim AS deps
WORKDIR /app
COPY package.json ./
RUN npm install

FROM deps AS build
WORKDIR /app
# NEXT_PUBLIC_* sao embutidas no bundle do cliente em BUILD TIME, nao em runtime -
# precisam chegar como build-arg (docker build --build-arg ...), nunca so como
# variavel de ambiente do container rodando (isso nao afeta codigo ja compilado).
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL
ENV NEXT_PUBLIC_SUPABASE_ANON_KEY=$NEXT_PUBLIC_SUPABASE_ANON_KEY
COPY . .
RUN npm run build

FROM node:20-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
COPY --from=build /app/public ./public
EXPOSE 3000
CMD ["node", "server.js"]
