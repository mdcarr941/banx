## Installing and Launching
0. Install nodejs.
1. Install and start mongodb.
2. Install SageMath.
3. Clone this repository and `cd` into it.
4. Invoke `npm run init`.
5. Invoke `npm run start`.
6. Direct your browser to `http://localhost:3000`.

For development you'll probably want the node process to auto-restart whenever
you make code changes. This can be achieved with `nodemon`.

Run `npm install -g nodemon` as root then invoke `npm run dev` in the repository directory.
This runs `tsc --watch`, `ng build --watch`, and runs the server under `nodemon`.
