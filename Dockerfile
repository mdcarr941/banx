FROM ubuntu:18.04
RUN apt-get update && DEBIAN_FRONTEND=noninteractive apt-get -y install sagemath nodejs npm
WORKDIR /banx
EXPOSE 80
ENV PORT=80 SAGE_LOCAL="/usr/share/sagemath" SAGE_ROOT=""
COPY . /banx
RUN npm run init && npm run build-all
CMD ["node", "www"]