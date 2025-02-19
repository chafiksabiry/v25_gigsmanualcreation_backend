FROM node:20

WORKDIR /app

COPY package*.json ./

ENV PORT=5003
ENV MONGO_URI=mongodb://harx:gcZ62rl8hoME@185.137.122.3:27017/V25_CompanySearchWizard

RUN npm install

COPY . .

RUN npm run build

EXPOSE 5003

CMD ["npm", "start"]