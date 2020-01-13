#!/bin/sh
docker create \
  --network="host" \
  --env MONGO_URI=mongodb://127.0.0.1:27017/banx \
  docker.carrfound.org/matt/banx:latest
