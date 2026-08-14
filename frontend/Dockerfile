# =========================================================
# Stage 1: Build React / Vite frontend
# =========================================================

FROM node:22-alpine AS build

WORKDIR /app

# ---------------------------------------------------------
# Vite production environment variables
# Railway service variables are passed into the build
# through these ARG values.
# ---------------------------------------------------------

ARG VITE_API_BASE_URL
ARG VITE_BACKEND_URL
ARG VITE_RAZORPAY_KEY_ID

ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}
ENV VITE_BACKEND_URL=${VITE_BACKEND_URL}
ENV VITE_RAZORPAY_KEY_ID=${VITE_RAZORPAY_KEY_ID}

# ---------------------------------------------------------
# Install dependencies
# ---------------------------------------------------------

COPY package*.json ./

RUN npm ci

# ---------------------------------------------------------
# Copy frontend source
# ---------------------------------------------------------

COPY . .

# Optional build-time verification.
# This prints only the backend URL, not sensitive secrets.
RUN echo "Building frontend with VITE_API_BASE_URL=${VITE_API_BASE_URL}"

# ---------------------------------------------------------
# Production build
# ---------------------------------------------------------

RUN npm run build


# =========================================================
# Stage 2: Nginx production server
# =========================================================

FROM nginx:1.27-alpine

# Remove default nginx content
RUN rm -rf /usr/share/nginx/html/*

# Copy Vite production build
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]