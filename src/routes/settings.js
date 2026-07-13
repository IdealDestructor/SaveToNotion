const express = require('express');
const router = express.Router();
const settingsService = require('../services/settings');

router.get('/', (req, res) => {
  res.json(settingsService.getAll());
});

router.put('/', (req, res) => {
  const updates = req.body;
  settingsService.update(updates);
  res.json(settingsService.getAll());
});

router.post('/test-notion', async (req, res) => {
  try {
    const result = await settingsService.testNotionConnection();
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/test-ai', async (req, res) => {
  try {
    const result = await settingsService.testAIConnection();
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/notion-pages', async (req, res) => {
  try {
    const pages = await settingsService.getNotionPages();
    res.json(pages);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
