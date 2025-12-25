const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { exportToPDF } = require('../utils/pdfExporter');
const { ensureAdmin } = require('../middleware/auth');

// Export Specialists
router.get('/specialists', ensureAdmin, async (req, res) => {
    try {
        const { format } = req.query;
        const centerId = req.user.center;

        // Fetch Data
        const specialists = await User.find({ role: 'specialist', center: centerId })
            .select('name email phone staffId specialization createdAt');

        // Prepare Data for Export
        const data = specialists.map(s => ({
            name: s.name,
            email: s.email,
            phone: s.phone || 'N/A',
            staffId: s.staffId || 'N/A',
            specialization: s.specialization || 'N/A',
            joinedDate: new Date(s.createdAt).toLocaleDateString()
        }));

        const columns = [
            { header: 'Name', key: 'name', width: 30 },
            { header: 'Email', key: 'email', width: 30 },
            { header: 'Phone', key: 'phone', width: 15 },
            { header: 'Staff ID', key: 'staffId', width: 15 },
            { header: 'Specialization', key: 'specialization', width: 20 },
            { header: 'Joined Date', key: 'joinedDate', width: 15 }
        ];

        if (format === 'pdf') {
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', 'attachment; filename=specialists.pdf');
            exportToPDF(data, columns, 'Specialists List', res);
        } else {
            res.status(400).send('Only PDF format is supported');
        }

    } catch (error) {
        console.error('Export Error:', error);
        res.status(500).send('Export failed');
    }
});

module.exports = router;
