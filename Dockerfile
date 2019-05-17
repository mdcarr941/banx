FROM ubuntu:18.04
RUN apt-get update && DEBIAN_FRONTEND=noninteractive apt-get -y install sagemath nodejs npm
WORKDIR /banx
EXPOSE 8080
COPY . /banx
RUN npm run init
ENV PORT=8080 SAGE_LOCAL="/usr/share/sagemath" SAGE_ROOT=""
CMD ["node", "www"]