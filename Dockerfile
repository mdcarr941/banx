FROM ubuntu:18.04
RUN apt-get update && DEBIAN_FRONTEND=noninteractive apt-get -y install sagemath nodejs npm
WORKDIR /banx
COPY . /banx
RUN npm run init && npm run build-all
CMD ["node", "www"]