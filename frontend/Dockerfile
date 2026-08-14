FROM node:22-alpine AS build

WORKDIR /app

ARG VITE_API_BASE_URL
ARG VITE_BACKEND_URL
ARG VITE_RAZORPAY_KEY_ID

ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}
ENV VITE_BACKEND_URL=${VITE_BACKEND_URL}
ENV VITE_RAZORPAY_KEY_ID=${VITE_RAZORPAY_KEY_ID}

COPY package*.json ./

RUN npm ci

COPY . .

RUN npm run build


FROM nginx:1.27-alpine

RUN rm -rf /usr/share/nginx/html/*

COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]