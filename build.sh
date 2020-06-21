#!/bin/sh
# Run `npm run build-all` then build the docker image.
set -e

TAG="$1"
if [ -z "$TAG" ]; then
  TAG=docker.carrfound.org/matt/banx:latest
fi

cd src
sh make_links.sh
npm run build-prod
sudo docker build -t "$TAG" .
