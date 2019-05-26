FROM ubuntu:18.04
RUN apt-get update && DEBIAN_FRONTEND=noninteractive apt-get -y install sagemath nodejs npm
WORKDIR /banx
EXPOSE 3000
COPY . /banx
RUN npm run init
ENV PORT=3000 SAGE_LOCAL="/usr/share/sagemath" SAGE_ROOT=""
CMD ["node", "www"]