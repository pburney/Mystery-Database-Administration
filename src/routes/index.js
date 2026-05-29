import { Router } from 'express';
import authRouter from './auth.js';
import schemaRouter from './schema.js';
import recordsRouter from './records.js';
import menuRouter from './menu.js';
import adminTablesRouter from './admin/tables.js';
import adminGroupsRouter from './admin/groups.js';
import adminUsersRouter from './admin/users.js';

const router = Router();

router.use('/auth', authRouter);
router.use('/schema', schemaRouter);
router.use('/records', recordsRouter);
router.use('/menu', menuRouter);
router.use('/admin/tables', adminTablesRouter);
router.use('/admin/groups', adminGroupsRouter);
router.use('/admin/users', adminUsersRouter);

// Phases 5-6 will add plugins router

export default router;
