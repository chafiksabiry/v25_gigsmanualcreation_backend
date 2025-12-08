FROM node:20

WORKDIR /app

COPY package*.json ./

ENV PORT=5003
ENV MONGO_URI=mongodb://harx:ix5S3vU6BjKn4MHp@207.180.226.2:27017/V25_HarxProd

RUN npm install

COPY . .

RUN npm run build

EXPOSE 5003

CMD ["npm", "start"]