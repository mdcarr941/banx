FROM ubuntu:18.04
RUN apt-get update && DEBIAN_FRONTEND=noninteractive apt-get -y install sagemath nodejs npm
WORKDIR /banx
EXPOSE 3001
ENV PORT=3001 SAGE_LOCAL="/usr/share/sagemath" SAGE_ROOT=""
COPY ./www /banx/www
COPY ./bin /banx/bin
COPY ./node_modules /banx/node_modules
COPY ./public /banx/public
COPY ./views /banx/views
COPY ./sage_server.py /banx/sage_server.py
CMD ["node", "www"]