/* SNIP existing content above remains unchanged */

  // =========================
  // CAMELot EDGE ROUTES
  // =========================

  app.post('/api/edge/android', async (req, res) => {
    const route = req.body;
    return res.json({ accepted: true, status: route.requiresApproval ? 'approval_required' : 'queued', targetNode: 'phoneclaw', message: 'Android task routed', route });
  });

  app.post('/api/edge/browser', async (req, res) => {
    const route = req.body;
    return res.json({ accepted: true, status: 'queued', targetNode: 'superpowers_chrome', message: 'Browser task routed', route });
  });

  app.post('/api/edge/cli', async (req, res) => {
    const route = req.body;
    return res.json({ accepted: true, status: route.requiresApproval ? 'approval_required' : 'queued', targetNode: 'termux', message: 'CLI task routed', route });
  });

  app.post('/api/edge/rescue', async (req, res) => {
    const route = req.body;
    return res.json({ accepted: true, status: 'queued', targetNode: 'rustdesk', message: 'Rescue session triggered', route });
  });

  app.post('/api/edge/approval', async (req, res) => {
    return res.json({ accepted: true, status: 'executed', targetNode: 'lukas', message: 'Approval processed', route: req.body });
  });

  app.post('/api/edge/conversation', async (req, res) => {
    return res.json({ accepted: true, status: 'executed', targetNode: 'gemini', message: 'Conversation handled', route: req.body });
  });

/* SNIP rest of file unchanged */
