import { Router } from 'express';
import authRouter from './auth.js';
import schemaRouter from './schema.js';
import adminTablesRouter from './admin/tables.js';

const router = Router();

router.use('/auth', authRouter);
router.use('/schema', schemaRouter);
router.use('/admin/tables', adminTablesRouter);

// Phases 3-6 will add records, menu, groups, users, permissions, plugins

export default router;
