import * as express from 'express';

import { GlobalSageServer } from '../sageServer';
import { onlyAllowAuthors } from '../middleware';
import { printError } from '../common';

const router = express.Router();

// Only authors are allowed to access this router.
router.use(onlyAllowAuthors);

router.post('/', async (req, res, next) => {
    const code: string = req.body.code;
    GlobalSageServer.execute(code)
    .then(result => res.send(result))
    .catch(err => {
        printError(err, 'Sage Shell: failed to execute code')
        next(err);
    });
})

export default router;