const express = require('express');
const router = express.Router();
const extractService = require('../services/extract');

router.post('/', async (req, res) => {
  try {
    const { url, parentId, note, promptOverride, textOnly } = req.body;
    if (!url) return res.status(400).json({ error: 'URL is required' });
    const result = await extractService.extractAndSave(
      url,
      parentId,
      note,
      promptOverride,
      req.body.settings,
      { textOnly: !!textOnly }
    );
    res.json(result);
  } catch (err) {
    console.error('Extract error:', err);
    res.status(500).json({ error: err.message });
  }
});

router.post('/preview', async (req, res) => {
  try {
    const { url, promptOverride, textOnly } = req.body;
    if (!url) return res.status(400).json({ error: 'URL is required' });
    const result = await extractService.preview(
      url,
      promptOverride,
      req.body.settings,
      { textOnly: !!textOnly }
    );
    res.json(result);
  } catch (err) {
    console.error('Preview error:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
