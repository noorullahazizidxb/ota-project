FROM node:12

WORKDIR /usr/app

COPY package.json .
RUN npm install
RUN npm i cls-hooked --save
RUN npm i -g mocha
RUN npm i nodemon -g
COPY . .
CMD [ "npm", "test" ]