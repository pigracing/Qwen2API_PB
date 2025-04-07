FROM node:lts-alpine

WORKDIR /app

COPY . .

RUN chmod 777 /app

RUN npm i

EXPOSE 3000

CMD ["npm", "start"]