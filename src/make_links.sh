#!/bin/sh
# Create links in `public` to static content in `node_modules`.
set -e

cd public
ln -sf ../node_modules/bootstrap/dist bootstrap
ln -sf ../node_modules/jquery/dist jquery
ln -sf ../node_modules/mathjax mathjax
ln -sf ../node_modules/popper.js/dist popper.js
ln -sf ../banx-app/node_modules/monaco-editor/min monaco