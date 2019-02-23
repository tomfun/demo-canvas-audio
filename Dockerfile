FROM node:lts-jessie

WORKDIR /home/node

COPY . /home/node

RUN npm i \
    && FORCE_COLOR=1 npm run build

FROM nginx

COPY . /usr/share/nginx/html

COPY --from=0 /home/node/public /usr/share/nginx/html
