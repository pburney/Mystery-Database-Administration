import { Router } from 'express';
import authRouter from './auth.js';
import schemaRouter from './schema.js';
import recordsRouter from './records.js';
import menuRouter from './menu.js';
import adminTablesRouter from './admin/tables.js';
import adminGroupsRouter from './admin/groups.js';
import adminUsersRouter from './admin/users.js';
import adminFkRouter from './admin/fk.js';

const router = Router();

router.use('/auth', authRouter);
router.use('/schema', schemaRouter);
router.use('/records', recordsRouter);
router.use('/menu', menuRouter);
router.use('/admin/tables', adminTablesRouter);
router.use('/admin/groups', adminGroupsRouter);
router.use('/admin/users', adminUsersRouter);
router.use('/admin/fk', adminFkRouter);

export default router;
