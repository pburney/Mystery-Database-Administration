import { Router } from 'express';
import { requireLogin } from '../middleware/auth.js';
import { checkPermission } from '../middleware/permissions.js';
import { listRecords, getRecord, insertRecord, updateRecord, deleteRecord } from '../services/record-service.js';
import { getFKOptions } from '../services/foreign-key-service.js';
import { getConfigDb } from '../db/config-db.js';

const router = Router();

router.get('/:tableId', requireLogin, checkPermission('select'), async (req, res, next) => {
  try {
    const tableId = parseInt(req.params.tableId, 10);
    const { page, rows, orderBy, dir, q } = req.query;
    const result = await listRecords(getConfigDb(), tableId, {
      page: parseInt(page || '1', 10),
      rows: parseInt(rows || '25', 10),
      orderBy: orderBy || '',
      dir: dir || 'asc',
      q: q || '',
    });
    res.json({ status: 'ok', message: 'ok', data: result });
  } catch (err) {
    next(err);
  }
});

router.get('/:tableId/:pk', requireLogin, checkPermission('select'), async (req, res, next) => {
  try {
    const tableId = parseInt(req.params.tableId, 10);
    const record = await getRecord(getConfigDb(), tableId, req.params.pk);
    if (!record) return res.status(404).json({ status: 'error', message: 'Record not found', data: null });
    res.json({ status: 'ok', message: 'ok', data: record });
  } catch (err) {
    next(err);
  }
});

router.post('/:tableId', requireLogin, checkPermission('insert'), async (req, res, next) => {
  try {
    const tableId = parseInt(req.params.tableId, 10);
    const result = await insertRecord(getConfigDb(), tableId, req.body);
    res.status(201).json({ status: 'ok', message: 'Record created', data: result });
  } catch (err) {
    next(err);
  }
});

router.put('/:tableId/:pk', requireLogin, checkPermission('update'), async (req, res, next) => {
  try {
    const tableId = parseInt(req.params.tableId, 10);
    const result = await updateRecord(getConfigDb(), tableId, req.params.pk, req.body);
    res.json({ status: 'ok', message: `${result.affected} row(s) updated`, data: result });
  } catch (err) {
    next(err);
  }
});

router.get('/:tableId/fk-options/:field', requireLogin, checkPermission('select'), async (req, res, next) => {
  try {
    const tableId = parseInt(req.params.tableId, 10);
    const options = await getFKOptions(getConfigDb(), tableId, req.params.field);
    if (!options) return res.status(404).json({ status: 'error', message: 'No FK defined for that field', data: null });
    res.json({ status: 'ok', message: 'ok', data: options });
  } catch (err) {
    next(err);
  }
});

router.delete('/:tableId/:pk', requireLogin, checkPermission('delete'), async (req, res, next) => {
  try {
    const tableId = parseInt(req.params.tableId, 10);
    const result = await deleteRecord(getConfigDb(), tableId, req.params.pk);
    res.json({ status: 'ok', message: `${result.affected} row(s) deleted`, data: result });
  } catch (err) {
    next(err);
  }
});

export default router;
