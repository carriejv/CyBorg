FROM node:14.15.1-alpine
COPY LICENSE /cyborg/LICENSE
COPY index.js /cyborg/index.js
COPY package.json /cyborg/package.json
COPY ./lib /cyborg/lib
COPY ./lang /cyborg/lang

WORKDIR /cyborg
RUN npm install
ENTRYPOINT ["npm", "start"]