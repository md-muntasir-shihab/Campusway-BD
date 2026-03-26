import { Router } from 'express';
import multer from 'multer';
import {
  approvePublishAdminNews,
  createAdminNews,
  createRssSource,
  deleteAdminNews,
  deleteRssSource,
  duplicateMerge,
  duplicatePublishAnyway,
  exportNews,
  fetchRssNow,
  getAdminAuditLogs,
  getAdminNewsById,
  getAdminNewsList,
  getAdminNewsSettings,
  listRssSources,
  moveNewsToDraft,
  putNewsSettings,
  rejectAdminNews,
  scheduleAdminNews,
  testRssSource,
  updateAdminNews,
  updateRssSource,
  uploadMedia
} from '../controllers/newsAdminController.js';

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

const router = Router();

router.get('/news', getAdminNewsList);
router.get('/news/:id', getAdminNewsById);
router.post('/news', createAdminNews);
router.put('/news/:id', updateAdminNews);
router.delete('/news/:id', deleteAdminNews);

router.post('/news/:id/approve-publish', approvePublishAdminNews);
router.post('/news/:id/approve', approvePublishAdminNews);
router.post('/news/:id/reject', rejectAdminNews);
router.post('/news/:id/schedule', scheduleAdminNews);
router.post('/news/:id/move-to-draft', moveNewsToDraft);
router.post('/news/:id/duplicate/publish-anyway', duplicatePublishAnyway);
router.post('/news/:id/duplicate/merge', duplicateMerge);

router.get('/rss-sources', listRssSources);
router.post('/rss-sources', createRssSource);
router.put('/rss-sources/:id', updateRssSource);
router.delete('/rss-sources/:id', deleteRssSource);
router.post('/rss-sources/:id/test', testRssSource);
router.post('/rss/fetch-now', fetchRssNow);

router.get('/news-settings', getAdminNewsSettings);
router.put('/news-settings', putNewsSettings);
router.get('/news/export', exportNews);
router.get('/audit-logs', getAdminAuditLogs);
router.post('/media/upload', upload.single('file'), uploadMedia);

export default router;

