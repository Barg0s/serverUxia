const express = require('express');
const router = express.Router();
const { User } = require('../models');

// POST /api/admin/usuaris/login
router.post('/usuaris/login', async (req, res) => {
    try {
        const { username, password } = req.body;

        // For this sprint, we do a simple check. In production, use bcrypt!
        // We also need to seed an admin user if not exists or assume one exists.
        // For simplicity, let's auto-create one if none exists for testing.

        // Check if user exists
        let user = await User.findOne({ where: { username } });

        // Mock login logic
        if (user) {
            if (user.password === password) {
                // Success
                // In a real app, generate a JWT token here.
                // Returning a simple fake token for now as per requirements to return a token.
                return res.json({
                    success: true,
                    message: 'Login successful',
                    token: 'mock-token-12345-admin'
                });
            } else {
                return res.status(401).json({ success: false, message: 'Invalid password' });
            }
        } else {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

module.exports = router;
