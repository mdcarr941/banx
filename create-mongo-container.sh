#!/bin/sh
docker run -d \
  -p 127.0.0.1:27017:27017 \
  --restart=always \
  --name mongo \
  -v /mnt/mongodb:/data/db \
  mongo:latest
